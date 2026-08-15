"use server";

// Transiciones entre pantallas. Cada una es el `action` de un <form> nativo, así
// que el flujo avanza con una navegación normal del navegador: sin JavaScript,
// sin fetch, sin estado en cliente.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  completeResponse,
  createResponse,
  DEVICE_WINDOW_HOURS,
  saveAnswersAndComplete,
  type DimensionAnswer,
} from "@/lib/db/responses";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "@/lib/i18n";

const DEVICE_COOKIE = "qrolvis_device";

/**
 * Token de dispositivo para la ventana antifraude de 6 horas.
 *
 * docs/01 lo describe en localStorage, pero sin JavaScript en cliente no hay
 * localStorage. Se usa una cookie con el mismo contenido: un UUID aleatorio, sin
 * relación con ningún dato de la persona. No es una cookie de seguimiento en el
 * sentido de R3: no se comparte, no sale de este dominio, no identifica a nadie
 * y caduca con la propia ventana de 6 horas.
 */
async function readOrCreateDeviceToken(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_COOKIE)?.value;
  if (existing) return existing;

  const fresh = crypto.randomUUID();
  store.set(DEVICE_COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: DEVICE_WINDOW_HOURS * 3600,
    path: "/f",
  });
  return fresh;
}

function keepLanguage(params: URLSearchParams, language: Language) {
  if (language !== DEFAULT_LANGUAGE) params.set("lang", language);
}

/** Pantalla 1: crea la respuesta y avanza a la pantalla 2. */
export async function startResponse(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const rawLanguage = formData.get("language");
  const language: Language = isLanguage(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;
  const overallRating = Number(formData.get("rating"));

  const deviceToken = await readOrCreateDeviceToken();
  const result = await createResponse({ code, overallRating, language, deviceToken });

  const params = new URLSearchParams();
  keepLanguage(params, language);

  if (result.status === "already_answered") {
    params.set("blocked", "1");
    redirect(`/f/${encodeURIComponent(code)}?${params}`);
  }

  if (result.status === "unavailable") {
    redirect(`/f/${encodeURIComponent(code)}?${params}`);
  }

  params.set("s", "2");
  params.set("r", result.responseId);
  redirect(`/f/${encodeURIComponent(code)}?${params}`);
}

/** Pantalla 2: guarda dimensiones y comentario, marca completa y avanza. */
export async function submitDimensions(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const responseId = String(formData.get("responseId") ?? "");
  const rawLanguage = formData.get("language");
  const language: Language = isLanguage(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;

  // Cada pregunta llega como q_<uuid>. Las que la persona no ha tocado no
  // aparecen en el FormData: todas son opcionales (docs/03, pantalla 2).
  const answers: DimensionAnswer[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("q_")) continue;
    const ratingValue = Number(value);
    if (Number.isInteger(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
      answers.push({ questionId: key.slice(2), ratingValue });
    }
  }

  // Una sola llamada, no dos: guardar y cerrar es una única acción de la
  // persona, y separarlas duplicaba las idas y vueltas a la base.
  const comment = formData.get("comment");
  await saveAnswersAndComplete(responseId, code, answers, typeof comment === "string" ? comment : null);

  const params = new URLSearchParams();
  keepLanguage(params, language);
  params.set("s", "3");
  params.set("r", responseId);
  redirect(`/f/${encodeURIComponent(code)}?${params}`);
}

/** Enlace de saltar: va directo al final sin guardar dimensiones. */
export async function skipDimensions(formData: FormData) {
  const code = String(formData.get("code") ?? "");
  const responseId = String(formData.get("responseId") ?? "");
  const rawLanguage = formData.get("language");
  const language: Language = isLanguage(rawLanguage) ? rawLanguage : DEFAULT_LANGUAGE;

  await completeResponse(responseId, code);

  const params = new URLSearchParams();
  keepLanguage(params, language);
  params.set("s", "3");
  params.set("r", responseId);
  redirect(`/f/${encodeURIComponent(code)}?${params}`);
}
