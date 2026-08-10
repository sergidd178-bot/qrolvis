# Evidencia de rendimiento · región de las funciones y latencia por interacción

Medición del coste de cada pulsación en `/f/[code]`, y del efecto de mover las
funciones de Vercel de `iad1` (Washington) a `fra1` (Frankfurt), junto a
Supabase.

**Estado: decidido (D26).** Ver `docs/08-decisiones.md`.

Esto complementa a `rendimiento-f-code.md`, que midió la **primera carga** (D21,
D22). Aquí se mide algo distinto: el tiempo de **cada interacción** con el
formulario, que aquel documento no cubría porque midió contra `localhost`, donde
el tramo de red vale cero.

## Condiciones

| | |
|---|---|
| Fecha | 2026-08-07 |
| Origen de las peticiones | Girona, conexión fija |
| Método | `curl -w %{time_starttransfer}`, medianas de n=6 a n=10 |
| Objetivo | `https://www.qrolvis.com/f/5JHT8RJ2` |
| Lighthouse | 13.4.1, `mobile`, `simulate`, 150 ms RTT, 1638,4 kbps, CPU ×4 |

Las pantallas 2 y 3 se midieron con un `r` inexistente: ejercita las mismas
consultas sin crear filas.

## El diagnóstico

`X-Vercel-Id: cdg1::iad1::…` — el edge era París pero la función se ejecutaba en
**Washington**, mientras la base de datos está en Frankfurt. Cada consulta
cruzaba el Atlántico.

Coste de una consulta a Supabase, en caliente:

| Origen | Tiempo | Cómo se midió |
|---|---|---|
| Girona | **86 ms** | 8 consultas reutilizando la misma conexión TLS (`num_connects=0`) |
| `iad1` | **154 ms** | mediana pantalla 3 − pantalla 1 (2 consultas vs 1), n=10 |
| `fra1` | **65-72 ms** | lo mismo, tras el cambio |

Con ~50 ms de PostgREST y Postgres, los 154 ms desde `iad1` son ese
procesamiento más ~90 ms de ida y vuelta transatlántica.

## Resultado del cambio de región

| Tramo | `iad1` | `fra1` | Δ |
|---|---|---|---|
| Edge cacheado, sin función *(control)* | 146 ms | 148 ms | +2 ms |
| GET pantalla 1 (1 consulta) | 381 ms | **215 ms** | −44 % |
| GET pantalla 2 (2 consultas) | 675 ms | **238 ms** | −65 % |
| GET pantalla 3 (2 consultas) | 535 ms | **280 ms** | −48 % |
| POST código inexistente (1 consulta) | 413 ms | **237 ms** | −43 % |
| POST pantalla 1 (4 consultas + trigger) | 1.188 ms | **453 ms** | −62 % |
| **Ciclo POST + 303 + GET** | **~1.420 ms** | **558 ms** | **−61 %** |

El control es lo que da validez al resto: el edge cacheado no se mueve
(146 → 148 ms), así que la mejora está toda en el camino de la función y no es
deriva de la red ni de la medición.

Se comprobó la región con 15 muestras: 15 de 15 en `cdg1::fra1::`.

## Lighthouse

`/f/[code]`, tres ejecuciones tras el cambio: FCP 981 / 838 / 864 ms.

| Métrica | `iad1` | `fra1` (mediana) | Δ |
|---|---|---|---|
| First Contentful Paint | 869 ms | **864 ms** | −5 ms |
| Largest Contentful Paint | 869 ms | 864 ms | −5 ms |
| Speed Index | 1.240 ms | **864 ms** | −376 ms |
| Total Blocking Time | 81 ms | 62-96 ms | ruido |
| Puntuación | 100 | 99-100 | — |

`/admin/login`: FCP 848 → 846 ms. Speed Index 2.978 → 846 ms, pero es **n=1
antes y n=1 después**, y la medición previa pudo caer en un arranque en frío: no
es una cifra firme.

**El FCP no se mueve, y es lo esperable.** Lighthouse en modo `simulate`
recompone los tiempos sobre un modelo de red, y los ~160 ms de servidor
ahorrados quedan absorbidos por el coste simulado de descarga y de CPU. Es lo
que ya estableció D21: el suelo del FCP es el runtime de App Router, no el
trabajo de servidor.

**El criterio de R9 se sigue cumpliendo** con 864 ms de mediana. Aviso: una de
las tres ejecuciones dio **981 ms**. El margen es más estrecho de lo que sugiere
la mediana, y conviene volver a medir ante cualquier cambio en la ruta crítica,
como ya exige D22.

## Deduplicación del envío de la pantalla 2

Aplicada después del cambio de región, ya sobre `fra1`. El envío hacía **ocho**
idas y vueltas para lo que necesita cuatro: cargaba la respuesta dos veces,
actualizaba `responses` dos veces y llegaba al negocio dando un rodeo por
`capture_points` cuando `responses.business_id` ya lo tiene.

| Acción | Antes | Después |
|---|---|---|
| Envío de pantalla 2 con dimensiones | 8 consultas | **4** |
| Envío de pantalla 2 sin dimensiones | 8 consultas | **2** |
| Enlace de saltar | 4 consultas | **2** |

Medición del POST de envío de la pantalla 2, n=6, ambas sobre `fra1`:

| | Mediana | Rango |
|---|---|---|
| Antes | 750 ms | 662-814 ms |
| Después | **429 ms** | 418-447 ms |

−321 ms (−43 %). La dispersión también se estrecha: menos viajes de red, menos
varianza.

Lighthouse tras el cambio, tres ejecuciones: FCP 954 / 852 / 841 ms, mediana
**852 ms**. Sin regresión respecto a los 864 ms anteriores; el criterio de R9 se
mantiene.

## Rediseño de color y rastro de espera

Cambio posterior, no de rendimiento sino visual, pero medido porque toca la ruta
crítica y **D22 obliga a volver a medir**: fondo de página de blanco a `#F9DBA5`,
tres colores de texto corregidos para mantener AA, y un indicador de espera en
CSS que aguanta 800 ms tras soltar el botón y se desvanece en 600 ms.

Coste en peso: la hoja inlineada pasa de **8.093 a 9.698 bytes** (+20 %), por las
reglas del rastro y el módulo nuevo del contenedor.

| | FCP mediana | Referencia | ¿Dentro de R9? |
|---|---|---|---|
| Local (`next start`, n=3: 719/687/689) | **689 ms** | 684 ms de D22 | **sí** |
| Producción (n=3: 963/834/838) | **838 ms** | 852 ms del apartado anterior | **sí** |

Ninguna de las dos medidas se mueve más allá del ruido: +5 ms en local y −14 ms
en producción. **El criterio de R9 se mantiene tras el cambio de fondo y el
rastro de espera**, que es lo que había que comprobar.

Se repite el patrón ya visto: la primera de las tres ejecuciones sale alta (963,
981 y 954 ms en las tres tandas de producción de hoy) y las dos siguientes se
estabilizan. Conviene seguir leyendo la mediana de tres y no una sola ejecución.

## Cuatro mejoras visuales: sombra, gradientes y patrón de fondo

Medido por tandas aisladas contra producción, para poder atribuir el coste a
cada cambio en vez de a todos juntos. Todas las ejecuciones son Lighthouse
`simulate` sobre `/f/<codigo>`, pantalla 1.

| Tanda | Qué añade | n | FCP mediana | Δ sobre la base |
|---|---|---|---|---|
| Base | estado tras el rediseño de color | 5 | **853 ms** | — |
| A | sombra sutil en la tarjeta + separadores con degradado | 5 | **848 ms** | −5 ms |
| B | gradiente radial de fondo al 4 % | 9 | **847 ms** | −6 ms |
| C | patrón de textura SVG en `data:` URI, tesela de 96×96 | 7 | **855 ms** | **+2 ms** |

El presupuesto disponible eran 145 ms hasta el límite de R9. El coste real de las
cuatro mejoras juntas queda dentro del ruido de medición: A y B salen incluso por
debajo de la base, lo que confirma que su coste es indistinguible de cero.

El patrón de la tanda C era el candidato a caer —es el único que obliga al
navegador a componer una imagen— y se aprobó porque su coste medido fue de 8 ms
en la comparación que se hizo en su momento contra la tanda B. La diferencia de
medianas frente a la base queda en +2 ms.

TBT no empeora en ninguna tanda (97 → 86 → 110 → 46 ms): era la duda razonable
con el patrón, y no se materializa. LCP sí sube de 937 ms a ~1.700 ms a partir de
la tanda A, pero el elemento LCP cambia con la sombra y el degradado, así que las
dos cifras no miden lo mismo y no son comparables entre sí.

**Estas medidas no se pueden reproducir tal cual**: se tomaron contra el punto de
captación `5JHT8RJ2`, borrado al vaciar la base de datos. Para repetirlas hay que
crear un negocio y un punto nuevos.

## Archivos

- `lighthouse-f-code-iad1.report.json` — antes del cambio de región
- `lighthouse-f-code-fra1.report.json` — después del cambio de región
- `lighthouse-f-code-fra1-dedup.report.json` — tras deduplicar la pantalla 2
- `lighthouse-f-code-fra1-color.report.json` — tras el rediseño de color
- `lighthouse-f-code-visual-base.report.json` — base de las tandas visuales
- `lighthouse-f-code-visual-tanda-a.report.json` — sombra y separadores
- `lighthouse-f-code-visual-tanda-b.report.json` — gradiente radial
- `lighthouse-f-code-visual-tanda-c.report.json` — patrón de textura
- `lighthouse-admin-login-iad1.report.json` — antes
- `lighthouse-admin-login-fra1.report.json` — después

## Reproducir

```
# region de ejecucion
curl -s -o /dev/null -D - https://www.qrolvis.com/f/<codigo> | grep -i x-vercel-id

# latencia por pantalla (el `r` falso no crea filas)
curl -s -o /dev/null -w '%{time_starttransfer}\n' https://www.qrolvis.com/f/<codigo>
curl -s -o /dev/null -w '%{time_starttransfer}\n' 'https://www.qrolvis.com/f/<codigo>?s=2&r=00000000-0000-4000-8000-000000000000'

# coste de una consulta a Supabase reutilizando conexion
curl -s -o /dev/null -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
  -w '%{time_starttransfer} %{num_connects}\n' "$URL" "$URL" "$URL"
```

Medir el POST **crea respuestas reales**. Las de estas mediciones se borraron
después; si repites, acuérdate de limpiarlas.
