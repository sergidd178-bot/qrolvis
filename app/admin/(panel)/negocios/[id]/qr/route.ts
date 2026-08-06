// PDF imprimible con los QR de un negocio.
//
// Vive dentro del grupo (panel), pero un route handler NO pasa por el layout,
// así que la comprobación de sesión se hace aquí de forma explícita. Es la
// excepción a "toda ruta del grupo queda protegida por omisión", y por eso está
// dicho en voz alta.

import { getBusiness } from "@/lib/db/businesses";
import { listCapturePoints } from "@/lib/db/capturePoints";
import { getOperator } from "@/lib/db/session";
import { buildQrSheet } from "@/lib/pdf/qrSheet";

// @react-pdf/renderer necesita el runtime de Node, no el de edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const operator = await getOperator();
  if (!operator) {
    return new Response(null, { status: 302, headers: { Location: "/admin/login" } });
  }

  const { id } = await context.params;
  const business = await getBusiness(id);
  if (!business) {
    return new Response("Negocio no encontrado", { status: 404 });
  }

  const points = await listCapturePoints(id);
  const sheet = await buildQrSheet(business.name, points);

  if (!sheet.ok) {
    return new Response(sheet.message, {
      status: 409,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const slug = business.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new Response(new Uint8Array(sheet.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="qr-${slug}.pdf"`,
      // Los QR cambian al añadir puntos o regenerar imágenes: nunca se cachea.
      "Cache-Control": "no-store",
      "X-Qrolvis-Pages": String(sheet.pages),
      "X-Qrolvis-Skipped": String(sheet.skipped.length),
    },
  });
}
