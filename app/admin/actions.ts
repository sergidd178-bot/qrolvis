"use server";

import { redirect } from "next/navigation";

import { createSessionClient } from "@/lib/db/session";

/**
 * Inicia sesión del operador.
 *
 * No hay registro ni recuperación de contraseña (docs/01, "Autenticación"): la
 * cuenta se crea a mano en el panel de Supabase y el registro público está
 * desactivado.
 */
export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/admin/login?error=campos");
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  // Un único código de error para cualquier fallo: distinguir "no existe" de
  // "contraseña incorrecta" confirmaría qué cuentas existen.
  if (error) {
    redirect("/admin/login?error=credenciales");
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
