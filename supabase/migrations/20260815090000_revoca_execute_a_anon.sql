-- Cierra la ejecución de las funciones internas al rol anónimo, y corta la raíz
-- del problema para que no reaparezca con cada función nueva.
--
-- =====================================================
-- QUÉ PASABA
-- =====================================================
--
-- Las migraciones que crearon `create_business`, `create_capture_point` y
-- `generate_capture_point_code` terminaban con:
--
--     revoke execute on function ... from public;
--
-- y eso NO basta en Supabase. `PUBLIC` es el pseudo-rol que agrupa a todos, pero
-- el proyecto trae además una concesión POR ROL sobre `anon` y `authenticated`,
-- puesta por las default privileges del esquema `public`. Revocar de `PUBLIC`
-- deja intacta la concesión nominal, así que la función seguía siendo invocable
-- con la clave publishable, que es pública por diseño y viaja en el navegador.
--
-- Comprobado en la auditoría del 2026-08-14: con la clave publishable se creó un
-- negocio completo con su punto "General", y `create_business` acepta un
-- `alert_email` arbitrario. Las filas de prueba se borraron.
--
-- =====================================================
-- INVENTARIO COMPLETO DE FUNCIONES DEL PROYECTO
-- =====================================================
--
--   capture_point_config(text)          security definer   anon SÍ  <- el formulario la necesita
--   create_business(...)                security definer   anon NO
--   create_capture_point(uuid,text,text) security definer  anon NO
--   generate_capture_point_code()       security definer   anon NO
--   set_response_business_id()          NO definer, trigger, no invocable por RPC
--
-- `capture_point_config` es la ÚNICA que el rol anónimo debe poder ejecutar: es
-- la que resuelve la configuración del punto por el código de la URL, y ya está
-- acotada a cuatro columnas inocuas. Su grant se deja como está.
--
-- `set_response_business_id` devuelve `trigger`, así que PostgREST no la expone y
-- no se toca: PostgreSQL comprueba el permiso al CREAR el disparador, no en cada
-- disparo, y revocárselo solo añadiría un obstáculo a migraciones futuras.

revoke execute on function create_business(text, smallint, text, text, text)
  from anon, authenticated, public;

revoke execute on function create_capture_point(uuid, text, text)
  from anon, authenticated, public;

revoke execute on function generate_capture_point_code()
  from anon, authenticated, public;

-- =====================================================
-- LA RAÍZ: DEFAULT PRIVILEGES
-- =====================================================
--
-- Sin esto, la próxima función que alguien cree en `public` nacería otra vez
-- ejecutable por `anon`, y volveríamos a depender de acordarse de revocarla.
-- El fallo estaba en el valor por omisión, no en las tres funciones.
--
-- `for role postgres` porque las default privileges son POR ROL CREADOR, y las
-- migraciones se aplican como `postgres`. Sin esa cláusula la orden solo
-- afectaría al rol que ejecuta esta sesión, que puede no ser el mismo.
--
-- A partir de aquí, toda función que deba ser alcanzable desde el formulario
-- necesita su `grant execute ... to anon` EXPLÍCITO en la misma migración que la
-- crea. Es más trabajo por función y es exactamente lo que se busca: que abrir
-- una puerta sea un acto deliberado y visible en el diff, no el valor por omisión.

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- =====================================================
-- CÓMO SE COMPRUEBA
-- =====================================================
--
-- Contra el Supabase LOCAL, nunca contra producción:
--
--   supabase start
--   supabase db reset          -- aplica todas las migraciones
--   node scripts/sonda-permisos.mjs
--
-- La sonda debe dar "bloqueada" en las tres funciones de arriba y "accesible"
-- en capture_point_config.
