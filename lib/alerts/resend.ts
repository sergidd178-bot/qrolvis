import "server-only";

import { Resend } from "resend";

/**
 * Cliente de Resend. Único punto del proyecto que toca la API de email.
 *
 * La clave se lee dentro de la función, no en el ámbito del módulo, por el mismo
 * motivo que en `lib/db/admin.ts`: que la falta de la variable falle en el envío
 * concreto que la necesita y no al arrancar el servidor entero. Una alerta que
 * no sale es un problema; un servidor que no arranca son todas.
 *
 * REMITENTE: exige tener `qrolvis.com` verificado en Resend con sus registros
 * SPF y DKIM. Sin verificar, Resend solo acepta `onboarding@resend.dev`, que
 * únicamente entrega a la dirección del titular de la cuenta: serviría para
 * probar, pero no avisaría a ningún negocio y el fallo sería silencioso.
 */

const DEFAULT_FROM = "Qrolvis <alertas@qrolvis.com>";

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

export type Attachment = { filename: string; content: Buffer };

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  /**
   * Remitente. Si no se indica se usa el de las alertas.
   *
   * Existe porque un informe mensual enviado desde `alertas@` chirría: son dos
   * conversaciones distintas con el cliente, una urgente y otra periódica, y
   * conviene que se distingan en su bandeja.
   */
  from?: string;
  /**
   * Adjuntos. Se usa para el PDF del informe.
   *
   * Adjunto y no enlace firmado: un informe se lee cuando el dueño tiene un
   * rato, que pueden ser tres días, y cualquier caducidad que le pusiéramos
   * sería una apuesta sobre cuándo abre el correo. Un enlace sin caducidad sería
   * una URL pública a un documento con comentarios íntegros (docs/06).
   */
  attachments?: Attachment[];
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Falta RESEND_API_KEY" };
  }

  const from = input.from?.trim() || process.env.ALERT_FROM_EMAIL?.trim() || DEFAULT_FROM;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      // Solo texto. Ver el comentario de `template.ts`.
      text: input.text,
      ...(input.attachments?.length
        ? { attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content })) }
        : {}),
    });

    if (error) {
      return { ok: false, error: `${error.name}: ${error.message}` };
    }
    return { ok: true, id: data?.id ?? null };
  } catch (error) {
    // Un fallo de red no puede tumbar la petición: quien rellenó el formulario
    // ya ha visto su pantalla 3. Se devuelve y queda registrado en `alerts`.
    return { ok: false, error: error instanceof Error ? error.message : "Error desconocido" };
  }
}
