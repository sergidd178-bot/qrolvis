-- Esquema inicial. Fuente de verdad: docs/02-modelo-datos.md.
-- Cualquier cambio aquí debe reflejarse antes en ese documento.

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

-- business_id y question_set_id los rellena el trigger de la migración
-- siguiente, nunca la aplicación. Son not null: el NOT NULL se comprueba
-- después de ejecutarse el trigger BEFORE INSERT.
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
