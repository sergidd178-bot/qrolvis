import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../globals.css";

export const metadata: Metadata = {
  title: "Qrolvis · Panel",
};

/**
 * Layout raíz del panel.
 *
 * `lang="es"` fijo y sin ninguna lógica, a propósito: el panel va solo en
 * castellano por decisión explícita de CLAUDE.md —lo usa una única persona y
 * mantener catalán ahí es coste sin beneficio—, así que aquí no hay nada que
 * resolver ni consulta que hacer.
 *
 * Que esté separado del layout del formulario es justamente el motivo de
 * dividirlos: antes compartían un `<html lang="es">` único, y eso obligaba a que
 * la ruta pública mintiera sobre su idioma para no romper la del panel.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
