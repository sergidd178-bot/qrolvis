/**
 * Sonda de permisos: qué alcanza de verdad el rol anónimo.
 *
 * Comprueba, CONTRA LA BASE REAL y no leyendo el SQL, qué tablas y funciones
 * puede tocar la clave publishable, que es la que viaja en el navegador. Las
 * policies y los grants se leen bien y engañan: `revoke ... from public` parecía
 * cerrar tres funciones y no cerraba ninguna (migración 20260815090000).
 *
 * SOLO CONTRA EL SUPABASE LOCAL. El script se niega a apuntar a otro sitio: una
 * sonda de escritura contra producción crea filas de verdad, y ya pasó una vez.
 *
 * Uso:
 *   supabase start
 *   supabase db reset
 *   supabase status -o env > .env.sonda      (o exporta las dos variables a mano)
 *   node scripts/sonda-permisos.mjs
 *
 * Variables: SUPABASE_URL y SUPABASE_ANON_KEY (o API_URL y ANON_KEY, que son los
 * nombres que imprime `supabase status -o env`).
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.API_URL ?? "http://127.0.0.1:54321";
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;

const esLocal = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(url.replace(/\/$/, ""));
if (!esLocal) {
  console.error(`NEGADO: ${url} no es local. Esta sonda escribe, y solo se ejecuta contra el Supabase local.`);
  process.exit(2);
}
if (!anonKey) {
  console.error("Falta SUPABASE_ANON_KEY (o ANON_KEY). Sácala de `supabase status -o env`.");
  process.exit(2);
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let fallos = 0;
function resultado(nombre, bloqueado, esperado, detalle = "") {
  const ok = bloqueado === esperado;
  if (!ok) fallos++;
  const etiqueta = esperado ? "debe estar cerrado" : "debe estar abierto";
  console.log(
    `${ok ? "OK  " : "FALLA"} ${nombre.padEnd(40)} ${etiqueta.padEnd(20)} ${detalle}`,
  );
}

/** Una lectura está bloqueada si da error o no devuelve ninguna fila. */
async function lectura(nombre, tabla, columnas, esperadoCerrado) {
  const { data, error } = await anon.from(tabla).select(columnas).limit(5);
  const filas = data?.length ?? 0;
  resultado(nombre, Boolean(error) || filas === 0, esperadoCerrado, error ? `error=${error.code}` : `filas=${filas}`);
}

console.log(`Sonda contra ${url}\n`);
console.log("--- Tablas que el rol anónimo NO debe leer ---");
await lectura("responses", "responses", "*", true);
await lectura("answers", "answers", "*", true);
await lectura("businesses.alert_email", "businesses", "alert_email", true);
await lectura("alerts", "alerts", "*", true);
await lectura("reports", "reports", "*", true);
await lectura("sectors", "sectors", "*", true);
await lectura("question_sets", "question_sets", "*", true);

console.log("\n--- Lo que el formulario SÍ necesita ---");
await lectura("questions", "questions", "id, code", false);
await lectura("capture_points", "capture_points", "id, code", false);

console.log("\n--- Escrituras directas: todas cerradas ---");
{
  const { error } = await anon
    .from("responses")
    .insert({ capture_point_id: "00000000-0000-0000-0000-000000000000", overall_rating: 1, language: "es" });
  resultado("insert en responses", Boolean(error), true, error ? `error=${error.code}` : "");
}
{
  const { error } = await anon.from("answers").insert({
    response_id: "00000000-0000-0000-0000-000000000000",
    question_id: "00000000-0000-0000-0000-000000000000",
    rating_value: 1,
  });
  resultado("insert en answers", Boolean(error), true, error ? `error=${error.code}` : "");
}

console.log("\n--- Funciones ---");
{
  // La única que debe responder. Con un código inexistente devuelve 0 filas, que
  // es la respuesta correcta: lo que se comprueba es que NO da error de permisos.
  const { error } = await anon.rpc("capture_point_config", { p_code: "NOEXISTE" });
  resultado("capture_point_config", Boolean(error), false, error ? `error=${error.code}` : "responde");
}
{
  const { error } = await anon.rpc("generate_capture_point_code");
  resultado("generate_capture_point_code", Boolean(error), true, error ? `error=${error.code}` : "EJECUTADA");
}
{
  const { error } = await anon.rpc("create_business", {
    p_name: "sonda",
    p_sector_id: 1,
    p_alert_email: "sonda@ejemplo.invalid",
    p_default_language: "es",
  });
  resultado("create_business", Boolean(error), true, error ? `error=${error.code}` : "EJECUTADA, HA CREADO UN NEGOCIO");
}
{
  const { error } = await anon.rpc("create_capture_point", {
    p_business_id: "00000000-0000-0000-0000-000000000000",
    p_label: "sonda",
    p_type: "table",
  });
  resultado("create_capture_point", Boolean(error), true, error ? `error=${error.code}` : "EJECUTADA");
}

console.log(`\n${fallos === 0 ? "TODO EN ORDEN" : `${fallos} COMPROBACIONES FALLAN`}`);
process.exit(fallos === 0 ? 0 : 1);
