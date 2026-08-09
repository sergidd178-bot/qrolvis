/**
 * Candidato a "Recomendación del mes". docs/05 §3, Bloque 5.
 *
 * El sistema NO escribe la recomendación: propone sobre qué debería ir. La
 * escribe el operador, y ese es el único trabajo manual aceptado en la versión 1.
 *
 * Prioridad, literal del documento:
 *
 *   1. Dimensión con peor media absoluta que supere el n mínimo
 *   2. Si no hay, dimensión con mayor caída respecto al mes anterior
 *   3. Si no hay, volumen de respuestas si ha caído más de un 30 %
 *
 * SIN DEPENDENCIAS, como `compute.ts`: recibe métricas ya calculadas y devuelve
 * una propuesta. Se prueba con objetos en memoria.
 *
 * OJO CON LA REGLA 2, que es inalcanzable con los umbrales actuales. La regla 1
 * dispara en cuanto exista una dimensión con n >= 10; la 2 solo se evalúa si la
 * 1 no encontró ninguna, o sea con TODAS las dimensiones por debajo de 10. Pero
 * la comparativa exige n >= 20 en ambos periodos (§2.7), así que si hay delta
 * disponible es que había al menos 20, y la regla 1 ya habría disparado.
 *
 * Se implementa igual, literal y en orden. No es código muerto por error: si
 * algún día se toca un umbral en R-M1, la rama pasa a ser alcanzable sin que
 * nadie tenga que acordarse de escribirla. Pero conviene saber que hoy no entra.
 */

import type { DeltaDimension, DimensionScore, MetricState } from "../metrics/types";

/** §3, Bloque 5, regla 3: "si ha caído más de un 30 %". */
export const CAIDA_VOLUMEN_MINIMA = 0.3;

export type Candidate =
  | {
      tipo: "dimension_peor";
      code: string;
      label: string;
      media: number;
      nD: number;
      detractoresPct: number;
    }
  | { tipo: "dimension_caida"; code: string; label: string; delta: number }
  | { tipo: "volumen"; actual: number; anterior: number; caidaPct: number }
  | { tipo: "ninguno" };

export function proposeCandidate(input: {
  dimensiones: MetricState<DimensionScore[]>;
  comparativa: MetricState<DeltaDimension[]>;
  volumenActual: number;
  volumenAnterior: number;
}): Candidate {
  // 1. Peor media absoluta entre las dimensiones que superan su n mínimo.
  //    `dimensiones` ya viene ordenada de peor a mejor y solo trae las que
  //    llegan al umbral, así que la primera es la respuesta.
  if (input.dimensiones.status === "OK" && input.dimensiones.value.length > 0) {
    const peor = input.dimensiones.value[0]!;
    return {
      tipo: "dimension_peor",
      code: peor.code,
      label: peor.label,
      media: peor.media,
      nD: peor.nD,
      detractoresPct: peor.detractoresPct,
    };
  }

  // 2. Mayor caída respecto al mes anterior. Solo cuentan las caídas: un delta
  //    positivo es una mejora y no es materia de recomendación.
  if (input.comparativa.status === "OK") {
    const caidas = input.comparativa.value.filter((d) => d.delta < 0);
    if (caidas.length > 0) {
      // Ya viene ordenada por delta ascendente, pero no se da por supuesto.
      const mayor = caidas.reduce((peor, d) => (d.delta < peor.delta ? d : peor), caidas[0]!);
      return { tipo: "dimension_caida", code: mayor.code, label: mayor.label, delta: mayor.delta };
    }
  }

  // 3. Caída de volumen por encima del 30 %.
  //    Si el mes anterior fue 0 no hay caída que medir: no se puede caer desde
  //    la nada, y dividir por cero daría Infinity.
  if (input.volumenAnterior > 0) {
    const caida = (input.volumenAnterior - input.volumenActual) / input.volumenAnterior;
    if (caida > CAIDA_VOLUMEN_MINIMA) {
      return {
        tipo: "volumen",
        actual: input.volumenActual,
        anterior: input.volumenAnterior,
        caidaPct: Math.round(caida * 1000) / 10,
      };
    }
  }

  return { tipo: "ninguno" };
}

/**
 * Texto de arranque que ve el operador. NO es la recomendación: es el andamio
 * sobre el que escribe, y por eso lleva huecos entre corchetes que obligan a
 * intervenir. Un texto que se pudiera enviar tal cual acabaría enviándose tal
 * cual.
 */
export function draftFor(candidate: Candidate): string {
  switch (candidate.tipo) {
    case "dimension_peor":
      return (
        `Este mes lo más flojo ha sido ${candidate.label.toLowerCase()}: ` +
        `${candidate.media} de media sobre ${candidate.nD} respuestas, ` +
        `con un ${candidate.detractoresPct} % de valoraciones de 2 o menos.\n\n` +
        `[Escribe aquí UNA acción concreta para el mes que viene.]`
      );
    case "dimension_caida":
      return (
        `${candidate.label} ha bajado ${Math.abs(candidate.delta)} puntos respecto al mes pasado.\n\n` +
        `[¿Qué ha cambiado en el local este mes? Escribe UNA acción concreta.]`
      );
    case "volumen":
      return (
        `Este mes han respondido ${candidate.actual} personas, frente a ${candidate.anterior} ` +
        `el mes pasado: un ${candidate.caidaPct} % menos.\n\n` +
        `[Esto suele ser un problema de los QR, no del local: comprueba que siguen ` +
        `visibles y en su sitio. Escribe aquí qué vais a revisar.]`
      );
    case "ninguno":
      return `[No hay ningún dato que destaque este mes. Escribe UNA observación útil, o deja constancia de que el mes ha ido bien.]`;
  }
}
