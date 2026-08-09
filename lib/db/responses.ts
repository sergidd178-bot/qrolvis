import "server-only";

import { scheduleAlert } from "../alerts";
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

/** Lo que las pantallas 2 y 3 necesitan para escribir, resuelto de una vez. */
type UpdatableResponse = {
  questionSetId: string;
  googleReviewUrl: string | null;
};

/**
 * Comprueba que la respuesta se puede seguir tocando: existe, se creó hace menos
 * de PARTIAL_WINDOW_MINUTES y sigue en partial (docs/02).
 *
 * Trae el negocio EMBEBIDO en la misma consulta. Antes se llegaba a él dando un
 * rodeo —respuesta, punto de captación, negocio—, pero `responses.business_id`
 * ya lo tiene: lo rellena el trigger al insertar. Eran dos viajes de red para un
 * dato que estaba a mano, y con la base en Frankfurt cada viaje se nota.
 */
async function loadUpdatable(responseId: string): Promise<UpdatableResponse | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("responses")
    .select("question_set_id, submitted_at, completeness, businesses(google_review_url)")
    .eq("id", responseId)
    .maybeSingle();

  if (!data || data.completeness !== "partial") return null;

  const age = Date.now() - new Date(data.submitted_at).getTime();
  if (age > PARTIAL_WINDOW_MINUTES * 60_000) return null;

  return {
    questionSetId: data.question_set_id,
    googleReviewUrl: data.businesses?.google_review_url ?? null,
  };
}

/**
 * Guarda las valoraciones por dimensión. Devuelve false si el lote falla.
 *
 * Las preguntas se filtran contra el conjunto al que apunta la respuesta: un
 * cliente no puede colgar una respuesta a una pregunta de otro sector o de otra
 * versión del conjunto.
 *
 * Sin dimensiones no consulta nada: quien salta la pantalla 2 no paga el viaje.
 */
async function writeAnswers(
  responseId: string,
  questionSetId: string,
  answers: DimensionAnswer[],
): Promise<boolean> {
  if (answers.length === 0) return true;

  const supabase = createAdminClient();

  const { data: allowed } = await supabase
    .from("questions")
    .select("id")
    .eq("question_set_id", questionSetId)
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

  if (rows.length === 0) return true;

  // upsert y no insert: si alguien reenvía la pantalla 2, la restricción
  // unique (response_id, question_id) haría fallar el lote entero.
  const { error } = await supabase
    .from("answers")
    .upsert(rows, { onConflict: "response_id,question_id" });

  return !error;
}

/**
 * Escritura final de la respuesta.
 *
 * `comment` a `undefined` significa "no lo toques", que es lo que necesita el
 * enlace de saltar; `null` significa "déjalo vacío".
 *
 * google_link_shown lo decide el servidor a partir de si el negocio tiene URL de
 * Google, no el cliente. Es el registro que permite demostrar que no hay
 * filtrado de reseñas (docs/03, "Cumplimiento de las políticas de Google"), así
 * que no puede depender de lo que diga el navegador.
 */
async function finish(
  responseId: string,
  response: UpdatableResponse,
  comment: string | null | undefined,
): Promise<UpdateResult> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("responses")
    .update({
      completeness: "complete",
      completed_at: new Date().toISOString(),
      google_link_shown: Boolean(response.googleReviewUrl),
      ...(comment !== undefined ? { comment } : {}),
    })
    .eq("id", responseId);

  if (error) return { status: "not_updatable" };

  // ÚNICO punto por el que una respuesta pasa a `complete`, así que es el único
  // sitio donde hace falta mirar si toca alertar. Cubre el envío de la pantalla
  // 2, el enlace de saltar y, cuando exista, la tarea de cierre de parciales.
  //
  // Se programa, no se espera: el trabajo corre tras enviar la respuesta HTTP.
  // La condición (overall_rating <= 2) la comprueba la propia capa de alertas,
  // que es quien conoce la regla; aquí no se duplica.
  scheduleAlert(responseId);

  return { status: "ok" };
}

/**
 * Guarda dimensiones y comentario SIN cerrar la respuesta.
 *
 * La usa `PATCH /api/responses/[id]` con `step="answers"`, que separa guardar de
 * cerrar. El formulario no pasa por aquí: usa `saveAnswersAndComplete()`, que
 * hace las dos cosas en una pasada.
 */
export async function addDimensionAnswers(
  responseId: string,
  answers: DimensionAnswer[],
  comment: string | null,
): Promise<UpdateResult> {
  const response = await loadUpdatable(responseId);
  if (!response) return { status: "not_updatable" };

  if (!(await writeAnswers(responseId, response.questionSetId, answers))) {
    return { status: "not_updatable" };
  }

  const supabase = createAdminClient();
  const trimmed = comment?.trim();

  const { error } = await supabase
    .from("responses")
    .update({ comment: trimmed ? trimmed : null })
    .eq("id", responseId);

  return error ? { status: "not_updatable" } : { status: "ok" };
}

/**
 * Envío de la pantalla 2: guarda dimensiones y comentario Y cierra la respuesta.
 *
 * Existe porque es UNA sola acción de la persona, y hacerla con dos llamadas
 * costaba el doble de viajes a la base: cargaba la respuesta dos veces y la
 * actualizaba dos veces. Ocho idas y vueltas para lo que necesita cuatro, o dos
 * si no hay dimensiones que guardar.
 */
export async function saveAnswersAndComplete(
  responseId: string,
  answers: DimensionAnswer[],
  comment: string | null,
): Promise<UpdateResult> {
  const response = await loadUpdatable(responseId);
  if (!response) return { status: "not_updatable" };

  if (!(await writeAnswers(responseId, response.questionSetId, answers))) {
    return { status: "not_updatable" };
  }

  const trimmed = comment?.trim();
  return finish(responseId, response, trimmed ? trimmed : null);
}

/**
 * Pantalla 3. Marca la respuesta como completa sin tocar el comentario.
 *
 * La usa el enlace de saltar y el `step="complete"` de la API.
 */
export async function completeResponse(responseId: string): Promise<UpdateResult> {
  const response = await loadUpdatable(responseId);
  if (!response) return { status: "not_updatable" };

  return finish(responseId, response, undefined);
}
