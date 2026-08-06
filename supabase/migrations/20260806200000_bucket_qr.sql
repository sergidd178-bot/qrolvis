-- Bucket de imágenes QR.
--
-- PRIVADO a propósito. La imagen no contiene ningún secreto —codifica una URL
-- pública— pero un bucket público permite listar sus objetos, y con esa lista
-- cualquiera obtendría el catálogo completo de códigos de todos los negocios.
-- Los códigos no son adivinables por fuerza bruta, pero sí enumerables si el
-- bucket está abierto, y con ellos se podrían enviar respuestas falsas a
-- cualquier cliente.
--
-- Y no hace falta que sea público: el QR solo se muestra en la ficha del panel
-- (autenticada, en servidor) y en el PDF imprimible (generado en servidor).
-- Ninguno de los dos necesita acceso anónimo. Se sirve con URLs firmadas de
-- vida corta.
--
-- Sin policies sobre storage.objects: solo la clave secreta accede (D23).

insert into storage.buckets (id, name, public)
values ('qr', 'qr', false)
on conflict (id) do nothing;
