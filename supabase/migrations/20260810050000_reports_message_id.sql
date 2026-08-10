-- Identificador del correo en Resend, para el informe mensual.
--
-- Mismo criterio que `alerts.message_id`: `status = 'sent'` solo dice que Resend
-- ACEPTÓ el envío, no que el cliente lo recibiera. Ya se comprobó en producción
-- que un aviso quedara en `sent` y nunca llegara a la bandeja. Sin este dato no
-- hay forma de averiguar qué pasó con un envío concreto.
--
-- Nullable: una fila existe en `pending` o `generated` mucho antes de enviarse.
--
-- Sin `unique`, aunque aquí un informe sí es un correo y podría llevarlo: un
-- reenvío legítimo produciría un identificador nuevo para la misma fila, y la
-- restricción no aportaría nada mientras que sí podría estorbar.

alter table reports add column message_id text;

comment on column reports.message_id is
  'Identificador del correo en Resend, guardado al marcar el informe como sent. '
  'Que exista NO significa que se haya entregado: solo que Resend lo acepto. '
  'Si se reenvia, se sobrescribe con el del ultimo envio.';
