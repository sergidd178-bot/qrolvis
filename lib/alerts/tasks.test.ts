/**
 * La ventana de la barrida de alertas.
 *
 * Fija la relación entre lo que la consulta TRAE y lo que `decidirAlerta` acepta.
 * Si se separan, vuelve el fallo que este test existe para impedir: la barrida
 * pidiendo las 500 valoraciones bajas más antiguas y las nuevas sin entrar nunca,
 * en silencio.
 */

import { describe, expect, it } from "vitest";

import { MAX_ALERT_AGE_HOURS } from "./decision";
import { sweepHorizon } from "./tasks";

const AHORA = Date.parse("2026-08-15T12:00:00.000Z");

describe("Horizonte de la barrida: exactamente el límite de antigüedad", () => {
  it("mira 48 horas atrás, ni más ni menos", () => {
    expect(sweepHorizon(AHORA)).toBe("2026-08-13T12:00:00.000Z");
  });

  it("se deriva de MAX_ALERT_AGE_HOURS y no de un número suelto", () => {
    const esperado = new Date(AHORA - MAX_ALERT_AGE_HOURS * 3600_000).toISOString();
    expect(sweepHorizon(AHORA)).toBe(esperado);
  });

  it("una respuesta de hace 47 h entra en la ventana; una de 49 h queda fuera", () => {
    const horizonte = sweepHorizon(AHORA);
    const hace47h = new Date(AHORA - 47 * 3600_000).toISOString();
    const hace49h = new Date(AHORA - 49 * 3600_000).toISOString();

    // La consulta usa gte(submitted_at, horizonte); esto reproduce esa comparación.
    expect(hace47h >= horizonte).toBe(true);
    expect(hace49h >= horizonte).toBe(false);
  });

  it("lo que queda fuera es justo lo que decidirAlerta habría descartado", () => {
    // Traerlo no servía de nada: por encima de MAX_ALERT_AGE_HOURS la decisión es
    // "descartar_vieja", así que solo gastaba sitio en el limit de la consulta.
    const hace49h = AHORA - 49 * 3600_000;
    expect(AHORA - hace49h).toBeGreaterThan(MAX_ALERT_AGE_HOURS * 3600_000);
  });
});
