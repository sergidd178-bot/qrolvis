-- Cuarto estado para `alerts`: not_applicable.
--
-- Motivo: la tarea de cierre puede encontrarse respuestas muy viejas, por
-- ejemplo si estuvo caída varios días. Avisar a un negocio de una valoración
-- de hace tres días no es un aviso, es ruido: llega tarde para actuar y
-- confunde sobre cuándo ocurrió el problema.
--
-- El límite es de 48 horas desde `submitted_at`. Pasado ese plazo la alerta se
-- registra igualmente —para que quede constancia de que se vio y de por qué no
-- se envió— pero no se manda ningún email.
--
-- Se registra en vez de omitirse por dos razones. Una: `alerts` tiene
-- unique(response_id), así que la fila es también la marca que impide que la
-- tarea vuelva a evaluar esa respuesta en cada ejecución. Y dos: docs/05 dice
-- que un fallo de envío no puede pasar desapercibido; una decisión de NO enviar
-- merece el mismo trato.
--
-- No se toca `reports`, que tiene su propia lista de estados.

alter table alerts drop constraint alerts_status_check;

alter table alerts
  add constraint alerts_status_check
  check (status in ('pending', 'sent', 'failed', 'not_applicable'));

comment on column alerts.status is
  'pending: registrada, aún sin enviar (incluye las retenidas para el resumen diario). '
  'sent: enviada. '
  'failed: se intentó y falló; el motivo va en error_detail. '
  'not_applicable: se decidió no enviarla; el motivo va en error_detail.';
