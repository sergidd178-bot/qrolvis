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
  | { readonly status: "OMITIDA"; readonly n: number; readonly required: number };

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
 * Umbrales de muestra mínima. Copiados de la tabla de R-M1, docs/05 §1.
 *
 * No se tocan sin cambiar el documento primero. Están juntos y con nombre para
 * que un cambio se vea en el diff y no quede escondido dentro de un `if`.
 */
export const MIN_N = {
  distribucion: 10,
  detractores: 10,
  /** R-M1: 10, igual que detractores. */
  promotores: 10,
  /** §2.5 y R-M2: "solo con n >= 10". */
  media: 10,
  /** R-M1: 10 por dimensión. */
  dimension: 10,
  /** §2.7: en AMBOS periodos. */
  comparativa: 20,
  /** R-M1: 15 por punto. */
  punto: 15,
  /** §2.8.1: 10 por punto Y dimensión. La misma muestra mínima de 2.6, sobre una
   *  rejilla más fina. No es una excepción a R-M1 (D33). */
  dimensionPunto: 10,
  /**
   * §2.8.1: 10 en AMBOS periodos para el delta por punto.
   *
   * Vale lo mismo que `dimensionPunto` y aun así es una constante aparte, porque
   * son dos condiciones distintas que hoy coinciden en el número: "se publica la
   * media" y "se puede afirmar una tendencia". El documento lo dice con esas
   * palabras. Si algún día una de las dos se mueve, se mueve sola.
   */
  comparativaPunto: 10,
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

/**
 * Una dimensión dentro de un punto de captación. §2.8.1.
 *
 * `media` y `delta` son `number | null`, y aquí el `null` SÍ es correcto aunque
 * `MetricState` exista para evitarlo: no es una métrica que se publique suelta,
 * es una celda de una tabla que el informe pinta entera. Envolver cada celda en
 * su propio estado obligaría a la plantilla a hacer un `switch` por casilla para
 * acabar escribiendo el mismo guion en todas las ramas.
 *
 * Lo que no puede pasar es confundir el guion con un cero, y eso lo impide el
 * tipo: `null` no es asignable a `number`, así que un `?? 0` distraído no cuela.
 * `nD` va SIEMPRE, también cuando `media` es null: es lo que distingue "aún no
 * hay muestra" de "esto está roto".
 */
export type DimensionPunto = {
  code: string;
  label: string;
  /** Respuestas `complete` de ese punto con valor en esa dimensión. */
  nD: number;
  /** null = por debajo de MIN_N.dimensionPunto. El informe pinta "—". */
  media: number | null;
  /** null = no se puede comparar con el mes anterior. El informe pinta "—". */
  delta: number | null;
};

export type PuntoDimensiones = {
  capturePointId: string;
  label: string;
  /** Peor a mejor por media; las que no llegan a muestra, al final. */
  dimensiones: DimensionPunto[];
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
  /**
   * R-M1: sin umbral y sin envoltorio de estado. Un `MetricState` obligaría a
   * cada pantalla a escribir una rama de "sin dato" que nunca se cumple, y esa
   * rama acabó pintando un guion donde debía poner 0.
   */
  volumen: number;
  distribucion: MetricState<Distribucion>;
  detractoresPct: MetricState<number>;
  promotoresPct: MetricState<number>;
  media: MetricState<number>;
  dimensiones: MetricState<DimensionScore[]>;
  puntos: MetricState<PuntoScore[]>;
  comentarios: MetricState<ComentarioRow[]>;
  finalizacionPct: MetricState<number>;
};
