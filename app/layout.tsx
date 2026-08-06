import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qrolvis",
};

// El idioma se fija por ahora en castellano. Cuando exista el diccionario de
// traducciones (Fase 1) pasará a resolverse por negocio.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
