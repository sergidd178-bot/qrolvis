-- Desnormalización de business_id en responses. Ver docs/02-modelo-datos.md.
--
-- business_id y question_set_id se derivan siempre del punto de captación.
-- La aplicación nunca los envía, para que no puedan desincronizarse.

create or replace function set_response_business_id()
returns trigger language plpgsql as $$
begin
  select cp.business_id, b.question_set_id
    into new.business_id, new.question_set_id
  from capture_points cp
  join businesses b on b.id = cp.business_id
  where cp.id = new.capture_point_id;

  if new.business_id is null then
    raise exception 'Punto de captación inexistente: %', new.capture_point_id;
  end if;

  return new;
end $$;

create trigger responses_set_business
  before insert on responses
  for each row execute function set_response_business_id();
