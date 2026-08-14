/**
 * El informe lo lee un cliente. Estos casos fijan que ningún número salga
 * escrito como lo escribiría JavaScript.
 */

import { describe, expect, it } from "vitest";

import { conSigno, decimal, porcentaje } from "./format";

describe("Separador decimal: coma, y siempre un decimal", () => {
  it("un entero lleva su decimal: 4 no es una media, 4,0 sí", () => {
    expect(decimal(4)).toBe("4,0");
  });

  it("nunca aparece un punto decimal", () => {
    expect(decimal(4.3)).toBe("4,3");
    expect(decimal(3.05)).not.toContain(".");
  });

  it("los negativos conservan el signo", () => {
    expect(decimal(-0.6)).toBe("-0,6");
  });

  it("el cero negativo no se imprime como -0,0", () => {
    // `unDecimal()` puede producir -0 al redondear una caída diminuta, y
    // "-0,0" en una columna de variaciones se lee como un descenso.
    expect(decimal(-0)).toBe("0,0");
  });
});

describe("Porcentajes", () => {
  it("llevan el símbolo separado por un espacio", () => {
    expect(porcentaje(7.4)).toBe("7,4 %");
  });

  it("el cero también lleva decimal, para que la columna no baile", () => {
    expect(porcentaje(0)).toBe("0,0 %");
  });
});

describe("Variaciones con signo", () => {
  it("una subida lleva + explícito", () => {
    expect(conSigno(0.1)).toBe("+0,1");
  });

  it("una bajada lleva su signo propio, sin duplicarlo", () => {
    expect(conSigno(-0.6)).toBe("-0,6");
  });

  it("sin cambio no lleva signo: no ha subido ni bajado", () => {
    expect(conSigno(0)).toBe("0,0");
  });
});
