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

/**
 * true si el dominio configurado no sirve para imprimir.
 *
 * Responde por el DESTINO, no por las imágenes: dice que lo que generes hoy no
 * vale, no que lo ya generado esté mal. Para eso está `qrStatusFor()`, y son
 * fallos distintos —el dominio puede ser bueno y la imagen vieja, que es
 * justamente el caso que se colaba antes—. El panel avisa si salta cualquiera.
 */
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
 * Render del SVG. Lo usan TANTO la generación como la verificación, y ese es el
 * motivo de que exista: si cada una construyera su SVG por su cuenta, podrían
 * divergir y la verificación empezaría a dar falsos positivos sin que nadie lo
 * notara hasta tener papel impreso de más.
 */
function renderQrSvg(code: string): Promise<string> {
  return QRCode.toString(formUrlFor(code), { type: "svg", ...QR_OPTIONS });
}

/**
 * Estado de la imagen guardada respecto al dominio configurado AHORA.
 *
 * - `ok`            coincide, se puede imprimir
 * - `stale`         codifica otra URL: se generó contra localhost, una IP de
 *                   red local o un dominio anterior
 * - `missing`       el punto no tiene imagen
 * - `unverifiable`  hay ruta pero no se pudo descargar o leer
 */
export type QrStatus = "ok" | "stale" | "missing" | "unverifiable";

/**
 * ¿El SVG guardado codifica la URL que le tocaría hoy?
 *
 * No se decodifica el QR. `QRCode.toString()` es determinista —mismas opciones y
 * misma URL producen el mismo SVG carácter por carácter—, así que basta con
 * volver a generarlo y comparar. Eso no permite saber QUÉ URL codifica un SVG
 * cualquiera, pero sí responder la única pregunta que importa antes de imprimir:
 * si codifica la que debe.
 *
 * Se comprueba el artefacto real y no un campo en la base. Un campo diría lo que
 * creímos haber generado; los bytes dicen lo que hay.
 *
 * ADVERTENCIA: la comparación también falla si cambian `QR_OPTIONS` o si la
 * librería altera su formato de salida. En ese caso TODOS los QR se marcarían
 * como caducados. Es un falso positivo, y es la dirección correcta del error:
 * avisa de más, nunca de menos.
 */
export async function qrMatchesCurrentSite(storedSvg: string, code: string): Promise<boolean> {
  return storedSvg === (await renderQrSvg(code));
}

/** Estado del QR de un punto, descargando su SVG del bucket. */
export async function qrStatusFor(point: {
  code: string;
  qr_asset_url: string | null;
}): Promise<QrStatus> {
  if (!point.qr_asset_url) return "missing";

  const supabase = createAdminClient();
  const { data } = await supabase.storage.from(BUCKET).download(point.qr_asset_url);
  if (!data) return "unverifiable";

  try {
    return (await qrMatchesCurrentSite(await data.text(), point.code)) ? "ok" : "stale";
  } catch {
    // Si no se puede ni leer ni regenerar, no se afirma que esté bien.
    return "unverifiable";
  }
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
    svg = await renderQrSvg(code);
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
