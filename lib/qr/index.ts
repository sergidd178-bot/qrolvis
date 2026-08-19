import "server-only";

import QRCode from "qrcode";

import { createAdminClient } from "../db/admin";
import {
  FRAME_BLEED,
  QR_STYLE,
  circlePath,
  fixed,
  reversedRoundedSquarePath,
  roundedSquarePath,
  roundedSquarePerimeterPoint,
} from "./style";

const BUCKET = "qr";

/**
 * SVG y no PNG: un QR es geometría pura, así que en vector escala a cualquier
 * tamaño de impresión sin pixelarse y pesa unos pocos KB. Un PNG a resolución
 * de imprenta sería mucho más pesado y quedaría atado a un tamaño concreto.
 *
 * Corrección de errores H y no M (D38): el estilo decorativo baja el contraste
 * efectivo —dorado sobre negro, tinta al 82 % del módulo— y el destino es
 * vinilo dentro de un local, expuesto a roce y suciedad. El precio es pasar de
 * 29×29 a 33×33 módulos, que a 5×5 cm siguen dando 1,042 mm por módulo.
 *
 * Sin `margin` ni `width`: el margen lo pone `QR_STYLE.quietZone` porque aquí
 * la zona de silencio no es blanca sino del color del fondo, y el tamaño lo
 * decide quien lo pinta, no el archivo.
 */
const QR_OPTIONS = { errorCorrectionLevel: "H" } as const;

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
 * Render del SVG decorativo (D38). Lo usan TANTO la generación como la
 * verificación, y ese es el motivo de que exista: si cada una construyera su
 * SVG por su cuenta, podrían divergir y la verificación empezaría a dar falsos
 * positivos sin que nadie lo notara hasta tener papel impreso de más.
 *
 * Se usa `QRCode.create()`, la API de bajo nivel, y no `toString()`: lo único
 * que se quiere de la librería es la matriz de módulos. El dibujo es nuestro.
 *
 * Salida: exactamente cinco `<path>` con `fill`, ninguno con `stroke`, en orden
 * de pintado. `parseQrSvg()` de `lib/pdf/qrSheet.tsx` depende de esa forma, así
 * que no se puede meter aquí un `<rect>` ni un `<circle>` por comodidad —el PDF
 * dejaría de ver esa capa y la página saldría a medias, sin avisar—.
 */
function renderQrSvg(code: string): string {
  const { modules } = QRCode.create(formUrlFor(code), QR_OPTIONS);
  const { size, data } = modules;
  const { quietZone, background, dots, finder, frame } = QR_STYLE;

  // El origen se desplaza para que el viewBox empiece en 0.
  const ringInset = quietZone + frame.gap;
  const offset = ringInset + FRAME_BLEED;
  const side = size + 2 * offset;

  // Las tres esquinas 7×7 se dibujan aparte, así que los módulos las saltan.
  const finders = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ] as const;
  const isFinder = (row: number, col: number) =>
    finders.some(([r, c]) => row >= r && row < r + 7 && col >= c && col < c + 7);

  let modulesPath = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!data[row * size + col] || isFinder(row, col)) continue;
      modulesPath += circlePath(offset + col + 0.5, offset + row + 0.5, dots.diameter / 2);
    }
  }

  // Polaridad invertida (D38): lo que en un QR normal es módulo oscuro aquí es
  // tinta clara. La ESTRUCTURA del patrón se respeta entera —anillo 7×7 de
  // tinta, hueco 5×5 de fondo, ojo 3×3 de tinta—, que es lo que lee el escáner.
  let ringsPath = "";
  let eyesPath = "";
  for (const [row, col] of finders) {
    const x = offset + col;
    const y = offset + row;
    ringsPath += roundedSquarePath(x, y, 7, finder.corner * 7);
    ringsPath += reversedRoundedSquarePath(x + 1, y + 1, 5, finder.corner * 5);
    eyesPath += roundedSquarePath(x + 2, y + 2, 3, finder.corner * 3);
  }

  // El marco va POR FUERA de la zona de silencio, nunca pegado a los módulos:
  // invadirla es la forma habitual de romper un QR decorado.
  const ringSide = size + 2 * ringInset;
  const ringCorner = background.corner * ringSide;
  const perimeter = 4 * (ringSide - 2 * ringCorner) + 2 * Math.PI * ringCorner;
  const count = Math.max(4, Math.round(perimeter / frame.step));

  let framePath = "";
  for (let i = 0; i < count; i++) {
    const [x, y] = roundedSquarePerimeterPoint(
      FRAME_BLEED,
      FRAME_BLEED,
      ringSide,
      ringCorner,
      (i * perimeter) / count,
    );
    framePath += circlePath(x, y, frame.diameter / 2);
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fixed(side)} ${fixed(side)}">` +
    `<path fill="${background.color}" d="${roundedSquarePath(0, 0, side, background.corner * side)}"/>` +
    `<path fill="${dots.color}" d="${modulesPath}"/>` +
    `<path fill="${finder.outer}" d="${ringsPath}"/>` +
    `<path fill="${finder.eye}" d="${eyesPath}"/>` +
    `<path fill="${frame.color}" d="${framePath}"/>` +
    `</svg>`
  );
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
 * No se decodifica el QR. `renderQrSvg()` es determinista —misma URL, mismo
 * estilo y mismas opciones producen el mismo SVG carácter por carácter, con el
 * redondeo fijo de `fixed()` cerrando la única fuente de deriva—, así que basta
 * con volver a generarlo y comparar. Eso no permite saber QUÉ URL codifica un
 * SVG cualquiera, pero sí responder la única pregunta que importa antes de
 * imprimir: si codifica la que debe.
 *
 * Se comprueba el artefacto real y no un campo en la base. Un campo diría lo que
 * creímos haber generado; los bytes dicen lo que hay.
 *
 * ADVERTENCIA: la comparación también falla si cambian `QR_OPTIONS`, si cambia
 * `QR_STYLE` o si la librería altera la matriz. En ese caso TODOS los QR se
 * marcarían como caducados. Es un falso positivo, y es la dirección correcta
 * del error: avisa de más, nunca de menos. Pasó al aplicar D38.
 */
export async function qrMatchesCurrentSite(storedSvg: string, code: string): Promise<boolean> {
  return storedSvg === renderQrSvg(code);
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
    svg = renderQrSvg(code);
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
