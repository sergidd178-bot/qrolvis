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
/f/[code]                Formulario público. Ruta crítica.
/f/[code]/gracias        Pantalla final con enlace a Google
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

---

## Rendimiento del formulario público

Requisito: primera pintura útil en menos de 1 segundo con 4G débil.

Reglas:

- Renderizado en servidor con datos ya resueltos. Sin peticiones de datos en cliente
  para pintar la primera pantalla.
- Sin fuentes web externas. Tipografía del sistema.
- Sin librerías de UI, de animación ni de gestión de estado.
- Sin analítica de terceros. Ninguna.
- Configuración del punto de captación cacheada. Cambia muy rara vez.
- SVG en línea para los iconos de valoración. Nada de paquetes de iconos.
- Presupuesto de JavaScript en esa ruta: por debajo de 30 KB comprimidos.

Si una funcionalidad nueva no cabe en ese presupuesto, no entra en el formulario.

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
- El rol anónimo solo puede **insertar** en `responses` y `answers`, y solo puede
  **leer** la configuración del punto de captación por su código. Nada más.
- El rol anónimo no puede leer ninguna respuesta, ni siquiera la propia.
- Las claves de servicio nunca llegan al cliente.

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
