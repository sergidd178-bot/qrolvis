-- Registro de los avisos internos al operador. Decisión D34 en docs/08.
--
-- =====================================================
-- QUÉ ARREGLA
-- =====================================================
--
-- `checkWeeklyOperatorNotice()` comparaba el recuento de alertas de los últimos
-- 7 días con `total !== WEEKLY_OPERATOR_THRESHOLD + 1`, es decir, exigía que
-- valiese EXACTAMENTE 16. Si dos alertas se creaban casi a la vez y el conteo
-- saltaba de 15 a 17, el aviso no se enviaba, y como la condición solo se cumple
-- en ese punto exacto, tampoco se enviaba después: se perdía para siempre.
--
-- Es el aviso que dice que un local va mal de verdad, así que perderlo en
-- silencio es lo contrario de lo que existe para hacer.
--
-- El umbral pasa a `>=`, y para que eso no llene el buzón del operador de
-- repeticiones hace falta recordar que la semana ya está avisada. Ese es el
-- único motivo de esta tabla.
--
-- =====================================================
-- POR QUÉ UNA TABLA Y NO UNA COLUMNA EN businesses
-- =====================================================
--
-- El aviso es estado operativo DEL SERVICIO, no un atributo del negocio. Y
-- guardar solo "la última vez que avisé" perdería justo la señal que buscamos: un
-- local que dispara el aviso tres semanas seguidas es un problema distinto de uno
-- que lo disparó una vez en marzo, y una columna sobrescrita no distingue los dos
-- casos. La tabla conserva el histórico.
--
-- El índice único hace la deduplicación EN LA BASE: el insert es la cerradura,
-- igual que `unique (response_id)` en `alerts`. Dos ejecuciones simultáneas del
-- cron no pueden mandar dos correos, sin lógica de fechas repartida por el código.

create table operator_notices (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete restrict,
  -- Lunes de la semana natural en Europe/Madrid, que es como se lee "esta
  -- semana" en el sitio donde está el local.
  week_start  date not null,
  sent_at     timestamptz not null default now(),
  unique (business_id, week_start)
);

create index operator_notices_business on operator_notices(business_id, week_start desc);

comment on table operator_notices is
  'Avisos internos al operador (docs/05, "Reglas anti-saturación"): un negocio '
  'supera 15 alertas en 7 días. Una fila por negocio y semana natural; el índice '
  'único es lo que impide repetir el correo. Ver D34 en docs/08.';

-- Misma regla que el resto de tablas que no aparecen en la sección de RLS de
-- docs/02: RLS activo y ninguna policy, de modo que el rol anónimo no puede
-- hacer nada. Solo la clave secreta entra (D23).
alter table operator_notices enable row level security;
