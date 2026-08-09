// Trabajo programado de las alertas: cierre de parciales, barrida de seguridad
// y resumen agrupado. Detalle de cada tarea en lib/alerts/tasks.ts.
//
// SE INVOCA DESDE FUERA, así que va protegida. Sin la comprobación del secreto
// sería un endpoint público que cualquiera podría martillear: no filtraría datos
// —no devuelve ninguno— pero sí dispararía envíos de correo a costa nuestra.
//
// El secreto viaja en `Authorization: Bearer ...`, que es lo que manda Vercel en
// sus crons cuando existe CRON_SECRET, y lo que envía también el workflow de
// GitHub Actions. Un solo formato para los dos disparadores.

import { runAlertTasks } from "@/lib/alerts/tasks";

export const dynamic = "force-dynamic";

// Las tareas hacen varias llamadas a Supabase y a Resend en serie. El valor por
// defecto de Vercel se queda corto en cuanto hay unas cuantas pendientes.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  // Sin secreto configurado NO se abre la puerta. Fallar cerrado: un despliegue
  // al que se le olvidó la variable no puede quedarse con el endpoint abierto.
  if (!secret) {
    return Response.json({ error: "CRON_SECRET sin configurar" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const started = Date.now();
  const report = await runAlertTasks();

  // Se devuelve el recuento para que quien dispare el cron pueda verlo en su
  // propio log sin entrar en Vercel. Los errores van dentro, no como código de
  // estado: un fallo de envío no debe hacer que el disparador reintente toda la
  // pasada, porque lo que ya salió, salió.
  return Response.json({ ok: true, ms: Date.now() - started, ...report });
}
