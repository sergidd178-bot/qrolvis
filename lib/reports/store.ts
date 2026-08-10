import "server-only";

import { createAdminClient } from "../db/admin";
import { monthPeriod } from "../metrics/period";

/**
 * Persistencia del informe: la fila de `reports` y el PDF en Storage.
 *
 * `reports` tiene `unique (business_id, period_start)`, así que aquí NUNCA se
 * hace un insert a ciegas: siempre upsert sobre esa clave. Un insert normal
 * fallaría al regenerar, que es una operación legítima y frecuente.
 */

const BUCKET = "reports";

export type StoredReport = {
  id: string;
  status: string;
  recommendation: string | null;
  pdfPath: string | null;
  generatedAt: string | null;
  sentAt: string | null;
};

/** Ruta del objeto. Predecible a propósito: un negocio y un mes, un archivo. */
export function reportObjectPath(businessId: string, month: string): string {
  return `${businessId}/${month}.pdf`;
}

/** Fechas del periodo tal como las guarda `reports`: dos DATE, no timestamps. */
function periodDates(month: string): { start: string; end: string } {
  const p = monthPeriod(month);
  // period_end es el ÚLTIMO día que entra, no el primero del mes siguiente:
  // la columna es `date` y el nombre dice "end", no "before".
  const ultimo = new Date(new Date(p.endUtc).getTime() - 1);
  return {
    start: `${month}-01`,
    end: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(ultimo),
  };
}

/** Informe ya guardado para ese negocio y mes, si existe. */
export async function findReport(
  businessId: string,
  month: string,
): Promise<StoredReport | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("reports")
    .select("id, status, recommendation, pdf_url, generated_at, sent_at")
    .eq("business_id", businessId)
    .eq("period_start", `${month}-01`)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    status: data.status,
    recommendation: data.recommendation,
    pdfPath: data.pdf_url,
    generatedAt: data.generated_at,
    sentAt: data.sent_at,
  };
}

/**
 * Guarda el PDF y la fila.
 *
 * El orden importa: primero el objeto, después la fila. Si fallara al revés,
 * quedaría una fila diciendo `generated` con `pdf_url` apuntando a nada, y el
 * operador se enteraría al pulsar descargar. Así, si falla la subida, no se
 * escribe nada y el estado sigue siendo el anterior.
 *
 * `status` vuelve a `generated` aunque antes fuera `sent`: el PDF que hay
 * guardado ya no es el que se envió, y decir lo contrario sería mentir sobre el
 * estado. El `sent_at` anterior se conserva como constancia de que hubo un envío.
 */
export async function saveReport(input: {
  businessId: string;
  month: string;
  pdf: Buffer;
  metrics: unknown;
  recommendation: string;
}): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const supabase = createAdminClient();
  const path = reportObjectPath(input.businessId, input.month);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.pdf, { contentType: "application/pdf", upsert: true });

  if (uploadError) return { ok: false, message: `No se pudo guardar el PDF: ${uploadError.message}` };

  const { start, end } = periodDates(input.month);

  const { error } = await supabase.from("reports").upsert(
    {
      business_id: input.businessId,
      period_start: start,
      period_end: end,
      metrics: input.metrics as never,
      pdf_url: path,
      recommendation: input.recommendation,
      status: "generated",
      generated_at: new Date().toISOString(),
    },
    { onConflict: "business_id,period_start" },
  );

  if (error) return { ok: false, message: `No se pudo guardar el informe: ${error.message}` };

  return { ok: true, path };
}

/** URL firmada para descargar. El bucket es privado: contiene comentarios. */
export async function signedReportUrl(path: string, seconds = 300): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
