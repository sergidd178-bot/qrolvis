# 03 · Flujo del formulario público

## Objetivo de diseño

Que una persona que acaba de pagar y quiere irse complete el formulario sin
arrepentirse de haberlo empezado.

Presupuesto total: **20 segundos**. Todo lo que no quepa ahí, fuera.

---

## Las tres pantallas

### Pantalla 1 — Un solo toque

```
        [Nombre del negocio]

     ¿Cómo ha ido tu visita?

     😞   🙁   😐   🙂   😀
      1    2    3    4    5
```

- Un solo elemento interactivo. Nada más en pantalla.
- Sin botón de continuar: **tocar la valoración avanza directamente**.
- Iconos grandes, mínimo 56 px de lado, separados para el pulgar.
- Al tocar: se crea la respuesta en base de datos y se pasa a la pantalla 2.

**Esta pantalla es la que decide todo.** Si aquí hay dos preguntas, se pierde la
mitad de la gente. Ninguna funcionalidad futura puede añadir nada aquí.

### Pantalla 2 — Dimensiones y comentario

Tres o cuatro preguntas de valoración según el sector, más un campo de texto
opcional. Todo en una sola pantalla, sin scroll en un móvil estándar si es posible.

```
     Valora estos aspectos

     Calidad de la comida     ⭐⭐⭐⭐⭐
     Atención del personal    ⭐⭐⭐⭐⭐
     Rapidez                  ⭐⭐⭐⭐⭐
     Limpieza                 ⭐⭐⭐⭐⭐

     ¿Algo que quieras contarnos? (opcional)
     [                                    ]

              [ Enviar ]
```

- Todas las preguntas de dimensión son **opcionales**. Obligar reduce la
  finalización más de lo que aporta el dato.
- El campo de texto nunca es obligatorio.
- Debe existir un enlace discreto de "saltar" que lleve directamente al final.

### Pantalla 3 — Cierre y Google

El mensaje cambia según la valoración global. **El enlace a Google se muestra
siempre, en los dos casos.**

**Si la valoración fue 4 o 5:**

```
     ¡Gracias!

     Nos alegra que hayas disfrutado.
     ¿Nos ayudas dejando una reseña en Google?
     Nos ayuda muchísimo.

           [ Dejar reseña en Google ]
```

**Si la valoración fue 1, 2 o 3:**

```
     Gracias por decírnoslo

     Sentimos que no haya ido como esperabas.
     Hemos avisado al responsable y lo tendrá en cuenta.

     Si quieres, también puedes dejar tu opinión
     pública en Google.

           [ Dejar reseña en Google ]
```

---

## Cumplimiento de las políticas de Google

Este es un punto que no admite interpretaciones flexibles.

**Prohibido (review gating):** mostrar el enlace a Google solo a quienes puntúan
alto, o esconderlo a quienes puntúan bajo. Google lo considera manipulación de
reseñas y puede penalizar o eliminar el perfil del negocio cliente. Sería un daño
grave y directo a la persona que nos paga.

**Lo que sí hacemos:**

- El enlace se muestra al 100% de quienes llegan a la pantalla 3.
- El botón tiene la misma prominencia visual en ambos casos.
- Lo único que varía es el texto de acompañamiento.
- No se ofrece ningún incentivo a cambio de una reseña positiva.
- Se registra `google_link_shown` en cada respuesta para poder demostrar, si
  alguna vez hiciera falta, que no hay filtrado.

**Verificación obligatoria en revisión de código:** cualquier condicional que
haga depender la presencia del botón de Google del valor de `overall_rating` es
un fallo bloqueante.

---

## Comportamiento de la alerta

Una respuesta con `overall_rating <= 2` dispara una alerta inmediata al negocio.
El umbral es configurable a nivel global pero no por cliente en la versión 1.

La alerta se envía tras la pantalla 2, no tras la 1, para poder incluir el
comentario si existe. Si el usuario abandona en la pantalla 2, se envía igualmente
a los 30 minutos mediante la tarea de cierre de respuestas parciales.

Detalle del contenido en `05-informes-y-alertas.md`.

---

## Idioma

Tres fuentes, y se consultan en este orden. La primera que resuelve, gana:

1. **El selector manual** (`?lang=`). Es una elección deliberada de quien tiene
   el móvil en la mano, así que gana a todo lo demás.
2. **`Accept-Language`, si pide catalán o castellano.** Quien tiene el navegador
   en una de las dos lenguas del producto ya ha dicho cuál entiende.
3. **`businesses.default_language`.** Cubre al visitante cuyo navegador está en
   inglés, francés o alemán.

- Selector manual discreto en el pie, siempre visible.
- El idioma elegido se guarda en la respuesta. Es un dato útil para el cliente.
- Si el negocio no existe o no tiene idioma válido, castellano.
- El idioma resuelto se declara en `<html lang>` y también en el `<main>` de la
  página. Los dos coinciden salvo cuando se usa el selector manual, porque el
  layout no ve la cadena de consulta; el detalle está en `01-arquitectura.md`.

**Por qué hay un tercer escalón (D32).** La regla original era solo `Accept-Language`:
catalán si lo pedía, castellano en cualquier otro caso. Eso trataba igual dos
casos distintos —«este navegador pide castellano» y «este navegador pide inglés
y no sabemos qué quiere»— y dejaba `default_language` como configuración que el
panel ofrecía y el formulario no miraba nunca. Con la regla nueva, un turista con
el móvil en inglés que entra en un local de Girona que atiende en catalán ve
catalán, no castellano.

El orden importa: el navegador va **antes** que el negocio. Alguien con el móvil
en castellano entiende castellano, y ese dato es más fiable sobre esa persona
concreta que la preferencia del local.

---

## Casos límite

| Situación | Comportamiento |
|---|---|
| Código de QR inexistente | Página neutra: "Este código no está disponible". Sin detalles técnicos |
| Punto de captación desactivado | Mismo mensaje |
| Negocio en estado `paused` | Mismo mensaje |
| Negocio sin `google_review_url` | Pantalla 3 sin botón, solo agradecimiento |
| Mismo dispositivo, mismo punto, menos de 6 horas | Se muestra "Ya hemos recibido tu opinión, gracias" |
| Sin conexión al enviar | Reintento automático, y mensaje claro si falla |
| JavaScript desactivado | Debe funcionar con formularios HTML nativos, degradado |

---

## Accesibilidad

No es un extra opcional: parte del público de estos negocios es mayor.

- Contraste mínimo AA
- Área táctil mínima de 44 px
- Los iconos de valoración llevan etiqueta textual visible, no solo el emoji
- Navegable con teclado
- Compatible con lector de pantalla en la valoración

---

## Lo que nunca se añade a este formulario

- Campos de nombre, email o teléfono
- Logo pesado o imágenes de fondo
- Animaciones de transición
- Ventanas emergentes
- Publicidad de nuestro propio servicio más allá de una línea discreta en el pie
- Cualquier script de terceros
