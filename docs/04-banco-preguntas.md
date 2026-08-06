# 04 · Banco de preguntas

## Reglas de diseño

1. **Máximo 4 preguntas de dimensión** por sector. Cada pregunta adicional reduce
   la finalización.
2. **Una dimensión por pregunta.** Nunca "calidad y precio" en la misma.
3. **Redacción neutra.** No inducir la respuesta.
4. **Vocabulario del cliente**, no del sector. "Rapidez", no "tiempo de servicio".
5. **Un solo campo de texto libre**, siempre opcional y siempre al final.
6. Las preguntas deben ser respondibles por alguien que no ha prestado atención.
   Si requiere reflexión, no sirve.

## Regla de versionado

Estas preguntas, una vez publicadas, **no se editan**. Ni una coma. Cambiar el
texto de una pregunta activa rompe la comparación con meses anteriores sin que
nadie se dé cuenta.

Para cambiar algo se crea `version = 2` del conjunto, se marca activa, y la
versión 1 queda inactiva pero intacta. Las respuestas históricas siguen apuntando
a su versión.

---

## Pregunta global (común a todos los sectores)

| Campo | Valor |
|---|---|
| `code` | `overall` |
| `dimension` | `overall` |
| `type` | `rating` |
| `text_es` | ¿Cómo ha ido tu visita? |
| `text_ca` | Com ha anat la teva visita? |

No pertenece a ningún conjunto: se almacena en `responses.overall_rating`.

---

## Hostelería · versión 1

Bares, restaurantes y cafeterías.

| Pos | `code` | `dimension` | Tipo | Castellano | Catalán |
|---|---|---|---|---|---|
| 1 | `food_quality` | Producto | rating | Calidad de la comida | Qualitat del menjar |
| 2 | `staff_attention` | Atención | rating | Atención del personal | Atenció del personal |
| 3 | `speed` | Rapidez | rating | Rapidez del servicio | Rapidesa del servei |
| 4 | `cleanliness` | Limpieza | rating | Limpieza del local | Neteja del local |
| 5 | `comment` | Comentario | text | ¿Algo que quieras contarnos? | Vols explicar-nos alguna cosa? |

**Descartadas y por qué:**

- *Relación calidad-precio*: siempre puntúa bajo, no es accionable, y desanima al
  dueño sin decirle qué hacer.
- *Ambiente*: demasiado subjetivo y difícil de traducir en una acción concreta.
- *Recomendarías el local*: redundante con la valoración global.

---

## Estética · versión 1

Peluquerías, salones de uñas y centros de estética.

| Pos | `code` | `dimension` | Tipo | Castellano | Catalán |
|---|---|---|---|---|---|
| 1 | `result_quality` | Resultado | rating | Resultado del servicio | Resultat del servei |
| 2 | `staff_attention` | Atención | rating | Trato del profesional | Tracte del professional |
| 3 | `punctuality` | Puntualidad | rating | Puntualidad y tiempo de espera | Puntualitat i temps d'espera |
| 4 | `cleanliness` | Higiene | rating | Limpieza e higiene | Neteja i higiene |
| 5 | `comment` | Comentario | text | ¿Algo que quieras contarnos? | Vols explicar-nos alguna cosa? |

**Nota sobre `staff_attention` en estética:** cuando el negocio tiene puntos de
captación por profesional, esta dimensión se puede desglosar por persona en el
informe. Es la funcionalidad más valorada del sector y conviene destacarla en la
venta.

**Descartadas y por qué:**

- *Asesoramiento recibido*: se solapa con "trato del profesional".
- *Precio*: mismo motivo que en hostelería.
- *Volverías*: redundante con la valoración global.

---

## Datos de inicialización

```sql
insert into sectors (id, code, name_es, name_ca) values
  (1, 'hosteleria', 'Hostelería', 'Hostaleria'),
  (2, 'estetica',   'Estética',   'Estètica');
```

Los conjuntos de preguntas y sus preguntas se cargan mediante una migración de
datos (seed), no desde el panel. El panel de la versión 1 no permite crear ni
editar preguntas: eso mantiene la integridad del versionado y evita que un
descuido rompa el histórico.

---

## Ampliaciones previstas (no en versión 1)

- **Hostelería, variante nocturna**: bares de copas, con dimensiones distintas
  (música, tiempo en barra).
- **Estética, variante centro de uñas**: durabilidad del trabajo.
- **Pregunta condicional**: si `overall_rating <= 2`, sustituir el campo de texto
  genérico por "¿Qué ha fallado?". Mejora la calidad del comentario, pero añade
  lógica al formulario. Evaluar tras el primer trimestre.
