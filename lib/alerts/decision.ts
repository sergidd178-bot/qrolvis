/**
 * Decisión de qué hacer con una alerta: enviarla, retenerla para el resumen o
 * descartarla por antigua.
 *
 * SIN DEPENDENCIAS, como `lib/metrics/compute.ts`. Recibe la edad de la
 * respuesta y las alertas que ese negocio ya tiene hoy, y devuelve la decisión.
 * Vive aparte porque la lógica de dentro de `processAlert()` no se podía probar
 * sin base de datos ni sin Resend, y ahí se escondió un fallo real.
 */

/** docs/05, "Reglas anti-saturación". */
export const DAILY_INDIVIDUAL_LIMIT = 5;

/**
 * Antigüedad máxima para enviar. Pasado el plazo la alerta se registra pero no
 * se envía: avisar de una valoración de hace tres días no es un aviso, es ruido.
 */
export const MAX_ALERT_AGE_HOURS = 48;

export type EstadoAlerta = "pending" | "sent" | "failed" | "not_applicable";

export type DecisionAlerta =
  | { accion: "descartar_vieja"; horas: number }
  | { accion: "enviar" }
  | { accion: "retener"; enviadasHoy: number };

/**
 * Cuántos CORREOS ha recibido hoy este negocio.
 *
 * SOLO cuenta `sent`, y esa es la corrección de un fallo real detectado en la
 * simulación de extremo a extremo:
 *
 *   - `not_applicable` es una decisión de NO enviar. No hubo correo.
 *   - `failed` es un intento que no llegó. Tampoco hubo correo.
 *   - `pending` está retenida esperando al resumen. Todavía no hubo correo.
 *
 * Antes se contaban todas, así que once respuestas antiguas descartadas por el
 * límite de 48 h consumieron el cupo de cinco y dejaron ocho alertas recientes y
 * legítimas retenidas en silencio. Peor todavía en el caso de `failed`: si los
 * cinco primeros envíos de un día fallaban —Resend caído, dominio mal
 * configurado—, el negocio se quedaba sin ninguna alerta y todo lo siguiente se
 * retenía sin que nadie lo notara.
 *
 * docs/05 dice "máximo 5 alertas por negocio y día". Una alerta es un correo que
 * llega, no una fila en una tabla.
 */
export function enviadasHoy(alertasDelDia: readonly { status: string }[]): number {
  return alertasDelDia.filter((a) => a.status === "sent").length;
}

/**
 * ¿Toca avisar al operador de que este negocio se ha pasado de la raya?
 *
 * `>=` y no `===`. La comparación era `total !== UMBRAL + 1`, o sea, exigía que
 * el recuento valiese EXACTAMENTE 16: si dos alertas se creaban casi a la vez y
 * el conteo saltaba de 15 a 17, el aviso no salía, y como la condición solo se
 * cumple en ese punto exacto, tampoco salía después. Se perdía para siempre justo
 * el correo que dice que un local va mal de verdad.
 *
 * Que no se repita cada alerta posterior ya no depende de esta comparación, sino
 * de `operator_notices` y su índice único por negocio y semana (D34).
 */
export function superaUmbralSemanal(alertasEnSieteDias: number): boolean {
  return alertasEnSieteDias >= WEEKLY_OPERATOR_THRESHOLD;
}

/** docs/05, "Reglas anti-saturación": 15 alertas en 7 días. */
export const WEEKLY_OPERATOR_THRESHOLD = 15;

export function decidirAlerta(input: {
  /** Edad de la RESPUESTA, no de la alerta. */
  edadMs: number;
  /** Alertas de ese negocio creadas hoy, SIN incluir la que se está decidiendo. */
  alertasDelDia: readonly { status: string }[];
}): DecisionAlerta {
  if (input.edadMs > MAX_ALERT_AGE_HOURS * 3600_000) {
    return { accion: "descartar_vieja", horas: Math.floor(input.edadMs / 3600_000) };
  }

  const enviadas = enviadasHoy(input.alertasDelDia);
  if (enviadas >= DAILY_INDIVIDUAL_LIMIT) {
    return { accion: "retener", enviadasHoy: enviadas };
  }

  return { accion: "enviar" };
}
