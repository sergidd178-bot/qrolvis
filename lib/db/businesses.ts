import "server-only";

import { createAdminClient } from "./admin";

export type BusinessInput = {
  name: string;
  sectorId: number;
  alertEmail: string;
  defaultLanguage: string;
  googleReviewUrl: string;
};

export type FieldErrors = Partial<Record<keyof BusinessInput, string>>;

/**
 * Formatos de URL de reseña admitidos. Son los dos que verificamos contra
 * Google y que documenta docs/02: ambos abren el cuadro de escribir reseña.
 *
 * La validación es dura a propósito. Una URL de Maps o de búsqueda no da
 * ningún error: lleva a la ficha del negocio, donde la mayoría abandona sin
 * escribir, y la reseña se pierde en silencio. Ese fallo mudo es exactamente lo
 * que este proyecto vende.
 *
 * Contrapartida asumida: si Google cambiara de formato, esto rechazaría un
 * enlace bueno hasta que se actualice el patrón.
 */
const GOOGLE_WRITEREVIEW = /^https:\/\/search\.google\.com\/local\/writereview\?placeid=[A-Za-z0-9_-]+$/;
const GOOGLE_SHORT_REVIEW = /^https:\/\/g\.page\/r\/[A-Za-z0-9_-]+\/review$/;

// Comprobación de forma, no de existencia: que haya algo, una arroba, algo, un
// punto y algo. Verificar que el buzón existe requeriría enviarle un correo.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LANGUAGES = new Set(["es", "ca"]);

export function validateBusiness(input: BusinessInput, sectorIds: number[]): FieldErrors {
  const errors: FieldErrors = {};

  if (!input.name.trim()) {
    errors.name = "El nombre es obligatorio.";
  }

  if (!sectorIds.includes(input.sectorId)) {
    errors.sectorId = "Elige un sector.";
  }

  if (!input.alertEmail.trim()) {
    errors.alertEmail = "El correo de alertas es obligatorio: es donde llegan los avisos.";
  } else if (!EMAIL_SHAPE.test(input.alertEmail.trim())) {
    errors.alertEmail = "Ese correo no tiene una forma válida.";
  }

  if (!LANGUAGES.has(input.defaultLanguage)) {
    errors.defaultLanguage = "Elige un idioma.";
  }

  const url = input.googleReviewUrl.trim();
  if (url && !GOOGLE_WRITEREVIEW.test(url) && !GOOGLE_SHORT_REVIEW.test(url)) {
    errors.googleReviewUrl =
      "Ese enlace no abre el cuadro de reseña. Una URL de Maps o de búsqueda lleva a la ficha del negocio y la reseña se pierde sin dar ningún error. Usa https://search.google.com/local/writereview?placeid=… o el enlace corto de Google Business Profile terminado en /review. Déjalo vacío si aún no lo tienes.";
  }

  return errors;
}

export async function listSectors() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sectors").select("id, name_es").order("id");
  return data ?? [];
}

export type BusinessRow = {
  id: string;
  name: string;
  sector_id: number;
  status: string;
  google_review_url: string | null;
  alert_email: string;
  default_language: string;
  instant_alerts_enabled: boolean;
  monthly_reports_enabled: boolean;
  capturePoints: number;
  activeCapturePoints: number;
};

export async function listBusinesses(): Promise<BusinessRow[]> {
  const supabase = createAdminClient();

  const { data: businesses } = await supabase
    .from("businesses")
    .select(
      "id, name, sector_id, status, google_review_url, alert_email, default_language, instant_alerts_enabled, monthly_reports_enabled",
    )
    .order("created_at", { ascending: false });

  if (!businesses) return [];

  // El recuento se muestra como activos sobre total. Contar solo el total
  // engañaría: un negocio con todos sus puntos desactivados parecería cubierto
  // y en realidad no puede recibir ni una respuesta.
  const { data: points } = await supabase.from("capture_points").select("business_id, is_active");
  const total = new Map<string, number>();
  const active = new Map<string, number>();
  for (const p of points ?? []) {
    total.set(p.business_id, (total.get(p.business_id) ?? 0) + 1);
    if (p.is_active) active.set(p.business_id, (active.get(p.business_id) ?? 0) + 1);
  }

  return businesses.map((b) => ({
    ...b,
    capturePoints: total.get(b.id) ?? 0,
    activeCapturePoints: active.get(b.id) ?? 0,
  }));
}

export async function getBusiness(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("businesses")
    .select(
      "id, name, sector_id, status, google_review_url, alert_email, default_language, question_set_id, instant_alerts_enabled, monthly_reports_enabled",
    )
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Alta. Delega en la función `create_business`, que hace en una sola
 * transacción el negocio y su punto "General", y resuelve el question_set_id
 * activo del sector.
 */
export async function createBusiness(
  input: BusinessInput,
): Promise<{ ok: true; id: string; code: string } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("create_business", {
    p_name: input.name.trim(),
    p_sector_id: input.sectorId,
    p_alert_email: input.alertEmail.trim(),
    p_default_language: input.defaultLanguage,
    p_google_review_url: input.googleReviewUrl.trim() || undefined,
  });

  const row = data?.[0];
  if (error || !row) {
    return { ok: false, message: error?.message ?? "No se ha podido crear el negocio." };
  }

  return { ok: true, id: row.business_id, code: row.capture_point_code };
}

/**
 * Edición.
 *
 * `sector_id` y `question_set_id` NO se pueden tocar (D8): los conjuntos de
 * preguntas son versionados e inmutables, y cambiar el sector de un negocio que
 * ya tiene respuestas rompería la comparación histórica sin avisar. No es que
 * el formulario no los envíe: es que esta función no los escribe nunca, aunque
 * lleguen.
 */
export async function updateBusiness(
  id: string,
  input: Omit<BusinessInput, "sectorId">,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("businesses")
    .update({
      name: input.name.trim(),
      alert_email: input.alertEmail.trim(),
      default_language: input.defaultLanguage,
      google_review_url: input.googleReviewUrl.trim() || null,
    })
    .eq("id", id);

  return error ? { ok: false, message: error.message } : { ok: true };
}

/** Los dos servicios que se contratan aparte (D37). */
export type OptionalService = "instant_alerts_enabled" | "monthly_reports_enabled";

/**
 * Enciende o apaga un servicio opcional.
 *
 * APARTE DE `updateBusiness()` a propósito. Esa función es el formulario de la
 * ficha: nombre, correo, idioma y enlace de Google, que se editan juntos y se
 * guardan con un botón. Esto es un interruptor que se pulsa solo, y mezclarlo
 * obligaría a mandar el formulario entero para marcar una casilla, con el riesgo
 * de sobrescribir con valores viejos lo que hubiera cambiado mientras tanto.
 *
 * El nombre de la columna no llega desde el navegador como texto libre: el tipo
 * `OptionalService` lo acota a las dos que existen.
 */
export async function setOptionalService(
  id: string,
  service: OptionalService,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createAdminClient();

  // El objeto se construye a mano y no con una clave calculada: con
  // `{ [service]: enabled }` TypeScript pierde el tipo de la columna y deja de
  // comprobar que exista. Así, si mañana se renombra una, esto no compila.
  const cambio =
    service === "instant_alerts_enabled"
      ? { instant_alerts_enabled: enabled }
      : { monthly_reports_enabled: enabled };

  const { error } = await supabase.from("businesses").update(cambio).eq("id", id);

  return error ? { ok: false, message: error.message } : { ok: true };
}
