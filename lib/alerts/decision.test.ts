import { describe, expect, it } from "vitest";

import {
  DAILY_INDIVIDUAL_LIMIT,
  MAX_ALERT_AGE_HOURS,
  decidirAlerta,
  enviadasHoy,
  type EstadoAlerta,
} from "./decision";

const HORA = 3600_000;
const reciente = 30 * 60_000; // media hora
const fila = (status: EstadoAlerta) => ({ status });

/**
 * Simula la pasada del cron: procesa una lista de respuestas en orden, llevando
 * la cuenta de las alertas que se van creando igual que hace `processAlert()`.
 *
 * `enviar` decide si el envío de esa alerta tiene éxito, para poder reproducir
 * un fallo de Resend sin tocar Resend.
 */
function simularPasada(
  respuestas: readonly { edadMs: number }[],
  enviar: (indice: number) => boolean = () => true,
) {
  const alertasDelDia: { status: EstadoAlerta }[] = [];
  const resultado: string[] = [];

  respuestas.forEach((r, i) => {
    const d = decidirAlerta({ edadMs: r.edadMs, alertasDelDia });
    if (d.accion === "descartar_vieja") {
      alertasDelDia.push(fila("not_applicable"));
      resultado.push("not_applicable");
    } else if (d.accion === "retener") {
      alertasDelDia.push(fila("pending"));
      resultado.push("pending");
    } else {
      const ok = enviar(i);
      alertasDelDia.push(fila(ok ? "sent" : "failed"));
      resultado.push(ok ? "sent" : "failed");
    }
  });

  return resultado;
}

describe("Tope diario: solo los correos que salieron consumen el cupo", () => {
  it("cuenta únicamente las `sent`", () => {
    expect(
      enviadasHoy([
        fila("sent"),
        fila("not_applicable"),
        fila("failed"),
        fila("pending"),
        fila("sent"),
      ]),
    ).toBe(2);
  });

  it("con 4 enviadas todavía se envía; con 5 se retiene", () => {
    const cuatro = Array.from({ length: 4 }, () => fila("sent"));
    expect(decidirAlerta({ edadMs: reciente, alertasDelDia: cuatro }).accion).toBe("enviar");

    const cinco = Array.from({ length: 5 }, () => fila("sent"));
    expect(decidirAlerta({ edadMs: reciente, alertasDelDia: cinco }).accion).toBe("retener");
  });

  it("veinte `not_applicable` NO consumen ni una unidad del cupo", () => {
    const viejas = Array.from({ length: 20 }, () => fila("not_applicable"));
    expect(decidirAlerta({ edadMs: reciente, alertasDelDia: viejas }).accion).toBe("enviar");
  });

  it("veinte `failed` tampoco: si nada llegó, el negocio no ha recibido nada", () => {
    const fallidas = Array.from({ length: 20 }, () => fila("failed"));
    expect(decidirAlerta({ edadMs: reciente, alertasDelDia: fallidas }).accion).toBe("enviar");
  });

  it("las `pending` retenidas tampoco cuentan: aún no han producido correo", () => {
    const retenidas = Array.from({ length: 20 }, () => fila("pending"));
    expect(decidirAlerta({ edadMs: reciente, alertasDelDia: retenidas }).accion).toBe("enviar");
  });
});

describe("El escenario que destapó el fallo en la simulación de producción", () => {
  // Once respuestas antiguas descartadas por el límite de 48 h, seguidas de
  // ocho recientes y legítimas. Antes, las once consumían el cupo y las ocho
  // quedaban retenidas en silencio.
  const viejas = Array.from({ length: 11 }, () => ({ edadMs: 500 * HORA }));
  const nuevas = Array.from({ length: 8 }, () => ({ edadMs: reciente }));

  it("las once viejas se descartan y ninguna se envía", () => {
    const r = simularPasada(viejas);
    expect(r.filter((x) => x === "not_applicable")).toHaveLength(11);
    expect(r.filter((x) => x === "sent")).toHaveLength(0);
  });

  it("tras las once viejas, las recientes SÍ se envían hasta el tope de 5", () => {
    const r = simularPasada([...viejas, ...nuevas]);
    const enviadas = r.filter((x) => x === "sent").length;
    const retenidas = r.filter((x) => x === "pending").length;

    expect(enviadas).toBe(DAILY_INDIVIDUAL_LIMIT); // 5, no 0
    expect(retenidas).toBe(nuevas.length - DAILY_INDIVIDUAL_LIMIT); // las 3 restantes
    expect(r.filter((x) => x === "not_applicable")).toHaveLength(11);
  });

  it("el orden no importa: viejas intercaladas entre recientes dan lo mismo", () => {
    const mezclado = [
      ...viejas.slice(0, 5),
      nuevas[0]!,
      ...viejas.slice(5),
      ...nuevas.slice(1),
    ];
    expect(simularPasada(mezclado).filter((x) => x === "sent")).toHaveLength(
      DAILY_INDIVIDUAL_LIMIT,
    );
  });
});

describe("Envíos fallidos: no consumen cupo y el sistema reintenta", () => {
  it("si los cinco primeros fallan, la sexta se sigue intentando", () => {
    // Resende caído para los cinco primeros y recuperado después.
    const r = simularPasada(
      Array.from({ length: 8 }, () => ({ edadMs: reciente })),
      (i) => i >= 5,
    );
    expect(r.slice(0, 5)).toEqual(["failed", "failed", "failed", "failed", "failed"]);
    // Las tres siguientes se INTENTAN y salen: el negocio no se queda a cero.
    expect(r.slice(5)).toEqual(["sent", "sent", "sent"]);
  });

  it("con el fallo antiguo, esos cinco fallos habrían dejado al negocio sin nada", () => {
    // Reproducción de la lógica ANTERIOR: contaba filas, no correos.
    const antiguo = (alertas: readonly { status: string }[]) => alertas.length;
    const alertas: { status: EstadoAlerta }[] = Array.from({ length: 5 }, () => fila("failed"));
    expect(antiguo(alertas) >= DAILY_INDIVIDUAL_LIMIT).toBe(true); // habría retenido
    expect(enviadasHoy(alertas) >= DAILY_INDIVIDUAL_LIMIT).toBe(false); // ahora envía
  });

  it("una vez que cinco salen de verdad, el tope sí actúa", () => {
    const r = simularPasada(Array.from({ length: 9 }, () => ({ edadMs: reciente })));
    expect(r.filter((x) => x === "sent")).toHaveLength(5);
    expect(r.filter((x) => x === "pending")).toHaveLength(4);
  });
});

describe("Límite de antigüedad", () => {
  it("justo por debajo de 48 h se envía; justo por encima se descarta", () => {
    expect(
      decidirAlerta({ edadMs: (MAX_ALERT_AGE_HOURS - 1) * HORA, alertasDelDia: [] }).accion,
    ).toBe("enviar");

    const d = decidirAlerta({ edadMs: (MAX_ALERT_AGE_HOURS + 1) * HORA, alertasDelDia: [] });
    expect(d.accion).toBe("descartar_vieja");
    if (d.accion === "descartar_vieja") expect(d.horas).toBe(MAX_ALERT_AGE_HOURS + 1);
  });

  it("la antigüedad manda sobre el tope: una vieja no se retiene, se descarta", () => {
    const cinco = Array.from({ length: 5 }, () => fila("sent"));
    expect(decidirAlerta({ edadMs: 500 * HORA, alertasDelDia: cinco }).accion).toBe(
      "descartar_vieja",
    );
  });
});
