/**
 * Servicio opcional del informe mensual (D37).
 *
 * Aquí la regla es más dura que en las alertas: un negocio sin el servicio
 * contratado NO debe aparecer ni siquiera como fila en `reports`. Lo que se fija
 * es que el filtro viaja en la CONSULTA, no que se descarte después: descartar
 * después significaría haber calculado dos meses de métricas de un negocio que
 * no lo ha contratado, que es justo el coste que la decisión quiere evitar.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  llamadas: [] as { tabla: string; op: string; filtros: [string, unknown][] }[],
  correos: [] as string[],
}));

vi.mock("../db/admin", () => ({
  createAdminClient: () => ({
    from(tabla: string) {
      const registro = { tabla, op: "select", filtros: [] as [string, unknown][] };
      const resolver = () => {
        estado.llamadas.push({ ...registro, filtros: [...registro.filtros] });
        // Ningún negocio pasa el filtro: es el caso que se quiere observar.
        return { data: [], error: null, count: 0 };
      };
      const q: Record<string, unknown> = {
        select: () => q,
        insert: () => ((registro.op = "insert"), q),
        update: () => ((registro.op = "update"), q),
        eq: (c: string, v: unknown) => (registro.filtros.push([c, v]), q),
        neq: () => q,
        gte: () => q,
        lt: () => q,
        order: () => q,
        limit: () => q,
        single: async () => resolver(),
        maybeSingle: async () => ({ data: null, error: null }),
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
          Promise.resolve(resolver()).then(ok, ko),
      };
      return q;
    },
  }),
}));

vi.mock("../alerts/resend", () => ({
  sendEmail: async (input: { to: string }) => {
    estado.correos.push(input.to);
    return { ok: true, id: "correo-1" };
  },
}));

const { prepareMonthlyReports } = await import("./monthly");

beforeEach(() => {
  estado.llamadas.length = 0;
  estado.correos.length = 0;
});

describe("Casilla desmarcada: el cron mensual no genera nada", () => {
  it("el filtro va en la consulta de negocios, no en un descarte posterior", async () => {
    await prepareMonthlyReports("2026-07");

    const consulta = estado.llamadas.find((l) => l.tabla === "businesses");
    expect(consulta?.filtros).toContainEqual(["monthly_reports_enabled", true]);
    // Y sigue exigiendo que el negocio esté activo: lo uno no sustituye a lo otro.
    expect(consulta?.filtros).toContainEqual(["status", "active"]);
  });

  it("no se inserta ninguna fila en reports", async () => {
    await prepareMonthlyReports("2026-07");

    expect(estado.llamadas.some((l) => l.tabla === "reports" && l.op === "insert")).toBe(false);
  });

  it("sin negocios que preparar no se molesta al operador", async () => {
    const informe = await prepareMonthlyReports("2026-07");

    expect(informe.preparados).toEqual([]);
    expect(informe.avisoOperador).toBe("sin_pendientes");
    expect(estado.correos).toEqual([]);
  });
});
