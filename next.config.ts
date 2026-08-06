import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El criterio de rendimiento de /f/[code] es FCP < 1 s en 4G lento (docs/01,
  // D21). Cualquier cabecera o reescritura que se añada aquí debe respetarlo, y
  // la comprobación es medir con Lighthouse, no estimar.
  poweredByHeader: false,
};

export default nextConfig;
