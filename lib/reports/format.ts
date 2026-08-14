/**
 * Formato de los números del informe.
 *
 * El informe lo lee un cliente en castellano, y en castellano el separador
 * decimal es la coma. `4.3` no es un decimal mal escrito: es un número escrito
 * en otro idioma, y en un documento que el dueño de un local va a enseñar a su
 * gestor se lee como una chapuza. En catalán la coma es igual de correcta, así
 * que esto no depende del idioma del negocio.
 *
 * SIEMPRE UN DECIMAL, también cuando es cero: `4,0` y no `4`. docs/05 lo pide
 * literalmente para las medias («un decimal») y aquí se extiende a los
 * porcentajes por una razón de lectura: en una columna de tabla, mezclar `55,9`
 * con `0` desalinea las cifras y obliga a mirar dos veces para compararlas, que
 * es justo lo que una tabla existe para evitar.
 *
 * SIN DEPENDENCIAS, como `compute.ts` y `candidate.ts`: recibe números y
 * devuelve texto. No usa `Intl` a propósito, para que el resultado no dependa de
 * los datos de idioma que traiga el runtime de turno.
 *
 * NO SE USA PARA LOS CONTEOS. Un número de respuestas es 34, nunca «34,0».
 */

/** Un número con un decimal y coma: 4 -> "4,0", 3.45 -> "3,5". */
export function decimal(x: number): string {
  return x.toFixed(1).replace(".", ",");
}

/** Un porcentaje con su símbolo: 7.4 -> "7,4 %". */
export function porcentaje(x: number): string {
  return `${decimal(x)} %`;
}

/**
 * Una variación con signo explícito: 0.1 -> "+0,1", -0.6 -> "-0,6".
 *
 * El `+` va a propósito: sin él, un `0,1` en una columna de variaciones se lee
 * como un valor absoluto y no como «ha subido una décima».
 */
export function conSigno(x: number): string {
  return `${x > 0 ? "+" : ""}${decimal(x)}`;
}
