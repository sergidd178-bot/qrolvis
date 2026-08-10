/**
 * Nombre largo de un mes en castellano.
 *
 * Vive aparte porque lo usan la plantilla del PDF y el cuerpo del email, y los
 * dos textos van al mismo cliente el mismo día. Si el asunto dijera "julio" y la
 * portada del adjunto "Julio de 2026" con otro formato, se notaría.
 *
 * Sin dependencias: se puede importar desde cualquier capa.
 */

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-07" -> "julio de 2026" */
export function mesLargo(month: string): string {
  const [anio, mes] = month.split("-");
  const nombre = MESES[Number(mes) - 1];
  if (!nombre || !anio) return month;
  return `${nombre} de ${anio}`;
}
