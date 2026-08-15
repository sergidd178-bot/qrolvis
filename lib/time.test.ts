/**
 * Semana natural de Madrid.
 *
 * De esta función depende que el aviso interno al operador no se repita ni se
 * pierda al cambiar de semana (D34): es lo que da el `week_start` que el índice
 * único de `operator_notices` deduplica.
 */

import { describe, expect, it } from "vitest";

import { weekStartInZone } from "./time";

describe("weekStartInZone: el lunes de la semana natural en Madrid", () => {
  it("un miércoles devuelve el lunes de esa semana", () => {
    expect(weekStartInZone(new Date("2026-08-12T10:00:00.000Z"))).toBe("2026-08-10");
  });

  it("el propio lunes se devuelve a sí mismo", () => {
    expect(weekStartInZone(new Date("2026-08-10T08:00:00.000Z"))).toBe("2026-08-10");
  });

  it("el domingo pertenece a la semana que empezó el lunes anterior, no a la siguiente", () => {
    // La semana aquí empieza en lunes. Con el criterio de getUTCDay (0 = domingo)
    // sin corregir, este caso saltaría siete días adelante.
    expect(weekStartInZone(new Date("2026-08-16T20:00:00.000Z"))).toBe("2026-08-10");
  });

  it("las 00:30 del lunes en Madrid ya son de la semana nueva, aunque en UTC sea domingo", () => {
    // 2026-08-16T22:30Z son las 00:30 del lunes 17 en Madrid (CEST, +02:00).
    expect(new Date("2026-08-16T22:30:00.000Z").toISOString().slice(0, 10)).toBe("2026-08-16");
    expect(weekStartInZone(new Date("2026-08-16T22:30:00.000Z"))).toBe("2026-08-17");
  });

  it("en invierno el desfase es +01:00 y el corte sigue cuadrando", () => {
    // 2026-01-11T23:30Z son las 00:30 del lunes 12 en Madrid (CET, +01:00).
    expect(weekStartInZone(new Date("2026-01-11T23:30:00.000Z"))).toBe("2026-01-12");
  });
});
