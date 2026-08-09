/**
 * Tests obligatorios de la capa de métricas. docs/05 §5.
 *
 * "Esta es la única parte del sistema con cobertura de test exigida. Un error
 * aquí no rompe nada visiblemente: produce informes que parecen correctos y son
 * falsos."
 *
 * Cada `describe` lleva el NOMBRE LITERAL del caso del documento, para que al
 * mirar la salida se vea de un vistazo si están los diez y cuál falta si alguien
 * borra uno.
 */

import { describe, expect, it } from "vitest";

import {
  comentarios,
  comparativa,
  computePeriod,
  detractoresPct,
  dimensiones,
  distribucion,
  finalizacionPct,
  media,
  promotoresPct,
  puntos,
  volumen,
} from "./compute";
import { isInPeriod, monthPeriod, previousMonth } from "./period";
import type { DimensionAnswerRow, ResponseRow } from "./types";

// --- constructores de datos, para que cada test diga solo lo que le importa ---

let contador = 0;

function respuesta(over: Partial<ResponseRow> = {}): ResponseRow {
  contador++;
  return {
    id: `r${contador}`,
    overallRating: 3,
    completeness: "complete",
    comment: null,
    submittedAt: "2026-08-15T10:00:00.000Z",
    capturePointId: "p1",
    capturePointLabel: "General",
    ...over,
  };
}

/** n respuestas con la misma valoración. */
function conValoracion(valor: number, n: number, over: Partial<ResponseRow> = {}): ResponseRow[] {
  return Array.from({ length: n }, () => respuesta({ overallRating: valor, ...over }));
}

function answer(
  responseId: string,
  code: string,
  value: number,
  over: Partial<DimensionAnswerRow> = {},
): DimensionAnswerRow {
  return { responseId, code, label: code, version: 1, value, ...over };
}

/** Una valoración de dimensión por cada respuesta de la lista. */
function answersPara(rs: ResponseRow[], code: string, value: number, version = 1) {
  return rs.map((r) => answer(r.id, code, value, { version, label: code }));
}

// =============================================================================

describe("N = 0: todas las métricas devuelven INSUFICIENTE, ninguna división por cero", () => {
  const m = computePeriod([], []);

  it("ninguna métrica queda en OK", () => {
    expect(m.volumen.status).toBe("INSUFICIENTE");
    expect(m.distribucion.status).toBe("INSUFICIENTE");
    expect(m.detractoresPct.status).toBe("INSUFICIENTE");
    expect(m.media.status).toBe("INSUFICIENTE");
    expect(m.dimensiones.status).toBe("INSUFICIENTE");
    expect(m.comentarios.status).toBe("INSUFICIENTE");
    expect(m.finalizacionPct.status).toBe("INSUFICIENTE");
    expect(m.puntos.status).toBe("OMITIDA");
  });

  it("no aparece NaN, Infinity ni null: ni un solo número basura", () => {
    // Esta comprobación ya cazó un fallo real: un `required: NaN` que se colaba
    // como `null` al serializar. En una capa cuyo trabajo es no dar números
    // falsos, un número basura es el peor fallo posible.
    const texto = JSON.stringify(m);
    expect(texto).not.toContain("NaN");
    expect(texto).not.toContain("Infinity");
    expect(texto).not.toContain("null");
  });

  it("promotores queda INSUFICIENTE, no en cero", () => {
    // Un 0 % de promotores con cero respuestas sería mentira, no un dato.
    expect(m.promotoresPct.status).toBe("INSUFICIENTE");
  });

  it("la comparativa sin datos se omite, no revienta", () => {
    expect(comparativa([], [], [], []).status).toBe("OMITIDA");
  });
});

describe("N = 9 y N = 10: el corte exacto de la muestra mínima", () => {
  it("con 9 respuestas la distribución, los detractores y la media son INSUFICIENTE", () => {
    const rs = conValoracion(3, 9);
    expect(distribucion(rs).status).toBe("INSUFICIENTE");
    expect(detractoresPct(rs).status).toBe("INSUFICIENTE");
    expect(media(rs).status).toBe("INSUFICIENTE");
  });

  it("con 10 respuestas las tres pasan a OK", () => {
    const rs = conValoracion(3, 10);
    expect(distribucion(rs).status).toBe("OK");
    expect(detractoresPct(rs).status).toBe("OK");
    expect(media(rs).status).toBe("OK");
  });

  it("promotores corta en el mismo 10 que detractores", () => {
    expect(promotoresPct(conValoracion(5, 9)).status).toBe("INSUFICIENTE");
    const diez = promotoresPct(conValoracion(5, 10));
    expect(diez.status).toBe("OK");
    if (diez.status === "OK") expect(diez.value).toBe(100);
  });

  it("un 4 no cuenta como promotor: solo el 5 (§2.4)", () => {
    const p = promotoresPct(conValoracion(4, 10));
    expect(p.status).toBe("OK");
    if (p.status === "OK") expect(p.value).toBe(0);
  });

  it("el volumen se muestra siempre, incluso con 1", () => {
    expect(volumen(conValoracion(3, 1)).status).toBe("OK");
    expect(volumen(conValoracion(3, 9)).status).toBe("OK");
  });

  it("una dimensión con 9 valoraciones no llega y con 10 sí", () => {
    const nueve = conValoracion(3, 9);
    expect(dimensiones(nueve, answersPara(nueve, "food_quality", 4)).status).toBe("INSUFICIENTE");

    const diez = conValoracion(3, 10);
    expect(dimensiones(diez, answersPara(diez, "food_quality", 4)).status).toBe("OK");
  });

  it("un punto con 14 respuestas se omite y con 15 aparece", () => {
    const catorce = [...conValoracion(3, 14, { capturePointId: "a", capturePointLabel: "A" }),
                     ...conValoracion(3, 20, { capturePointId: "b", capturePointLabel: "B" })];
    const r1 = puntos(catorce);
    expect(r1.status).toBe("OK");
    if (r1.status === "OK") expect(r1.value.map((p) => p.capturePointId)).toEqual(["b"]);

    const quince = [...conValoracion(3, 15, { capturePointId: "a", capturePointLabel: "A" }),
                    ...conValoracion(3, 20, { capturePointId: "b", capturePointLabel: "B" })];
    const r2 = puntos(quince);
    expect(r2.status).toBe("OK");
    if (r2.status === "OK") expect(r2.value.map((p) => p.capturePointId).sort()).toEqual(["a", "b"]);
  });
});

describe("Distribución bimodal (mitad 1, mitad 5): la media es 3 y los detractores 50%", () => {
  const rs = [...conValoracion(1, 10), ...conValoracion(5, 10)];

  it("la media es exactamente 3", () => {
    const m = media(rs);
    expect(m.status).toBe("OK");
    if (m.status === "OK") expect(m.value).toBe(3);
  });

  it("los detractores son el 50%", () => {
    const d = detractoresPct(rs);
    expect(d.status).toBe("OK");
    if (d.status === "OK") expect(d.value).toBe(50);
  });

  it("la distribución enseña los dos polos, que es lo que la media esconde (R-M2)", () => {
    const d = distribucion(rs);
    expect(d.status).toBe("OK");
    if (d.status === "OK") {
      expect(d.value.n).toEqual({ 1: 10, 2: 0, 3: 0, 4: 0, 5: 10 });
      expect(d.value.pct[1]).toBe(50);
      expect(d.value.pct[5]).toBe(50);
      expect(d.value.pct[3]).toBe(0);
    }
  });
});

describe("Todas las respuestas iguales: no rompe nada", () => {
  const rs = conValoracion(4, 12);

  it("la media es el propio valor y la distribución se concentra", () => {
    const m = media(rs);
    if (m.status === "OK") expect(m.value).toBe(4);
    const d = distribucion(rs);
    if (d.status === "OK") {
      expect(d.value.n[4]).toBe(12);
      expect(d.value.pct[4]).toBe(100);
      expect(d.value.pct[1]).toBe(0);
    }
  });

  it("sin ningún detractor el porcentaje es 0, no INSUFICIENTE", () => {
    const d = detractoresPct(rs);
    expect(d.status).toBe("OK");
    if (d.status === "OK") expect(d.value).toBe(0);
  });

  it("todas de 1: los detractores son el 100% y sigue sin romper", () => {
    const bajas = conValoracion(1, 12);
    const d = detractoresPct(bajas);
    if (d.status === "OK") expect(d.value).toBe(100);
  });
});

describe("Respuestas partial mezcladas con complete: cada métrica usa el conjunto correcto", () => {
  const completas = conValoracion(2, 6, { completeness: "complete" });
  const parciales = conValoracion(4, 6, { completeness: "partial" });
  const rs = [...completas, ...parciales];
  // Solo las completas tienen valoración por dimensión: la pantalla 2 es lo que
  // las hace completas.
  const as = answersPara(completas, "food_quality", 2);

  it("el volumen cuenta las 12: R-M3 dice todas", () => {
    const v = volumen(rs);
    if (v.status === "OK") expect(v.value).toBe(12);
  });

  it("la valoración global usa las 12, no solo las completas", () => {
    const d = distribucion(rs);
    expect(d.status).toBe("OK");
    if (d.status === "OK") {
      expect(d.value.n[2]).toBe(6);
      expect(d.value.n[4]).toBe(6);
    }
    const det = detractoresPct(rs);
    if (det.status === "OK") expect(det.value).toBe(50);
  });

  it("las dimensiones NO llegan a 10 porque solo cuentan las 6 completas", () => {
    expect(dimensiones(rs, as).status).toBe("INSUFICIENTE");
  });

  it("una valoración de dimensión colgada de una parcial se ignora", () => {
    const colgadas = [...as, ...answersPara(parciales, "food_quality", 5)];
    const d = dimensiones(rs, colgadas);
    // 6 completas + 6 parciales darían 12 y pasaría el umbral si se colaran.
    expect(d.status).toBe("INSUFICIENTE");
  });

  it("la tasa de finalización distingue los dos conjuntos", () => {
    const f = finalizacionPct(rs);
    expect(f.status).toBe("OK");
    if (f.status === "OK") expect(f.value).toBe(50);
  });

  it("los comentarios entran vengan de parcial o de completa", () => {
    const conTexto = [
      respuesta({ completeness: "partial", overallRating: 1, comment: "de una parcial" }),
      respuesta({ completeness: "complete", overallRating: 5, comment: "de una completa" }),
    ];
    const c = comentarios(conTexto);
    expect(c.status).toBe("OK");
    if (c.status === "OK") {
      expect(c.value).toHaveLength(2);
      // Primero las bajas: son las accionables (§2.9).
      expect(c.value[0]!.overallRating).toBe(1);
    }
  });
});

describe("Dimensión sin ninguna respuesta: INSUFICIENTE para esa dimensión, el resto se calcula", () => {
  const rs = conValoracion(3, 12);
  const as = [
    ...answersPara(rs, "food_quality", 4),
    // 'speed' solo la contestaron 3 personas.
    ...answersPara(rs.slice(0, 3), "speed", 2),
  ];

  it("la dimensión con datos sale y la que no llega desaparece", () => {
    const d = dimensiones(rs, as);
    expect(d.status).toBe("OK");
    if (d.status === "OK") {
      expect(d.value.map((x) => x.code)).toEqual(["food_quality"]);
      expect(d.value[0]!.nD).toBe(12);
    }
  });

  it("una dimensión sin ni una sola valoración tampoco rompe", () => {
    const d = dimensiones(rs, answersPara(rs, "food_quality", 4));
    expect(d.status).toBe("OK");
  });

  it("el resto de métricas se calculan igual", () => {
    expect(media(rs).status).toBe("OK");
    expect(distribucion(rs).status).toBe("OK");
  });
});

describe("Periodo anterior inexistente (primer mes del cliente): sin comparativa, sin error", () => {
  const rs = conValoracion(4, 30);
  const as = answersPara(rs, "food_quality", 4);

  it("se omite, no es INSUFICIENTE ni lanza", () => {
    const c = comparativa(rs, as, [], []);
    expect(c.status).toBe("OMITIDA");
  });

  it("el resto del informe se calcula con normalidad", () => {
    const m = computePeriod(rs, as);
    expect(m.volumen.status).toBe("OK");
    expect(m.dimensiones.status).toBe("OK");
  });

  it("con 20 en ambos periodos sí se calcula el delta", () => {
    const antes = conValoracion(4, 20);
    const ahora = conValoracion(4, 20);
    const c = comparativa(
      ahora,
      answersPara(ahora, "food_quality", 4),
      antes,
      answersPara(antes, "food_quality", 3),
    );
    expect(c.status).toBe("OK");
    if (c.status === "OK") {
      expect(c.value[0]!.delta).toBe(1);
      expect(c.value[0]!.significativo).toBe(true);
    }
  });

  it("con 19 en el periodo anterior se omite: hacen falta 20 en AMBOS", () => {
    const antes = conValoracion(4, 19);
    const ahora = conValoracion(4, 20);
    const c = comparativa(
      ahora,
      answersPara(ahora, "food_quality", 4),
      antes,
      answersPara(antes, "food_quality", 3),
    );
    expect(c.status).toBe("OMITIDA");
  });

  it("un delta por debajo de 0,3 no se destaca: es ruido (§2.7)", () => {
    const antes = [...conValoracion(4, 10), ...conValoracion(5, 10)];
    const ahora = [...conValoracion(4, 12), ...conValoracion(5, 8)];
    const c = comparativa(
      ahora,
      [...answersPara(ahora.slice(0, 12), "x", 4), ...answersPara(ahora.slice(12), "x", 5)],
      antes,
      [...answersPara(antes.slice(0, 10), "x", 4), ...answersPara(antes.slice(10), "x", 5)],
    );
    expect(c.status).toBe("OK");
    if (c.status === "OK") {
      expect(Math.abs(c.value[0]!.delta)).toBeLessThan(0.3);
      expect(c.value[0]!.significativo).toBe(false);
    }
  });
});

describe("Cambio de versión del conjunto a mitad de periodo: agrupa por code, no por id de pregunta", () => {
  const primeraMitad = conValoracion(3, 6);
  const segundaMitad = conValoracion(3, 6);
  const as = [
    // Misma dimensión, dos versiones del conjunto y etiqueta reescrita.
    ...answersPara(primeraMitad, "cleanliness", 2, 1).map((a) => ({ ...a, label: "Limpieza" })),
    ...answersPara(segundaMitad, "cleanliness", 4, 2).map((a) => ({ ...a, label: "Higiene" })),
  ];
  const rs = [...primeraMitad, ...segundaMitad];

  it("las dos versiones se suman en UNA sola dimensión de 12", () => {
    const d = dimensiones(rs, as);
    expect(d.status).toBe("OK");
    if (d.status === "OK") {
      expect(d.value).toHaveLength(1);
      expect(d.value[0]!.code).toBe("cleanliness");
      expect(d.value[0]!.nD).toBe(12);
      expect(d.value[0]!.media).toBe(3);
    }
  });

  it("se etiqueta con la versión más reciente", () => {
    const d = dimensiones(rs, as);
    if (d.status === "OK") expect(d.value[0]!.label).toBe("Higiene");
  });

  it("si se agrupara por id de pregunta saldrían dos dimensiones de 6, ambas insuficientes", () => {
    // Prueba de contraste: agrupando mal, ninguna llegaría a 10.
    const porId = dimensiones(rs, as.map((a, i) => ({ ...a, code: `${a.code}-${i < 6 ? "v1" : "v2"}` })));
    expect(porId.status).toBe("INSUFICIENTE");
  });
});

describe("Respuesta justo en el límite del periodo (23:59 del último día): se incluye", () => {
  const agosto = monthPeriod("2026-08");

  it("las 23:59:59 del 31 de agosto en Madrid entran", () => {
    // 31/08/2026 23:59:59 en Madrid (CEST, +02:00) = 21:59:59Z.
    expect(isInPeriod("2026-08-31T21:59:59.000Z", agosto)).toBe(true);
  });

  it("el primer instante del mes entra", () => {
    expect(isInPeriod(agosto.startUtc, agosto)).toBe(true);
  });

  it("el primer instante del mes siguiente ya NO entra: el límite es exclusivo", () => {
    expect(isInPeriod(agosto.endUtc, agosto)).toBe(false);
  });

  it("el mes anterior se calcula bien, incluido el salto de año", () => {
    expect(previousMonth("2026-08")).toBe("2026-07");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
});

describe("Zona horaria: una respuesta a las 00:30 del día 1 pertenece al mes nuevo", () => {
  const agosto = monthPeriod("2026-08");
  const julio = monthPeriod("2026-07");

  it("00:30 del 1 de agosto en Madrid es 22:30Z del 31 de julio, y es de AGOSTO", () => {
    const instante = "2026-07-31T22:30:00.000Z";
    expect(isInPeriod(instante, agosto)).toBe(true);
    expect(isInPeriod(instante, julio)).toBe(false);
  });

  it("cortar por medianoche UTC habría metido esa respuesta en julio", () => {
    // La prueba de que el corte NO es UTC: en UTC ese instante es del 31 de julio.
    expect(new Date("2026-07-31T22:30:00.000Z").toISOString().slice(0, 7)).toBe("2026-07");
    expect(isInPeriod("2026-07-31T22:30:00.000Z", agosto)).toBe(true);
  });

  it("el periodo de agosto empieza a las 22:00Z del 31 de julio (CEST, +02:00)", () => {
    expect(agosto.startUtc).toBe("2026-07-31T22:00:00.000Z");
  });

  it("en invierno el desfase es +01:00 y el corte cambia", () => {
    // Enero: CET. El mes empieza a las 23:00Z del 31 de diciembre.
    expect(monthPeriod("2026-01").startUtc).toBe("2025-12-31T23:00:00.000Z");
  });
});
