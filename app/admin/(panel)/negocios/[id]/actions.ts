"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { setOptionalService, type OptionalService } from "@/lib/db/businesses";
import {
  createCapturePoint,
  getCapturePoint,
  listCapturePoints,
  setCapturePointActive,
} from "@/lib/db/capturePoints";
import { requireOperator } from "@/lib/db/session";
import { generateQr } from "@/lib/qr";

export async function addCapturePointAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const label = String(formData.get("label") ?? "");
  const type = String(formData.get("type") ?? "");

  const result = await createCapturePoint(businessId, label, type);

  revalidatePath(`/admin/negocios/${businessId}`);

  if (!result.ok) {
    redirect(`/admin/negocios/${businessId}?errorPunto=${encodeURIComponent(result.message)}`);
  }

  // La imagen se genera DESPUÉS del alta y su fallo NO revierte el punto: es
  // dato derivado, reconstruible desde el código. Si falla, el punto queda con
  // qr_asset_url null y el botón de la lista lo resuelve.
  const puntos = await listCapturePoints(businessId);
  const nuevo = puntos.find((p) => p.code === result.code);
  let qrFallido = false;
  if (nuevo) {
    const qr = await generateQr(nuevo.id, nuevo.code);
    qrFallido = !qr.ok;
  }

  revalidatePath(`/admin/negocios/${businessId}`);

  // El código viaja en la URL para enseñárselo al operador: es lo que acabará
  // impreso en el QR y no cambia nunca.
  redirect(
    `/admin/negocios/${businessId}?puntoCreado=${encodeURIComponent(label.trim())}&codigo=${result.code}${qrFallido ? "&qrFallido=1" : ""}`,
  );
}

/**
 * Genera o regenera el QR de un punto.
 *
 * Un solo botón para tres casos que son el mismo: puntos creados antes de que
 * existiera esta función, puntos cuya generación falló, y regeneración cuando
 * cambie el dominio. Al llegar el dominio definitivo basta con cambiar
 * NEXT_PUBLIC_SITE_URL y pulsarlo: el código (D1) no cambia, solo la URL que
 * codifica la imagen.
 */
export async function generateQrAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const capturePointId = String(formData.get("capturePointId") ?? "");

  const point = await getCapturePoint(capturePointId);
  if (!point) {
    redirect(`/admin/negocios/${businessId}?errorPunto=${encodeURIComponent("Punto no encontrado.")}`);
  }

  const result = await generateQr(point.id, point.code);

  revalidatePath(`/admin/negocios/${businessId}`);

  if (!result.ok) {
    redirect(`/admin/negocios/${businessId}?errorPunto=${encodeURIComponent(result.message)}`);
  }

  redirect(`/admin/negocios/${businessId}?qr=generado`);
}

export async function toggleCapturePointAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const id = String(formData.get("capturePointId") ?? "");
  const activate = formData.get("activate") === "1";

  const result = await setCapturePointActive(id, activate);

  revalidatePath(`/admin/negocios/${businessId}`);

  if (!result.ok) {
    redirect(`/admin/negocios/${businessId}?errorPunto=${encodeURIComponent(result.message)}`);
  }

  redirect(`/admin/negocios/${businessId}?punto=${activate ? "reactivado" : "desactivado"}`);
}

/**
 * Enciende o apaga uno de los dos servicios opcionales (D37).
 *
 * El nombre del servicio llega por el formulario, así que se comprueba contra la
 * lista cerrada antes de tocar nada: sin eso, el campo sería el nombre de una
 * columna elegido por quien mande la petición.
 */
const SERVICIOS: OptionalService[] = ["instant_alerts_enabled", "monthly_reports_enabled"];

export async function toggleOptionalServiceAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const service = String(formData.get("service") ?? "") as OptionalService;
  const enable = formData.get("enable") === "1";

  if (!SERVICIOS.includes(service)) {
    redirect(`/admin/negocios/${businessId}?errorServicio=1`);
  }

  const result = await setOptionalService(businessId, service, enable);

  revalidatePath(`/admin/negocios/${businessId}`);

  if (!result.ok) {
    redirect(`/admin/negocios/${businessId}?errorPunto=${encodeURIComponent(result.message)}`);
  }

  redirect(`/admin/negocios/${businessId}?servicio=${enable ? "activado" : "desactivado"}`);
}
