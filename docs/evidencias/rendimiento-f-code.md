# Evidencia de rendimiento · `/f/[code]`

Medición con Lighthouse CLI sobre el formulario público, para resolver la
discrepancia entre el presupuesto de 30 KB de R9 y el peso real del runtime de
App Router (~141 KB gzip efectivos en navegador moderno).

**Estado: decidido (D21).** El resultado es mixto —FCP cumple el segundo, LCP
no— y se adoptó FCP como umbral de la ruta. El presupuesto de 30 KB queda
retirado. Ver `docs/08-decisiones.md` (D21) y `docs/01`, "Rendimiento del
formulario público".

## Condiciones

| | |
|---|---|
| Herramienta | Lighthouse 12.8.2 (CLI, `npx lighthouse`) |
| Fecha | 2026-08-02 |
| URL | `http://localhost:3100/f/ZZLH0001` (build de producción, `next start`) |
| Perfil | `mobile`, emulación de pantalla móvil |
| Throttling | `simulate` — 150 ms RTT, 1638,4 kbps de bajada, CPU ×4 |
| Datos | Negocio de prueba con el banco de preguntas real de hostelería |

El throttling corresponde al preset "Slow 4G" de Lighthouse, que es el más
cercano al "4G débil dentro de un local" de R9.

## Resultados

Tres ejecuciones consecutivas, mismo build y mismas condiciones:

| Métrica | Run 1 | Run 2 | Run 3 | Umbral R9 | ¿Cumple? |
|---|---|---|---|---|---|
| First Contentful Paint | 780 ms | 765 ms | 759 ms | < 1000 ms | **sí** |
| Largest Contentful Paint | 1530 ms | 1515 ms | 1509 ms | < 1000 ms | **no** |
| Speed Index | 780 ms | 765 ms | 759 ms | — | — |
| Time to Interactive | 2113 ms | — | — | — | — |
| Total Blocking Time | 83 ms | — | — | — | — |
| Cumulative Layout Shift | 0 | — | — | — | — |
| Puntuación de rendimiento | 100 | 100 | 100 | — | — |

Variación entre ejecuciones por debajo del 1,5 %: el resultado no es ruido.

## Desglose del LCP

El elemento LCP es el `<h1>` con el nombre del negocio, que viene ya en el HTML
inicial. Su retraso no es de descarga:

| Fase | Tiempo | Peso |
|---|---|---|
| TTFB | 465 ms | 30 % |
| Load Delay | 0 ms | 0 % |
| Load Time | 0 ms | 0 % |
| **Render Delay** | **1065 ms** | **70 %** |

Las descargas no son el cuello de botella: el documento tarda 131 ms y ningún
chunk pasa de 26 ms. Los 1065 ms de Render Delay son trabajo de hilo principal
con la CPU frenada ×4, es decir, el coste de evaluar e hidratar el runtime de
React y Next — el mismo suelo fijo que impide cumplir los 30 KB.

## Lectura

- La página **se pinta con contenido en 0,76-0,78 s** y es usable sin esperar al
  JavaScript: las tres pantallas son formularios HTML nativos con Server Actions,
  y funcionan con JavaScript desactivado.
- El **LCP de 1,51-1,53 s** supera el segundo, y lo hace por el coste de
  hidratación del runtime, no por el tamaño de la transferencia.

Si "primera pintura útil" de R9 se interpreta como FCP, el requisito se cumple.
Si se interpreta como LCP, no se cumple. La discrepancia no se resuelve midiendo
más: hay que decidir cuál de las dos métricas es el criterio.

## Archivos

- `lighthouse-f-code.report.html` — informe completo navegable (run 1)
- `lighthouse-f-code.report.json` — datos crudos (run 1)

Los runs 2 y 3 se ejecutaron solo para comprobar varianza; sus cifras están en la
tabla y sus JSON no se conservan.

## Reproducir

```
npx next build && npx next start -p 3100
npx lighthouse http://localhost:3100/f/<codigo-activo> \
  --only-categories=performance --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate --output=html --output-path=informe
```
