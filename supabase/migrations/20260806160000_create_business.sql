-- Alta de negocios desde el panel. Ver docs/02-modelo-datos.md.
--
-- docs/02: "Todo negocio tiene al menos un punto de captación llamado General".
-- Eso son dos inserciones, y si la segunda falla queda un negocio SIN NINGÚN QR,
-- incumpliendo la regla en silencio. Por eso van en una función: una sola
-- transacción, y la invariante queda en la base, donde no se puede rodear.

-- =====================================================
-- GENERACIÓN DEL CÓDIGO
-- =====================================================
--
-- docs/01: 8 caracteres, alfabeto sin caracteres ambiguos. El alfabeto concreto
-- no estaba definido en ningún sitio; queda fijado aquí y documentado en
-- docs/02.
--
--   - Sin 0/O ni 1/I/L: son los que se confunden al teclear la URL a mano.
--   - Sin vocales: así ningún código puede formar una palabra por accidente.
--     Con material impreso y colocado en bares, eso importa.
--
-- 28^8 ≈ 3,8·10^11 combinaciones.
--
-- REGLA CRÍTICA (D1): el código de un punto de captación no cambia nunca.
-- Cambiar este alfabeto no invalida los códigos ya emitidos, pero tampoco los
-- regenera: el material físico ya impreso manda.

create or replace function generate_capture_point_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := '23456789BCDFGHJKMNPQRSTVWXYZ';
  candidate text;
  i integer;
  attempts integer := 0;
begin
  loop
    candidate := '';
    for i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (select 1 from public.capture_points cp where cp.code = candidate);

    attempts := attempts + 1;
    -- Con 3,8·10^11 combinaciones esto no debería ocurrir jamás. Si ocurre, es
    -- señal de que algo va muy mal y es mejor fallar que girar para siempre.
    if attempts > 50 then
      raise exception 'No se ha podido generar un código único tras % intentos', attempts;
    end if;
  end loop;

  return candidate;
end $$;

revoke execute on function generate_capture_point_code() from public;

-- =====================================================
-- ALTA DE NEGOCIO
-- =====================================================
--
-- question_set_id NO lo elige el operador: se deriva del sector, tomando el
-- conjunto activo. Dejarlo a mano permitiría asignar un conjunto de otro sector
-- o una versión inactiva, y el histórico dejaría de ser comparable (D8).

create function create_business(
  p_name text,
  p_sector_id smallint,
  p_alert_email text,
  p_default_language text,
  p_google_review_url text default null
)
returns table (business_id uuid, capture_point_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_question_set_id uuid;
  v_business_id uuid;
  v_code text;
begin
  select qs.id into v_question_set_id
  from public.question_sets qs
  where qs.sector_id = p_sector_id
    and qs.is_active
  limit 1;

  if v_question_set_id is null then
    raise exception 'El sector % no tiene ningún conjunto de preguntas activo', p_sector_id;
  end if;

  insert into public.businesses
    (name, sector_id, question_set_id, alert_email, default_language, google_review_url)
  values
    (p_name, p_sector_id, v_question_set_id, p_alert_email, p_default_language, p_google_review_url)
  returning id into v_business_id;

  v_code := public.generate_capture_point_code();

  insert into public.capture_points (business_id, code, label, type, is_active)
  values (v_business_id, v_code, 'General', 'general', true);

  return query select v_business_id, v_code;
end $$;

-- Solo el servidor con la clave secreta da de alta negocios (D23). Ni el rol
-- anónimo ni el autenticado pueden ejecutarla.
revoke execute on function create_business(text, smallint, text, text, text) from public;
