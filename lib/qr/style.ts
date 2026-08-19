import "server-only";

/**
 * Estilo del QR imprimible (D38).
 *
 * Todo va en unidades de MÓDULO, nunca en píxeles: el SVG no lleva `width` ni
 * `height`, solo `viewBox`, así que lo que aquí se declara es proporción y no
 * tamaño. Quien lo pinta decide a cuántos milímetros sale.
 *
 * `server-only` aunque esto sea geometría pura y no toque nada del servidor:
 * es la barrera que impide que el estilo del panel acabe importado desde
 * `/f/[code]`, que es la ruta donde R9 no admite peso de más.
 */
export const QR_STYLE = {
  /** ISO 18004. Ninguna tinta decorativa puede entrar aquí. */
  quietZone: 4,
  background: { color: "#0a0a0a", corner: 0.06 },
  dots: { color: "#ffffff", diameter: 0.82 },
  finder: { outer: "#C9A227", eye: "#ffffff", corner: 0.3 },
  frame: { color: "#C9A227", diameter: 0.34, gap: 2, step: 2 },
} as const;

/** Aire entre el eje del marco decorativo y el borde del cuadrado de fondo. */
export const FRAME_BLEED = 1.5;

/** Constante de Bézier para aproximar un cuarto de circunferencia. */
const KAPPA = 0.5522847498307936;

/**
 * Redondeo fijo a tres decimales.
 *
 * D25 compara el SVG guardado carácter por carácter. Sin un redondeo estable,
 * la última cifra de un flotante bastaría para marcar como caducados QR que
 * están perfectamente bien.
 */
export function fixed(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  // `-0` se serializa como "-0" y rompería la comparación contra un "0".
  return Object.is(rounded, -0) ? "0" : String(rounded);
}

/**
 * Círculo como cuatro cúbicas en lugar de dos arcos `A`.
 *
 * Es el doble de bytes y se acepta a propósito: los arcos obligan a react-pdf a
 * su propia conversión a Bézier, y ese es justo el punto donde su render podría
 * separarse del de un navegador. Las cúbicas las dibuja igual todo el mundo.
 */
export function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA;
  return (
    `M${fixed(cx - r)},${fixed(cy)}` +
    `C${fixed(cx - r)},${fixed(cy - k)} ${fixed(cx - k)},${fixed(cy - r)} ${fixed(cx)},${fixed(cy - r)}` +
    `C${fixed(cx + k)},${fixed(cy - r)} ${fixed(cx + r)},${fixed(cy - k)} ${fixed(cx + r)},${fixed(cy)}` +
    `C${fixed(cx + r)},${fixed(cy + k)} ${fixed(cx + k)},${fixed(cy + r)} ${fixed(cx)},${fixed(cy + r)}` +
    `C${fixed(cx - k)},${fixed(cy + r)} ${fixed(cx - r)},${fixed(cy + k)} ${fixed(cx - r)},${fixed(cy)}Z`
  );
}

/** Cuadrado de esquinas redondeadas, recorrido en sentido horario. */
export function roundedSquarePath(x: number, y: number, side: number, r: number): string {
  const k = r * KAPPA;
  const x2 = x + side;
  const y2 = y + side;
  return (
    `M${fixed(x + r)},${fixed(y)}` +
    `L${fixed(x2 - r)},${fixed(y)}` +
    `C${fixed(x2 - r + k)},${fixed(y)} ${fixed(x2)},${fixed(y + r - k)} ${fixed(x2)},${fixed(y + r)}` +
    `L${fixed(x2)},${fixed(y2 - r)}` +
    `C${fixed(x2)},${fixed(y2 - r + k)} ${fixed(x2 - r + k)},${fixed(y2)} ${fixed(x2 - r)},${fixed(y2)}` +
    `L${fixed(x + r)},${fixed(y2)}` +
    `C${fixed(x + r - k)},${fixed(y2)} ${fixed(x)},${fixed(y2 - r + k)} ${fixed(x)},${fixed(y2 - r)}` +
    `L${fixed(x)},${fixed(y + r)}` +
    `C${fixed(x)},${fixed(y + r - k)} ${fixed(x + r - k)},${fixed(y)} ${fixed(x + r)},${fixed(y)}Z`
  );
}

/**
 * El mismo cuadrado recorrido al revés.
 *
 * Sirve para vaciar el interior de los anillos de localización por regla de
 * bobinado (nonzero), que respeta cualquier motor, en vez de con
 * `fill-rule="evenodd"`, que react-pdf no garantiza.
 */
export function reversedRoundedSquarePath(x: number, y: number, side: number, r: number): string {
  const k = r * KAPPA;
  const x2 = x + side;
  const y2 = y + side;
  return (
    `M${fixed(x + r)},${fixed(y)}` +
    `C${fixed(x + r - k)},${fixed(y)} ${fixed(x)},${fixed(y + r - k)} ${fixed(x)},${fixed(y + r)}` +
    `L${fixed(x)},${fixed(y2 - r)}` +
    `C${fixed(x)},${fixed(y2 - r + k)} ${fixed(x + r - k)},${fixed(y2)} ${fixed(x + r)},${fixed(y2)}` +
    `L${fixed(x2 - r)},${fixed(y2)}` +
    `C${fixed(x2 - r + k)},${fixed(y2)} ${fixed(x2)},${fixed(y2 - r + k)} ${fixed(x2)},${fixed(y2 - r)}` +
    `L${fixed(x2)},${fixed(y + r)}` +
    `C${fixed(x2)},${fixed(y + r - k)} ${fixed(x2 - r + k)},${fixed(y)} ${fixed(x2 - r)},${fixed(y)}Z`
  );
}

/**
 * Punto del perímetro de un cuadrado redondeado a `distance` del inicio.
 *
 * Se recorre por longitud de arco y no por ángulo para que el espaciado entre
 * puntos sea el mismo en los tramos rectos y en las curvas. Repartiendo el
 * perímetro completo entre un número entero de puntos, el anillo cierra sin
 * junta visible.
 */
export function roundedSquarePerimeterPoint(
  x: number,
  y: number,
  side: number,
  r: number,
  distance: number,
): [number, number] {
  const straight = side - 2 * r;
  const arc = (Math.PI * r) / 2;
  // Arriba, esquina, derecha, esquina, abajo, esquina, izquierda, esquina.
  const segments = [straight, arc, straight, arc, straight, arc, straight, arc];

  let d = distance;
  for (const [i, segment] of segments.entries()) {
    if (d > segment) {
      d -= segment;
      continue;
    }
    if (i === 0) return [x + r + d, y];
    if (i === 2) return [x + side, y + r + d];
    if (i === 4) return [x + side - r - d, y + side];
    if (i === 6) return [x, y + side - r - d];

    const a = d / r;
    if (i === 1) return [x + side - r + r * Math.sin(a), y + r - r * Math.cos(a)];
    if (i === 3) return [x + side - r + r * Math.cos(a), y + side - r + r * Math.sin(a)];
    if (i === 5) return [x + r - r * Math.sin(a), y + side - r + r * Math.cos(a)];
    return [x + r - r * Math.cos(a), y + r - r * Math.sin(a)];
  }
  return [x + r, y];
}
