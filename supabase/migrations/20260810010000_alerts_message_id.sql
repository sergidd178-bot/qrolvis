-- Identificador del mensaje que devuelve Resend al aceptar un envío.
--
-- MOTIVO. Hoy `status = 'sent'` solo dice que la API de Resend aceptó el correo,
-- no que el destinatario lo haya recibido. Son cosas distintas y ya se ha visto
-- la diferencia en producción: un aviso quedó registrado como `sent` y nunca
-- llegó a la bandeja. Sin el identificador del mensaje no hay forma de averiguar
-- qué le pasó a ese envío concreto.
--
-- Guardarlo no consulta nada por sí solo: es el dato que hará falta el día que se
-- consulte el estado real de entrega (delivered, bounced, complained) por API o
-- por webhook. Esa parte NO se implementa aquí.
--
-- NULLABLE, y con tres motivos distintos para estarlo:
--   - las filas anteriores a esta migración no lo tienen;
--   - una alerta en `pending`, `failed` o `not_applicable` no ha producido correo;
--   - Resend podría aceptar un envío sin devolver identificador.
--
-- SIN RESTRICCIÓN DE UNICIDAD, y es deliberado: el resumen agrupado es UN correo
-- que cubre N alertas, así que esas N filas comparten el mismo identificador.
-- Eso es justo lo que permite saber qué alertas viajaron en qué resumen.

alter table alerts add column message_id text;

comment on column alerts.message_id is
  'Identificador del correo en Resend. Se guarda al marcar la alerta como sent. '
  'No es único: las alertas agrupadas en un mismo resumen comparten el del correo '
  'que las llevó. Sirve para consultar el estado real de entrega más adelante; '
  'que exista NO significa que el correo se haya entregado, solo que Resend lo aceptó.';
