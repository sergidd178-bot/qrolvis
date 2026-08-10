import "server-only";

import { monthlyMetrics } from "../metrics";
import { monthPeriod } from "../metrics/period";
import { formatInZone } from "../time";
import { proposeCandidate, draftFor, type Candidate } from "./candidate";
import { renderReport } from "./template";

export * from "./candidate";
export { renderReport } from "./template";
export { sendReport, reportSubject, reportBody } from "./send";
export type { ReportInput } from "./template";

/**
 * Error de generación sin recomendación escrita.
 *
 * Se distingue con un tipo propio para que quien llame pueda dejar
 * `reports.status` en `pending` en vez de marcarlo `failed`: no ha fallado nada,
 * es que falta el trabajo manual. Confundir "pendiente de una persona" con
 * "roto" haría que el operador buscara un fallo técnico que no existe.
 */
export class RecomendacionPendienteError extends Error {
  constructor(businessId: string, month: string) {
    super(
      `El informe de ${month} para ${businessId} no se puede generar: falta la ` +
        `recomendación del mes, que la escribe el operador (docs/05 §3, Bloque 5).`,
    );
    this.name = "RecomendacionPendienteError";
  }
}

/** Periodo exacto cubierto, para el pie del informe (docs/05 §3, Pie). */
function periodoTexto(month: string): string {
  const p = monthPeriod(month);
  // El fin es exclusivo: se resta un instante para enseñar el último momento
  // que SÍ entra, que es lo que el cliente entiende por "hasta".
  const ultimo = new Date(new Date(p.endUtc).getTime() - 1).toISOString();
  return `${formatInZone(p.startUtc)} — ${formatInZone(ultimo)}`;
}

/**
 * Propuesta de recomendación para que el operador escriba encima.
 *
 * Se expone aparte de la generación porque ocurre ANTES: primero el operador ve
 * el candidato y redacta, y solo después existe informe que generar.
 */
export async function proposeRecommendation(
  businessId: string,
  month: string,
): Promise<{ candidate: Candidate; draft: string }> {
  const m = await monthlyMetrics(businessId, month);
  const candidate = proposeCandidate({
    dimensiones: m.dimensiones,
    comparativa: m.comparativa,
    volumenActual: m.n,
    volumenAnterior: m.volumenAnterior,
  });
  return { candidate, draft: draftFor(candidate) };
}

/**
 * Genera el PDF del informe mensual.
 *
 * FALLA si no hay recomendación escrita. Un informe sin ella no está incompleto:
 * le falta justo lo que docs/05 llama "lo que más valor percibido aporta", y
 * enviarlo con un hueco o con la plantilla de andamio sin rellenar sería peor
 * que no enviarlo.
 */
export async function generateReport(input: {
  businessId: string;
  businessName: string;
  month: string;
  recomendacion: string;
  operador: string;
}): Promise<{ pdf: Buffer; metrics: Awaited<ReturnType<typeof monthlyMetrics>> }> {
  const recomendacion = input.recomendacion?.trim();

  // También se rechaza el andamio sin rellenar: los corchetes son la marca de
  // que nadie ha pasado por ahí.
  if (!recomendacion || recomendacion.includes("[")) {
    throw new RecomendacionPendienteError(input.businessId, input.month);
  }

  const metrics = await monthlyMetrics(input.businessId, input.month);

  const pdf = await renderReport({
    businessName: input.businessName,
    metrics,
    recomendacion,
    operador: input.operador,
    periodoTexto: periodoTexto(input.month),
  });

  return { pdf, metrics };
}
