import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { getCapturePointConfig } from "@/lib/db/capturePointConfig";
import { resolveLanguage } from "@/lib/i18n";

import "../../globals.css";

export const metadata: Metadata = {
  title: "Qrolvis",
};

/**
 * Layout raíz del formulario público.
 *
 * Es raíz de verdad —renderiza `<html>` y `<body>`— porque no hay ningún layout
 * por encima: `app/layout.tsx` se eliminó a propósito. Cada rama de la
 * aplicación tiene el suyo, y así el `<html lang>` de esta ruta puede depender
 * del negocio sin arrastrar a `/admin`, que va siempre en castellano.
 *
 * Tiene que colgar de `[code]` y no de un grupo de rutas más arriba: el idioma
 * del negocio solo se puede averiguar con el código del punto delante, y un
 * layout únicamente recibe los parámetros que hay en su propio camino.
 *
 * LO QUE ESTE LAYOUT NO PUEDE VER es `?lang=`, el selector manual del pie: los
 * layouts no reciben la cadena de consulta, y el middleware no puede alcanzar
 * `/f` sin romper el presupuesto de D21. Por eso la página marca además el
 * idioma en su propio contenedor: cuando alguien cambia de lengua a mano, el
 * `<html>` se queda con el idioma de partida y el contenido declara el suyo,
 * que es la técnica que WCAG llama "idioma de las partes".
 */
export default async function PublicFormLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [config, requestHeaders] = await Promise.all([getCapturePointConfig(code), headers()]);

  const language = resolveLanguage({
    param: undefined,
    acceptLanguage: requestHeaders.get("accept-language"),
    businessDefault: config?.default_language,
  });

  return (
    <html lang={language}>
      <body>{children}</body>
    </html>
  );
}
