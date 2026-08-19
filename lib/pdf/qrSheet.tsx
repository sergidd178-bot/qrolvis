import "server-only";

import {
  Document,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { createAdminClient } from "../db/admin";
import type { CapturePointRow } from "../db/capturePoints";
import { isProvisionalDomain, qrMatchesCurrentSite } from "../qr";

/**
 * Un `path` del SVG del QR. El generador produce exactamente dos: el fondo
 * blanco (con `fill`) y el código entero como un único trazo (con `stroke`).
 */
type QrPath = { d: string; fill?: string; stroke?: string };

type QrArt = { viewBox: string; paths: QrPath[] };

/**
 * Extrae la geometría del SVG guardado para pasarla al PDF como vector.
 *
 * No se usa un parser de XML: el SVG lo genera nuestra propia librería con una
 * forma fija y conocida, así que un parser completo sería una dependencia más
 * para leer dos etiquetas. Si algún día el SVG viniera de otra fuente, esto
 * habría que rehacerlo.
 *
 * El viewBox se lee del archivo y no se fija: su tamaño depende de cuántos
 * módulos necesite el QR, que a su vez depende de la longitud de la URL.
 */
export function parseQrSvg(svg: string): QrArt | null {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  if (!viewBox) return null;

  const paths: QrPath[] = [];
  for (const tag of svg.match(/<path[^>]*>/g) ?? []) {
    const d = tag.match(/\sd="([^"]+)"/)?.[1];
    if (!d) continue;
    paths.push({
      d,
      fill: tag.match(/fill="([^"]+)"/)?.[1],
      stroke: tag.match(/stroke="([^"]+)"/)?.[1],
    });
  }

  return paths.length > 0 ? { viewBox, paths } : null;
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 48,
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Helvetica",
  },
  // 142 pt = 50 mm exactos: el tamaño de la etiqueta de vinilo (D38). No es
  // decorativo, es la medida física a la que se imprime y se corta.
  // Sin marginBottom: ya no hay nada debajo, y la página centra el QR sola.
  qrBox: { width: 142, height: 142 },
  warning: {
    position: "absolute",
    top: 28,
    left: 48,
    right: 48,
    padding: 8,
    borderWidth: 1,
    borderColor: "#92400e",
    color: "#92400e",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
});

function QrPage({
  art,
  provisional,
  stale,
}: {
  art: QrArt;
  provisional: boolean;
  stale: boolean;
}) {
  return (
    <Page size="A4" style={styles.page}>
      {/* La marca viaja CON el archivo. El aviso del panel no: alguien puede
          descargar este PDF hoy e imprimirlo semanas después.

          La de imagen caducada es POR PÁGINA, no del documento entero: en un
          negocio pueden convivir puntos regenerados y puntos viejos, y marcar
          todo el PDF haría que se ignorase el aviso en las páginas correctas. */}
      {stale ? (
        <Text style={styles.warning}>QR CADUCADO · NO LLEVA AL FORMULARIO · NO IMPRIMIR</Text>
      ) : (
        provisional && <Text style={styles.warning}>QR DE PRUEBA · NO IMPRIMIR</Text>
      )}

      {/* La página es el producto: solo el QR a 50 mm, para imprimir y cortar
          sin retoques. Cualquier texto aquí es algo que habría que recortar
          después, y el operador ya sabe de qué negocio es el PDF que descargó. */}
      <View style={styles.qrBox}>
        <Svg viewBox={art.viewBox} width="100%" height="100%">
          {art.paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              fill={p.fill ?? "none"}
              stroke={p.stroke ?? "none"}
              strokeWidth={p.stroke ? 1 : 0}
            />
          ))}
        </Svg>
      </View>
    </Page>
  );
}

export type SheetResult =
  | { ok: true; pdf: Buffer; pages: number; skipped: string[] }
  | { ok: false; message: string };

/**
 * PDF con un QR por página para todos los puntos ACTIVOS de un negocio.
 *
 * Los bytes del SVG se descargan con la clave secreta. No intervienen URLs
 * firmadas: existen para que un navegador pida un objeto privado, y aquí el
 * documento se compone entero en el servidor. Además, N URLs firmadas podrían
 * caducar a mitad del montaje si el negocio tuviera muchos puntos.
 */
export async function buildQrSheet(
  businessName: string,
  points: CapturePointRow[],
): Promise<SheetResult> {
  // Solo activos: un punto desactivado lleva a "código no disponible", así que
  // imprimirlo sería fabricar cartelería muerta.
  const printable = points.filter((p) => p.is_active);
  const supabase = createAdminClient();
  const provisional = isProvisionalDomain();

  const pages: { point: CapturePointRow; art: QrArt; stale: boolean }[] = [];
  const skipped: string[] = [];

  for (const point of printable) {
    if (!point.qr_asset_url) {
      skipped.push(point.label);
      continue;
    }
    const { data } = await supabase.storage.from("qr").download(point.qr_asset_url);
    if (!data) {
      skipped.push(point.label);
      continue;
    }

    const svg = await data.text();
    const art = parseQrSvg(svg);
    if (!art) {
      skipped.push(point.label);
      continue;
    }

    // Los bytes ya están aquí, así que verificar a dónde apunta la imagen no
    // cuesta ni una descarga más. La página se genera igual: se marca, no se
    // esconde, para que quien la abra vea cuál falla y pueda regenerarla.
    pages.push({ point, art, stale: !(await qrMatchesCurrentSite(svg, point.code)) });
  }

  if (pages.length === 0) {
    return {
      ok: false,
      message:
        "Ningún punto activo tiene su QR generado. Genéralos desde la ficha antes de descargar el PDF.",
    };
  }

  const pdf = await renderToBuffer(
    <Document title={`QR · ${businessName}`}>
      {pages.map(({ point, art, stale }) => (
        <QrPage
          key={point.id}
          art={art}
          provisional={provisional}
          stale={stale}
        />
      ))}
    </Document>,
  );

  return { ok: true, pdf, pages: pages.length, skipped };
}
