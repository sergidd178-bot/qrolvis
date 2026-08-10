// Preparación mensual de informes. Ruta fijada por docs/01.
//
// PREPARA PERO NO ENVÍA (D30). Deja una fila `pending` por negocio activo con la
// foto del cálculo del mes anterior y avisa al operador. La recomendación la
// escribe una persona y sin ella no se genera PDF, así que el envío al cliente
// sale del panel, no de aquí.
//
// Se puede llamar cualquier día y tantas veces como haga falta: mira qué falta y
// crea solo eso. Por eso el cron diario de Vercel sirve de red de seguridad si
// el disparador del día 1 no llega.

import { prepareMonthlyReports } from "@/lib/reports/monthly";

export const dynamic = "force-dynamic";

// Recorre todos los negocios activos calculando dos meses de métricas cada uno.
// Con pocos clientes sobra, pero el valor por defecto se queda corto en cuanto
// crezcan.
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Mismo criterio que /api/cron: sin secreto configurado no se abre la puerta.
  // Un despliegue al que se le olvidó la variable no puede quedarse con un
  // endpoint abierto que manda correo.
  if (!secret) {
    return Response.json({ error: "CRON_SECRET sin configurar" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  // `?mes=YYYY-MM` para rehacer un mes concreto a mano. Sin parámetro, el mes
  // anterior al actual.
  const mes = new URL(request.url).searchParams.get("mes") ?? undefined;

  const started = Date.now();
  const report = await prepareMonthlyReports(mes ?? undefined);

  return Response.json({
    ok: true,
    ms: Date.now() - started,
    month: report.month,
    preparados: report.preparados.length,
    yaExistentes: report.yaExistentes,
    sinRespuestas: report.sinRespuestas,
    avisoOperador: report.avisoOperador,
    errores: report.errores,
  });
}
