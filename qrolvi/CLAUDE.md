# CLAUDE.md

Instrucciones permanentes para cualquier sesión de Claude Code en este repositorio.
Este archivo se lee siempre. Es corto a propósito. El detalle está en `/docs`.

---

## Qué es este proyecto

Servicio de recogida de opiniones mediante código QR para negocios de servicios
(hostelería y estética) en Girona y comarca.

El cliente final es el **dueño del negocio**, no el consumidor. El consumidor solo
rellena un formulario de 20 segundos.

El producto tiene tres entregas de valor, en este orden de importancia comercial:

1. **Más reseñas en Google.** Es lo que hace que el cliente pague.
2. **Aviso inmediato cuando alguien queda descontento**, antes de que se convierta
   en una reseña pública negativa.
3. **Informe mensual** con la evolución de la calidad y una recomendación concreta.

---

## Reglas duras

Estas reglas no se negocian, no se optimizan y no se saltan por conveniencia
técnica. Si una tarea parece exigir romper una de ellas, **detente y pregunta**.

### R1. Nunca inventes una fórmula ni una métrica
Todas las métricas están definidas en `docs/05-informes-y-alertas.md`.
Si necesitas una que no está ahí, no la deduzcas ni uses "la habitual".
Para y pregunta.

### R2. Nunca implementes filtrado de reseñas (review gating)
El enlace a Google se muestra **a todos los que completan el formulario**,
independientemente de su valoración. Lo único que cambia según la valoración es
el texto del mensaje y si se dispara una alerta interna.
Filtrar quién ve el enlace viola las políticas de Google y puede provocar la
eliminación del perfil del cliente.

### R3. El formulario público no recoge ningún dato personal
Sin nombre, sin email, sin teléfono, sin login. No se almacena la IP.
No se usan cookies de seguimiento. Detalle en `docs/06-privacidad-rgpd.md`.

### R4. Las reglas de n mínimo se aplican en código, no en la plantilla
Ninguna métrica se publica en un informe si no supera su umbral de muestra
mínima. Los umbrales están en `docs/05`. Esta lógica vive en la capa de cálculo
y devuelve un estado explícito `INSUFICIENTE`, nunca un número engañoso.

### R5. La media aritmética nunca es la métrica principal
Se muestra la distribución completa y el porcentaje de detractores.
La media puede aparecer como dato secundario y solo con muestra suficiente.

### R6. Los conjuntos de preguntas son versionados e inmutables
Modificar una pregunta publicada rompe la comparación histórica.
Para cambiar preguntas se crea una nueva versión del conjunto.
Las respuestas antiguas siguen apuntando a su versión original.

### R7. Las respuestas no se editan ni se borran a petición del cliente
Un negocio no puede eliminar valoraciones negativas. Si lo pide, la respuesta es
no. Detalle en `docs/06`.

### R8. Nada de IA en la versión 1
Sin resúmenes generados, sin clasificación automática de comentarios,
sin análisis de sentimiento. Se añadirá cuando haya volumen que lo justifique.

### R9. Velocidad del formulario público por encima de todo
La página del formulario debe cargar en menos de 1 segundo con 4G débil dentro
de un local. Sin librerías pesadas, sin fuentes externas, sin analítica de
terceros en esa ruta.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router), TypeScript |
| Base de datos, auth y storage | Supabase (PostgreSQL) |
| Alojamiento | Vercel |
| Email transaccional | Resend |
| Generación de PDF | HTML a PDF en servidor |
| Generación de QR | Librería en servidor, salida en PDF imprimible |

No se añaden dependencias nuevas sin justificarlo. Ante la duda, menos librerías.

---

## Estructura del repositorio

```
/app
  /f/[code]          Formulario público. Ruta crítica de rendimiento.
  /admin             Panel interno. Solo para el operador del servicio.
  /api               Endpoints internos
/lib
  /metrics           Cálculo de métricas. Única fuente de verdad numérica.
  /reports           Composición del informe mensual
  /alerts            Detección y envío de avisos
  /db                Acceso a Supabase, tipos generados
/supabase
  /migrations        DDL versionado
/docs                Especificación funcional
```

---

## Convenciones

- **Idioma del código**: inglés. Nombres de tabla, columna, función y variable
  en inglés.
- **Idioma de la interfaz**: castellano y catalán. Nunca texto en duro en los
  componentes, siempre desde el diccionario de traducciones.
- **Idioma de la documentación y los commits**: castellano.
- Nombres de tabla y columna en `snake_case`, plural para tablas.
- Componentes de React en `PascalCase`, funciones y variables en `camelCase`.
- Toda lógica de cálculo vive en `/lib`, nunca dentro de un componente.
- Los comentarios explican **por qué**, no qué hace el código.

---

## Mapa de documentos

Cárgalos solo cuando la tarea lo requiera.

| Documento | Léelo cuando |
|---|---|
| `docs/00-vision-producto.md` | Necesites contexto de negocio, precios o alcance |
| `docs/01-arquitectura.md` | Toques estructura, rutas o decisiones técnicas |
| `docs/02-modelo-datos.md` | Toques el esquema, migraciones o consultas |
| `docs/03-flujo-formulario.md` | Trabajes en el formulario público o en Google |
| `docs/04-banco-preguntas.md` | Cargues o modifiques preguntas por sector |
| `docs/05-informes-y-alertas.md` | Toques cualquier cálculo, informe o alerta |
| `docs/06-privacidad-rgpd.md` | Toques datos, retención o textos legales |
| `docs/07-plan-implementacion.md` | Necesites saber qué construir y en qué orden |
| `docs/08-decisiones.md` | Dudes de si algo está decidido o abierto |

---

## Estado del proyecto

Fase actual: **no iniciado**. Ver `docs/07-plan-implementacion.md`.

Antes de escribir código de producción debe completarse la Fase 0 (validación
manual con un negocio real). Si la Fase 0 no está marcada como superada en
`docs/07`, pregunta antes de empezar a construir.
