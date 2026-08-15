import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import type { Database } from "./types";

/**
 * Cliente de sesión del panel. Su ÚNICA función es la autenticación: iniciar
 * sesión, cerrarla y saber quién es el usuario actual.
 *
 * No se usa para leer ni escribir datos de negocio. Eso va siempre por
 * `createAdminClient()` desde servidor (D23). Motivo: RLS está activo sin
 * ninguna policy para `authenticated`, así que este cliente no vería nada; y
 * mantenerlo así garantiza que el navegador del panel nunca consulta Supabase
 * directamente, ni por error.
 *
 * Usa la clave publishable porque es la que exige el endpoint de autenticación
 * de Supabase. Ahí es correcta: no da acceso a ningún dato por sí sola, y la
 * autorización real la hace la comprobación de sesión del layout.
 */
export async function createSessionClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y rellénala.",
    );
  }

  const store = await cookies();

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          // Escribir cookies desde un Server Component lanza. El refresco del
          // token lo hace el proxy (proxy.ts), que sí puede, así que aquí se ignora.
        }
      },
    },
  });
}

/**
 * Usuario autenticado, o null.
 *
 * Usa `getUser()` y nunca `getSession()`: `getSession()` se limita a leer la
 * cookie, que el cliente controla y puede falsear. `getUser()` valida el token
 * contra Supabase. Para una puerta de acceso, esa diferencia es la seguridad
 * entera.
 */
export async function getOperator() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Puerta de las Server Actions del panel. Corta la ejecución si no hay sesión.
 *
 * EXISTE PORQUE EL LAYOUT NO BASTA. La guardia de `app/admin/(panel)/layout.tsx`
 * protege lo que se RENDERIZA, pero una Server Action es un POST a su propio
 * identificador: se ejecuta ANTES de que se renderice ningún layout, así que la
 * mutación ya ha ocurrido cuando la guardia miraría. Es la misma trampa que el
 * route handler del PDF de QR ya esquivaba llamando a `getOperator()` a mano.
 *
 * Toda Server Action que escriba algo o mande un correo empieza llamando aquí.
 */
export async function requireOperator() {
  const operator = await getOperator();
  if (!operator) redirect("/admin/login");
  return operator;
}
