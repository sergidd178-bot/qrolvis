import "server-only";

import { createAdminClient } from "./admin";

/**
 * Tipos que el operador puede crear. `general` NO está aquí: se crea solo, con
 * el negocio, y `create_capture_point()` lo rechaza aunque llegue a mano.
 */
export const POINT_TYPES = ["table", "room", "professional", "counter"] as const;
export type PointType = (typeof POINT_TYPES)[number];

export type CapturePointRow = {
  id: string;
  code: string;
  label: string;
  type: string;
  is_active: boolean;
  /** Ruta del objeto en Storage, no una URL: el bucket es privado y las URLs
   *  firmadas caducan. `null` = todavía sin imagen generada. */
  qr_asset_url: string | null;
};

export async function listCapturePoints(businessId: string): Promise<CapturePointRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("capture_points")
    .select("id, code, label, type, is_active, qr_asset_url")
    .eq("business_id", businessId)
    // El General primero: es el que siempre existe y el que más se consulta.
    .order("type", { ascending: true })
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function createCapturePoint(
  businessId: string,
  label: string,
  type: string,
): Promise<{ ok: true; code: string } | { ok: false; message: string }> {
  if (!label.trim()) {
    return { ok: false, message: "La etiqueta es obligatoria: es lo que identifica el punto." };
  }
  if (!POINT_TYPES.includes(type as PointType)) {
    return { ok: false, message: "Elige un tipo de punto válido." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_capture_point", {
    p_business_id: businessId,
    p_label: label.trim(),
    p_type: type,
  });

  const row = data?.[0];
  if (error || !row) {
    return { ok: false, message: error?.message ?? "No se ha podido crear el punto." };
  }
  return { ok: true, code: row.capture_point_code };
}

/**
 * Activa o desactiva un punto. NUNCA se borra.
 *
 * El código ya pudo imprimirse y colocarse en un local, y borrarlo dejaría un
 * QR físico apuntando a la nada sin rastro de qué era. Desactivar es
 * reversible; borrar no.
 *
 * Efecto de desactivar: `capture_point_config` y `resolveCapturePoint` filtran
 * por `is_active`, así que el QR impreso pasa a mostrar "Este código no está
 * disponible" (docs/03, casos límite).
 */
export async function setCapturePointActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("capture_points")
    .update({ is_active: isActive })
    .eq("id", id);
  return error ? { ok: false, message: error.message } : { ok: true };
}

/** Un punto por su id, para regenerar su QR. */
export async function getCapturePoint(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("capture_points")
    .select("id, code, business_id")
    .eq("id", id)
    .maybeSingle();
  return data;
}
