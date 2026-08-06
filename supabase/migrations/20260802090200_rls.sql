-- Row Level Security. Ver docs/02-modelo-datos.md y docs/01-arquitectura.md.
--
-- Regla de fondo: el rol anónimo solo puede LEER la configuración del punto de
-- captación y las preguntas. No escribe nada y no puede leer ninguna respuesta,
-- ni siquiera la que acaba de enviar.
--
-- Toda escritura de respuestas pasa por el servidor con la clave secreta
-- (createAdminClient de lib/db/admin.ts), que salta RLS. Ver D20 en docs/08.

-- =====================================================
-- TABLAS DEL DOCUMENTO
-- =====================================================

alter table responses      enable row level security;
alter table answers        enable row level security;
alter table capture_points enable row level security;
alter table businesses     enable row level security;
alter table questions      enable row level security;

-- El público NO escribe directamente. No hay policy de insert para anon.
--
-- Antes existían public_insert_responses y public_insert_answers, ambas con
-- `with check (true)`. Esa condición no comprueba nada: cualquiera con la clave
-- publishable, que es pública por diseño y se lee del bundle del formulario,
-- podía escribir contra PostgREST sin pasar por ninguna validación del servidor.
-- RLS activo con una policy permisiva da apariencia de control sin ejercerlo.
--
-- El riesgo explotable estaba en answers: se podían colgar valoraciones y
-- comentarios de un response_id ajeno, suplantando lo que otra persona escribió.
--
-- En responses la policy nunca fue explotable, pero por accidente y no por
-- diseño: el trigger set_response_business_id() no es security definer, así que
-- su join contra businesses no ve nada con el rol anónimo y aborta antes de que
-- se evalúe el with check. Ese trigger existe para derivar business_id, no para
-- controlar acceso; marcarlo security definer eliminaría la barrera sin previo
-- aviso. No apoyarse en él al añadir tablas nuevas: cada tabla necesita su
-- denegación explícita aquí.
--
-- Las escrituras van ahora por /api/responses con la clave secreta, donde sí se
-- valida el punto de captación, la pertenencia de cada pregunta al conjunto y la
-- ventana antifraude por device_token.
--
-- responses y answers quedan con RLS activo y sin ninguna policy para anon: ni
-- lectura ni escritura.

-- El público puede leer el punto de captación activo por su código
create policy public_read_capture_point on capture_points
  for select to anon using (is_active = true);

create policy public_read_questions on questions
  for select to anon using (true);

-- =====================================================
-- TABLAS RESTANTES: DENEGAR POR DEFECTO
-- =====================================================
--
-- Estas cuatro tablas no aparecen en la sección de RLS de docs/02. Sin RLS
-- activo quedarían expuestas a través de PostgREST al rol anónimo: alerts y
-- reports contienen datos de negocio, y reports incluye el jsonb completo de
-- métricas. Se activa RLS sin ninguna policy, de modo que el rol anónimo no
-- puede hacer nada con ellas.
--
-- El panel del operador no se ve afectado: accede desde el servidor con la
-- clave secreta, que salta RLS (docs/01, "Seguridad de datos").

alter table sectors       enable row level security;
alter table question_sets enable row level security;
alter table alerts        enable row level security;
alter table reports       enable row level security;

-- =====================================================
-- VISTA DE CONFIGURACIÓN DEL PUNTO DE CAPTACIÓN
-- =====================================================
--
-- docs/02: los datos del negocio que necesita el formulario se exponen por
-- una vista de solo lectura, nunca dando acceso directo a businesses.
--
-- alert_email queda deliberadamente fuera. No puede ser accesible desde el
-- cliente público bajo ninguna circunstancia.
--
-- security_invoker = false (comportamiento por defecto, explícito aquí para
-- que se lea la intención): la vista se ejecuta con los permisos de su
-- propietario y por tanto no aplica la RLS de businesses. Es justo lo que se
-- busca: exponer tres columnas inocuas sin abrir la tabla entera.

create view capture_point_config
with (security_invoker = false) as
select
  cp.id                as capture_point_id,
  cp.code              as capture_point_code,
  cp.label             as capture_point_label,
  b.id                 as business_id,
  b.name               as business_name,
  b.default_language,
  b.google_review_url,
  b.question_set_id
from capture_points cp
join businesses b on b.id = cp.business_id
where cp.is_active = true
  and b.status = 'active';

grant select on capture_point_config to anon, authenticated;
