import "server-only";

import { after } from "next/server";

import { createAdminClient } from "../db/admin";
import {
  MAX_ALERT_AGE_HOURS,
  WEEKLY_OPERATOR_THRESHOLD,
  decidirAlerta,
  superaUmbralSemanal,
} from "./decision";
import { dayInZone, startOfDayInZone, weekStartInZone } from "../time";
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

/**
 * El tope diario y el límite de antigüedad viven en `./decision`, puros y sin
 * dependencias, y se reexportan desde aquí para no romper a quien ya los
 * importaba de este módulo.
 */
export * from "./decision";


/**
 * Ventana tras la cual una respuesta parcial ya puede alertarse.
 *
 * Coincide con PARTIAL_WINDOW_MINUTES de lib/db/responses.ts, y coincidir es el
 * punto: hasta que esa ventana no cierra, la persona todavía puede añadir el
 * comentario, y docs/03 dice que la alerta espera precisamente para poder
 * incluirlo.
 */
export const PARTIAL_ALERT_DELAY_MINUTES = 30;

export type AlertOutcome =
  | { status: "not_applicable"; reason?: string }
  /** El negocio no tiene contratadas las notificaciones instantáneas (D37). */
  | { status: "skipped" }
  | { status: "already_handled" }
  | { status: "sent" }
  /** `enviadasHoy` son los correos que YA salieron hoy, los que agotaron el cupo. */
  | { status: "held_for_digest"; enviadasHoy: number }
  | { status: "too_old" }
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
      "id, business_id, overall_rating, comment, submitted_at, completeness, businesses(name, alert_email, instant_alerts_enabled), capture_points(label), answers(rating_value, questions(text_es, position))",
    )
    .eq("id", responseId)
    .maybeSingle();

  if (!response) return { status: "not_applicable" };

  // La condición, tal cual docs/05. Se comprueba aquí y no en quien llama para
  // que no pueda colarse una alerta por un camino que se olvide de mirarla.
  if (response.overall_rating > LOW_RATING_THRESHOLD) return { status: "not_applicable" };

  const ageMs = Date.now() - new Date(response.submitted_at).getTime();

  // Una parcial SÍ alerta, pero solo cuando su ventana de edición ha cerrado:
  // hasta entonces la persona todavía puede escribir el comentario, y docs/03
  // dice que la alerta espera justamente para incluirlo.
  //
  // OJO: esto NO cambia `completeness`. La respuesta sigue siendo `partial`
  // para siempre. `docs/05` §2.10 calcula la tasa de finalización como
  // complete/N, así que cerrarlas aquí daría 100 % constante y destruiría la
  // única métrica que sirve para detectar que el formulario falla.
  if (response.completeness !== "complete") {
    if (ageMs < PARTIAL_ALERT_DELAY_MINUTES * 60_000) return { status: "not_applicable" };
  }

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

  // SIN SERVICIO CONTRATADO NO SE ENVÍA, pero la fila se queda (D37).
  //
  // Se comprueba ANTES que la antigüedad y que el tope diario, porque es una
  // condición de otro orden: los otros dos deciden sobre ESTA alerta, y esto
  // decide si el negocio tiene el servicio siquiera. Mezclarlos haría que una
  // valoración baja de un cliente sin contrato apareciera en el panel como
  // "no aplicable por antigua", que es una explicación falsa.
  //
  // La fila se conserva porque el histórico vale: si el cliente contrata las
  // alertas más adelante, se le puede enseñar exactamente lo que se perdió. Y
  // porque `unique (response_id)` hace que esa fila sea también la marca que
  // impide reevaluar la respuesta en cada pasada del cron.
  if (!business.instant_alerts_enabled) {
    await supabase
      .from("alerts")
      .update({
        status: "skipped",
        error_detail:
          "No enviada: el negocio no tiene contratadas las notificaciones instantáneas.",
      })
      .eq("id", alert.id);
    return { status: "skipped" };
  }

  // Se traen los ESTADOS de las alertas que ese negocio ya tiene hoy, sin la
  // recién creada. El corte de día es el de Madrid, no el de UTC (lib/time.ts).
  //
  // Se piden los estados y no un `count`: el cupo lo consumen solo los correos
  // que de verdad salieron, y para saberlo hay que mirar el estado de cada uno.
  // Contar filas era el fallo. El volumen está acotado por el propio tope, así
  // que traer las filas del día no es caro.
  const dayStart = startOfDayInZone(dayInZone());
  const { data: alertasDelDia } = await supabase
    .from("alerts")
    .select("status")
    .eq("business_id", response.business_id)
    .gte("created_at", dayStart ?? new Date().toISOString())
    .neq("id", alert.id);

  const decision = decidirAlerta({ edadMs: ageMs, alertasDelDia: alertasDelDia ?? [] });

  // Demasiado vieja: se registra la decisión y no se envía. La fila existe, así
  // que la tarea no volverá a evaluar esta respuesta en cada ejecución, y queda
  // constancia de por qué se descartó.
  if (decision.accion === "descartar_vieja") {
    await supabase
      .from("alerts")
      .update({
        status: "not_applicable",
        error_detail: `No enviada: la respuesta tiene ${decision.horas} h, por encima del límite de ${MAX_ALERT_AGE_HOURS} h.`,
      })
      .eq("id", alert.id);
    return { status: "too_old" };
  }

  // Superado el tope, la fila queda en `pending` y NO se envía email individual.
  // El resumen que las agrupa lo manda la tarea programada, que marcará estas
  // filas como `sent`.
  if (decision.accion === "retener") {
    await checkWeeklyOperatorNotice(response.business_id, business.name);
    return { status: "held_for_digest", enviadasHoy: decision.enviadasHoy };
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

  // Se guarda el identificador que devuelve Resend. `sent` solo significa que
  // Resend ACEPTÓ el correo, no que llegara: ya ha pasado en producción que un
  // aviso quedara en `sent` y nunca apareciera en la bandeja. Sin este dato no
  // hay forma de averiguar después qué le pasó a ese envío concreto.
  //
  // Guardarlo no consulta nada por sí solo. Es la materia prima para cuando se
  // consulte el estado real de entrega, que es trabajo aparte.
  await supabase
    .from("alerts")
    .update({ status: "sent", sent_at: new Date().toISOString(), message_id: result.id })
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
  if (!superaUmbralSemanal(total)) return;

  // LA CERRADURA ES EL INSERT, igual que en `alerts`. Una fila por negocio y
  // semana natural, con unique(business_id, week_start): si ya existe, este
  // insert falla y no se manda nada. Así el umbral puede ser `>=` sin que el
  // operador reciba un correo por cada alerta a partir de la decimoquinta, y dos
  // ejecuciones simultáneas del cron tampoco pueden mandar dos. Ver D34.
  const semana = weekStartInZone();
  const { data: aviso, error: yaAvisado } = await supabase
    .from("operator_notices")
    .insert({ business_id: businessId, week_start: semana })
    .select("id")
    .single();

  if (yaAvisado || !aviso) return;

  const result = await sendEmail({
    to: operatorEmail,
    subject: operatorNoticeSubject(businessName),
    text: operatorNoticeBody(businessName, total),
  });

  // Si el envío falla se BORRA la fila que acaba de reservar la semana. Dejarla
  // puesta significaría "esta semana ya está avisada" cuando no ha salido ningún
  // correo, y la siguiente alerta del mismo negocio ya no lo reintentaría: el
  // aviso se habría perdido igual que antes, solo que por otra puerta.
  if (!result.ok) {
    await supabase.from("operator_notices").delete().eq("id", aviso.id);
    console.error(
      `[alertas] no se pudo avisar al operador de que ${businessName} supera ${WEEKLY_OPERATOR_THRESHOLD} alertas semanales:`,
      result.error,
    );
  }
}
