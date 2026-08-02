# 02 · Modelo de datos

## Decisiones estructurales y su motivo

### El QR apunta a un punto de captación, no a un negocio

Un `capture_point` es una mesa, una sala, un profesional o un mostrador. Pertenece
a un negocio.

Motivo: permite saber que las quejas de rapidez vienen de la terraza, o que las
valoraciones de Ana son mejores que las de Marc. En estética es la funcionalidad
más valorada y la que justifica un precio superior.

Si no se diseña así desde el principio, añadirlo después obliga a **reimprimir
todo el material físico de todos los clientes**. Coste de hacerlo ahora: cero.

Todo negocio tiene al menos un punto de captación llamado "General".

### Los conjuntos de preguntas son versionados

Cambiar el texto de una pregunta ya publicada rompe silenciosamente cualquier
comparación histórica. Por eso `question_sets` tiene versión y las respuestas
guardan a qué versión respondieron.

Para modificar preguntas se crea una versión nueva. La anterior queda inactiva
pero nunca se borra.

### `business_id` está desnormalizado en `responses`

Se puede derivar por `capture_point_id`, pero se guarda directamente porque
prácticamente todas las consultas filtran por negocio y periodo. Evita un join en
la ruta más caliente.

Se rellena por trigger, nunca desde la aplicación, para que no pueda desincronizarse.

### No existe tabla de posiciones ni agregados precalculados

Todas las métricas se calculan a partir de `responses` y `answers`. No se
almacenan medias ni totales. Con los volúmenes de este negocio el cálculo es
instantáneo, y un agregado almacenado es un agregado que algún día quedará desfasado.

---

## Esquema

```sql
-- =====================================================
-- SECTORES Y PREGUNTAS
-- =====================================================

create table sectors (
  id          smallint primary key,
  code        text not null unique,          -- 'hosteleria' | 'estetica'
  name_es     text not null,
  name_ca     text not null
);

create table question_sets (
  id          uuid primary key default gen_random_uuid(),
  sector_id   smallint not null references sectors(id),
  version     smallint not null,
  is_active   boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (sector_id, version)
);

-- Solo un conjunto activo por sector
create unique index one_active_set_per_sector
  on question_sets (sector_id) where is_active;

create table questions (
  id              uuid primary key default gen_random_uuid(),
  question_set_id uuid not null references question_sets(id) on delete restrict,
  code            text not null,             -- 'food_quality', 'staff_attention'
  dimension       text not null,             -- agrupador para el informe
  type            text not null check (type in ('rating', 'text')),
  text_es         text not null,
  text_ca         text not null,
  position        smallint not null,
  is_required     boolean not null default false,
  unique (question_set_id, code),
  unique (question_set_id, position)
);

-- =====================================================
-- NEGOCIOS Y PUNTOS DE CAPTACIÓN
-- =====================================================

create table businesses (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  sector_id         smallint not null references sectors(id),
  question_set_id   uuid not null references question_sets(id) on delete restrict,
  google_review_url text,                    -- null = no se muestra el paso
  alert_email       text not null,
  default_language  text not null default 'es' check (default_language in ('es','ca')),
  status            text not null default 'active'
                    check (status in ('active', 'paused', 'cancelled')),
  onboarded_at      date,
  created_at        timestamptz not null default now()
);

create table capture_points (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete restrict,
  code         text not null unique,         -- 8 caracteres, va en la URL del QR
  label        text not null,                -- 'Mesa 4', 'Ana', 'General'
  type         text not null
               check (type in ('general', 'table', 'room', 'professional', 'counter')),
  is_active    boolean not null default true,
  qr_asset_url text,
  created_at   timestamptz not null default now()
);

create index capture_points_business on capture_points(business_id);

-- =====================================================
-- RESPUESTAS
-- =====================================================

create table responses (
  id                uuid primary key default gen_random_uuid(),
  capture_point_id  uuid not null references capture_points(id) on delete restrict,
  business_id       uuid not null references businesses(id) on delete restrict,
  question_set_id   uuid not null references question_sets(id) on delete restrict,
  overall_rating    smallint not null check (overall_rating between 1 and 5),
  comment           text,
  language          text not null check (language in ('es','ca')),
  completeness      text not null default 'partial'
                    check (completeness in ('partial', 'complete')),
  google_link_shown boolean not null default false,
  device_token      uuid,                    -- aleatorio, antifraude, no personal
  submitted_at      timestamptz not null default now(),
  completed_at      timestamptz
);

create index responses_business_date on responses(business_id, submitted_at desc);
create index responses_capture_point on responses(capture_point_id, submitted_at desc);
create index responses_device_window  on responses(device_token, capture_point_id, submitted_at desc);

create table answers (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references responses(id) on delete cascade,
  question_id  uuid not null references questions(id) on delete restrict,
  rating_value smallint check (rating_value between 1 and 5),
  text_value   text,
  unique (response_id, question_id),
  check (rating_value is not null or text_value is not null)
);

create index answers_response on answers(response_id);

-- =====================================================
-- ALERTAS E INFORMES
-- =====================================================

create table alerts (
  id           uuid primary key default gen_random_uuid(),
  response_id  uuid not null references responses(id) on delete restrict,
  business_id  uuid not null references businesses(id) on delete restrict,
  channel      text not null default 'email',
  status       text not null default 'pending'
               check (status in ('pending', 'sent', 'failed')),
  error_detail text,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  unique (response_id)
);

create table reports (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses(id) on delete restrict,
  period_start date not null,
  period_end   date not null,
  metrics      jsonb not null,               -- foto del cálculo, ver doc 05
  pdf_url      text,
  status       text not null default 'pending'
               check (status in ('pending', 'generated', 'sent', 'failed')),
  generated_at timestamptz,
  sent_at      timestamptz,
  unique (business_id, period_start)
);
```

---

## Trigger de desnormalización

`business_id` en `responses` se rellena siempre desde el punto de captación.
La aplicación nunca lo envía.

```sql
create or replace function set_response_business_id()
returns trigger language plpgsql as $$
begin
  select business_id, b.question_set_id
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
```

---

## Row Level Security

```sql
alter table responses      enable row level security;
alter table answers        enable row level security;
alter table capture_points enable row level security;
alter table businesses     enable row level security;
alter table questions      enable row level security;

-- El público puede insertar respuestas
create policy public_insert_responses on responses
  for insert to anon with check (true);

create policy public_insert_answers on answers
  for insert to anon with check (true);

-- El público NO puede leer ninguna respuesta, ni la suya
-- (no se crea ninguna policy de select para anon)

-- El público puede leer el punto de captación activo por su código
create policy public_read_capture_point on capture_points
  for select to anon using (is_active = true);

-- El público puede leer el negocio asociado, solo campos necesarios,
-- resuelto mediante una vista restringida
create policy public_read_questions on questions
  for select to anon using (true);
```

**Nota de implementación:** los datos del negocio que necesita el formulario
(nombre, idioma, URL de Google) se exponen mediante una vista de solo lectura, no
dando acceso directo a `businesses`. `alert_email` no debe ser accesible desde el
cliente público bajo ninguna circunstancia.

---

## Actualización de respuestas parciales

Las pantallas 2 y 3 actualizan una respuesta ya creada. Como el rol anónimo no
tiene permiso de `update`, esta operación se hace a través de un endpoint del
servidor que valida:

- Que la respuesta existe
- Que se creó hace menos de 30 minutos
- Que aún está en estado `partial`

Fuera de esa ventana, la respuesta es inmutable.

---

## Retención

Ver `06-privacidad-rgpd.md`. Resumen operativo:

| Dato | Retención |
|---|---|
| `responses.device_token` | Se pone a `null` a los 7 días |
| `responses` y `answers` | 24 meses, luego borrado |
| `reports` | Indefinido (son agregados, sin dato individual) |
| Datos de un negocio cancelado | Borrado a los 3 meses de la baja |

El borrado se ejecuta mediante una tarea programada mensual.
