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
  undefinedThreshold,
  type ComentarioRow,
  type DeltaDimension,
  type DimensionAnswerRow,
  type DimensionScore,
  type Distribucion,
  type MetricState,
  type PeriodMetrics,
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

/** §2.1 · volumen = N. R-M1: siempre se muestra. */
export function volumen(responses: ResponseRow[]): MetricState<number> {
  const N = responses.length;
  return N >= MIN_N.volumen ? ok(N) : insufficient(N, MIN_N.volumen);
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
 * PENDIENTE Y DELIBERADO: la tabla de R-M1 no le asigna muestra mínima. Están
 * volumen, distribución, detractores, dimensión, comparativa, punto y
 * comentarios; promotores NO aparece.
 *
 * Sin ese umbral la métrica no se puede publicar: R-M1 dice que ninguna se
 * publica sin muestra suficiente, y ponerle 10 "porque es lo que tiene
 * detractores" es exactamente lo que R1 prohíbe.
 *
 * Devuelve SIN_DEFINIR con el motivo. Un porcentaje sin umbral engañaría, y un
 * umbral de relleno —0, NaN— sería peor todavía: un número falso dentro de la
 * capa que existe para que no haya números falsos.
 *
 * En cuanto la tabla de R-M1 le asigne un n mínimo, esto son dos líneas.
 */
export function promotoresPct(): MetricState<number> {
  return undefinedThreshold(
    "docs/05 §2.4 define la fórmula pero la tabla de R-M1 no le asigna muestra mínima. " +
      "Sin ese umbral no se puede publicar (R-M1) y no se puede deducir (R1).",
  );
}

/** Valor de promotores, ya calculable. Se expone aparte para no perder el trabajo. */
export function promotoresPctValor(responses: ResponseRow[]): number | null {
  const N = responses.length;
  if (N === 0) return null;
  return pct(contar(responses)[5], N);
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
  const porPunto = new Map<string, ResponseRow[]>();
  for (const r of responses) {
    const lista = porPunto.get(r.capturePointId) ?? [];
    lista.push(r);
    porPunto.set(r.capturePointId, lista);
  }

  // "Solo para negocios con más de un punto activo".
  if (porPunto.size < 2) return omitted(porPunto.size, 2);

  const scores: PuntoScore[] = [];
  for (const [id, lista] of porPunto) {
    if (lista.length < MIN_N.punto) continue;
    const suma = lista.reduce((acc, r) => acc + r.overallRating, 0);
    scores.push({
      capturePointId: id,
      label: lista[0]!.capturePointLabel,
      n: lista.length,
      media: unDecimal(suma / lista.length),
    });
  }

  if (scores.length === 0) {
    const mayor = Math.max(...[...porPunto.values()].map((l) => l.length));
    return omitted(mayor, MIN_N.punto);
  }

  scores.sort((a, b) => a.media - b.media || a.label.localeCompare(b.label));
  return ok(scores);
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
    promotoresPct: promotoresPct(),
    media: media(responses),
    dimensiones: dimensiones(responses, answers),
    puntos: puntos(responses),
    comentarios: comentarios(responses),
    finalizacionPct: finalizacionPct(responses),
  };
}
