-- Puntos de captación adicionales. Ver docs/02-modelo-datos.md.

-- =====================================================
-- EXACTAMENTE UN PUNTO "GENERAL" POR NEGOCIO
-- =====================================================
--
-- docs/02: "Todo negocio tiene al menos un punto de captación llamado General".
-- La `check` de la tabla admite el tipo 'general' sin límite, así que hasta
-- ahora nada impedía crear dos, ni por el panel ni por un alta manual.
--
-- El índice parcial garantiza el "no más de uno". El "al menos uno" lo garantiza
-- create_business(), que lo crea en la misma transacción que el negocio.

create unique index one_general_per_business
  on capture_points (business_id) where type = 'general';

-- =====================================================
-- ALTA DE PUNTOS ADICIONALES
-- =====================================================
--
-- 'general' queda reservado al punto automático: esta función lo rechaza
-- explícitamente, así que la reserva no depende de que el desplegable del panel
-- no lo ofrezca. Aunque llegue el valor a mano, no entra.
--
-- El código sale de generate_capture_point_code(), que ya reintenta ante
-- colisión. Va dentro de la función para que generación e inserción ocurran en
-- la misma transacción: entre generar y grabar por separado, otro alta
-- simultánea podría llevarse el código.

create function create_capture_point(
  p_business_id uuid,
  p_label text,
  p_type text
)
returns table (capture_point_id uuid, capture_point_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
  v_id uuid;
begin
  if p_type = 'general' then
    raise exception 'El punto General se crea con el negocio y no puede añadirse a mano';
  end if;

  if p_type not in ('table', 'room', 'professional', 'counter') then
    raise exception 'Tipo de punto de captación no válido: %', p_type;
  end if;

  if length(trim(p_label)) = 0 then
    raise exception 'La etiqueta del punto de captación no puede estar vacía';
  end if;

  v_code := public.generate_capture_point_code();

  insert into public.capture_points (business_id, code, label, type, is_active)
  values (p_business_id, v_code, trim(p_label), p_type, true)
  returning id into v_id;

  return query select v_id, v_code;
end $$;

-- Solo el servidor con la clave secreta da de alta puntos (D23).
revoke execute on function create_capture_point(uuid, text, text) from public;
