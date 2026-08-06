import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y rellénala.`,
    );
  }
  return value;
}

/**
 * Cliente sujeto a Row Level Security, con la clave publishable.
 *
 * Es el único cliente admitido en la ruta del formulario público: no tiene
 * sesión, no persiste nada en el navegador y sus permisos son exactamente los
 * que concede RLS al rol anónimo (docs/01: insertar respuestas y leer la
 * configuración del punto de captación por su código, nada más).
 *
 * Se instancia por petición. Un cliente compartido entre peticiones en el
 * servidor acabaría filtrando estado de una a otra.
 */
export function createPublicClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
