import "server-only";

import { sendEmail } from "../alerts/resend";
import { createAdminClient } from "../db/admin";
import { mesLargo } from "./month";

/**
 * Envío del informe mensual al cliente.
 *
 * FUNCIÓN ÚNICA. La usan el botón del panel y, cuando exista, la tarea
 * programada. La lógica de envío no se duplica: si un día cambia el asunto o el
 * remitente, cambia en un sitio y los dos caminos lo heredan.
 *
 * ADJUNTO, no enlace firmado. Un informe se lee cuando el dueño tiene un rato,
 * que pueden ser tres días, y cualquier caducidad sería una apuesta sobre cuándo
 * abre el correo: si pierde, ve un error en vez de su informe. Un enlace sin
 * caducidad sería peor: una URL pública a un documento con comentarios íntegros,
 * que según docs/06 pueden llevar datos personales. Y un adjunto se archiva: el
 * cliente lo vuelve a abrir en enero.
 *
 * Cabe de sobra: los PDF pesan unos 6 KB frente al límite de 40 MB de Resend.
 */

const DEFAULT_FROM = "Qrolvis <informes@qrolvis.com>";

export type SendReportResult =
  | { ok: true; messageId: string | null; to: string }
  | { ok: false; message: string };

/**
 * Asunto y cuerpo.
 *
 * NO ESTÁ EN docs/05. Ese documento define al detalle la plantilla de la alerta,
 * pero del informe solo dice que se envía por email. Este texto se acordó
 * aparte; si algún día se toca, que se toque aquí y no repartido.
 *
 * Sin ninguna cifra de RESULTADO en el cuerpo: ni media ni detractores. Si el
 * asunto dijera "26 % de detractores", el dueño podría reaccionar sin abrir el
 * PDF, y la mitad del valor del informe está en el contexto que lo acompaña. El
 * único número es el volumen, que es neutro.
 */
export function reportSubject(businessName: string, month: string): string {
  return `Tu informe de ${mesLargo(month)} · ${businessName}`;
}

export function reportBody(input: {
  businessName: string;
  month: string;
  volumen: number;
  operador: string;
}): string {
  return `Hola,

Te adjunto el informe de ${mesLargo(input.month)} de ${input.businessName}, con lo que
han dicho tus clientes este mes.

Son ${input.volumen} respuestas. Dentro tienes la distribución completa de
valoraciones, el detalle por aspecto, los comentarios íntegros y una
recomendación concreta para el mes que viene.

Si algo no cuadra o quieres comentarlo, responde a este email.

—
${input.operador}
Qrolvis
`;
}

/** Nombre del archivo adjunto, legible en la bandeja del cliente. */
function nombreAdjunto(businessName: string, month: string): string {
  const limpio = businessName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `informe-${month}-${limpio}.pdf`;
}

/**
 * Envía el informe ya generado.
 *
 * Se manda el PDF GUARDADO, no uno recién renderizado. El de Storage es el
 * artefacto de registro: si se regenerase al vuelo, el cliente podría recibir
 * algo distinto de lo que consta como enviado, y la diferencia no la vería
 * nadie.
 */
export async function sendReport(
  businessId: string,
  month: string,
): Promise<SendReportResult> {
  const supabase = createAdminClient();

  const { data: informe } = await supabase
    .from("reports")
    .select("id, status, pdf_url, metrics, businesses(name, alert_email, monthly_reports_enabled)")
    .eq("business_id", businessId)
    .eq("period_start", `${month}-01`)
    .maybeSingle();

  if (!informe) {
    return { ok: false, message: "No hay informe generado para ese negocio y mes." };
  }
  if (!informe.pdf_url) {
    return { ok: false, message: "El informe no tiene PDF guardado. Genéralo antes de enviarlo." };
  }

  const negocio = informe.businesses;
  if (!negocio?.alert_email) {
    return { ok: false, message: "El negocio no tiene dirección de correo configurada." };
  }

  // GENERAR SÍ, ENVIAR NO (D37). El operador puede componer el informe de un
  // negocio sin el servicio contratado para verlo por dentro —es su herramienta—
  // pero el correo es el entregable que se factura, y sale solo para quien lo ha
  // contratado. La comprobación vive aquí, en la única función de envío, y no en
  // el botón del panel: así la cubre también la tarea programada del día que
  // exista.
  if (!negocio.monthly_reports_enabled) {
    return {
      ok: false,
      message:
        "Este negocio no tiene contratado el informe mensual, así que no se le puede enviar. Actívalo en su ficha si lo ha contratado.",
    };
  }

  const { data: archivo, error: descargaError } = await supabase.storage
    .from("reports")
    .download(informe.pdf_url);

  if (descargaError || !archivo) {
    return {
      ok: false,
      message: `No se pudo leer el PDF guardado: ${descargaError?.message ?? "no existe"}.`,
    };
  }

  const pdf = Buffer.from(await archivo.arrayBuffer());

  // El volumen sale de la foto del cálculo guardada con el informe, no de un
  // recuento nuevo: el correo debe decir lo mismo que el PDF que adjunta.
  const metrics = informe.metrics as { n?: number } | null;
  const volumen = typeof metrics?.n === "number" ? metrics.n : 0;

  const operador = process.env.OPERATOR_NAME?.trim() || "el equipo de Qrolvis";

  const resultado = await sendEmail({
    to: negocio.alert_email,
    from: process.env.REPORT_FROM_EMAIL?.trim() || DEFAULT_FROM,
    subject: reportSubject(negocio.name, month),
    text: reportBody({ businessName: negocio.name, month, volumen, operador }),
    attachments: [{ filename: nombreAdjunto(negocio.name, month), content: pdf }],
  });

  if (!resultado.ok) {
    // Se deja constancia del fallo en la propia fila: un informe que no llegó no
    // puede parecer enviado.
    await supabase.from("reports").update({ status: "failed" }).eq("id", informe.id);
    return { ok: false, message: resultado.error };
  }

  await supabase
    .from("reports")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      // Mismo criterio que en las alertas: `sent` significa que Resend aceptó,
      // no que el cliente lo recibiera. Sin este identificador no hay forma de
      // averiguar después qué pasó con este envío concreto.
      message_id: resultado.id,
    })
    .eq("id", informe.id);

  return { ok: true, messageId: resultado.id, to: negocio.alert_email };
}
