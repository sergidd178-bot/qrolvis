import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuración de los tests. Existe por un solo motivo: `server-only`.
 *
 * Ese paquete es un marcador para el compilador, y su entrypoint por defecto
 * LANZA al importarse fuera de un Server Component. Eso deja fuera del alcance
 * de los tests a cualquier módulo que lo lleve en la primera línea, entre ellos
 * `lib/reports/monthly.ts`, cuyos textos de correo sí queremos fijar.
 *
 * Se sustituye por el módulo vacío que el propio paquete trae para la condición
 * `react-server`. NO SE RELAJA NINGUNA GARANTÍA: quien impide que un módulo de
 * servidor acabe en el bundle del navegador es el compilador de Next al
 * construir, no el runner de tests, y ahí `server-only` sigue intacto.
 */
const vacio = fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url));
const alias = [{ find: /^server-only$/, replacement: vacio }];

export default defineConfig({
  resolve: { alias },
  test: { alias },
});
