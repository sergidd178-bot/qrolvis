/**
 * Cálculo de todas las métricas de docs/05 §2.
 *
 * SIN DEPENDENCIAS. No importa Supabase, ni el reloj, ni `server-only`. Recibe
 * arrays y devuelve números. Esa es la razón de que los diez casos de docs/05 §5
 * se puedan probar sin base de datos y sin dobles de prueba.
 *
 * Cada función lleva encima la fórmula literal del documento. Si alguna vez
 * discrepan, manda el documento: es "la única fuente de verdad numérica".
 */

import {
  DELTA_SIGNIFICATIVO,
  insufficient,
  MIN_N,
  ok,
  omitted,
  type ComentarioRow,
  type DeltaDimension,
  type DimensionAnswerRow,
  type DimensionPunto,
  type DimensionScore,
  type Distribucion,
  type MetricState,
  type PeriodMetrics,
  type PuntoDimensiones,
  type PuntoScore,
  type ResponseRow,
} from "./types";

const VALORES = [1, 2, 3, 4, 5] as const;

/** Redondeo a un decimal. §2.5 y §2.7 piden un decimal. */
function unDecimal(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Porcentaje con un decimal. El documento no fija precisión para los %. */
function pct(parte: number, total: number): number {
  return unDecimal((parte / total) * 100);
}

/** Conteo por valor. Base de casi todo lo demás. */
function contar(responses: ResponseRow[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const n = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const r of responses) {
    if (r.overallRating >= 1 && r.overallRating <= 5) {
      n[r.overallRating as 1 | 2 | 3 | 4 | 5]++;
    }
  }
  return n;
}

/**
 * §2.1 · volumen = N.
 *
 * R-M1: siempre se muestra, sin umbral y sin excepción para el cero. "0
 * respuestas" es un dato correcto y accionable —el QR no se está usando—,
 * mientras que un guion parecería un fallo del informe.
 */
export function volumen(responses: ResponseRow[]): number {
  return responses.length;
}

/**
 * §2.2 · distribucion[x] = n(x); porcentaje[x] = n(x) / N * 100
 *
 * R-M3: entran TODAS las respuestas, parciales incluidas.
 */
export function distribucion(responses: ResponseRow[]): MetricState<Distribucion> {
  const N = responses.length;
  if (N < MIN_N.distribucion) return insufficient(N, MIN_N.distribucion);

  const n = contar(responses);
  const p = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  for (const x of VALORES) p[x] = pct(n[x], N);

  return ok({ n, pct: p });
}

/** §2.3 · detractores_pct = (n(1) + n(2)) / N * 100 */
export function detractoresPct(responses: ResponseRow[]): MetricState<number> {
  const N = responses.length;
  if (N < MIN_N.detractores) return insufficient(N, MIN_N.detractores);

  const n = contar(responses);
  return ok(pct(n[1] + n[2], N));
}

/**
 * §2.4 · promotores_pct = n(5) / N * 100
 *
 * n >= 10, igual que detractores. La tabla de R-M1 no lo incluía y por eso esta
 * función estuvo devolviendo SIN_DEFINIR: el umbral no se podía deducir (R1).
 * Ya está en el documento, así que aquí se aplica.
 *
 * Solo cuenta el 5. Un 4 es un cliente satisfecho, no un prescriptor.
 */
export function promotoresPct(responses: ResponseRow[]): MetricState<number> {
  const N = responses.length;
  if (N < MIN_N.promotores) return insufficient(N, MIN_N.promotores);

  return ok(pct(contar(responses)[5], N));
}

/**
 * §2.5 · media = ( Σ(x · n(x)) ) / N
 *
 * Un decimal, dato secundario, n >= 10 (R-M2).
 */
export function media(responses: ResponseRow[]): MetricState<number> {
  const N = responses.length;
  if (N < MIN_N.media) return insufficient(N, MIN_N.media);

  const n = contar(responses);
  let suma = 0;
  for (const x of VALORES) suma += x * n[x];
  return ok(unDecimal(suma / N));
}

/**
 * §2.6 · Por dimensión, sobre las respuestas `complete` que contestaron.
 *
 *   N_d      = número de respuestas con valor en la dimensión d
 *   media_d  = Σ(valor) / N_d
 *   detrac_d = (n_d(1) + n_d(2)) / N_d * 100
 *
 * R-M3: SOLO respuestas `complete`. Se filtra aquí y no fuera para que ningún
 * llamante pueda saltárselo.
 *
 * Se agrupa por `code` y no por id de pregunta: al versionar un conjunto nacen
 * preguntas nuevas con el mismo `code`, y agrupar por id partiría la dimensión
 * en dos a mitad de mes (docs/05 §5).
 *
 * Orden: de peor a mejor por `media_d`, "lo que hay que arreglar va arriba".
 */
export function dimensiones(
  responses: ResponseRow[],
  answers: DimensionAnswerRow[],
): MetricState<DimensionScore[]> {
  const completas = new Set(
    responses.filter((r) => r.completeness === "complete").map((r) => r.id),
  );

  const porCodigo = new Map<string, DimensionAnswerRow[]>();
  for (const a of answers) {
    if (!completas.has(a.responseId)) continue;
    if (!(a.value >= 1 && a.value <= 5)) continue;
    const lista = porCodigo.get(a.code) ?? [];
    lista.push(a);
    porCodigo.set(a.code, lista);
  }

  if (porCodigo.size === 0) return insufficient(0, MIN_N.dimension);

  const scores: DimensionScore[] = [];
  for (const [code, lista] of porCodigo) {
    const nD = lista.length;
    // Cada dimensión tiene su propio umbral: una por debajo de 10 no invalida
    // las demás (docs/05 §5, "el resto se calcula").
    if (nD < MIN_N.dimension) continue;

    const suma = lista.reduce((acc, a) => acc + a.value, 0);
    const bajas = lista.filter((a) => a.value <= 2).length;

    // La etiqueta, de la versión más alta presente: si el conjunto se versionó a
    // mitad de mes y se reescribió el texto, manda el más reciente.
    const label = lista.reduce((mejor, a) => (a.version > mejor.version ? a : mejor), lista[0]!).label;

    scores.push({
      code,
      label,
      nD,
      media: unDecimal(suma / nD),
      detractoresPct: pct(bajas, nD),
    });
  }

  if (scores.length === 0) {
    const mayor = Math.max(...[...porCodigo.values()].map((l) => l.length));
    return insufficient(mayor, MIN_N.dimension);
  }

  scores.sort((a, b) => a.media - b.media || a.code.localeCompare(b.code));
  return ok(scores);
}

/**
 * §2.8 · Desglose por punto de captación.
 *
 * Solo para negocios con más de un punto activo, y solo puntos con N >= 15.
 * R-M1 dice "se omite ese punto", así que los que no llegan desaparecen en vez
 * de mostrarse como insuficientes.
 *
 * Usa TODAS las respuestas: se calcula sobre `overall_rating`, y R-M3 dice que
 * la valoración global las usa todas.
 */
export function puntos(responses: ResponseRow[]): MetricState<PuntoScore[]> {
  const seleccion = puntosIncluidos(responses);
  if (!seleccion.ok) return omitted(seleccion.n, seleccion.required);

  const scores: PuntoScore[] = seleccion.incluidos.map((p) => {
    const suma = p.rows.reduce((acc, r) => acc + r.overallRating, 0);
    return {
      capturePointId: p.id,
      label: p.label,
      n: p.rows.length,
      media: unDecimal(suma / p.rows.length),
    };
  });

  scores.sort(ordenDePuntos);
  return ok(scores);
}

/**
 * Qué puntos entran en el desglose de §2.8: los de un negocio con más de un
 * punto, y solo los que llegan a `MIN_N.punto`.
 *
 * Está aparte porque lo necesitan DOS métricas —la tabla de medias de 2.8 y el
 * desglose por dimensión de 2.8.1— y las dos tienen que incluir exactamente los
 * mismos puntos. Si cada una lo decidiera por su cuenta, el informe podría
 * enseñar una tabla de dimensiones de un profesional que no aparece en la tabla
 * de arriba, y nadie sabría cuál de las dos miente.
 *
 * Devuelve el motivo ya medido cuando no aplica, para que quien llame construya
 * su `OMITIDA` sin repetir el recuento.
 */
type PuntosIncluidos =
  | { ok: true; incluidos: { id: string; label: string; rows: ResponseRow[] }[] }
  | { ok: false; n: number; required: number };

function puntosIncluidos(responses: ResponseRow[]): PuntosIncluidos {
  const porPunto = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const lista = porPunto.get(r.capturePointId) ?? [];
    lista.push(r);
    porPunto.set(r.capturePointId, lista);
  }

  // "Solo para negocios con más de un punto activo".
  if (porPunto.size < 2) return { ok: false, n: porPunto.size, required: 2 };

  const incluidos = [...porPunto.entries()]
    .filter(([, lista]) => lista.length >= MIN_N.punto)
    .map(([id, rows]) => ({ id, label: rows[0]!.capturePointLabel, rows }));

  if (incluidos.length === 0) {
    const mayor = Math.max(...[...porPunto.values()].map((l) => l.length));
    return { ok: false, n: mayor, required: MIN_N.punto };
  }

  return { ok: true, incluidos };
}

/** Orden de los puntos: peor media primero, empates por etiqueta. */
function ordenDePuntos(a: { media: number; label: string }, b: { media: number; label: string }) {
  return a.media - b.media || a.label.localeCompare(b.label);
}

/**
 * Valores de dimensión agrupados por punto y por `code`, solo de respuestas
 * `complete` (R-M3, igual que 2.6).
 */
function valoresPorPuntoYCodigo(
  responses: ResponseRow[],
  answers: DimensionAnswerRow[],
): Map<string, Map<string, number[]>> {
  const puntoDe = new Map<string, string>();
  for (const r of responses) {
    if (r.completeness === "complete") puntoDe.set(r.id, r.capturePointId);
  }

  const porPunto = new Map<string, Map<string, number[]>>();
  for (const a of answers) {
    const punto = puntoDe.get(a.responseId);
    if (!punto) continue;
    if (!(a.value >= 1 && a.value <= 5)) continue;

    const porCodigo = porPunto.get(punto) ?? new Map<string, number[]>();
    const valores = porCodigo.get(a.code) ?? [];
    valores.push(a.value);
    porCodigo.set(a.code, valores);
    porPunto.set(punto, porCodigo);
  }
  return porPunto;
}

const mediaDe = (valores: number[]) => valores.reduce((s, v) => s + v, 0) / valores.length;

/**
 * §2.8.1 · Media de cada dimensión DENTRO de cada punto de captación.
 *
 *   N_d_p     = respuestas complete del punto p con valor en la dimensión d
 *   media_d_p = Σ(valor) / N_d_p     si N_d_p >= 10, y "—" (null) si no
 *   delta_d_p = media_d_p(actual) − media_d_p(anterior)
 *               solo si N_d_p >= 10 en AMBOS periodos
 *
 * FUNCIÓN APARTE DE `dimensiones()` A PROPÓSITO (D33). Calculan cosas parecidas
 * con umbrales que hoy coinciden, y precisamente por eso convenía separarlas: si
 * mañana uno de los dos se mueve, aquí no hay que desenredar nada. Tampoco
 * comparten el delta con `comparativa()`, que exige 20 y mira el negocio entero.
 *
 * NO ES UNA EXCEPCIÓN A R-M1. Es la misma muestra mínima de 2.6 aplicada al
 * cruce punto × dimensión. Por debajo de 10 se devuelve `media: null` y el
 * informe pinta un guion, nunca un número.
 *
 * El universo de dimensiones sale de los `code` vistos en el periodo actual, no
 * de una lista fija: así una dimensión que ese punto no contestó ninguna vez
 * aparece igualmente con `nD: 0` y su guion, en vez de desaparecer de su tabla y
 * dar a entender que el conjunto de preguntas de ese punto es otro.
 */
export function dimensionesPorPunto(
  actualResponses: ResponseRow[],
  actualAnswers: DimensionAnswerRow[],
  anteriorResponses: ResponseRow[],
  anteriorAnswers: DimensionAnswerRow[],
): MetricState<PuntoDimensiones[]> {
  const seleccion = puntosIncluidos(actualResponses);
  if (!seleccion.ok) return omitted(seleccion.n, seleccion.required);

  // La etiqueta de cada dimensión, de la versión más alta presente, por el mismo
  // motivo que en 2.6: si el conjunto se versionó a mitad de mes, manda el texto
  // más reciente.
  const etiquetas = new Map<string, string>();
  const versiones = new Map<string, number>();
  for (const a of actualAnswers) {
    if ((versiones.get(a.code) ?? -1) < a.version) {
      versiones.set(a.code, a.version);
      etiquetas.set(a.code, a.label);
    }
  }

  const ahora = valoresPorPuntoYCodigo(actualResponses, actualAnswers);
  const antes = valoresPorPuntoYCodigo(anteriorResponses, anteriorAnswers);

  const salida = seleccion.incluidos.map((punto) => {
    const suyas = ahora.get(punto.id) ?? new Map<string, number[]>();
    const previas = antes.get(punto.id) ?? new Map<string, number[]>();

    const filas: DimensionPunto[] = [...etiquetas].map(([code, label]) => {
      const valores = suyas.get(code) ?? [];
      const anteriores = previas.get(code) ?? [];

      const media = valores.length >= MIN_N.dimensionPunto ? unDecimal(mediaDe(valores)) : null;

      // Condición SEPARADA de la de arriba, aunque hoy sea el mismo número: son
      // dos afirmaciones distintas y docs/05 §2.8.1 pide que puedan moverse por
      // separado. Se comprueban los dos periodos, nunca solo el actual.
      const hayComparativa =
        valores.length >= MIN_N.comparativaPunto && anteriores.length >= MIN_N.comparativaPunto;

      return {
        code,
        label,
        nD: valores.length,
        media,
        delta: hayComparativa ? unDecimal(mediaDe(valores) - mediaDe(anteriores)) : null,
      };
    });

    // Peor a mejor por la media de ESTE punto. Las que no llegan a muestra van
    // todas al final: si se ordenaran como si valieran 0 encabezarían la tabla y
    // parecerían el problema del mes, que es exactamente lo contrario de lo que
    // significan.
    filas.sort((a, b) => {
      if (a.media === null && b.media === null) return a.code.localeCompare(b.code);
      if (a.media === null) return 1;
      if (b.media === null) return -1;
      return a.media - b.media || a.code.localeCompare(b.code);
    });

    return {
      capturePointId: punto.id,
      label: punto.label,
      dimensiones: filas,
      // Solo para ordenar los puntos entre sí; no sale del `map`.
      mediaGlobal: unDecimal(
        punto.rows.reduce((acc, r) => acc + r.overallRating, 0) / punto.rows.length,
      ),
    };
  });

  // Mismo orden que la tabla de medias de 2.8, para que quien lea el informe
  // encuentre las tablas en el orden en el que acaba de ver los puntos.
  salida.sort((a, b) => ordenDePuntos({ media: a.mediaGlobal, label: a.label }, { media: b.mediaGlobal, label: b.label }));

  return ok(salida.map(({ capturePointId, label, dimensiones }) => ({ capturePointId, label, dimensiones })));
}

/**
 * §2.9 · Comentarios.
 *
 * R-M3: todas las respuestas que tengan texto, parciales incluidas.
 * Orden: primero los de valoración baja, que son los accionables.
 * Texto íntegro, sin editar ni resumir. Sin agrupación ni sentimiento (R8).
 */
export function comentarios(responses: ResponseRow[]): MetricState<ComentarioRow[]> {
  const conTexto = responses
    .filter((r) => r.comment !== null && r.comment.trim() !== "")
    .map((r) => ({
      submittedAt: r.submittedAt,
      overallRating: r.overallRating,
      capturePointLabel: r.capturePointLabel,
      texto: r.comment!,
    }));

  if (conTexto.length < MIN_N.comentarios) return insufficient(conTexto.length, MIN_N.comentarios);

  conTexto.sort(
    (a, b) => a.overallRating - b.overallRating || b.submittedAt.localeCompare(a.submittedAt),
  );
  return ok(conTexto);
}

/**
 * §2.10 · finalizacion_pct = respuestas_complete / N * 100
 *
 * Métrica INTERNA: docs/05 dice que no aparece en el informe del cliente.
 * R-M1 no le asigna umbral, y su regla habla de lo que "se publica" al cliente,
 * así que no se le aplica muestra mínima más allá de necesitar al menos una
 * respuesta para no dividir por cero. Si esto debiera tener umbral, cámbialo
 * aquí y en la tabla de R-M1.
 */
export function finalizacionPct(responses: ResponseRow[]): MetricState<number> {
  const N = responses.length;
  if (N === 0) return insufficient(0, 1);
  const completas = responses.filter((r) => r.completeness === "complete").length;
  return ok(pct(completas, N));
}

/**
 * §2.7 · delta_d = media_d(actual) − media_d(anterior)
 *
 * Solo si AMBOS periodos tienen N_d >= 20. Un decimal, con signo, sin convertir
 * a porcentaje. Se destaca solo si |delta_d| >= 0,3.
 *
 * Devuelve OMITIDA, no INSUFICIENTE: R-M1 dice "se omite la comparativa".
 * El primer mes de un cliente cae aquí y no es un error, es lo normal.
 */
export function comparativa(
  actualResponses: ResponseRow[],
  actualAnswers: DimensionAnswerRow[],
  anteriorResponses: ResponseRow[],
  anteriorAnswers: DimensionAnswerRow[],
): MetricState<DeltaDimension[]> {
  const medias = (responses: ResponseRow[], answers: DimensionAnswerRow[]) => {
    const completas = new Set(
      responses.filter((r) => r.completeness === "complete").map((r) => r.id),
    );
    const porCodigo = new Map<string, DimensionAnswerRow[]>();
    for (const a of answers) {
      if (!completas.has(a.responseId)) continue;
      if (!(a.value >= 1 && a.value <= 5)) continue;
      const lista = porCodigo.get(a.code) ?? [];
      lista.push(a);
      porCodigo.set(a.code, lista);
    }
    return porCodigo;
  };

  const ahora = medias(actualResponses, actualAnswers);
  const antes = medias(anteriorResponses, anteriorAnswers);

  const deltas: DeltaDimension[] = [];
  for (const [code, lista] of ahora) {
    const previa = antes.get(code);
    if (!previa) continue;
    if (lista.length < MIN_N.comparativa || previa.length < MIN_N.comparativa) continue;

    const mediaAhora = lista.reduce((s, a) => s + a.value, 0) / lista.length;
    const mediaAntes = previa.reduce((s, a) => s + a.value, 0) / previa.length;
    const delta = unDecimal(mediaAhora - mediaAntes);

    const label = lista.reduce((m, a) => (a.version > m.version ? a : m), lista[0]!).label;
    deltas.push({ code, label, delta, significativo: Math.abs(delta) >= DELTA_SIGNIFICATIVO });
  }

  if (deltas.length === 0) {
    const mayor = ahora.size === 0 ? 0 : Math.max(...[...ahora.values()].map((l) => l.length));
    return omitted(mayor, MIN_N.comparativa);
  }

  deltas.sort((a, b) => a.delta - b.delta || a.code.localeCompare(b.code));
  return ok(deltas);
}

/** Todas las métricas del periodo de una vez. */
export function computePeriod(
  responses: ResponseRow[],
  answers: DimensionAnswerRow[],
): PeriodMetrics {
  return {
    n: responses.length,
    volumen: volumen(responses),
    distribucion: distribucion(responses),
    detractoresPct: detractoresPct(responses),
    promotoresPct: promotoresPct(responses),
    media: media(responses),
    dimensiones: dimensiones(responses, answers),
    puntos: puntos(responses),
    comentarios: comentarios(responses),
    finalizacionPct: finalizacionPct(responses),
  };
}
