/**
 * Servicio opcional de notificaciones instantáneas (D37).
 *
 * Lo que se fija aquí es la diferencia entre "no se envió" y "no se detectó": un
 * negocio sin el servicio contratado tiene que seguir generando su fila en
 * `alerts`, porque de eso depende poder enseñarle después lo que se perdió. Un
 * cambio que se limitara a no crear la fila pasaría cualquier prueba de "no se
 * manda correo" y rompería el histórico en silencio.
 *
 * Se usa un doble de Supabase hecho a mano: son cuatro llamadas encadenadas y no
 * justifica traer una librería de mocks (CLAUDE.md, "ante la duda, menos
 * librerías").
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = vi.hoisted(() => ({
  /** Lo que devuelve cada consulta, por tabla y operación. */
  respuesta: { instant_alerts_enabled: true } as Record<string, unknown>,
  /** Todo lo que se pidió a la base, en orden. */
  llamadas: [] as { tabla: string; op: string; datos?: unknown; filtros: [string, unknown][] }[],
  /** Los correos que se intentaron enviar. */
  correos: [] as { to: string; subject: string }[],
}));

vi.mock("../db/admin", () => ({
  createAdminClient: () => ({
    from(tabla: string) {
      const registro = { tabla, op: "select", filtros: [] as [string, unknown][], datos: undefined as unknown };

      const resolver = () => {
        estado.llamadas.push({ ...registro });
        if (tabla === "responses") {
          return {
            data: {
              id: "r1",
              business_id: "b1",
              overall_rating: 1,
              comment: "Media hora esperando.",
              submitted_at: new Date().toISOString(),
              completeness: "complete",
              businesses: {
                name: "Blend Barber Shop",
                alert_email: "duenyo@ejemplo.com",
                instant_alerts_enabled: estado.respuesta.instant_alerts_enabled,
              },
              capture_points: { label: "Diego" },
              answers: [],
            },
            error: null,
          };
        }
        if (tabla === "alerts" && registro.op === "insert") {
          return { data: { id: "a1" }, error: null };
        }
        if (tabla === "alerts" && registro.op === "select") {
          // Alertas del día y recuento semanal: ninguna, para no enredar el caso.
          return { data: [], error: null, count: 0 };
        }
        return { data: null, error: null, count: 0 };
      };

      const q: Record<string, unknown> = {
        select: (...a: unknown[]) => ((registro.datos = a[0]), q),
        insert: (d: unknown) => ((registro.op = "insert"), (registro.datos = d), q),
        update: (d: unknown) => ((registro.op = "update"), (registro.datos = d), q),
        delete: () => ((registro.op = "delete"), q),
        eq: (c: string, v: unknown) => (registro.filtros.push([c, v]), q),
        neq: () => q,
        gte: () => q,
        lt: () => q,
        lte: () => q,
        in: () => q,
        order: () => q,
        limit: () => q,
        single: async () => resolver(),
        maybeSingle: async () => resolver(),
        // Los constructores de PostgREST son "thenables": se pueden esperar sin
        // llamar a single(). El doble tiene que serlo también.
        then: (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) =>
          Promise.resolve(resolver()).then(ok, ko),
      };
      return q;
    },
  }),
}));

vi.mock("./resend", () => ({
  sendEmail: async (input: { to: string; subject: string }) => {
    estado.correos.push({ to: input.to, subject: input.subject });
    return { ok: true, id: "correo-1" };
  },
}));

const { processAlert } = await import("./index");

beforeEach(() => {
  estado.llamadas.length = 0;
  estado.correos.length = 0;
  estado.respuesta.instant_alerts_enabled = true;
});

const filaDeAlerta = () =>
  estado.llamadas.find((l) => l.tabla === "alerts" && l.op === "update")?.datos as
    | { status?: string; error_detail?: string }
    | undefined;

describe("Casilla desmarcada: la alerta se registra pero no se envía", () => {
  it("no se llama a Resend", async () => {
    estado.respuesta.instant_alerts_enabled = false;
    const outcome = await processAlert("r1");

    expect(outcome.status).toBe("skipped");
    expect(estado.correos).toEqual([]);
  });

  it("la fila en alerts SÍ se crea: el histórico es lo que se vende después", async () => {
    estado.respuesta.instant_alerts_enabled = false;
    await processAlert("r1");

    const insert = estado.llamadas.find((l) => l.tabla === "alerts" && l.op === "insert");
    expect(insert).toBeDefined();
  });

  it("queda en 'skipped', no en 'failed' ni en 'not_applicable'", async () => {
    estado.respuesta.instant_alerts_enabled = false;
    await processAlert("r1");

    // `failed` es un fallo de Resend y `not_applicable` es una alerta vieja. Esto
    // no es ninguna de las dos: es un negocio sin el servicio contratado.
    expect(filaDeAlerta()?.status).toBe("skipped");
    expect(filaDeAlerta()?.error_detail).toContain("no tiene contratadas");
  });

  it("con la casilla marcada sí sale el correo: el control del caso anterior", async () => {
    estado.respuesta.instant_alerts_enabled = true;
    const outcome = await processAlert("r1");

    expect(outcome.status).toBe("sent");
    expect(estado.correos).toHaveLength(1);
    expect(estado.correos[0]!.to).toBe("duenyo@ejemplo.com");
    expect(filaDeAlerta()?.status).toBe("sent");
  });
});
