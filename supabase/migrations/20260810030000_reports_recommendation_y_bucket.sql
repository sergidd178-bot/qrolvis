-- Dos cosas que faltaban para poder generar informes desde el panel.

-- 1. La recomendación del mes, escrita por el operador.
--
-- docs/05 §3, Bloque 5 la llama "lo que más valor percibido aporta" y es el
-- único trabajo manual aceptado en la versión 1. No tenía dónde guardarse: sin
-- esta columna, al salir de la pantalla se perdía el texto, regenerar obligaba a
-- reescribirlo desde cero, y no quedaba constancia de qué se le dijo al cliente.
--
-- Nullable porque una fila puede existir en `pending` antes de que nadie escriba
-- nada. Lo que NO puede es generarse un PDF sin ella: eso lo impide
-- `generateReport()`, que lanza si el texto viene vacío o con los corchetes del
-- borrador sin rellenar.

alter table reports add column recommendation text;

comment on column reports.recommendation is
  'Recomendación del mes, escrita a mano por el operador (docs/05 §3, Bloque 5). '
  'Se conserva para poder regenerar sin reescribir y para tener constancia de lo '
  'que se le dijo al cliente. Sin ella no se genera PDF.';

-- 2. Bucket de los informes en PDF.
--
-- PRIVADO, y aquí el motivo es más fuerte que en el de los QR: un informe
-- contiene comentarios íntegros de clientes, que según docs/06 pueden incluir
-- datos personales que la propia persona escribió. Un bucket público los
-- expondría a quien acertara la ruta, y las rutas son predecibles por diseño
-- —negocio y mes—, así que no habría ni que adivinarlas.
--
-- `reports.pdf_url` guarda la RUTA del objeto, no una URL: misma convención que
-- `capture_points.qr_asset_url`. Una URL firmada caducaría y quedaría guardada
-- una cadena muerta.
--
-- Sin policies sobre storage.objects: solo la clave secreta accede (D23).

insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
