# 01 · Arquitectura

## Principio rector

Dos aplicaciones con requisitos opuestos conviviendo en un solo proyecto:

| | Formulario público | Panel de administración |
|---|---|---|
| Usuarios | Miles de desconocidos | Una persona |
| Requisito dominante | Velocidad extrema | Comodidad de uso |
| Autenticación | Ninguna | Obligatoria |
| Optimización | Máxima | Irrelevante |

Nunca se comparte código pesado entre ambas. Si un componente del panel entra en
el bundle del formulario, es un error que hay que corregir.

---

## Rutas

```
/f/[code]                Formulario público, las tres pantallas. Ruta crítica.
/admin                   Login
/admin/negocios          Listado y alta
/admin/negocios/[id]     Ficha, puntos de captación, descarga de QR
/admin/respuestas        Consulta y filtrado
/admin/informes          Generación y descarga
/api/responses           POST público. Recibe respuestas
/api/reports/generate    POST interno. Genera informe mensual
/api/cron/monthly        Disparo programado de informes
```

`[code]` es un identificador corto y aleatorio del **punto de captación**, no del
negocio. Ver `02-modelo-datos.md` para el porqué.

**La pantalla de cierre no tiene ruta propia.** Antes figuraba aquí como
`/f/[code]/gracias`. Las tres pantallas se sirven desde `/f/[code]`, y cuál se
pinta lo decide el parámetro `s` de la URL (`s=2`, `s=3`); `r` lleva el id de la
respuesta en curso.

El motivo es no repetir trabajo en la ruta crítica (R9). Una ruta aparte tendría
que resolver otra vez la configuración del punto de captación por
`capture_point_config` antes de poder pintar el enlace a Google, y mantener en
dos sitios la regla de que ese enlace se muestra siempre. Con una sola ruta, la
configuración se resuelve una vez por pantalla y la regla vive en un único
componente.

Conviene ser exacto en un punto: esto **no** ahorra una navegación. Desde que el
formulario funciona sin JavaScript, pasar de la pantalla 2 a la 3 es un `303` del
servidor, y llevaría a `/f/[code]/gracias` con el mismo coste. Lo que se evita es
la duplicación de la resolución de datos y de la regla de Google, no el salto.

### No hay un layout raíz único

`app/layout.tsx` no existe. Cada rama tiene el suyo, y los tres renderizan su
propio `<html>` y `<body>`:

| Layout | Cubre | `<html lang>` |
|---|---|---|
| `app/f/[code]/layout.tsx` | Formulario público | Resuelto por negocio y navegador |
| `app/admin/layout.tsx` | Panel | `es` fijo |
| `app/(raiz)/layout.tsx` | `/`, marcador de posición | `es` fijo |

Con un layout compartido, `<html lang>` solo podía ser una constante, y era `es`.
Un negocio que atiende en catalán servía su formulario entero en catalán dentro
de un documento declarado en castellano: un lector de pantalla lo leía con
fonética castellana. No se podía arreglar sin separar, porque el panel va siempre
en castellano (CLAUDE.md) y compartía el mismo `<html>`.

El del formulario cuelga de `[code]` y no de un grupo de rutas más arriba porque
**un layout solo recibe los parámetros de su propio camino**, y sin el código del
punto no hay forma de saber el idioma del negocio.

La configuración del punto la necesitan el layout, para el idioma, y la página,
para pintar. Se resuelve con `getCapturePointConfig()`, envuelta en `cache()` de
React: se llama dos veces y viaja a Supabase **una**. Medido, la pantalla 1
completa tarda menos que dos consultas seguidas.

**Lo que este reparto no resuelve.** Un layout no recibe la cadena de consulta,
así que el layout del formulario no ve `?lang=`, el selector manual del pie. El
middleware podría inyectarla, pero su matcher tiene prohibido alcanzar `/f`
(D21). Consecuencia: cuando alguien cambia de idioma a mano, el `<html>` conserva
el de partida. Para cubrirlo, la página marca `lang` en su propio `<main>`, que
es la técnica de "idioma de las partes" de WCAG. En una visita normal, entrar y
responder, los dos coinciden.

---

## Rendimiento del formulario público

Requisito: **First Contentful Paint por debajo de 1 segundo con 4G lento**,
verificado con Lighthouse en perfil móvil.

Medición vigente: **722 ms** de FCP. Es el **peor caso** de las tres pantallas
—la 2, la más pesada— y la cifra que hay que citar, no la mejor.

| Pantalla | FCP, peor de tres ejecuciones |
|---|---|
| 1 · valoración global | 684 ms |
| 2 · dimensiones y comentario | **722 ms** |
| 3 · cierre y Google | 699 ms |

Evidencia:
`docs/evidencias/lighthouse-f-code-pantalla2.report.json`, con las otras dos
pantallas en los archivos hermanos. Condiciones y cómo reproducirlo en
`docs/evidencias/rendimiento-f-code.md`.

El FCP **no escala con el tamaño del documento**: la pantalla 2 sirve 39 KB de
HTML y la 3 sirve 8 KB, y miden prácticamente lo mismo. Lo que fija el suelo es
la evaluación del runtime, no los bytes. No tiene sentido razonar sobre esta
ruta en términos de "presupuesto de contenido que se va gastando".

Reglas:

- Renderizado en servidor con datos ya resueltos. Sin peticiones de datos en cliente
  para pintar la primera pantalla.
- Sin fuentes web externas. Tipografía del sistema.
- Sin librerías de UI, de animación ni de gestión de estado.
- Sin analítica de terceros. Ninguna.
- Configuración del punto de captación cacheada. Cambia muy rara vez.
- SVG en línea para los iconos de valoración. Nada de paquetes de iconos.
- Ningún componente de cliente en la ruta. Las tres pantallas son formularios
  HTML nativos con Server Actions.

Si una funcionalidad nueva empuja el FCP por encima del segundo, no entra en el
formulario. La verificación es medir, no estimar.

### Por qué el umbral es FCP y no LCP

En esta ruta el elemento LCP es el `<h1>` con el nombre del negocio, que ya viene
en el HTML inicial. No espera a ninguna descarga: su desglose es 465 ms de TTFB y
1065 ms de *render delay*, con `Load Delay` y `Load Time` a cero. Ese retraso es
coste de hidratación de React con la CPU frenada ×4, no espera de contenido.

Y la hidratación no condiciona el uso. Las tres pantallas son formularios HTML
nativos con Server Actions: funcionan con JavaScript desactivado, así que desde
el FCP se puede tocar una valoración y enviarla sin esperar a que el runtime
termine de evaluarse. Medir esta ruta por LCP mediría cuándo el navegador da por
pintado un `<h1>` que ya estaba ahí, no cuándo la persona puede usar el
formulario.

Para constancia, el LCP medido es de 1,51 s. Se registra, pero no es el umbral.

### Por qué desaparece el presupuesto de 30 KB

Hasta ahora esta sección fijaba un tope de 30 KB comprimidos de JavaScript en la
ruta. Era un **proxy** del objetivo real, y resultó no ser alcanzable: App Router
carga siempre su runtime de React, cliente de RSC y router, unos 141 KB gzip
efectivos en un navegador moderno, haya o no componentes de cliente en la página.

Se comprobó de forma directa: con cero `"use client"` en las tres pantallas, el
código propio del formulario aporta **0 KB** al bundle y el único módulo de
cliente que la ruta arrastra es `app/global-error.tsx`, con 0,3 KB, que Next
obliga a que sea de cliente. Quitar código no baja de 30 KB porque el peso no es
código nuestro. Cumplir ese tope exigiría servir la ruta fuera de App Router, con
HTML compuesto a mano y cero React.

El requisito de fondo nunca fue un peso concreto: era **velocidad percibida en 4G
débil**, y eso es lo que ahora se mide y se cumple.

---

## Envío de respuestas

El formulario tiene tres pantallas y **guarda al final de la primera**.

Motivo: la mayoría de abandonos ocurren después del primer toque. Guardar solo al
final descarta precisamente las respuestas más fáciles de conseguir.

```
Pantalla 1  →  POST /api/responses          → crea response, devuelve response_id
Pantalla 2  →  PATCH /api/responses/[id]    → añade dimensiones y comentario
Pantalla 3  →  PATCH /api/responses/[id]    → marca completed
```

Una respuesta que solo tiene la pantalla 1 es **válida y se cuenta**. Se marca con
`completeness = 'partial'`. Las métricas por dimensión solo usan las completas;
la valoración global y el volumen usan todas.

---

## Autenticación

Solo el panel. Supabase Auth con email y contraseña. Un único usuario operador en
la versión 1. Sin roles, sin invitaciones, sin recuperación automática.

El formulario público no tiene sesión ni identidad de ningún tipo.

---

## Seguridad de datos

- Row Level Security activo en todas las tablas.
- El rol anónimo **no escribe nada**. Solo puede **leer** los `capture_points`
  activos y las `questions`. Nada más.
- El rol anónimo no puede leer ninguna respuesta, ni siquiera la propia.
- Toda escritura en `responses` y `answers` se hace desde el servidor con la
  clave secreta, a través de `createAdminClient()` en los endpoints de
  `/api/responses`.
- Las claves de servicio nunca llegan al cliente.

**Por qué el rol anónimo ya no inserta.** Hasta la decisión D20 existían dos
policies de insert, `public_insert_responses` y `public_insert_answers`, ambas
con `with check (true)`. Esa condición no comprueba nada. La clave publishable es
pública por diseño y se lee del bundle del formulario, así que cualquiera podía
extraerla y escribir directamente contra PostgREST, sin pasar por la validación
del servidor: sin comprobación del punto de captación, sin comprobar que cada
pregunta pertenezca al conjunto correcto y sin la ventana antifraude por
`device_token`.

El riesgo explotable estaba en `answers`. Con la policy puesta, cualquiera podía
insertar filas colgadas de un `response_id` ajeno y adjudicar a la respuesta de
otra persona valoraciones o comentarios de texto que esa persona nunca escribió.
Esto se verificó contra el proyecto remoto: tras retirar la policy, el intento
devuelve `42501` (`new row violates row-level security policy`).

En `responses` la policy nunca llegó a ser explotable, pero **no por diseño**. El
trigger `set_response_business_id()` es `before insert` y no es `security
definer`, así que su `select` sobre `capture_points join businesses` se ejecuta
con los permisos de quien inserta. `businesses` no tiene ninguna policy para el
rol anónimo, de modo que el join devuelve cero filas, `business_id` queda a null
y el trigger lanza una excepción antes de que Postgres llegue siquiera a evaluar
el `with check`. Cualquier inserción anónima moría ahí, con policy o sin ella.

Conviene subrayar que eso es un **efecto secundario, no buscado**, de una
decisión de diseño con otro propósito: el trigger existe para que `business_id` y
`question_set_id` se deriven siempre del punto de captación y no puedan
desincronizarse, no para controlar el acceso. Basta con marcarlo `security
definer`, algo perfectamente razonable de hacer algún día, para que esa barrera
desaparezca sin que nadie lo note. **No debe darse por supuesta esta protección
al añadir tablas nuevas**: cada tabla necesita su propia denegación explícita en
RLS, y no vale apoyarse en que un trigger de otra tabla falle por el camino.

Tener RLS activo con una policy permisiva es peor que no tenerla: da apariencia
de control sin ejercerlo. Con la escritura en el servidor, la validación y el
límite de abuso quedan en un único sitio que el cliente no puede rodear.

**RLS sin policies también deniega a `authenticated`.** `sectors`,
`question_sets`, `alerts` y `reports` tienen RLS activo y ninguna policy. Eso no
bloquea solo al rol anónimo: bloquea igualmente al rol `authenticated`, es decir
al operador que entra al panel con Supabase Auth.

Hoy no afecta, porque el panel accede desde el servidor con la clave secreta, que
salta RLS. Pero si en la Fase 2 alguna consulta del panel acaba usando el cliente
de sesión del operador en lugar de la clave secreta, esas cuatro tablas
devolverán **vacío sin dar ningún error**. Es el mismo tipo de fallo silencioso
que el trigger de `responses`: el sistema no se rompe, simplemente empieza a
mentir, y un informe construido sobre una consulta vacía parece un informe
válido.

**DECIDIDO en la Fase 2 (D23): todo el acceso a datos del panel pasa por la
clave secreta desde el servidor.** No se crean policies para `authenticated` y
`authenticated` sigue sin poder leer nada.

La sesión de Supabase Auth cumple una única función: identificar al operador y
dar paso. La comprobación vive en el layout de `app/admin/(panel)/`, que llama a
`getUser()` y redirige a `/admin/login` si no hay sesión. A partir de ahí, cada
consulta usa `createAdminClient()`.

Consecuencia práctica que conviene tener presente: **el navegador del panel nunca
consulta Supabase directamente**. Si alguna pantalla futura necesitara hacerlo,
no devolvería vacío en silencio como se temía aquí, sino que habría que decidir
de nuevo y crear las policies correspondientes. Mientras no ocurra, el fallo
silencioso descrito arriba no puede darse.

---

## Limitación de abuso

Sin captcha: destruye la conversión y el riesgo real es bajo.

En su lugar:

1. **Token de dispositivo**: UUID aleatorio guardado en `localStorage` en la
   primera visita. Se envía con la respuesta. Bloquea repeticiones desde el mismo
   navegador dentro de una ventana de 6 horas para el mismo punto de captación.
   No es un dato personal: es aleatorio y no identifica a nadie.
2. **Límite por IP en el borde**, aplicado en memoria y **nunca persistido**.
3. **Alerta operativa** si un punto de captación recibe un volumen anómalo.

El token es evitable por cualquiera que quiera evitarlo. Es aceptable: el
incentivo para falsear estas encuestas es prácticamente nulo.

---

## Generación de QR

Se generan en el alta del punto de captación y se guardan en Supabase Storage.

Cada QR apunta a `https://[dominio]/f/[code]`. El código es corto (8 caracteres,
alfabeto sin caracteres ambiguos) para que la URL sea legible si alguien la teclea.

Salida: un PDF por negocio con todos sus puntos de captación, formato imprimible,
con la etiqueta de cada punto visible ("Mesa 4", "Ana") para que el personal sepa
cuál colocar dónde.

**Cómo se compone el PDF.** Con `@react-pdf/renderer`, no con un navegador sin
cabeza. No es HTML a PDF: se compone el documento directamente (D24).

El QR llega a la página **como vector**, extrayendo los `path` del SVG guardado
en Storage, así que sale nítido a cualquier tamaño de impresión. Los bytes se
descargan con la clave secreta desde el servidor: **no intervienen URLs
firmadas**, que solo hacen falta cuando es un navegador quien pide el objeto.

Se imprimen únicamente los puntos **activos**: uno desactivado lleva a "código no
disponible", así que imprimirlo sería fabricar cartelería muerta.

Mientras `NEXT_PUBLIC_SITE_URL` sea provisional, cada página sale con una marca
visible de "no imprimir". El aviso del panel no viaja con el archivo; la marca
sí, y alguien puede descargar el PDF hoy e imprimirlo semanas después.

**Regla crítica:** el código de un punto de captación no cambia nunca. Cambiarlo
obliga a reimprimir material físico ya colocado en el local.

---

## Programación de tareas

Cron el día 1 de cada mes: **prepara** los informes del mes anterior para todos
los negocios activos y avisa al operador. **No los envía** (D30).

El envío automático y la recomendación escrita a mano son incompatibles: `docs/05`
§3 exige que la escriba una persona, y sin ella no se genera el PDF. El cron hace
todo lo automatizable —calcular, dejar la fila `pending` con la foto del cálculo,
avisar— y el operador escribe y envía desde `/admin/informes`.

La ruta `/api/cron/monthly` es **idempotente**: mira qué informes del mes anterior
faltan y crea solo esos, así que se puede llamar cualquier día. La dispara GitHub
Actions el día 1, con el cron diario de Vercel como red de seguridad, igual que
las alertas y por el mismo motivo: el plan Hobby limita sus crons a frecuencia
diaria.

Las alertas no son programadas: se disparan de forma síncrona al recibir una
respuesta que cumpla la condición.

---

## Entornos

| Entorno | Uso |
|---|---|
| Local | Desarrollo, con proyecto Supabase propio |
| Producción | Vercel + proyecto Supabase de producción |

Sin entorno de staging en la versión 1. No compensa para un operador único.

---

## Lo que deliberadamente no hacemos

- **Sin microservicios.** Un solo proyecto Next.js.
- **Sin ORM pesado.** Cliente de Supabase con tipos generados.
- **Sin gestor de estado global.** El formulario tiene tres pantallas.
- **Sin tests exhaustivos de UI.** Sí tests de la capa de métricas, que es donde
  un error pasa desapercibido y produce informes falsos.
- **Sin internacionalización genérica.** Dos idiomas, diccionario plano.
