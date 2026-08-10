import type { Metadata } from "next";
import type { ReactNode } from "react";

import "../globals.css";

export const metadata: Metadata = {
  title: "Qrolvis",
};

/**
 * Layout raíz de `/`, que hoy es solo un marcador de posición.
 *
 * Existe porque en el App Router toda página necesita un layout que renderice
 * `<html>` y `<body>`, y al repartir el layout raíz entre `/f` y `/admin` esta
 * ruta se quedó sin ninguno por encima. El grupo `(raiz)` no aparece en la URL.
 */
export default function RootPlaceholderLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
