// Este import debe ser la primera línea del archivo. Hace que la compilación
// falle si algo dentro del grafo de un componente de cliente llega a importar
// este módulo, en lugar de fallar en silencio en tiempo de ejecución.
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * ADVERTENCIA: `server-only` NO impide la fuga de datos, solo la del código.
 *
 * Lo que este guardia cubre: que el módulo acabe empaquetado en un bundle de
 * cliente. Ahí la compilación se rompe y el error es evidente.
 *
 * Lo que NO cubre, y es el riesgo real de este archivo: un Server Component
 * puede importar este cliente legítimamente, leer datos que saltan RLS y
 * pasarlos como prop a un componente de cliente. Esas props se serializan en la
 * carga de RSC y viajan al navegador en texto plano. La compilación pasa, el
 * tipado pasa, el lint pasa, y el dato queda expuesto.
 *
 *   // Server Component: compila sin errores y filtra todo
 *   const { data } = await createAdminClient().from("responses").select("*");
 *   return <TablaCliente filas={data} />;   // <-- data acaba en el navegador
 *
 * Regla: lo que salga de este cliente se agrega, se filtra o se recorta en el
 * servidor. A un componente de cliente solo baja el resultado ya reducido y
 * apto para mostrarse, nunca la fila en bruto.
 *
 * Esto importa especialmente aquí porque el panel maneja comentarios libres de
 * consumidores (docs/06): el formulario no pide datos personales, pero un
 * comentario puede contenerlos igualmente escritos por quien lo rellena.
 */

/**
 * Cliente que salta Row Level Security, con la clave secreta.
 *
 * Reservado al panel interno, los informes y las tareas programadas. Nunca debe
 * usarse en la ruta del formulario público: ahí va `createPublicClient()` de
 * `./client`, que sí queda sujeto a RLS.
 *
 * Se instancia por petición, por el mismo motivo que el cliente público: un
 * cliente compartido entre peticiones filtra estado de una a otra.
 */
export function createAdminClient(): SupabaseClient<Database> {
  // Se lee dentro de la función y no en el ámbito del módulo para que la falta
  // de la variable falle en la petición que la necesita, y no al arrancar todo
  // el servidor.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url) {
    throw new Error(
      "Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL. Copia .env.example a .env.local y rellénala.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "Falta la variable de entorno SUPABASE_SECRET_KEY. Copia .env.example a .env.local y rellénala.",
    );
  }

  // Salvaguarda contra un error de configuración concreto y fácil de cometer:
  // pegar la clave publishable en la ranura de la secreta. El cliente seguiría
  // funcionando, pero sujeto a RLS, y el panel devolvería resultados vacíos o
  // incompletos sin dar ningún error. Mejor no arrancar que mentir.
  if (!secretKey.startsWith("sb_secret_")) {
    throw new Error(
      "SUPABASE_SECRET_KEY no tiene el formato esperado (sb_secret_...). Revisa que no sea la clave publishable.",
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
