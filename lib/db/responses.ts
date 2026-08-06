import "server-only";

import { createAdminClient } from "./admin";
import type { Database } from "./types";
import type { Language } from "../i18n";

type ResponseInsert = Database["public"]["Tables"]["responses"]["Insert"];

/** Lo que la aplicación sí envía: el resto lo deriva el trigger. */
type TriggerFilledResponseInsert = Omit<ResponseInsert, "business_id" | "question_set_id">;

// docs/02, "Actualización de respuestas parciales": las pantallas 2 y 3 solo
// pueden tocar una respuesta reciente que siga en estado partial.
export const PARTIAL_WINDOW_MINUTES = 30;

// docs/01, "Limitación de abuso": mismo dispositivo y mismo punto de captación
// dentro de esta ventana no crea una respuesta nueva.
export const DEVICE_WINDOW_HOURS = 6;

export type CreateResult =
  | { status: "created"; responseId: string }
  | { status: "unavailable" }
  | { status: "already_answered" };

export type UpdateResult = { status: "ok" } | { status: "not_updatable" };

export type DimensionAnswer = {
  questionId: string;
  ratingValue: number;
};

type CapturePoint = {
  id: string;
  businessId: string;
  googleReviewUrl: string | null;
};

/**
 * Resuelve el punto de captación a partir del código de la URL.
 *
 * Devuelve null tanto si el código no existe como si el punto está desactivado o
 * el negocio no está activo. docs/03, "Casos límite": los tres casos muestran el
 * mismo mensaje neutro, sin detalles técnicos que permitan distinguirlos.
 */
async function resolveCapturePoint(code: string): Promise<CapturePoint | null> {
  const supabase = createAdminClient();

  const { data: capturePoint } = await supabase
    .from("capture_points")
    .select("id, business_id")
    .eq("code", code)
    .eq("is_active", true)
    .maybeSingle();

  if (!capturePoint) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("status, google_review_url")
    .eq("id", capturePoint.business_id)
    .maybeSingle();

  if (!business || business.status !== "active") return null;

  return {
    id: capturePoint.id,
    businessId: capturePoint.business_id,
    googleReviewUrl: business.google_review_url,
  };
}

/**
 * Pantalla 1. Crea la respuesta con la valoración global.
 *
 * business_id y question_set_id no se envían: los rellena el trigger
 * set_response_business_id() derivándolos del punto de captación. Enviarlos
 * desde aquí permitiría que se desincronizaran (docs/02).
 */
export async function createResponse(input: {
  code: string;
  overallRating: number;
  language: Language;
  deviceToken: string | null;
}): Promise<CreateResult> {
  if (!Number.isInteger(input.overallRating) || input.overallRating < 1 || input.overallRating > 5) {
    return { status: "unavailable" };
  }

  const capturePoint = await resolveCapturePoint(input.code);
  if (!capturePoint) return { status: "unavailable" };

  const supabase = createAdminClient();

  if (input.deviceToken) {
    const since = new Date(Date.now() - DEVICE_WINDOW_HOURS * 3600_000).toISOString();
    const { data: recent } = await supabase
      .from("responses")
      .select("id")
      .eq("device_token", input.deviceToken)
      .eq("capture_point_id", capturePoint.id)
      .gte("submitted_at", since)
      .limit(1);

    if (recent && recent.length > 0) return { status: "already_answered" };
  }

  // business_id y question_set_id son not null y los tipos generados los exigen,
  // pero aquí NO se envían a propósito: los rellena set_response_business_id()
  // antes del insert, y el not null se comprueba una vez ejecutado el trigger.
  // Los tipos se generan del esquema y no saben de triggers, así que el cast
  // documenta esa diferencia en lugar de taparla. Enviar esas dos columnas desde
  // la aplicación es justo lo que el trigger existe para impedir.
  const payload: TriggerFilledResponseInsert = {
    capture_point_id: capturePoint.id,
    overall_rating: input.overallRating,
    language: input.language,
    device_token: input.deviceToken,
  };

  const { data, error } = await supabase
    .from("responses")
    .insert(payload as ResponseInsert)
    .select("id")
    .single();

  if (error || !data) return { status: "unavailable" };

  return { status: "created", responseId: data.id };
}

/**
 * Valoración global de una respuesta, para elegir el texto de la pantalla 3.
 *
 * Se lee del servidor y no se pasa por la URL: el texto de cierre no debe
 * depender de un valor que el navegador pueda alterar. El botón de Google no
 * depende de esto en ningún caso (R2).
 */
export async function readOverallRating(responseId: string): Promise<number | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("responses")
    .select("overall_rating")
    .eq("id", responseId)
    .maybeSingle();

  return data?.overall_rating ?? null;
}

/**
 * Comprueba que la respuesta se puede seguir tocando: existe, se creó hace menos
 * de PARTIAL_WINDOW_MINUTES y sigue en partial (docs/02).
 */
async function loadUpdatable(responseId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("responses")
    .select("id, question_set_id, capture_point_id, submitted_at, completeness")
    .eq("id", responseId)
    .maybeSingle();

  if (!data || data.completeness !== "partial") return null;

  const age = Date.now() - new Date(data.submitted_at).getTime();
  if (age > PARTIAL_WINDOW_MINUTES * 60_000) return null;

  return data;
}

/**
 * Pantalla 2. Añade las valoraciones por dimensión y el comentario.
 *
 * Las preguntas se filtran contra el conjunto al que apunta la respuesta: un
 * cliente no puede colgar una respuesta a una pregunta de otro sector o de otra
 * versión del conjunto.
 */
export async function addDimensionAnswers(
  responseId: string,
  answers: DimensionAnswer[],
  comment: string | null,
): Promise<UpdateResult> {
  const response = await loadUpdatable(responseId);
  if (!response) return { status: "not_updatable" };

  const supabase = createAdminClient();

  const { data: allowed } = await supabase
    .from("questions")
    .select("id")
    .eq("question_set_id", response.question_set_id)
    .eq("type", "rating");

  const allowedIds = new Set((allowed ?? []).map((q) => q.id));

  const rows = answers
    .filter((a) => allowedIds.has(a.questionId))
    .filter((a) => Number.isInteger(a.ratingValue) && a.ratingValue >= 1 && a.ratingValue <= 5)
    .map((a) => ({
      response_id: responseId,
      question_id: a.questionId,
      rating_value: a.ratingValue,
    }));

  if (rows.length > 0) {
    // upsert y no insert: si alguien reenvía la pantalla 2, la restricción
    // unique (response_id, question_id) haría fallar el lote entero.
    const { error } = await supabase
      .from("answers")
      .upsert(rows, { onConflict: "response_id,question_id" });

    if (error) return { status: "not_updatable" };
  }

  const trimmed = comment?.trim();
  const { error: updateError } = await supabase
    .from("responses")
    .update({ comment: trimmed ? trimmed : null })
    .eq("id", responseId);

  if (updateError) return { status: "not_updatable" };

  return { status: "ok" };
}

/**
 * Pantalla 3. Marca la respuesta como completa.
 *
 * google_link_shown lo decide el servidor a partir de si el negocio tiene URL de
 * Google, no el cliente. Es el registro que permite demostrar que no hay
 * filtrado de reseñas (docs/03, "Cumplimiento de las políticas de Google"), así
 * que no puede depender de lo que diga el navegador.
 */
export async function completeResponse(responseId: string): Promise<UpdateResult> {
  const response = await loadUpdatable(responseId);
  if (!response) return { status: "not_updatable" };

  const supabase = createAdminClient();

  const { data: capturePoint } = await supabase
    .from("capture_points")
    .select("business_id")
    .eq("id", response.capture_point_id)
    .maybeSingle();

  let googleLinkShown = false;
  if (capturePoint) {
    const { data: business } = await supabase
      .from("businesses")
      .select("google_review_url")
      .eq("id", capturePoint.business_id)
      .maybeSingle();

    googleLinkShown = Boolean(business?.google_review_url);
  }

  const { error } = await supabase
    .from("responses")
    .update({
      completeness: "complete",
      completed_at: new Date().toISOString(),
      google_link_shown: googleLinkShown,
    })
    .eq("id", responseId);

  return error ? { status: "not_updatable" } : { status: "ok" };
}
