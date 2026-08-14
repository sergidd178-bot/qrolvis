/**
 * El correo interno de propuestas.
 *
 * Se prueba una cosa concreta: que sus cifras estén escritas como las del PDF.
 * Este texto es lo que el operador tiene delante al escribir el Bloque 5, y lo
 * natural es copiarlo; un punto decimal aquí vuelve a colarse en el informe que
 * lee el cliente por la puerta de atrás.
 */

import { describe, expect, it } from "vitest";

import { operatorBody, type MonthlyReport, type PreparedReport } from "./monthly";
import type { Candidate } from "./candidate";

function informe(candidate: Candidate, over: Partial<PreparedReport> = {}): MonthlyReport {
  return {
    month: "2026-07",
    preparados: [
      {
        businessId: "b1",
        businessName: "Blend Barber Shop",
        volumen: 68,
        candidate,
        yaExistia: false,
        ...over,
      },
    ],
    yaExistentes: 0,
    sinRespuestas: 0,
    errores: [],
    avisoOperador: "enviado",
  };
}

/** Un decimal escrito con punto: 3.5, 17.2. Lo que no debe aparecer. */
const PUNTO_DECIMAL = /\d\.\d/;

describe("Propuesta de recomendación: las cifras van con coma, como en el PDF", () => {
  it("dimensión con peor media: media y porcentaje con coma", () => {
    const texto = operatorBody(
      informe({
        tipo: "dimension_peor",
        code: "punctuality",
        label: "Puntualidad",
        media: 3.5,
        nD: 58,
        detractoresPct: 17.2,
      }),
    );

    expect(texto).toContain("Puntualidad, 3,5 de media y 17,2 % de 2 o menos");
    expect(texto).not.toMatch(PUNTO_DECIMAL);
  });

  it("una media redonda conserva su decimal: 4 no es una media, 4,0 sí", () => {
    const texto = operatorBody(
      informe({
        tipo: "dimension_peor",
        code: "cleanliness",
        label: "Higiene",
        media: 4,
        nD: 30,
        detractoresPct: 0,
      }),
    );

    expect(texto).toContain("Higiene, 4,0 de media y 0,0 % de 2 o menos");
  });

  it("caída de una dimensión: el número va en positivo, porque la frase ya dice que ha bajado", () => {
    const texto = operatorBody(
      informe({ tipo: "dimension_caida", code: "speed", label: "Rapidez", delta: -0.4 }),
    );

    expect(texto).toContain("ha bajado 0,4 puntos");
    // Un "-0,4" detrás de "ha bajado" sería una doble negación.
    expect(texto).not.toContain("-0,4");
  });

  it("caída de volumen: el porcentaje con coma y los conteos enteros", () => {
    const texto = operatorBody(informe({ tipo: "volumen", actual: 25, anterior: 40, caidaPct: 37.5 }));

    expect(texto).toContain("ha caído un 37,5 % (25 frente a 40)");
    expect(texto).not.toMatch(PUNTO_DECIMAL);
  });

  it("los conteos siguen siendo enteros: 68 respuestas, no 68,0", () => {
    const texto = operatorBody(informe({ tipo: "ninguno" }));

    expect(texto).toContain("68 respuestas");
    expect(texto).not.toContain("68,0");
  });

  it("un mes sin respuestas sigue avisando de la captación, sin cifras que formatear", () => {
    const texto = operatorBody(informe({ tipo: "volumen_bajo", n: 0 }, { volumen: 0 }));

    expect(texto).toContain("SIN RESPUESTAS");
    expect(texto).not.toMatch(PUNTO_DECIMAL);
  });
});
