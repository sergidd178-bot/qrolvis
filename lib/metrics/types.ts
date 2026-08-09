/**
 * Tipos de la capa de métricas.
 *
 * ESTE MÓDULO NO IMPORTA NADA. Ni Supabase, ni `server-only`, ni el reloj. Es la
 * condición que hace que `compute.ts` se pueda probar con arrays en memoria, sin
 * base de datos y sin dobles de prueba, que es lo que exige docs/05 §5.
 */

/**
 * Resultado de una métrica. Tres estados, no dos, porque R-M1 distingue dos
 * formas distintas de no tener muestra en su columna "Si no se alcanza":
 *
 *   INSUFICIENTE  el informe muestra un texto explicativo en su lugar
 *   OMITIDA       el informe no pinta nada, la sección desaparece
 *
 * LA RAMA SIN DATOS NO LLEVA NINGÚN CAMPO NUMÉRICO QUE PUEDA CONFUNDIRSE CON EL
 * VALOR. No existe `.value` que leer sin haber comprobado antes `status`:
 * TypeScript obliga a estrechar el tipo. Y al no ser `number | null`, tampoco
 * cuela un `?? 0` distraído, que es justo el error que convertiría "no sabemos"
 * en "cero" dentro de un informe que el cliente va a creerse.
 */
export type MetricState<T> =
  | { readonly status: "OK"; readonly value: T }
  | { readonly status: "INSUFICIENTE"; readonly n: number; readonly required: number }
  | { readonly status: "OMITIDA"; readonly n: number; readonly required: number }
  | { readonly status: "SIN_DEFINIR"; readonly motivo: string };

export function ok<T>(value: T): MetricState<T> {
  return { status: "OK", value };
}

export function insufficient<T>(n: number, required: number): MetricState<T> {
  return { status: "INSUFICIENTE", n, required };
}

export function omitted<T>(n: number, required: number): MetricState<T> {
  return { status: "OMITIDA", n, required };
}

/**
 * Cuarto estado, y no es de R-M1: marca una métrica que docs/05 define pero cuyo
 * umbral de muestra mínima no fija.
 *
 * Existe porque la alternativa era peor. Poner un umbral inventado sería violar
 * R1, y meter un número falso —un 0, un NaN— en la estructura sería exactamente
 * el error que toda esta capa existe para impedir. Un estado propio dice la
 * verdad: "esto no se puede publicar todavía y aquí está el motivo".
 *
 * Debería desaparecer en cuanto el documento se complete.
 */
export function undefinedThreshold<T>(motivo: string): MetricState<T> {
  return { status: "SIN_DEFINIR", motivo };
}

/**
 * Umbrales de muestra mínima. Copiados de la tabla de R-M1, docs/05 §1.
 *
 * No se tocan sin cambiar el documento primero. Están juntos y con nombre para
 * que un cambio se vea en el diff y no quede escondido dentro de un `if`.
 */
export const MIN_N = {
  /** R-M1: siempre se muestra. */
  volumen: 1,
  distribucion: 10,
  detractores: 10,
  /** §2.5 y R-M2: "solo con n >= 10". */
  media: 10,
  /** R-M1: 10 por dimensión. */
  dimension: 10,
  /** §2.7: en AMBOS periodos. */
  comparativa: 20,
  /** R-M1: 15 por punto. */
  punto: 15,
  /** R-M1: siempre se muestran. */
  comentarios: 1,
} as const;

/** §2.7: por debajo de esto es ruido y no se destaca. */
export const DELTA_SIGNIFICATIVO = 0.3;

export type Completeness = "partial" | "complete";

/** Una respuesta del periodo, ya aplanada. */
export type ResponseRow = {
  id: string;
  /** 1..5 */
  overallRating: number;
  completeness: Completeness;
  comment: string | null;
  /** ISO 8601. */
  submittedAt: string;
  capturePointId: string;
  capturePointLabel: string;
};

/**
 * Una valoración por dimensión.
 *
 * `code` es el agrupador y `label` lo que se enseña. NO se agrupa por el id de
 * la pregunta: al versionar un conjunto (R6) nacen preguntas nuevas con el mismo
 * `code`, y agrupar por id partiría la dimensión en dos a mitad de mes. docs/05
 * §5 lo exige explícitamente.
 */
export type DimensionAnswerRow = {
  responseId: string;
  code: string;
  label: string;
  /** Versión del conjunto, para elegir la etiqueta cuando el periodo cruza dos. */
  version: number;
  /** 1..5 */
  value: number;
};

export type Distribucion = {
  /** Conteo absoluto por valor 1..5. */
  n: Record<1 | 2 | 3 | 4 | 5, number>;
  /** Porcentaje por valor 1..5. */
  pct: Record<1 | 2 | 3 | 4 | 5, number>;
};

export type DimensionScore = {
  code: string;
  label: string;
  nD: number;
  media: number;
  detractoresPct: number;
};

export type PuntoScore = {
  capturePointId: string;
  label: string;
  n: number;
  media: number;
};

export type ComentarioRow = {
  submittedAt: string;
  overallRating: number;
  capturePointLabel: string;
  texto: string;
};

export type DeltaDimension = {
  code: string;
  label: string;
  delta: number;
  /** §2.7: |delta| >= 0,3. Por debajo es ruido. */
  significativo: boolean;
};

export type PeriodMetrics = {
  /** N según R-M3 para la valoración global: TODAS las respuestas. */
  n: number;
  volumen: MetricState<number>;
  distribucion: MetricState<Distribucion>;
  detractoresPct: MetricState<number>;
  promotoresPct: MetricState<number>;
  media: MetricState<number>;
  dimensiones: MetricState<DimensionScore[]>;
  puntos: MetricState<PuntoScore[]>;
  comentarios: MetricState<ComentarioRow[]>;
  finalizacionPct: MetricState<number>;
};
