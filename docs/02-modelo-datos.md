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
```

### Formato de `capture_points.code`

`docs/01` fija 8 caracteres con "alfabeto sin caracteres ambiguos", pero no decía
cuál. Queda fijado aquí:

```
23456789BCDFGHJKMNPQRSTVWXYZ
```

28 caracteres. Dos exclusiones, cada una por su motivo:

- **Sin `0`/`O` ni `1`/`I`/`L`.** Son los que se confunden al teclear la URL a
  mano, que es justo el caso para el que el código es corto.
- **Sin vocales.** Así ningún código puede formar una palabra por accidente. Con
  material impreso y colocado en mesas de bares, eso importa más de lo que
  parece.

28⁸ ≈ 3,8 × 10¹¹ combinaciones. La generación vive en la función
`generate_capture_point_code()`, que reintenta si colisiona con un código ya
existente.

**Cambiar este alfabeto no regenera los códigos ya emitidos** ni los invalida: el
material físico ya impreso manda (D1). Solo afecta a los que se creen después.

### Contenido de `capture_points.qr_asset_url`

Pese al nombre, **no guarda una URL: guarda la ruta del objeto en Supabase
Storage**.

```
qr/<capture_point_id>.svg
```

El bucket `qr` es **privado**, y de un bucket privado no existe una URL estable
que almacenar: se sirven URLs firmadas de vida corta (300 s), que se generan en
cada visita del panel. Guardar una caducaría en minutos.

Se usa el `capture_point_id` en el nombre y no el código, porque el id no
aparece en ninguna parte pública.

**`null` significa "todavía sin imagen"**, no "roto". La imagen es dato
derivado: se reconstruye siempre desde el código con el botón de la ficha. Ese
estado aparece en dos casos: puntos creados antes de que existiera la generación,
y generaciones que fallaron.

**Por qué el bucket es privado.** La imagen no contiene ningún secreto —codifica
una URL pública— pero un bucket público permite **listar** sus objetos, y esa
lista daría el catálogo completo de códigos de todos los negocios. Los códigos no
son adivinables por fuerza bruta, pero sí enumerables si el bucket está abierto,
y con ellos se podrían enviar respuestas falsas a cualquier cliente. Además no
hace falta: el QR solo se muestra en el panel autenticado y en el PDF, ambos
generados en servidor.

### Formato de `businesses.google_review_url`

Este campo alimenta el botón de la pantalla 3 y **es el que produce el valor por
el que paga el cliente**: más reseñas en Google. Un enlace mal pegado no da
error en ningún sitio; simplemente lleva a la persona a la ficha del negocio, y
ahí la mayoría abandona sin escribir nada. Se pierde silenciosamente.

**Formato correcto**, el que abre directamente el cuadro de escribir reseña:

```
https://search.google.com/local/writereview?placeid=PLACE_ID
```

El `PLACE_ID` se obtiene en el Place ID Finder de Google:
<https://developers.google.com/maps/documentation/places/web-service/place-id>
Funciona aunque no se administre el perfil del negocio.

**Alternativa válida:** el enlace corto que genera el propio panel de Google
Business Profile en "Pide reseñas", con la forma `https://g.page/r/CÓDIGO/review`.
Termina en `/review`; si no termina así, no abre el cuadro.

**Lo que NO sirve**, aunque parezca que sí:

| Pegado en el campo | Qué hace |
|---|---|
| `https://www.google.com/maps/place/...` | Abre la ficha, no el cuadro de reseña |
| `https://g.page/nombre` (sin `/review`) | Abre la ficha |
| `https://www.google.com/search?q=...` | Abre una búsqueda. No tiene nada que ver |
| URL acortada `maps.app.goo.gl` | Abre la ficha o el mapa, según el caso |

**Comprobación obligatoria al dar de alta un negocio:** abrir la URL en una
ventana de incógnito. Si no aparece el cuadro de puntuar y escribir, el enlace
no vale. No basta con que cargue algo de Google.

El campo admite `null`: sin URL, la pantalla 3 muestra solo el agradecimiento y
ningún botón (`docs/03`, "Casos límite"). Es preferible dejarlo vacío a poner un
enlace que no abra el cuadro.

**No hay validación de formato en base de datos ni en la aplicación.** El valor
se vuelca tal cual en el `href` del botón. La comprobación es humana, en el alta.

```sql

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
               check (status in ('pending', 'sent', 'failed', 'not_applicable')),
  error_detail text,
  message_id   text,                          -- id del correo en Resend
  created_at   timestamptz not null default now(),
  sent_at      timestamptz,
  unique (response_id)
);

-- `message_id`: identificador que devuelve Resend al ACEPTAR el envío. Se guarda
-- al marcar la alerta como `sent`.
--
-- Que exista NO significa que el correo se haya entregado. `sent` solo dice que
-- la API de Resend lo aceptó, y son cosas distintas: ya ha ocurrido en producción
-- que un aviso quedara en `sent` y nunca llegara a la bandeja. Este campo es lo
-- que permitirá consultar el estado real de entrega —delivered, bounced,
-- complained— por API o por webhook. Esa consulta todavía no está implementada.
--
-- Es NULL cuando la fila es anterior a la migración que añadió la columna, cuando
-- la alerta no ha producido correo (`pending`, `failed`, `not_applicable`), o si
-- Resend aceptara un envío sin devolver identificador.
--
-- NO es único, a propósito: el resumen diario es UN correo que cubre N alertas, y
-- esas N filas comparten su identificador. Eso es justo lo que permite saber qué
-- alertas viajaron en qué resumen.
--
-- Estados:
--   pending         registrada, aún sin enviar. Incluye las retenidas para el
--                   resumen diario al superar el tope de 5 por negocio y día.
--   sent            enviada, sola o dentro de un resumen.
--   failed          se intentó y falló. El motivo va en error_detail.
--   not_applicable  se decidió NO enviarla. El motivo va en error_detail.
--                   Hoy solo lo usa el límite de 48 h de antigüedad (D28).
--
-- `unique (response_id)` no es solo una salvaguarda contra duplicados: es la
-- cerradura del envío. El insert de la fila es lo que reclama la alerta, así que
-- dos procesos simultáneos no pueden mandar el mismo aviso dos veces, y la
-- existencia de la fila es lo que impide que la tarea programada vuelva a
-- evaluar esa respuesta en cada pasada.

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

RLS va activo en **todas** las tablas del esquema `public`, sin excepción.
Supabase expone por PostgREST cualquier tabla de ese esquema al rol anónimo, así
que no activar RLS no significa "sin reglas": significa legible por cualquiera
que tenga la clave publishable, que es pública por diseño.

```sql
alter table responses      enable row level security;
alter table answers        enable row level security;
alter table capture_points enable row level security;
alter table businesses     enable row level security;
alter table questions      enable row level security;

-- Sin ninguna policy: el rol anónimo no puede hacer nada con ellas.
-- El motivo no es el mismo en los dos grupos, ver más abajo.
alter table sectors       enable row level security;
alter table question_sets enable row level security;
alter table alerts        enable row level security;
alter table reports       enable row level security;

-- El público NO escribe: responses y answers quedan con RLS activo y sin
-- ninguna policy para anon, ni de insert ni de select. Toda escritura pasa por
-- /api/responses con la clave secreta (D20 en docs/08).

-- El público puede leer el punto de captación activo por su código
create policy public_read_capture_point on capture_points
  for select to anon using (is_active = true);

create policy public_read_questions on questions
  for select to anon using (true);
```

### `sectors` y `question_sets`: higiene, no confidencialidad

No hay nada que proteger en estas dos. `sectors` es catálogo puro
(`hosteleria`, `estetica` y sus nombres) y `question_sets` guarda versión y
`is_active`. Que se filtrasen sería irrelevante.

Se deniegan porque el formulario público no las necesita: resuelve la
configuración del negocio por la vista `capture_point_config` y lee `questions`
filtrando por el `question_set_id` que sale de esa vista, sin tocar ninguna de
las dos. Denegar no cuesta nada y evita dejarlas abiertas por descuido.

El motivo aquí es ese y solo ese. No es que el contenido deba protegerse.

### `alerts`: confidencialidad real

Contiene `response_id`, `business_id` y el estado del envío. Legible desde fuera
revelaría qué negocios están recibiendo avisos por valoraciones bajas y con qué
frecuencia.

Y hay un motivo más fuerte: una fila de `alerts` solo se crea cuando una
valoración es baja, así que su mera existencia delata que hubo una respuesta
negativa, aunque `responses` esté protegida. Dejar `alerts` abierta sería un
rodeo a la protección de `responses`.

### `reports`: confidencialidad real

`metrics` es el jsonb con el histórico completo de calidad de cada negocio.
Abierto, entrega a cualquiera la evolución de todos los clientes del servicio.

Además, es lo que sostiene la política de retención: `docs/06-privacidad-rgpd.md`
conserva los `reports` de forma indefinida por ser agregados sin dato individual,
y esa retención indefinida solo se justifica si el acceso está cerrado.

---

## Configuración del punto de captación

Los datos del negocio que necesita el formulario se obtienen por esta función,
nunca dando acceso directo a `businesses`. Devuelve **exactamente cuatro
columnas**, que son las únicas que usan las tres pantallas de `docs/03`.

`alert_email` queda deliberadamente fuera. No puede ser accesible desde el
cliente público bajo ninguna circunstancia.

```sql
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

revoke execute on function capture_point_config(text) from public;
grant execute on function capture_point_config(text) to anon, authenticated;
```

El formulario la invoca como `/rest/v1/rpc/capture_point_config?p_code=ABC12345`.

**Por qué función y no vista.** PostgREST solo permite filtrar por columnas que
la relación proyecta. Una vista recortada a estas cuatro columnas no podría
filtrarse por el código del punto de captación, y un `select=*` sin filtro
devolvería la configuración de todos los negocios activos en una sola llamada.
Con el código como parámetro, quien no lo conoce no obtiene nada.

**Por qué `security definer`.** `businesses` no tiene ninguna policy para el rol
anónimo, así que la consulta necesita los permisos del propietario para resolver
el join. Es el mismo motivo por el que la vista anterior llevaba
`security_invoker = false`.

**Por qué `set search_path = ''`.** En una función `security definer`, un
`search_path` heredado del llamante permitiría resolver `capture_points` o
`businesses` a objetos suplantados. Por eso se fija vacío y los nombres van
cualificados con `public.`.

**Qué se quitó y por qué.** La versión anterior exponía ocho columnas:

| Columna retirada | Motivo |
|---|---|
| `capture_point_label` | Dato para el personal ("Mesa 4", "Ana"), destinado al PDF imprimible. Ninguna pantalla lo muestra, y con `type = 'professional'` es el nombre de pila de un trabajador |
| `capture_point_id` | Solo hacía falta cuando el cliente insertaba en `responses`. Desde D20 lo resuelve el servidor a partir del código |
| `business_id` | Igual que el anterior |
| `capture_point_code` | El cliente ya lo tiene: viene en la URL que acaba de abrir |

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
