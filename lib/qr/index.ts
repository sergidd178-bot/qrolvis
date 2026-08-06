import "server-only";

import QRCode from "qrcode";

import { createAdminClient } from "../db/admin";

const BUCKET = "qr";

/**
 * SVG y no PNG: un QR es geometría pura, así que en vector escala a cualquier
 * tamaño de impresión sin pixelarse y pesa unos pocos KB. Un PNG a resolución
 * de imprenta sería mucho más pesado y quedaría atado a un tamaño concreto.
 *
 * Corrección de errores M: el estándar para impresión. Aguanta suciedad y roces
 * en una mesa de bar sin densificar tanto el código como para dificultar el
 * escaneo a distancia.
 */
const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
  width: 512,
} as const;

/**
 * URL que codifica el QR.
 *
 * Falla si no hay dominio configurado. Generar imágenes contra un dominio
 * equivocado no da ningún error visible: produce papel muerto, QR impresos que
 * no abren nada. Mejor no generar que generar mal.
 */
export function siteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!url) {
    throw new Error(
      "Falta NEXT_PUBLIC_SITE_URL. Sin dominio, los QR generados apuntarían a ninguna parte.",
    );
  }
  return url.replace(/\/+$/, "");
}

/** true si el dominio configurado no sirve para imprimir. */
export function isProvisionalDomain(): boolean {
  try {
    const { protocol, hostname } = new URL(siteUrl());
    return (
      protocol !== "https:" ||
      hostname === "localhost" ||
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
      hostname.endsWith(".vercel.app")
    );
  } catch {
    return true;
  }
}

export function formUrlFor(code: string): string {
  return `${siteUrl()}/f/${code}`;
}

export function qrObjectPath(capturePointId: string): string {
  // El id y no el código: el id no aparece en ningún sitio público.
  return `qr/${capturePointId}.svg`;
}

/**
 * Genera el SVG, lo sube al bucket y guarda la ruta en `capture_points`.
 *
 * Se llama DESPUÉS del alta, nunca dentro de ella: `create_capture_point()` es
 * SQL y no puede invocar una librería de npm, y meter una subida a Storage
 * dentro de la transacción la ataría a un servicio externo.
 *
 * Si esto falla, el punto se queda como está. La imagen es dato DERIVADO: se
 * reconstruye siempre desde el código, que es el artefacto duradero y no cambia
 * nunca (D1). Un punto sin imagen no está corrupto, está sin renderizar, y el
 * botón de generar lo resuelve.
 */
export async function generateQr(
  capturePointId: string,
  code: string,
): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  let svg: string;
  let path: string;

  try {
    svg = await QRCode.toString(formUrlFor(code), { type: "svg", ...QR_OPTIONS });
    path = qrObjectPath(capturePointId);
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "No se pudo generar el QR." };
  }

  const supabase = createAdminClient();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, svg, { contentType: "image/svg+xml", upsert: true });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error: updateError } = await supabase
    .from("capture_points")
    .update({ qr_asset_url: path })
    .eq("id", capturePointId);

  if (updateError) {
    return { ok: false, message: updateError.message };
  }

  return { ok: true, path };
}

/**
 * URL firmada para mostrar la miniatura en el panel. El bucket es privado, así
 * que no se guarda una URL en la columna —caducaría— sino la ruta del objeto, y
 * la URL se firma en cada visita.
 */
export async function signedQrUrl(path: string, seconds = 300): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  return data?.signedUrl ?? null;
}
