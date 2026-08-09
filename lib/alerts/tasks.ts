import "server-only";

import { createAdminClient } from "../db/admin";
import { dayInZone, startOfDayInZone, TIME_ZONE } from "../time";
import { sendEmail } from "./resend";
import { digestBody, digestSubject, type DigestItem } from "./template";
import { PARTIAL_ALERT_DELAY_MINUTES, processAlert } from "./index";

/**
 * Trabajo programado de las alertas. Tres tareas en una sola pasada.
 *
 * TODAS LAS CONSULTAS SON POR ESTADO, NUNCA POR MARCA DE AGUA. No existe un
 * "desde la última ejecución": cada pasada busca lo que sigue pendiente. Por eso
 * perder un ciclo entero —o veinte— solo retrasa, no pierde nada, y por eso dos
 * ejecuciones solapadas no se estorban: `alerts` tiene unique(response_id) y el
 * insert es la cerradura.
 *
 * Hora del resumen: 09:00 de Madrid, sobre el día natural ANTERIOR ya cerrado.
 * Del día anterior porque un bar sigue sirviendo a las 23:00 y un resumen
 * enviado antes de medianoche se dejaría fuera las últimas horas. A las 09:00
 * porque el dueño de un bar no lee el correo a las 00:30, y a esa hora aún le da
 * tiempo a actuar antes de abrir.
 */

export const DIGEST_HOUR_LOCAL = 9;

export type CronReport = {
  partialsAlerted: number;
  sweepAlerted: number;
  tooOld: number;
  digestsSent: number;
  digestsFailed: number;
  errors: string[];
};

/** Hora local de Madrid, 0-23, del instante dado. */
function localHour(at: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(at),
  );
}

/**
 * Tareas 1 y 2: parciales con la ventana cerrada, y barrida de seguridad.
 *
 * Son la MISMA consulta con distinto filtro de estado —valoración baja, sin fila
 * en `alerts`— así que se resuelven juntas. La barrida existe porque `after()`
 * puede morir entre la respuesta HTTP y el envío: ahí la alerta se perdería sin
 * dejar rastro, y esto la recupera.
 */
async function dispatchPending(report: CronReport): Promise<void> {
  const supabase = createAdminClient();

  const cutoff = new Date(Date.now() - PARTIAL_ALERT_DELAY_MINUTES * 60_000).toISOString();

  // Se piden las candidatas y se descartan en memoria las que ya tienen alerta:
  // PostgREST no expresa bien un "not exists" sobre la tabla embebida, y el
  // volumen es pequeño. Si algún día crece, esto pasa a una vista o a un RPC.
  const { data, error } = await supabase
    .from("responses")
    .select("id, submitted_at, completeness, alerts(id)")
    .lte("overall_rating", 2)
    .order("submitted_at", { ascending: true })
    .limit(500);

  if (error) {
    report.errors.push(`consulta de pendientes: ${error.message}`);
    return;
  }

  for (const r of data ?? []) {
    // `alerts` viene como objeto y no como lista: response_id es unique, así que
    // PostgREST lo trata como relación uno a uno. Si existe, ya se procesó.
    if (r.alerts) continue;

    // Una parcial solo entra cuando su ventana de edición ha cerrado. Una
    // completa entra siempre: si no tiene fila, es que el envío se perdió.
    if (r.completeness !== "complete" && r.submitted_at > cutoff) continue;

    const outcome = await processAlert(r.id);

    if (outcome.status === "too_old") report.tooOld++;
    else if (outcome.status === "sent" || outcome.status === "held_for_digest") {
      if (r.completeness === "complete") report.sweepAlerted++;
      else report.partialsAlerted++;
    } else if (outcome.status === "failed") {
      report.errors.push(`envío de ${r.id}: ${outcome.error}`);
    }
  }
}

/**
 * Tarea 3: resumen agrupado de los días ya cerrados.
 *
 * No hace falta columna ni estado extra para saber si un resumen ya salió: las
 * filas agrupadas quedan en `pending` hasta que se envía, y al enviarse pasan a
 * `sent`. Una vez enviadas dejan de aparecer en esta consulta. La idempotencia
 * sale del propio dato.
 *
 * Se autorrepara: si falla la pasada de las 09:00, la de las 09:10 lo manda.
 */
export async function sendDigests(report: CronReport): Promise<void> {
  // La puerta horaria NO vive aquí, sino en `runAlertTasks`. Esta función hace
  // el trabajo; quien la llama decide cuándo toca. Así se puede ejercitar el
  // envío sin esperar a que den las nueve.
  const supabase = createAdminClient();

  // Solo días ya cerrados: el inicio del día natural de HOY en Madrid es el
  // techo. Las retenidas de hoy esperan a mañana.
  const todayStart = startOfDayInZone(dayInZone());
  if (!todayStart) return;

  const { data, error } = await supabase
    .from("alerts")
    .select(
      "id, business_id, created_at, businesses(name, alert_email), responses(overall_rating, comment, submitted_at, capture_points(label), answers(rating_value, questions(text_es, position)))",
    )
    .eq("status", "pending")
    .lt("created_at", todayStart)
    .order("created_at", { ascending: true });

  if (error) {
    report.errors.push(`consulta del resumen: ${error.message}`);
    return;
  }

  // Se agrupa por negocio Y día natural: si estuvo caído tres días, salen tres
  // resúmenes, uno por día, en vez de un revoltijo sin fecha.
  type Fila = NonNullable<typeof data>[number];
  const grupos = new Map<string, { dia: string; filas: Fila[] }>();

  for (const a of data ?? []) {
    const dia = dayInZone(new Date(a.created_at));
    const clave = `${a.business_id}|${dia}`;
    const grupo = grupos.get(clave) ?? { dia, filas: [] };
    grupo.filas.push(a);
    grupos.set(clave, grupo);
  }

  for (const { dia, filas } of grupos.values()) {
    const negocio = filas[0]?.businesses;
    if (!negocio?.alert_email) continue;

    const items: DigestItem[] = filas
      .filter((f) => f.responses)
      .map((f) => ({
        overallRating: f.responses!.overall_rating,
        pointLabel: f.responses!.capture_points?.label ?? "—",
        submittedAt: f.responses!.submitted_at,
        comment: f.responses!.comment,
        dimensions: (f.responses!.answers ?? [])
          .filter((x) => x.rating_value !== null && x.questions)
          .sort((x, y) => (x.questions?.position ?? 0) - (y.questions?.position ?? 0))
          .map((x) => ({ label: x.questions!.text_es, rating: x.rating_value! })),
      }));

    if (items.length === 0) continue;

    const result = await sendEmail({
      to: negocio.alert_email,
      subject: digestSubject(negocio.name, items.length),
      text: digestBody(negocio.name, formatDay(dia), items),
    });

    const ids = filas.map((f) => f.id);

    if (result.ok) {
      // TODAS las filas del grupo comparten el mismo identificador, porque las
      // ha llevado UN solo correo. No es un descuido ni un duplicado: es lo que
      // permite saber después qué alertas viajaron en qué resumen. Por eso la
      // columna no lleva restricción de unicidad.
      await supabase
        .from("alerts")
        .update({ status: "sent", sent_at: new Date().toISOString(), message_id: result.id })
        .in("id", ids);
      report.digestsSent++;
    } else {
      // Se marcan `failed` para que el fallo se vea en el panel, como exige
      // docs/05. Al no quedar en `pending`, no se reintenta indefinidamente:
      // un reintento eterno acabaría enviando un resumen de hace semanas.
      await supabase
        .from("alerts")
        .update({ status: "failed", error_detail: `Resumen diario: ${result.error}` })
        .in("id", ids);
      report.digestsFailed++;
      report.errors.push(`resumen de ${negocio.name} (${dia}): ${result.error}`);
    }
  }
}

/** YYYY-MM-DD a DD/MM/YYYY, que es como se lee una fecha aquí. */
function formatDay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export async function runAlertTasks(): Promise<CronReport> {
  const report: CronReport = {
    partialsAlerted: 0,
    sweepAlerted: 0,
    tooOld: 0,
    digestsSent: 0,
    digestsFailed: 0,
    errors: [],
  };

  await dispatchPending(report);

  // El resumen solo a partir de las 09:00 de Madrid. Antes de esa hora las
  // retenidas siguen esperando: nadie lee el correo del negocio a las 00:30.
  if (localHour() >= DIGEST_HOUR_LOCAL) {
    await sendDigests(report);
  }

  return report;
}
