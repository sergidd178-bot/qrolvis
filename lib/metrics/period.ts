/**
 * Periodo mensual del informe. R-M4, docs/05 §1.
 *
 * "Del día 1 al último día del mes natural, en zona horaria Europe/Madrid, según
 * responses.submitted_at."
 *
 * NO DUPLICA LA CONVERSIÓN HORARIA. Usa `startOfDayInZone` de `lib/time.ts`, que
 * es exactamente lo que usa `applyFilters` del panel. Panel e informe cortan el
 * mes con el mismo código: si un día divergieran, el operador vería en pantalla
 * un número distinto del que el cliente recibe por correo, y nadie se enteraría
 * hasta que el cliente lo preguntara.
 */

import { startOfDayInZone } from "../time";

export type Period = {
  /** Mes natural, formato YYYY-MM. */
  month: string;
  /** Instante UTC del primer momento del mes en Madrid. Límite INCLUSIVO. */
  startUtc: string;
  /** Instante UTC del primer momento del mes siguiente. Límite EXCLUSIVO. */
  endUtc: string;
};

function parseMonth(month: string): { year: number; month: number } {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) throw new Error(`Mes con formato inválido: ${month}. Se espera YYYY-MM.`);
  const year = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new Error(`Mes fuera de rango: ${month}.`);
  return { year, month: mes };
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/**
 * Periodo de un mes natural.
 *
 * El límite superior es EXCLUSIVO y apunta al primer instante del mes siguiente.
 * Así una respuesta de las 23:59:59 del último día entra sin tener que jugar con
 * milisegundos, y una de las 00:30 del día 1 cae en el mes nuevo. Los dos son
 * casos exigidos por docs/05 §5.
 */
export function monthPeriod(month: string): Period {
  const { year, month: mes } = parseMonth(month);

  const startUtc = startOfDayInZone(`${year}-${dosDigitos(mes)}-01`);
  const siguienteAnio = mes === 12 ? year + 1 : year;
  const siguienteMes = mes === 12 ? 1 : mes + 1;
  const endUtc = startOfDayInZone(`${siguienteAnio}-${dosDigitos(siguienteMes)}-01`);

  if (!startUtc || !endUtc) throw new Error(`No se pudo calcular el periodo de ${month}.`);

  return { month, startUtc, endUtc };
}

/** Mes natural anterior, para la comparativa de §2.7. */
export function previousMonth(month: string): string {
  const { year, month: mes } = parseMonth(month);
  const anterior = mes === 1 ? 12 : mes - 1;
  const anio = mes === 1 ? year - 1 : year;
  return `${anio}-${dosDigitos(anterior)}`;
}

/**
 * ¿Cae este instante dentro del periodo?
 *
 * Existe para que los tests puedan comprobar los límites sin pasar por la base
 * de datos. La consulta real usa `gte`/`lt` con los mismos dos valores, así que
 * ambos caminos aplican el mismo criterio.
 */
export function isInPeriod(submittedAt: string, period: Period): boolean {
  const t = new Date(submittedAt).getTime();
  return t >= new Date(period.startUtc).getTime() && t < new Date(period.endUtc).getTime();
}
