import { describe, expect, it } from "vitest";

import { proposeCandidate } from "./candidate";
import { ok, omitted, insufficient } from "../metrics/types";
import type { DeltaDimension, DimensionScore } from "../metrics/types";

const dim = (over: Partial<DimensionScore> = {}): DimensionScore => ({
  code: "food_quality",
  label: "Producto",
  nD: 12,
  media: 3,
  detractoresPct: 10,
  ...over,
});

const delta = (over: Partial<DeltaDimension> = {}): DeltaDimension => ({
  code: "food_quality",
  label: "Producto",
  delta: -0.5,
  significativo: true,
  ...over,
});

const sinNada = {
  dimensiones: insufficient<DimensionScore[]>(0, 10),
  comparativa: omitted<DeltaDimension[]>(0, 20),
  volumenActual: 0,
  volumenAnterior: 0,
};

describe("Candidato a recomendación: prioridad de docs/05 §3, Bloque 5", () => {
  it("regla 1: la dimensión con peor media, que ya viene la primera", () => {
    const c = proposeCandidate({
      ...sinNada,
      dimensiones: ok([dim({ code: "speed", label: "Rapidez", media: 2.1 }), dim({ media: 4.2 })]),
    });
    expect(c.tipo).toBe("dimension_peor");
    if (c.tipo === "dimension_peor") {
      expect(c.code).toBe("speed");
      expect(c.media).toBe(2.1);
    }
  });

  it("la regla 1 gana aunque haya caídas: el orden del documento manda", () => {
    const c = proposeCandidate({
      ...sinNada,
      dimensiones: ok([dim({ media: 4.5 })]),
      comparativa: ok([delta({ code: "otra", delta: -1.2 })]),
      volumenActual: 1,
      volumenAnterior: 100,
    });
    expect(c.tipo).toBe("dimension_peor");
  });

  it("regla 2: sin dimensiones publicables, la mayor caída", () => {
    const c = proposeCandidate({
      ...sinNada,
      comparativa: ok([
        delta({ code: "a", delta: -0.4 }),
        delta({ code: "b", delta: -1.1 }),
        delta({ code: "c", delta: 0.8 }),
      ]),
    });
    expect(c.tipo).toBe("dimension_caida");
    if (c.tipo === "dimension_caida") expect(c.code).toBe("b");
  });

  it("una subida no es materia de recomendación", () => {
    const c = proposeCandidate({ ...sinNada, comparativa: ok([delta({ delta: 0.9 })]) });
    expect(c.tipo).toBe("ninguno");
  });

  it("regla 3: caída de volumen por encima del 30 %", () => {
    const c = proposeCandidate({ ...sinNada, volumenActual: 60, volumenAnterior: 100 });
    expect(c.tipo).toBe("volumen");
    if (c.tipo === "volumen") expect(c.caidaPct).toBe(40);
  });

  it("una caída de exactamente el 30 % NO dispara: el documento dice 'más de'", () => {
    const c = proposeCandidate({ ...sinNada, volumenActual: 70, volumenAnterior: 100 });
    expect(c.tipo).toBe("ninguno");
  });

  it("sin mes anterior no hay caída que medir, y no se divide por cero", () => {
    const c = proposeCandidate({ ...sinNada, volumenActual: 0, volumenAnterior: 0 });
    expect(c.tipo).toBe("ninguno");
    expect(JSON.stringify(c)).not.toContain("Infinity");
  });

  it("un mes sin nada reseñable devuelve 'ninguno', no revienta", () => {
    expect(proposeCandidate(sinNada).tipo).toBe("ninguno");
  });

  it("la regla 2 es hoy inalcanzable, y el test lo deja escrito", () => {
    // Si una dimensión tiene delta es que superó n>=20 en ambos periodos (§2.7),
    // luego supera el 10 de la regla 1, luego `dimensiones` habría venido en OK
    // y la regla 1 habría disparado. Esta combinación no puede darse en real.
    const irreal = proposeCandidate({
      ...sinNada,
      dimensiones: insufficient<DimensionScore[]>(9, 10),
      comparativa: ok([delta({ delta: -0.5 })]),
    });
    expect(irreal.tipo).toBe("dimension_caida");
  });
});
