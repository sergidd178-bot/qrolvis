import "server-only";

import { createAdminClient } from "../db/admin";
import type { DimensionAnswerRow, ResponseRow } from "./types";
import type { Period } from "./period";

/**
 * ÚNICA capa de métricas que habla con Supabase.
 *
 * Trae filas y las aplana al tipo que espera `compute.ts`. No calcula nada: si
 * alguna vez aparece aquí una división, está en el sitio equivocado, porque este
 * módulo no se puede probar sin base de datos y el de cálculo sí.
 *
 * El corte del periodo usa `gte(startUtc)` y `lt(endUtc)`, los dos valores que
 * produce `monthPeriod()`. Límite superior EXCLUSIVO sobre el primer instante
 * del mes siguiente: así entra la respuesta de las 23:59:59 del último día sin
 * tener que jugar con milisegundos.
 */
export async function loadPeriod(
  businessId: string,
  period: Period,
): Promise<{ responses: ResponseRow[]; answers: DimensionAnswerRow[] }> {
  const supabase = createAdminClient();

  const { data: rows, error } = await supabase
    .from("responses")
    .select(
      "id, overall_rating, completeness, comment, submitted_at, capture_point_id, capture_points(label)",
    )
    .eq("business_id", businessId)
    .gte("submitted_at", period.startUtc)
    .lt("submitted_at", period.endUtc)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(`No se pudieron leer las respuestas del periodo: ${error.message}`);

  const responses: ResponseRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    overallRating: r.overall_rating,
    completeness: r.completeness === "complete" ? "complete" : "partial",
    comment: r.comment,
    submittedAt: r.submitted_at,
    capturePointId: r.capture_point_id,
    capturePointLabel: r.capture_points?.label ?? "—",
  }));

  if (responses.length === 0) return { responses, answers: [] };

  // Las valoraciones por dimensión, con el `code` de la pregunta y la versión de
  // su conjunto. Se traen todas y `compute.ts` filtra por `complete`: el filtro
  // vive con la regla (R-M3), no repartido entre dos módulos.
  const { data: answerRows, error: answersError } = await supabase
    .from("answers")
    .select("response_id, rating_value, questions(code, dimension, question_sets(version))")
    .in(
      "response_id",
      responses.map((r) => r.id),
    );

  if (answersError) {
    throw new Error(`No se pudieron leer las valoraciones por dimensión: ${answersError.message}`);
  }

  const answers: DimensionAnswerRow[] = (answerRows ?? [])
    .filter((a) => a.rating_value !== null && a.questions)
    .map((a) => ({
      responseId: a.response_id,
      code: a.questions!.code,
      label: a.questions!.dimension,
      version: a.questions!.question_sets?.version ?? 0,
      value: a.rating_value!,
    }));

  return { responses, answers };
}
