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

---

## Rendimiento del formulario público

Requisito: **First Contentful Paint por debajo de 1 segundo con 4G lento**,
verificado con Lighthouse en perfil móvil.

Medición vigente: **0,76 s** de FCP. Ver `docs/evidencias/rendimiento-f-code.md`
para condiciones, cifras completas y cómo reproducirlo.

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

Al construir el panel en la Fase 2 hay que decidirlo explícitamente: o el
operador tiene sus propias policies para `authenticated`, o todo el acceso a
datos pasa siempre por la clave secreta desde el servidor. Lo que no vale es
dejarlo sin decidir y descubrirlo con un informe en blanco.

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

**Regla crítica:** el código de un punto de captación no cambia nunca. Cambiarlo
obliga a reimprimir material físico ya colocado en el local.

---

## Programación de tareas

Cron de Vercel el día 1 de cada mes: genera los informes del mes anterior para
todos los negocios activos y los envía por email.

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
