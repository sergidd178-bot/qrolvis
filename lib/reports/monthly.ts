import "server-only";

import { sendEmail } from "../alerts/resend";
import { createAdminClient } from "../db/admin";
import { monthlyMetrics } from "../metrics";
import { monthPeriod, previousMonth } from "../metrics/period";
import { dayInZone } from "../time";
import { proposeCandidate, type Candidate } from "./candidate";
import { mesLargo } from "./month";

/**
 * Preparación mensual de informes. Día 1, para el mes anterior.
 *
 * PREPARA PERO NO ENVÍA, y esa es la decisión de fondo (D30). `docs/01` decía
 * que el cron "genera los informes del mes anterior para todos los negocios
 * activos y los envía por email", pero `docs/05` §3 exige que la recomendación
 * la escriba una persona, y ya está decidido que sin ella no se genera nada. Un
 * cron no puede escribir un juicio sobre el negocio de otro.
 *
 * Así que hace todo lo automatizable —calcular, dejar la fila lista, avisar— y
 * deja fuera lo único que por definición no se puede automatizar en la versión 1.
 *
 * IDEMPOTENTE Y SIN MARCA DE AGUA. Cada pasada mira qué informes del mes
 * anterior faltan y crea solo esos, así que se puede llamar cualquier día y
 * tantas veces como haga falta. Si el disparador del día 1 falla, el del día 2
 * lo recupera. Mismo principio que el cron de alertas.
 */

export type PreparedReport = {
  businessId: string;
  businessName: string;
  volumen: number;
  candidate: Candidate;
  /** Ya existía una fila para ese mes: no se toca nada. */
  yaExistia: boolean;
};

export type MonthlyReport = {
  month: string;
  preparados: PreparedReport[];
  yaExistentes: number;
  sinRespuestas: number;
  errores: string[];
  avisoOperador: "enviado" | "sin_pendientes" | "sin_destinatario" | "fallido";
};

/**
 * Deja lista una fila `pending` por cada negocio activo, con la foto del
 * cálculo, y avisa al operador de lo que tiene encima de la mesa.
 *
 * `month` es opcional para poder rehacer un mes concreto a mano; por defecto,
 * el mes anterior al actual en la zona del proyecto.
 */
export async function prepareMonthlyReports(month?: string): Promise<MonthlyReport> {
  const mes = month ?? previousMonth(dayInZone().slice(0, 7));
  const supabase = createAdminClient();

  const report: MonthlyReport = {
    month: mes,
    preparados: [],
    yaExistentes: 0,
    sinRespuestas: 0,
    errores: [],
    avisoOperador: "sin_pendientes",
  };

  const { data: negocios, error } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  if (error) {
    report.errores.push(`No se pudieron leer los negocios: ${error.message}`);
    return report;
  }

  const { start } = { start: `${mes}-01` };

  for (const negocio of negocios ?? []) {
    try {
      // Si ya hay fila para ese negocio y mes no se toca: puede que el operador
      // ya haya escrito la recomendación, y sobrescribirla sería destruir el
      // único trabajo manual del proceso.
      const { data: existente } = await supabase
        .from("reports")
        .select("id, status")
        .eq("business_id", negocio.id)
        .eq("period_start", start)
        .maybeSingle();

      if (existente) {
        report.yaExistentes++;
        continue;
      }

      const m = await monthlyMetrics(negocio.id, mes);
      const candidate = proposeCandidate({
        dimensiones: m.dimensiones,
        comparativa: m.comparativa,
        volumenActual: m.n,
        volumenAnterior: m.volumenAnterior,
      });

      if (m.n === 0) report.sinRespuestas++;

      const p = monthPeriod(mes);
      const ultimo = new Date(new Date(p.endUtc).getTime() - 1);
      const periodEnd = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Madrid",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(ultimo);

      // `recommendation` se queda a NULL a propósito. La columna significa "lo
      // que escribió el operador"; meter ahí el borrador la convertiría en "lo
      // que propuso el sistema" y ya no se sabría si alguien había pasado por
      // ahí. El panel ya calcula el borrador al vuelo cuando está vacía.
      const { error: insertError } = await supabase.from("reports").insert({
        business_id: negocio.id,
        period_start: start,
        period_end: periodEnd,
        metrics: m as never,
        status: "pending",
      });

      if (insertError) {
        report.errores.push(`${negocio.name}: ${insertError.message}`);
        continue;
      }

      report.preparados.push({
        businessId: negocio.id,
        businessName: negocio.name,
        volumen: m.n,
        candidate,
        yaExistia: false,
      });
    } catch (e) {
      report.errores.push(`${negocio.name}: ${e instanceof Error ? e.message : "error desconocido"}`);
    }
  }

  report.avisoOperador = await avisarOperador(report);
  return report;
}

/**
 * Aviso al operador con la lista de lo que espera su recomendación.
 *
 * UN SOLO CORREO con todo, no uno por negocio. El operador va a sentarse una vez
 * al mes a escribir; recibir cinco correos sueltos convierte una tarea en cinco
 * y no aporta nada.
 */
async function avisarOperador(report: MonthlyReport): Promise<MonthlyReport["avisoOperador"]> {
  if (report.preparados.length === 0) return "sin_pendientes";

  const destino = process.env.OPERATOR_ALERT_EMAIL?.trim();
  if (!destino) return "sin_destinatario";

  const resultado = await sendEmail({
    to: destino,
    // Desde `informes@`, no desde `alertas@`: este correo va de informes. Es
    // interno, pero mezclarlo con las alertas en la bandeja del operador
    // estropea justo lo que separar los remitentes venía a conseguir.
    from: process.env.REPORT_FROM_EMAIL?.trim() || "Qrolvis <informes@qrolvis.com>",
    subject: operatorSubject(report.month, report.preparados.length),
    text: operatorBody(report),
  });

  if (!resultado.ok) {
    console.error("[informes] no se pudo avisar al operador:", resultado.error);
    return "fallido";
  }
  return "enviado";
}

export function operatorSubject(month: string, n: number): string {
  return n === 1
    ? `1 informe de ${mesLargo(month)} espera tu recomendación`
    : `${n} informes de ${mesLargo(month)} esperan tu recomendación`;
}

export function operatorBody(report: MonthlyReport): string {
  const lineas = report.preparados.map((p) => {
    const cabecera = `· ${p.businessName} — ${p.volumen} respuestas`;

    // Un mes sin respuestas NO es un informe flojo: es un problema NUESTRO de
    // captación (docs/05 §2.1). Se marca aquí para que la decisión de enviar o
    // no la tome una persona, que es lo acordado.
    if (p.volumen === 0) {
      return `${cabecera}\n    SIN RESPUESTAS. Antes de enviar nada, revisa la captación:\n    los QR pueden haberse caído, tapado o desactivado.`;
    }

    return `${cabecera}\n    ${resumenCandidato(p.candidate)}`;
  });

  const avisos: string[] = [];
  if (report.yaExistentes > 0) {
    avisos.push(`${report.yaExistentes} ya tenían informe de ese mes y no se han tocado.`);
  }
  if (report.errores.length > 0) {
    avisos.push(`Con errores: ${report.errores.join("; ")}`);
  }

  return `${report.preparados.length} informes de ${mesLargo(report.month)} están listos para que escribas su recomendación.

Ninguno se ha enviado. El sistema calcula los números, pero la recomendación
la escribes tú, y sin ella no se genera el PDF.

${lineas.join("\n\n")}

Los tienes en el panel, en Informes, eligiendo el negocio y ${report.month}.
${avisos.length > 0 ? `\n${avisos.join("\n")}\n` : ""}`;
}

function resumenCandidato(c: Candidate): string {
  switch (c.tipo) {
    case "dimension_peor":
      return `Propuesta: ${c.label}, ${c.media} de media y ${c.detractoresPct} % de 2 o menos.`;
    case "dimension_caida":
      return `Propuesta: ${c.label}, ha bajado ${Math.abs(c.delta)} puntos.`;
    case "volumen":
      return `Propuesta: el volumen ha caído un ${c.caidaPct} % (${c.actual} frente a ${c.anterior}).`;
    case "volumen_bajo":
      return `Solo ${c.n} respuestas: por debajo del mínimo para publicar nada. El borrador de volumen bajo ya viene completo.`;
    case "ninguno":
      return `Nada destaca este mes.`;
  }
}
