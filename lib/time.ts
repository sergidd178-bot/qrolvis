/**
 * Zona horaria del proyecto y cortes de día, en un solo sitio.
 *
 * Vive aparte porque lo usan capas que no deben depender entre sí: el listado
 * del panel, y ahora las alertas, que necesitan el mismo corte de día para
 * contar cuántas lleva un negocio hoy. Si cada una tuviera su propio cálculo,
 * el panel y las alertas podrían discrepar sobre qué día es una respuesta de
 * las 00:30, y nadie se enteraría hasta que los números no cuadraran.
 *
 * La zona la fija R-M4 de docs/05.
 *
 * No es un detalle cosmético. `submitted_at` es `timestamptz`, o sea UTC. Si el
 * corte fuera la medianoche UTC, en verano estaría cortando a las 02:00 de
 * Madrid: las respuestas de un bar entre las 00:00 y las 02:00 del día 1
 * caerían en el día anterior. En hostelería esa franja es cierre de cocina y
 * copas, no un residuo.
 */
export const TIME_ZONE = "Europe/Madrid";

/** Desfase de la zona respecto a UTC en un instante dado, en milisegundos. */
function zoneOffset(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

/**
 * Instante UTC en que empieza un día natural de Madrid.
 *
 * Se corrige dos veces porque el desfase se evalúa en un instante estimado, y en
 * los días de cambio de hora ese instante puede caer al otro lado de la
 * transición.
 */
export function startOfDayInZone(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, y, m, d] = match;
  let utc = Date.UTC(Number(y), Number(m) - 1, Number(d));
  utc -= zoneOffset(utc);
  utc = Date.UTC(Number(y), Number(m) - 1, Number(d)) - zoneOffset(utc);
  return new Date(utc).toISOString();
}

/** Inicio del día siguiente: el filtro "hasta" incluye el día completo. */
export function endOfDayInZone(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return startOfDayInZone(next.toISOString().slice(0, 10));
}

/** Fecha del día natural de Madrid en el que cae un instante, como YYYY-MM-DD. */
export function dayInZone(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Fecha y hora en la zona del proyecto. */
export function formatInZone(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
