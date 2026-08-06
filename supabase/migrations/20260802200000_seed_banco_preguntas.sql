-- Seed del banco de preguntas. Fuente de verdad: docs/04-banco-preguntas.md.
--
-- Los textos están copiados literalmente del documento. Una vez aplicada esta
-- migración NO se editan: ni una coma. Cambiar el texto de una pregunta activa
-- rompe la comparación con meses anteriores sin que nadie se dé cuenta (R6).
-- Para cambiar algo se crea version = 2 del conjunto en una migración nueva, se
-- marca activa, y la versión 1 queda inactiva pero intacta.
--
-- La pregunta global `overall` (¿Cómo ha ido tu visita?) NO se inserta aquí a
-- propósito: no pertenece a ningún conjunto, se almacena en
-- responses.overall_rating.
--
-- is_required se deja en false en las diez preguntas, y es una decisión tomada,
-- no un valor por defecto pendiente de revisar. docs/03-flujo-formulario.md,
-- "Pantalla 2": todas las preguntas de dimensión son opcionales, porque obligar
-- reduce la finalización más de lo que aporta el dato, y el campo de texto nunca
-- es obligatorio. No poner ninguna a true sin cambiar antes esa regla.

insert into sectors (id, code, name_es, name_ca) values
  (1, 'hosteleria', 'Hostelería', 'Hostaleria'),
  (2, 'estetica',   'Estética',   'Estètica');

insert into question_sets (sector_id, version, is_active) values
  (1, 1, true),
  (2, 1, true);

-- Las preguntas se enganchan a su conjunto por (sector_id, version), que es la
-- clave única del conjunto, en vez de por un uuid escrito a mano.
insert into questions
  (question_set_id, code, dimension, type, text_es, text_ca, position)
select
  qs.id, v.code, v.dimension, v.type, v.text_es, v.text_ca, v.position
from question_sets qs
join (values
  -- Hostelería · versión 1
  (1, 'food_quality',    'Producto',    'rating', 'Calidad de la comida',           'Qualitat del menjar',            1),
  (1, 'staff_attention', 'Atención',    'rating', 'Atención del personal',          'Atenció del personal',           2),
  (1, 'speed',           'Rapidez',     'rating', 'Rapidez del servicio',           'Rapidesa del servei',            3),
  (1, 'cleanliness',     'Limpieza',    'rating', 'Limpieza del local',             'Neteja del local',               4),
  (1, 'comment',         'Comentario',  'text',   '¿Algo que quieras contarnos?',   'Vols explicar-nos alguna cosa?', 5),
  -- Estética · versión 1
  (2, 'result_quality',  'Resultado',   'rating', 'Resultado del servicio',         'Resultat del servei',            1),
  (2, 'staff_attention', 'Atención',    'rating', 'Trato del profesional',          'Tracte del professional',        2),
  (2, 'punctuality',     'Puntualidad', 'rating', 'Puntualidad y tiempo de espera', 'Puntualitat i temps d''espera',  3),
  (2, 'cleanliness',     'Higiene',     'rating', 'Limpieza e higiene',             'Neteja i higiene',               4),
  (2, 'comment',         'Comentario',  'text',   '¿Algo que quieras contarnos?',   'Vols explicar-nos alguna cosa?', 5)
) as v (sector_id, code, dimension, type, text_es, text_ca, position)
  on v.sector_id = qs.sector_id
where qs.version = 1;
