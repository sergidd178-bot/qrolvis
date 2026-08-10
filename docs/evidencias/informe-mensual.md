# Evidencia · plantilla del informe mensual

Dos PDF generados con la plantilla real (`lib/reports/template.tsx`) para
comprobar que la estructura de `docs/05` §3 se cumple y que los estados
`INSUFICIENTE` y `OMITIDA` se reflejan como manda R-M1.

**Estado: decidido.** Ver D24 (por qué `@react-pdf/renderer` y no HTML a PDF) y
D29 (por qué el informe crece antes que recortar comentarios).

## Condiciones

| | |
|---|---|
| Fecha | 2026-08-10 |
| Generador | `renderReport()` de `lib/reports/template.tsx` |
| Datos | Sintéticos, escritos a mano para forzar los tres estados |
| Tamaño | A4 |

Los datos son inventados a propósito. El objetivo no es validar el cálculo —eso
lo cubren los 51 tests de `lib/metrics` y `lib/reports`— sino la **composición**:
que cada bloque aparezca donde debe, que lo que no tiene muestra no se pinte como
un número, y que lo omitido desaparezca sin dejar hueco.

## Archivos

### `informe-mensual-completo.pdf` — 2 páginas

Todas las métricas en `OK`, salvo el desglose por punto, que va en `OMITIDA`.

Comprobado extrayendo el texto del PDF:

| Elemento | Resultado |
|---|---|
| Portada: nombre, mes, volumen, % detractores | presente |
| Media global, en pequeño | presente |
| Bloque 1, distribución en barras | presente |
| Bloque 2, por aspecto con comparativa | presente, con la columna `vs. mes ant.` |
| Bloque 3, comentarios | los tres, **el largo sin recortar** |
| Bloque 4, por punto de captación | **ausente**, como exige `OMITIDA` |
| Bloque 5, recomendación firmada | presente |
| Pie con la nota fija | presente |

Que la sección del Bloque 4 **desaparezca entera** es el comportamiento correcto:
R-M1 dice "se omite ese punto", no "se muestra vacío". Un encabezado huérfano con
un hueco debajo es una forma de enseñar que falta algo.

### `informe-mensual-muestra-insuficiente.pdf` — 1 página

El mismo negocio con 6 respuestas. Casi todo cae en `INSUFICIENTE`.

| Elemento | Resultado |
|---|---|
| Volumen | se muestra: R-M1 le pone n mínimo 1 |
| % detractores | `sin muestra suficiente (6 de 10)` |
| Distribución y dimensiones | `Hacen falta al menos 10 respuestas…` |
| Media global | **ausente**: no se publica por debajo de 10 (R-M2) |
| Comentarios | "Este mes nadie dejó comentario escrito" |

El texto de `INSUFICIENTE` lleva **las dos cifras**, la que hace falta y la que
hubo. "Datos insuficientes" a secas deja al cliente sin saber si le faltó una
respuesta o cuarenta, y esa diferencia cambia lo que tiene que hacer.

## Cómo se verificó

El texto no se lee con un extractor normal: `@react-pdf/renderer` escribe las
cadenas como `<hex>` dentro de arrays `TJ`, un byte por glifo, y el interletrado
parte las palabras entre trozos. La comprobación descomprime los `stream`,
concatena los trozos y normaliza los espacios antes de buscar.

## Reproducir

La plantilla no se puede importar desde un script suelto sin un rodeo: exige
`server-only`, que solo se resuelve bajo la condición `react-server`, y esa misma
condición rompe el reconciliador de `@react-pdf`. Dentro de Next no hay conflicto
porque resuelve cada cosa por su lado. Desde fuera hay que precargar la caché de
CommonJS:

```js
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const p = req.resolve("server-only");
req.cache[p] = { id: p, filename: p, loaded: true, exports: {} };

const { renderReport } = await import("./lib/reports/template.tsx");
```
