-- Servicios opcionales por negocio. Decisión D37 en docs/08.
--
-- Las alertas instantáneas y el informe mensual dejan de ir incluidos con el
-- alta y pasan a contratarse por separado. Hasta ahora los recibía todo negocio
-- activo que cumpliera las condiciones técnicas.
--
-- =====================================================
-- APAGADOS POR OMISIÓN, Y ESO TIENE CONSECUENCIAS
-- =====================================================
--
-- `default false` porque lo contrario sería facturar por omisión: un negocio
-- nuevo no tiene contratado nada hasta que alguien lo marca en el panel.
--
-- CUIDADO AL APLICAR ESTA MIGRACIÓN: los negocios que ya existen se quedan
-- también en `false`, así que dejan de recibir avisos e informes hasta que se
-- marquen a mano. No es un efecto secundario, es la consecuencia buscada de que
-- nadie tenga servicios que no ha contratado; pero hay que avisar antes, no
-- después. El 2026-08-15 solo existía Blend Barber Shop, y se marcaron sus dos
-- casillas en la misma tanda que este push.

alter table businesses
  add column instant_alerts_enabled  boolean not null default false,
  add column monthly_reports_enabled boolean not null default false;

comment on column businesses.instant_alerts_enabled is
  'Servicio opcional: aviso inmediato por valoración baja. Si es false, la alerta '
  'se detecta y se registra igual con status = skipped, pero no se envía correo '
  'ni individual ni en el resumen diario (D37).';

comment on column businesses.monthly_reports_enabled is
  'Servicio opcional: informe mensual. Si es false, el cron NI SIQUIERA lo genera '
  'y no queda fila en reports para ese periodo. El operador puede generarlo a mano '
  'desde el panel para verlo, pero el envío al cliente queda bloqueado (D37).';

-- =====================================================
-- QUINTO ESTADO PARA alerts: skipped
-- =====================================================
--
-- Hacía falta un estado propio, y no reutilizar los que ya hay:
--
--   failed          se intentó enviar y no se pudo. Aquí no se ha intentado.
--   not_applicable  el sistema decidió no enviar ESA alerta —por vieja—.
--                   Esto no depende de la alerta, sino del contrato del negocio.
--   pending         queda por procesar. Esto ya está procesado y decidido.
--
-- Confundirlos haría que el panel enseñara como avería lo que es una condición
-- comercial, y al revés: un fallo de Resend se perdería entre decenas de filas
-- de un cliente que no tiene el servicio.

alter table alerts drop constraint alerts_status_check;

alter table alerts
  add constraint alerts_status_check
  check (status in ('pending', 'sent', 'failed', 'not_applicable', 'skipped'));

comment on column alerts.status is
  'pending: registrada, aún sin enviar (incluye las retenidas para el resumen diario). '
  'sent: enviada. '
  'failed: se intentó y falló; el motivo va en error_detail. '
  'not_applicable: se decidió no enviarla —por antigüedad—; el motivo va en error_detail. '
  'skipped: el negocio no tiene contratadas las notificaciones instantáneas (D37).';
