-- Recorta la configuración que ve el formulario público a lo que realmente usa.
-- Ver docs/02-modelo-datos.md y docs/01-arquitectura.md, "Seguridad de datos".
--
-- La vista anterior exponía ocho columnas al rol anónimo, de las que el
-- formulario solo usa cuatro. Sobraban capture_point_id, capture_point_label,
-- capture_point_code y business_id:
--
--   - capture_point_label es un dato para el personal ("Mesa 4", "Ana"), pensado
--     para el PDF imprimible. Ninguna de las tres pantallas de docs/03 lo enseña,
--     y con type = 'professional' es el nombre de pila de un trabajador.
--   - capture_point_id y business_id hacían falta cuando el cliente insertaba
--     directamente en responses. Desde D20 no inserta: envía a /api/responses y
--     el servidor resuelve ambos a partir del código.
--   - capture_point_code lo tiene ya el cliente, viene en la URL que acaba de
--     abrir.
--
-- Se pasa de vista a función porque PostgREST solo permite filtrar por columnas
-- que la relación proyecta. Sin capture_point_code en la vista, el formulario no
-- podría localizar su configuración por el código de la URL, y `select=*` sin
-- filtro seguiría devolviendo la configuración de TODOS los negocios activos de
-- una sola llamada. Con el código como parámetro, quien no lo conoce no obtiene
-- nada, y las cuatro columnas son las únicas alcanzables.

drop view if exists capture_point_config;

-- security definer por el mismo motivo que tenía la vista security_invoker =
-- false: businesses no tiene ninguna policy para el rol anónimo, así que la
-- consulta debe ejecutarse con los permisos del propietario para poder resolver
-- el join. Expone cuatro campos inocuos sin abrir la tabla entera.
--
-- search_path fijado a vacío y nombres cualificados: en una función security
-- definer, un search_path heredado del llamante permitiría resolver
-- capture_points o businesses a objetos suplantados.
create function capture_point_config(p_code text)
returns table (
  business_name     text,
  default_language  text,
  google_review_url text,
  question_set_id   uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    b.name,
    b.default_language,
    b.google_review_url,
    b.question_set_id
  from public.capture_points cp
  join public.businesses b on b.id = cp.business_id
  where cp.code = p_code
    and cp.is_active = true
    and b.status = 'active';
$$;

-- Postgres concede execute a public por defecto. Se revoca antes de conceder
-- para que la lista de roles sea exactamente la que se lee aquí.
revoke execute on function capture_point_config(text) from public;
grant execute on function capture_point_config(text) to anon, authenticated;
