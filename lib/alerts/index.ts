import "server-only";

import { after } from "next/server";

import { createAdminClient } from "../db/admin";
import { dayInZone, startOfDayInZone } from "../time";
import { sendEmail } from "./resend";
import {
  alertBody,
  alertSubject,
  operatorNoticeBody,
  operatorNoticeSubject,
  type AlertDimension,
} from "./template";

/** docs/05, sección 4 "Condición". Umbral global, no configurable por cliente. */
export const LOW_RATING_THRESHOLD = 2;

/** docs/05, "Reglas anti-saturación". */
export const DAILY_INDIVIDUAL_LIMIT = 5;
export const WEEKLY_OPERATOR_THRESHOLD = 15;

export type AlertOutcome =
  | { status: "not_applicable" }
  | { status: "already_handled" }
  | { status: "sent" }
  | { status: "held_for_digest"; todayCount: number }
  | { status: "failed"; error: string };

/**
 * Programa la alerta de una respuesta recién cerrada.
 *
 * Usa `after()`: el trabajo corre DESPUÉS de que la respuesta HTTP se haya
 * enviado, dentro de la misma invocación. La persona que rellenó el formulario
 * ya está viendo la pantalla 3 mientras esto ocurre, así que la llamada a Resend
 * —entre 100 y 300 ms— no entra en el camino crítico. Medido: el envío de la
 * pantalla 2 no se mueve de sus ~430 ms.
 *
 * No es una cola ni un cron: sigue siendo la misma petición, que es lo que pide
 * docs/03 al decir que la alerta sale "tras la pantalla 2".
 *
 * CONTRAPARTIDA, y está asumida: si la función muere entre la respuesta y el
 * envío, se pierde el email y también su registro en `alerts`. La red de
 * seguridad es la barrida de la tarea de cierre, que busca respuestas completas
 * con valoración baja y sin fila en `alerts`. Hasta que esa tarea exista, esta
 * ventana está abierta.
 */
export function scheduleAlert(responseId: string): void {
  try {
    after(async () => {
      try {
        await processAlert(responseId);
      } catch (error) {
        // `after()` corre fuera del ciclo de la petición: si esto lanzara, no lo
        // vería nadie. Se traga y se deja rastro en el log de la función.
        console.error("[alertas] fallo procesando", responseId, error);
      }
    });
  } catch (error) {
    // `after()` exige una petición en curso. Si algún día la tarea programada
    // cierra respuestas parciales llamando a `completeResponse()` desde un
    // script suelto, en vez de desde un Route Handler, esto reventaría sin
    // explicación. Se avisa con claridad: ahí hay que llamar a `processAlert()`
    // y esperarla.
    console.error(
      `[alertas] scheduleAlert() necesita una petición en curso. Fuera de una, llama a processAlert(${responseId}) y espérala.`,
      error,
    );
  }
}

/**
 * Procesa la alerta de una respuesta. Idempotente.
 *
 * Se expone aparte de `scheduleAlert` para que la tarea programada pueda
 * llamarla directamente y esperarla: ahí no hay petición HTTP, así que `after()`
 * no aplica.
 */
export async function processAlert(responseId: string): Promise<AlertOutcome> {
  const supabase = createAdminClient();

  // En UNA sola cadena literal a propósito: los tipos generados de Supabase
  // resuelven los embebidos leyendo el literal, y partirlo con `+` deja a
  // TypeScript viendo un `string` cualquiera y perdiendo todo el tipado.
  const { data: response } = await supabase
    .from("responses")
    .select(
      "id, business_id, overall_rating, comment, submitted_at, completeness, businesses(name, alert_email), capture_points(label), answers(rating_value, questions(text_es, position))",
    )
    .eq("id", responseId)
    .maybeSingle();

  if (!response) return { status: "not_applicable" };

  // La condición, tal cual docs/05. Se comprueba aquí y no en quien llama para
  // que no pueda colarse una alerta por un camino que se olvide de mirarla.
  if (response.overall_rating > LOW_RATING_THRESHOLD) return { status: "not_applicable" };
  if (response.completeness !== "complete") return { status: "not_applicable" };

  const business = response.businesses;
  if (!business?.alert_email) return { status: "not_applicable" };

  // `alerts` tiene unique(response_id): el insert es la cerradura. Si otra
  // invocación ya lo hizo, este falla y se sale sin enviar nada. Comprobar antes
  // con un select dejaría una carrera entre la comprobación y el insert.
  const { data: alert, error: insertError } = await supabase
    .from("alerts")
    .insert({ response_id: responseId, business_id: response.business_id })
    .select("id")
    .single();

  if (insertError || !alert) return { status: "already_handled" };

  // Anti-saturación: cuántas van hoy para este negocio, sin contar la recién
  // creada. El corte de día es el de Madrid, no el de UTC (lib/time.ts).
  const dayStart = startOfDayInZone(dayInZone());
  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", response.business_id)
    .gte("created_at", dayStart ?? new Date().toISOString())
    .neq("id", alert.id);

  const previousToday = count ?? 0;

  // Superado el tope, la fila queda en `pending` y NO se envía email individual.
  // El resumen que las agrupa lo manda la tarea programada, que marcará estas
  // filas como `sent`. Mientras esa tarea no exista, quedan visibles en
  // `pending`, que es lo correcto: no se han enviado.
  if (previousToday >= DAILY_INDIVIDUAL_LIMIT) {
    await checkWeeklyOperatorNotice(response.business_id, business.name);
    return { status: "held_for_digest", todayCount: previousToday + 1 };
  }

  const dimensions: AlertDimension[] = (response.answers ?? [])
    .filter((a) => a.rating_value !== null && a.questions)
    .sort((a, b) => (a.questions?.position ?? 0) - (b.questions?.position ?? 0))
    .map((a) => ({ label: a.questions!.text_es, rating: a.rating_value! }));

  const result = await sendEmail({
    to: business.alert_email,
    subject: alertSubject(business.name),
    text: alertBody({
      businessName: business.name,
      overallRating: response.overall_rating,
      pointLabel: response.capture_points?.label ?? "—",
      submittedAt: response.submitted_at,
      comment: response.comment,
      dimensions,
    }),
  });

  if (!result.ok) {
    // docs/05: "Un fallo de envío no puede pasar desapercibido". Queda en
    // `failed` con el motivo, para que el panel pueda enseñarlo.
    await supabase
      .from("alerts")
      .update({ status: "failed", error_detail: result.error })
      .eq("id", alert.id);
    return { status: "failed", error: result.error };
  }

  await supabase
    .from("alerts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", alert.id);

  await checkWeeklyOperatorNotice(response.business_id, business.name);

  return { status: "sent" };
}

/**
 * docs/05: si un negocio supera 15 alertas en una semana, se avisa al operador.
 *
 * Se comprueba en cada alerta y solo se avisa AL CRUZAR el umbral, no en todas
 * las siguientes: si no, un negocio con problemas graves llenaría de correo
 * también al operador, que es justo lo que las reglas anti-saturación intentan
 * evitar.
 */
async function checkWeeklyOperatorNotice(businessId: string, businessName: string): Promise<void> {
  const operatorEmail = process.env.OPERATOR_ALERT_EMAIL?.trim();
  if (!operatorEmail) return;

  const supabase = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

  const { count } = await supabase
    .from("alerts")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .gte("created_at", weekAgo);

  const total = count ?? 0;
  if (total !== WEEKLY_OPERATOR_THRESHOLD + 1) return;

  const result = await sendEmail({
    to: operatorEmail,
    subject: operatorNoticeSubject(businessName),
    text: operatorNoticeBody(businessName, total),
  });

  // Este aviso no tiene fila en `alerts` —la tabla es de alertas a negocios, y
  // no se le va a inventar una columna—, así que si falla no queda rastro en
  // ningún sitio. Al log, que es lo único disponible sin tocar el esquema.
  // Vale la pena saberlo: es el aviso que dice que un local va mal de verdad.
  if (!result.ok) {
    console.error(
      `[alertas] no se pudo avisar al operador de que ${businessName} supera ${WEEKLY_OPERATOR_THRESHOLD} alertas semanales:`,
      result.error,
    );
  }
}
