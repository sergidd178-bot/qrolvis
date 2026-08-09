# 08 · Registro de decisiones

Propósito: que nadie, ni humano ni IA, reabra una decisión ya cerrada, y que
nadie dé por cerrada una que sigue abierta.

**Si trabajas en este proyecto y encuentras algo en la sección "Abiertas",
no lo decidas por tu cuenta. Pregunta.**

---

## Decisiones cerradas

| # | Decisión | Motivo | Coste de revertir |
|---|---|---|---|
| D1 | El QR apunta a un punto de captación, no al negocio | Permite desglose por mesa o profesional | **Muy alto**: reimprimir todo el material físico |
| D2 | Formulario totalmente anónimo | Reduce el RGPD, sube la finalización, elimina el riesgo de filtración | Medio |
| D3 | Base de datos: Supabase (PostgreSQL), región UE | Escala sin migración, RLS nativo, gratis al principio | Alto |
| D4 | El enlace a Google se muestra a todos | Filtrar viola las políticas de Google y pondría en riesgo al cliente | No revertible: es una obligación |
| D5 | Informe mensual, no semanal | Con volúmenes bajos, el semanal es ruido y parece vacío | Bajo |
| D6 | Alertas inmediatas ante valoración ≤ 2 | Es el valor percibido diario del servicio | Bajo |
| D7 | Sectores iniciales: hostelería y estética | Mercado local accesible y necesidades bien acotadas | Bajo |
| D8 | Conjuntos de preguntas versionados e inmutables | Editar una pregunta rompe el histórico en silencio | Alto si se descubre tarde |
| D9 | La media no es la métrica principal | Oculta distribuciones bimodales, que son las habituales | Bajo |
| D10 | Reglas de n mínimo aplicadas en código | Un número basado en 6 respuestas destruye la confianza | Bajo |
| D11 | Las respuestas parciales cuentan | Descartarlas sesga hacia quien tiene más paciencia | Bajo |
| D12 | Sin IA en la versión 1 | No hay volumen que lo justifique y añade coste y opacidad | Bajo |
| D13 | El cliente no puede borrar valoraciones | Si pudiera, el informe no valdría nada | Bajo técnicamente, alto comercialmente |
| D14 | Sin panel para el cliente en la versión 1 | El email es suficiente y el panel dispara el alcance | Bajo |
| D15 | Idiomas: castellano y catalán | Mercado objetivo | Bajo |
| D16 | Máximo 4 preguntas de dimensión | Cada pregunta extra reduce la finalización | Bajo |
| D17 | Sin captcha | Destruye la conversión y el riesgo real es mínimo | Bajo |
| D18 | La recomendación mensual la escribe el operador | Es el mayor valor percibido y no hay volumen para automatizarla bien | Bajo |
| D19 | Nombre comercial y dominio: Qrolvis | Necesario para las URL de los QR, que no pueden cambiar | No revertible, obliga a reimprimir todo el material físico |
| D20 | Escritura de respuestas solo desde servidor, no desde el rol anónimo | Las policies de insert tenían `with check (true)`, que no comprueba nada. El riesgo real cerrado estaba en `answers`: con la clave publishable, que es pública por diseño, cualquiera podía colgar valoraciones o comentarios de texto de un `response_id` ajeno y suplantar lo que otra persona había escrito. En `responses` la policy nunca fue explotable, pero por un efecto secundario no buscado del trigger `set_response_business_id()`, no por diseño: al no ser `security definer` y no poder leer `businesses`, abortaba antes de evaluar la RLS. Esa barrera no debe darse por supuesta en tablas futuras. Detalle en `docs/01`, "Seguridad de datos" | Bajo |
| D21 | El umbral de rendimiento de `/f/[code]` es FCP < 1 s en 4G lento, no un presupuesto de bundle | El tope de 30 KB era un proxy inalcanzable: App Router carga siempre ~141 KB gzip de runtime, y con cero `"use client"` el código propio aporta 0 KB. Cumplirlo exigiría servir la ruta fuera de App Router con HTML a mano. El objetivo real, velocidad percibida en 4G débil, sí se cumple: 0,76 s de FCP medidos con Lighthouse *(cifra vigente al tomar esta decisión, sobre la pantalla 1 sin diseñar; la medición actual es 722 ms en el peor caso de las tres pantallas y depende de D22)*. Se descarta LCP como umbral porque su elemento es un `<h1>` ya presente en el HTML inicial y su retraso es hidratación de React, no espera de contenido; con Server Actions nativas el formulario es utilizable desde el FCP. Evidencia en `docs/evidencias/rendimiento-f-code.md` | Bajo |
| D22 | `experimental.inlineCss` activado en `next.config.ts` | Es lo que permite cumplir el umbral de D21 con margen. Inlinea la hoja de estilos en el documento y elimina la petición bloqueante, que con 150 ms de RTT era el único coste de la ruta crítica evitable sin renunciar a React. El peor caso de las tres pantallas baja de **942 ms a 722 ms**. Verificado además que el flujo completo sin JavaScript sigue funcionando. **Cualquier actualización de Next.js debe volver a medir Lighthouse en `/f/[code]` antes de darse por buena**, precisamente por este flag. Evidencia: `docs/evidencias/lighthouse-f-code-pantalla2.report.json` y, como referencia previa, `lighthouse-f-code-pre-inlinecss.report.json` | Bajo técnicamente (una línea), pero **riesgo medio**: es un flag experimental y puede cambiar de comportamiento entre versiones de Next.js |
| D23 | La sesión del panel solo identifica; los datos van siempre por `createAdminClient()` | Cierra la pregunta que `docs/01` dejó abierta sobre el rol `authenticated`. RLS está activo sin ninguna policy para ese rol, así que el cliente de sesión no vería nada. En vez de crear policies, el panel accede a datos exclusivamente desde el servidor con la clave secreta, y Supabase Auth se limita a decir quién entra. Ventajas: ninguna migración nueva, y el navegador del panel nunca consulta Supabase directamente, así que no puede filtrar datos por una consulta mal hecha en cliente. La clave publishable interviene solo en el intercambio de autenticación, nunca en lectura ni escritura de datos. La guardia vive en el layout de `app/admin/(panel)/`, de modo que toda ruta añadida a ese grupo queda protegida por omisión | Bajo: si alguna pantalla necesitara consultar desde el navegador, habría que crear entonces las policies para `authenticated` |
| D24 | El PDF se compone con `@react-pdf/renderer`, no con HTML a PDF | Se aparta de la **letra** de `docs/01` y `CLAUDE.md`, que decían "HTML a PDF en servidor", pero no de su **espíritu**: menos dependencias y sin fragilidad en producción. Cumplirlo al pie de la letra exigía Puppeteer con un Chromium empaquetado, unos **75 MB** de dependencias (`puppeteer-core` 5,75 MB + `@sparticuz/chromium` 69,7 MB) frente a los **292 KB** de `@react-pdf/renderer`, además de arranques en frío de segundos y los límites de tamaño y memoria de las funciones de Vercel. El argumento decisivo: los QR ya son vectores y cada página lleva un QR y dos líneas de texto, así que **no hace falta un motor de maquetado**. Traer un navegador entero para colocar cuatro elementos es desproporcionado. Los `path` del SVG guardado se pasan directamente al PDF, que queda vectorial | Bajo: es una librería aislada en `lib/pdf`. Si algún día hiciera falta maquetación compleja de verdad, se cambia sin tocar el resto |
| D25 | El aviso de "no imprimir" se decide comparando los bytes del SVG guardado, no la variable de entorno | `isProvisionalDomain()` solo miraba `NEXT_PUBLIC_SITE_URL`, así que respondía por el **destino** ("¿sirve el dominio de hoy?") y no por el **artefacto** ("¿a dónde apunta esta imagen?"). Con el dominio ya bueno, un QR generado antes contra `http://192.168.1.38:3000` se mostraba como imprimible: caso real detectado el 2026-08-07 en «Bar de prueba». La comprobación nueva regenera el SVG esperado y lo compara carácter por carácter con el guardado, aprovechando que `QRCode.toString()` es determinista. **No decodifica el QR**: no hace falta saber qué URL codifica, solo si codifica la que debe. Se verifica el artefacto real y no un campo en la base, que registraría lo que creímos generar y no lo que hay. Se conservan los dos avisos porque son fallos distintos y pueden darse por separado. Contrapartida asumida: si cambian `QR_OPTIONS` o el formato de salida de la librería, **todos** los QR se marcarían como caducados; es un falso positivo que avisa de más, nunca de menos | Bajo: `lib/qr`, la ficha del negocio y el PDF. Sin migración ni columna nueva |
| D26 | Las funciones se ejecutan en `fra1` (Frankfurt), declarado en `vercel.json`; y el envío de la pantalla 2 guarda y cierra en una sola pasada | Las funciones se ejecutaban en `iad1` (Washington) mientras la base está en Frankfurt, así que **cada consulta cruzaba el Atlántico**. Diagnosticado con `X-Vercel-Id: cdg1::iad1::…` y confirmado midiendo el coste de una consulta: 86 ms desde Girona, 154 ms desde `iad1`, 65-72 ms desde `fra1`. Cada pulsación hace entre 4 y 8 consultas **secuenciales**, así que el desajuste se pagaba entero varias veces. Resultado: el ciclo POST + 303 + GET pasa de **~1.420 ms a 558 ms (−61 %)**, con el edge cacheado como control clavado en 146→148 ms, lo que descarta deriva de la medición. Encima, deduplicar el envío de la pantalla 2 (8 consultas → 4; `loadUpdatable` se ejecutaba dos veces sobre la misma fila, `responses` se actualizaba dos veces, y se llegaba al negocio por `capture_points` teniendo `responses.business_id` a mano) lo baja de 750 ms a **429 ms (−43 %)**. Se declara en `vercel.json` y no en los ajustes del panel para que quede en control de versiones: un reenlace del proyecto no puede perderlo en silencio. Lighthouse re-medido como exige D22: FCP mediana 852 ms, sin regresión, R9 se mantiene. **El FCP apenas se mueve y es lo esperable**: en modo `simulate` el ahorro de servidor queda absorbido por el modelo de red y CPU, y el suelo lo pone el runtime de App Router, como ya dijo D21. Evidencia: `docs/evidencias/rendimiento-region-fra1.md` | Bajo: la región es una línea de `vercel.json`. La deduplicación toca `lib/db/responses.ts`, pero `addDimensionAnswers` se conserva porque `PATCH /api/responses/[id]` expone `step="answers"` separado de `step="complete"` |
| D27 | No se aplican las optimizaciones 2-5 de la investigación de latencia | Se estudiaron y se descartan **por innecesarias, no por inviables**: cachear `questions` y `capture_point_config`, resolver el punto de captación con el RPC ya existente, y fusionar la comprobación antifraude con el insert. Sumaban ~250 ms sobre los 558 ms ya conseguidos, y el objetivo de 1 s está cumplido con holgura. Además, cachear `capture_point_config` tiene un filo peligroso: un punto **desactivado** seguiría sirviendo el formulario hasta que caducara la caché, cuando `docs/03` exige que muestre "no disponible". Eso obligaría a enganchar la invalidación a la acción de desactivar, y sería introducir un riesgo de corrección a cambio de milisegundos que ya no hacen falta. Si algún día el volumen o el coste lo justifican, el análisis está hecho y medido | Nulo: no se ha construido nada. Reabrirlo solo cuesta releer la evidencia |
| D28 | El trabajo programado de alertas lo dispara GitHub Actions cada 10 min, no el cron de Vercel; con límite de 48 h y resumen a las 09:00 de Madrid | **El plan Hobby de Vercel limita sus crons a frecuencia diaria**, y una respuesta abandonada con valoración baja esperaría hasta 24 h, lo que vacía de sentido la segunda promesa del producto. GitHub Actions permite intervalos de minutos y el repositorio ya está allí; queda además un cron diario de Vercel (`0 8 * * *` UTC, que son las 10:00 en verano y las 09:00 en invierno, ambas por encima del corte del resumen) como red de seguridad, porque GitHub desactiva los workflows programados tras 60 días sin actividad. **Todas las consultas son por estado, nunca por marca de agua**: no existe un "desde la última ejecución", así que perder un ciclo entero solo retrasa, y dos ejecuciones solapadas no se estorban porque `unique (response_id)` hace de cerradura. La tarea de cierre **NO toca `completeness`**: `docs/05` §2.10 calcula la tasa de finalización como `complete/N`, y cerrarlas daría 100 % constante, destruyendo la única métrica que detecta que el formulario falla. El límite de 48 h evita avisar de una valoración de hace tres días, que no es un aviso sino ruido; esas alertas se registran como `not_applicable` con el motivo, lo que exigió un cuarto estado en `alerts` (migración `20260809200000`). El resumen sale a las **09:00 de Madrid sobre el día natural anterior ya cerrado**: del día anterior porque un bar sigue sirviendo a las 23:00 y un resumen previo a medianoche se dejaría fuera las últimas horas; a las 09:00 porque nadie lee el correo del negocio a las 00:30 y a esa hora aún da tiempo a actuar. No hizo falta columna nueva para saber si un resumen ya salió: las filas quedan en `pending` y pasan a `sent` al enviarse, así que la idempotencia sale del propio dato | Medio: si algún día se pasa a Pro, el workflow de GitHub se sustituye por `crons` en `vercel.json` sin tocar la ruta ni la lógica |

---

## Cuestiones abiertas

Requieren decisión antes de la fase indicada.

| # | Cuestión | Decidir antes de | Notas |
|---|---|---|---|
| A1 | Precio definitivo de alta y cuota mensual | Fase 5 | Rango propuesto: 90–150 € y 25–45 € |
| A3 | Número de puntos de captación incluidos en la cuota base | Fase 5 | Propuesta: 3 |
| A4 | Formato físico de los expositores y proveedor de impresión | Fase 5 | Afecta al coste de alta |
| A5 | Umbral de alerta configurable por cliente | Tras el piloto | Ahora fijo en ≤ 2 |
| A6 | Pregunta condicional "¿qué ha fallado?" con valoración baja | Tras el primer trimestre | Mejora el comentario, añade lógica al formulario |
| A7 | Plan semanal para locales de alto volumen | Tras el piloto | Posible plan superior |
| A8 | Qué ocurre con los datos si un cliente se da de baja | Antes del primer contrato | Debe constar en el contrato |
| A9 | Tercer sector a abordar | Tras el piloto | Candidatos: talleres, clínicas dentales, gimnasios |

---

## Decisiones descartadas y por qué

Registradas para que no vuelvan a proponerse.

| Idea | Por qué se descartó |
|---|---|
| Sorteo mensual con email | Rompe el anonimato y dispara la carga de RGPD. Alternativa: incentivo inmediato gestionado por el negocio |
| Excel o Google Sheets como base de datos | Problemas de concurrencia en hora punta, sin permisos por cliente, y mezcla datos de varios negocios en un archivo |
| Mostrar el enlace de Google solo a quien puntúa alto | Es *review gating*, prohibido por Google. Podría provocar la eliminación del perfil del cliente |
| Informe semanal desde el inicio | Con 10 respuestas semanales el informe es ruido y hace parecer vacío el servicio |
| Preguntar por la relación calidad-precio | Siempre puntúa bajo, no es accionable y desanima al dueño sin decirle qué hacer |
| Login o registro del usuario en el formulario | Destruiría la tasa de respuesta |
| Aplicación móvil | El QR abre el navegador. Una app añadiría una barrera enorme sin ningún beneficio |
| Análisis de sentimiento de los comentarios | Sin volumen no aporta nada y los comentarios se leen enteros de todos modos |
