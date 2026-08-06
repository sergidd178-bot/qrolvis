# 07 · Plan de implementación

Cada fase tiene un **criterio de salida**. No se pasa a la siguiente sin cumplirlo.

Estado actual: **Fase 1 (cimientos y formulario público), en curso. Fase 0
omitida deliberadamente, riesgo asumido por Sergi.** No se ejecutó: no hay
validación con ningún negocio real.

---

## Fase 0 · Validación sin código

> **NO EJECUTADA.** Esta fase se omitió deliberadamente, con el riesgo asumido
> por Sergi, y se pasó directamente a la Fase 1. Nada de lo que sigue llegó a
> hacerse: no hay ningún negocio real que haya probado el formulario, ni las 20
> respuestas del criterio de salida, ni la conversación sobre el precio. Se
> mantiene escrita porque sigue siendo la validación pendiente, no porque esté
> superada.

**No se escribe una línea de código de producción hasta superar esta fase.**

Es la fase que se salta todo el mundo y es la que decide si el proyecto tiene
sentido. El riesgo número uno del proyecto no es técnico: es que nadie escanee
el QR.

### Qué hacer

1. Crear un formulario con una herramienta gratuita: 1 pregunta de valoración
   global, 4 de dimensión, 1 texto libre. Sector hostelería.
2. Generar un QR gratuito que apunte a él.
3. Imprimir 5 expositores de mesa y 1 cartel para la barra.
4. Conseguir **un** negocio conocido que acepte un mes gratis.
5. Formar al personal: que lo mencione al llevar la cuenta. Esto es lo que más
   mueve la aguja.
6. Dejarlo dos semanas.
7. Contar respuestas y hablar con el dueño.

### Criterio de salida

- **Mínimo 20 respuestas en dos semanas** en un local de volumen normal.
- El dueño, al ver los datos, reacciona con interés real. No cortesía.
- El dueño responde afirmativamente a: "si esto siguiera funcionando y además te
  avisara al momento de las valoraciones malas y te trajera reseñas de Google,
  ¿pagarías 30 € al mes?"

### Si no se cumple

**No construyas.** El problema es la captación y ningún software lo arregla.
Prueba a cambiar la colocación del QR, el guion del personal o el incentivo, y
repite. Si tras dos intentos sigue sin funcionar, el modelo no es viable en su
forma actual y hay que replantearlo antes de invertir semanas de desarrollo.

Coste de esta fase: unos euros de impresión y dos conversaciones.
Coste de saltársela: semanas de desarrollo sobre una hipótesis sin verificar.

---

## Fase 1 · Cimientos y formulario público

### Tareas

1. Proyecto Next.js con TypeScript
2. Proyecto Supabase **en región UE**
3. Migraciones con el esquema de `02-modelo-datos.md`
4. Seed de sectores, conjuntos de preguntas y preguntas de `04-banco-preguntas.md`
5. Políticas de Row Level Security
6. Trigger de desnormalización de `business_id`
7. Ruta `/f/[code]` con las tres pantallas de `03-flujo-formulario.md`
8. Endpoints de creación y actualización de respuesta
9. Diccionario de traducciones castellano y catalán
10. Aviso de privacidad
11. Despliegue en Vercel

### Criterio de salida

- Un QR físico impreso, escaneado con un móvil real, guarda una respuesta completa
- ✅ **First Contentful Paint de `/f/[code]` por debajo de 1 segundo con 4G
  lento**, verificado con Lighthouse en perfil móvil.
  **Cumplido: 722 ms**, peor caso de las tres pantallas (la 2, la más pesada;
  la 1 da 684 ms y la 3, 699 ms). Cada cifra es la peor de tres ejecuciones.
  Evidencia en `docs/evidencias/lighthouse-f-code-pantalla2.report.json`, con las
  otras dos pantallas en los archivos hermanos y las condiciones en
  `docs/evidencias/rendimiento-f-code.md`.

  Depende de `experimental.inlineCss` (D22): sin ese flag el peor caso sube a
  942 ms y el criterio queda al borde. Cualquier actualización de Next.js obliga
  a volver a medir antes de dar el criterio por vigente.

El criterio anterior era "bundle por debajo de 30 KB comprimidos". Se retiró: era
un proxy que no anticipaba el suelo fijo de runtime de App Router (~141 KB gzip
que se cargan haya o no componentes de cliente). El objetivo real siempre fue la
velocidad percibida en 4G débil, y esa sí se cumple. Detalle en `docs/01`,
"Rendimiento del formulario público", y decisión D21 en `docs/08`.
- El rol anónimo no puede leer ninguna respuesta (verificado intentándolo)
- Funciona con JavaScript desactivado, de forma degradada

---

## Fase 2 · Panel de administración y QR

### Tareas

1. Autenticación del operador con Supabase Auth
2. Alta y edición de negocios
3. Alta de puntos de captación con generación de código único
4. Generación de imágenes QR y almacenamiento
5. PDF imprimible con todos los QR de un negocio, etiquetados
6. Listado de respuestas con filtros por negocio, periodo y valoración
7. Vista de comentarios

### Criterio de salida

- Dar de alta un negocio completo, con 4 puntos de captación, en menos de 5 minutos
- El PDF de QR sale listo para imprimir y plastificar, sin retoques

---

## Fase 3 · Alertas

### Tareas

1. Integración con Resend
2. Detección de la condición `overall_rating <= 2`
3. Plantilla de email según `05-informes-y-alertas.md`
4. Registro en la tabla `alerts`
5. Límite de 5 alertas por negocio y día, con agrupación
6. Tarea de cierre de respuestas parciales a los 30 minutos
7. Visibilidad de fallos de envío en el panel

### Criterio de salida

- Una valoración de 1 estrella produce un email legible en el móvil en menos de
  2 minutos
- Un fallo de envío es visible en el panel, no silencioso

---

## Fase 4 · Informes

### Tareas

1. Capa `/lib/metrics` con **todas** las definiciones de `05-informes-y-alertas.md`
2. Tests de la capa de métricas, incluidos todos los casos del punto 5 de ese documento
3. Plantilla HTML del informe
4. Conversión a PDF
5. Tarea programada mensual
6. Envío por email al cliente
7. Generación manual desde el panel para un periodo arbitrario

### Criterio de salida

- Los tests de métricas pasan, incluidos los casos límite
- Un informe con 8 respuestas muestra `INSUFICIENTE` donde corresponde y **no
  inventa ningún número**
- El PDF es legible en el móvil
- Generar el informe de un mes para todos los clientes es un solo clic

---

## Fase 5 · Piloto real

### Tareas

1. Contrato de servicio y contrato de encargo de tratamiento
2. Materiales físicos definitivos
3. Guion de venta y guion de formación del personal
4. Alta de los 3 primeros clientes de pago
5. Revisión a las dos semanas de cada uno

### Criterio de salida

Los tres criterios de `00-vision-producto.md`:

- Mediana superior a 40 respuestas mensuales por local
- Al menos 4 de 5 clientes renuevan el tercer mes
- Menos de 1 hora mensual de operación manual por cliente

---

## Orden de construcción dentro de cada fase

Regla general: **primero el camino que atraviesa todo el sistema, después el detalle**.

En la Fase 1, antes de pulir el diseño del formulario, conseguir que una respuesta
llegue desde el móvil hasta la base de datos. En la Fase 4, antes de la plantilla
del PDF, que la capa de métricas devuelva números correctos.

Un camino completo y feo enseña más que media aplicación bonita.

---

## Registro de avance

| Fase | Estado | Fecha | Notas |
|---|---|---|---|
| 0 · Validación | Superada | *(pendiente de anotar)* | *(pendiente: nº de respuestas en dos semanas y reacción del dueño)* |
| 1 · Cimientos | En curso | 2026-08-02 | Tarea 1 hecha: proyecto Next.js con TypeScript y App Router |
| 2 · Panel y QR | | | |
| 3 · Alertas | | | |
| 4 · Informes | | | |
| 5 · Piloto | | | |

Mantener esta tabla actualizada. Es lo primero que lee Claude Code al empezar
una sesión.
