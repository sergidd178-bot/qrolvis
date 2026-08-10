# 05 · Métricas, informes y alertas

**Este documento es la única fuente de verdad numérica del sistema.**
Ninguna métrica se calcula en ningún sitio si no está definida aquí.
Si necesitas una que no aparece, para y pregunta. No la deduzcas.

---

## 1. Reglas transversales

### R-M1 · Muestra mínima

Ninguna métrica se publica sin muestra suficiente. Cuando no la hay, la capa de
cálculo devuelve el estado `INSUFICIENTE` y el informe muestra un texto
explicativo, **nunca un número**.

| Métrica | n mínimo | Si no se alcanza |
|---|---|---|
| Volumen de respuestas | 1 | Siempre se muestra |
| Distribución de valoración global | 10 | `INSUFICIENTE` |
| Porcentaje de detractores | 10 | `INSUFICIENTE` |
| Porcentaje de promotores | 10 | `INSUFICIENTE` |
| Puntuación por dimensión | 10 por dimensión | `INSUFICIENTE` para esa dimensión |
| Comparativa con el periodo anterior | 20 en **ambos** periodos | Se omite la comparativa |
| Desglose por punto de captación | 15 por punto | Se omite ese punto |
| Comentarios | 1 | Siempre se muestran |

Esta lógica vive en `/lib/metrics`, no en la plantilla del informe. La plantilla
solo pinta lo que recibe.

**Motivo:** un informe que dice "satisfacción media 3,4" basado en 6 respuestas es
peor que no decir nada. Es falso, el cliente tomará decisiones con él, y cuando
descubra que se basaba en 6 personas dejará de confiar en todo lo demás.

### R-M2 · La media no es la métrica principal

La media aritmética oculta distribuciones bimodales, que son justamente las más
frecuentes en este tipo de datos. Un 3,5 puede ser "todo el mundo regular" o
"mitad encantados, mitad furiosos", y son dos negocios distintos con planes
opuestos.

La media aparece como dato secundario, con un decimal, y solo con n ≥ 10.
Lo que encabeza el informe es la **distribución** y el **porcentaje de detractores**.

### R-M3 · Qué respuestas entran en cada cálculo

| Métrica | Usa respuestas |
|---|---|
| Volumen | Todas (`partial` y `complete`) |
| Valoración global y detractores | Todas |
| Dimensiones | Solo `complete` |
| Comentarios | Todas las que tengan texto |

Una respuesta parcial es una respuesta válida. Descartarlas sesgaría el resultado
hacia quienes tienen más paciencia.

### R-M4 · Periodo

El periodo de un informe mensual es del día 1 al último día del mes natural,
en zona horaria `Europe/Madrid`, según `responses.submitted_at`.

---

## 2. Definiciones

Notación: `N` = número de respuestas del periodo que aplican según R-M3.
`n(x)` = número de respuestas con valoración exactamente `x`.

### 2.1 Volumen de respuestas

```
volumen = N
```

Es la métrica de salud **de nuestro servicio**, no del negocio. Si cae, actuamos
nosotros sobre la captación.

### 2.2 Distribución de la valoración global

```
distribucion[x] = n(x)              para x en {1,2,3,4,5}
porcentaje[x]   = n(x) / N * 100
```

Se muestra como barras horizontales con el número absoluto y el porcentaje.

### 2.3 Porcentaje de detractores

```
detractores_pct = (n(1) + n(2)) / N * 100
```

Es el número que mueve al cliente a actuar. Va en portada.

### 2.4 Porcentaje de promotores

```
promotores_pct = n(5) / N * 100
```

Solo cuenta el 5. Un 4 es un cliente satisfecho, no un prescriptor.

Requiere n ≥ 10, igual que detractores: son la misma escala leída por los dos extremos.

### 2.5 Media global

```
media = ( Σ(x · n(x)) ) / N          para x en {1..5}
```

Un decimal. Dato secundario. Requiere n ≥ 10.

### 2.6 Puntuación por dimensión

Para cada dimensión `d`, sobre las respuestas `complete` que contestaron esa
pregunta:

```
N_d       = número de respuestas con valor en la dimensión d
media_d   = Σ(valor) / N_d
detrac_d  = (n_d(1) + n_d(2)) / N_d * 100
```

Requiere `N_d ≥ 10`. Se ordenan de peor a mejor: lo que hay que arreglar va arriba.

### 2.7 Comparativa con el periodo anterior

```
delta_d = media_d(actual) − media_d(anterior)
```

Solo se calcula si **ambos** periodos tienen `N_d ≥ 20`.

Se muestra con un decimal y signo. No se convierte a porcentaje: un cambio
porcentual sobre una escala de 1 a 5 es engañoso.

Umbral de significación práctica: solo se destaca visualmente si `|delta_d| ≥ 0,3`.
Por debajo de eso es ruido y presentarlo como tendencia sería un error.

### 2.8 Desglose por punto de captación

Solo para negocios con más de un punto activo, y solo para puntos con `N ≥ 15`.

```
media_punto = media de overall_rating de las respuestas de ese punto
```

En estética, cuando los puntos son profesionales, esta sección es la más valiosa
del informe.

**Aviso a incluir en el propio informe:** los volúmenes por punto suelen ser
pequeños y las diferencias entre profesionales pueden deberse al azar. El informe
debe presentarlo como observación, no como evaluación de desempeño.

### 2.9 Comentarios

Se listan todos los comentarios del periodo con:
- Fecha
- Valoración global asociada
- Punto de captación
- Texto íntegro, **sin editar ni resumir**

Orden: primero los de valoración baja. Son los accionables.

Sin agrupación temática ni análisis de sentimiento en la versión 1 (regla R8 de
`CLAUDE.md`).

### 2.10 Tasa de finalización

```
finalizacion_pct = respuestas_complete / N * 100
```

Métrica interna. No aparece en el informe del cliente. Sirve para detectar
problemas en el formulario.

---

## 3. Estructura del informe mensual

Una sola página si es posible, dos como máximo. El dueño de un bar no lee ocho páginas.

**Aclaración (D29).** Esta longitud es un objetivo, no un límite duro, y cede ante la
integridad de los comentarios. Cuando el Bloque 3 no quepa, el informe crece: los
comentarios van **todos y enteros**, sin truncar y sin un «y N comentarios más» al
final, que sería un recorte disfrazado. No es una contradicción sin resolver: está
decidido en `docs/08-decisiones.md`.

### Portada

- Nombre del negocio, mes y año
- **Volumen de respuestas**
- **Porcentaje de detractores**
- Media global, en pequeño

### Bloque 1 — Distribución

Barras horizontales de 1 a 5, con número y porcentaje.

### Bloque 2 — Por dimensión

Tabla ordenada de peor a mejor, con la comparativa del mes anterior cuando exista.

### Bloque 3 — Qué dicen tus clientes

Comentarios íntegros. Es la sección que más se lee. No se recorta.

### Bloque 4 — Por punto de captación

Solo si aplica, con el aviso del punto 2.8.

### Bloque 5 — Recomendación del mes

**Una sola recomendación.** No tres, no cinco. Una.

En la versión 1 la escribe el operador manualmente sobre una plantilla propuesta
por el sistema. Es el único trabajo manual aceptado, debe ocupar menos de 5
minutos por cliente, y es lo que más valor percibido aporta.

El sistema propone el candidato aplicando esta prioridad:

1. Dimensión con peor media absoluta que supere el n mínimo
2. Si no hay, dimensión con mayor caída respecto al mes anterior
3. Si no hay, volumen de respuestas si ha caído más de un 30%

**Aclaración: volumen por debajo de 10 (D31).** Con menos de 10 respuestas ninguna
dimensión llega a su muestra mínima, así que la regla 1 no puede disparar y no hay
nada que analizar sobre la calidad del servicio. En ese caso el sistema propone un
borrador **ya completo y sin huecos**, sobre captación en vez de sobre calidad, que
el operador puede enviar tal cual o editar.

Es la **única** propuesta sin corchetes, y la excepción está acotada a propósito: el
mensaje no depende del negocio —con esa muestra lo único que se puede decir es que
hacen falta más respuestas—, así que obligar a reescribirlo cada mes sería trabajo
sin criterio. **No se relaja la exigencia de intervención humana**: el operador
sigue teniendo que leerlo y generar el informe a mano (D18), y el cron sigue sin
enviar nada por su cuenta (D30).

### Pie

- Periodo exacto cubierto
- Número total de respuestas
- Nota: "Basado en las opiniones recibidas mediante código QR en el local"

---

## 4. Alertas

### Condición

```
overall_rating <= 2
```

Umbral global, no configurable por cliente en la versión 1.

### Momento del envío

Tras la pantalla 2 del formulario, para poder incluir el comentario.
Si la respuesta se queda en `partial`, la tarea de cierre la envía a los 30 minutos.

### Contenido del email

```
Asunto: Valoración baja en [Nombre del negocio]

Acabas de recibir una valoración de [X] sobre 5.

Punto: [etiqueta del punto de captación]
Hora: [fecha y hora local]

Comentario del cliente:
"[texto íntegro, o 'No dejó comentario']"

Valoraciones por aspecto:
[listado de dimensiones respondidas]

---
Recibes este aviso porque tienes activado el servicio de recogida
de opiniones. Responde a este email si quieres cambiar el umbral.
```

Sin enlaces a paneles. Sin imágenes. Sin formato recargado. Se lee en el móvil, de
pie, en 10 segundos.

### Reglas anti-saturación

- Máximo **5 alertas por negocio y día**. Superado el límite, se agrupa en un único
  email resumen.
- Si un negocio supera 15 alertas en una semana, se avisa al operador: es señal de
  un problema serio en el local o de un uso indebido del sistema.

### Registro

Toda alerta se registra en la tabla `alerts` con su estado. Un fallo de envío no
puede pasar desapercibido: si `status = 'failed'`, aparece en el panel del operador.

---

## 5. Tests obligatorios de la capa de métricas

Esta es la única parte del sistema con cobertura de test exigida. Un error aquí no
rompe nada visiblemente: produce informes que parecen correctos y son falsos.

Casos que deben estar cubiertos:

- `N = 0`: todas las métricas devuelven `INSUFICIENTE`, ninguna división por cero
- `N = 9` y `N = 10`: verificar el corte exacto de la muestra mínima
- Distribución bimodal (mitad 1, mitad 5): la media es 3 y los detractores 50%
- Todas las respuestas iguales: no rompe nada. La media es ese valor, la
  distribución se concentra en él y los detractores salen 0 % o 100 % según
  cuál sea. **Nota:** una versión anterior de este caso hablaba de "la desviación",
  pero la desviación típica **no es una métrica de este documento**: no está
  definida en la sección 2 y la capa de cálculo no la implementa.
- Respuestas `partial` mezcladas con `complete`: cada métrica usa el conjunto correcto
- Dimensión sin ninguna respuesta: `INSUFICIENTE` para esa dimensión, el resto se calcula
- Periodo anterior inexistente (primer mes del cliente): sin comparativa, sin error
- Cambio de versión del conjunto de preguntas a mitad de periodo: cada dimensión
  agrupa correctamente por `code`, no por identificador de pregunta
- Respuesta justo en el límite del periodo (23:59 del último día): se incluye
- Zona horaria: una respuesta a las 00:30 del día 1 pertenece al mes nuevo
