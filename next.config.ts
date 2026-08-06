import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El criterio de rendimiento de /f/[code] es FCP < 1 s en 4G lento (docs/01,
  // D21). Cualquier cabecera o reescritura que se añada aquí debe respetarlo, y
  // la comprobación es medir con Lighthouse, no estimar.
  poweredByHeader: false,

  // Inlinea el CSS en el documento y elimina la petición bloqueante de la hoja
  // de estilos. Con 150 ms de RTT era el único coste de la ruta crítica
  // evitable sin renunciar a React: el peor caso baja de 942 ms a 722 ms.
  //
  // Decisión D22. Es un flag EXPERIMENTAL: cualquier actualización de Next.js
  // obliga a volver a medir Lighthouse en /f/[code] antes de darla por buena.
  experimental: {
    inlineCss: true,
  },

  // Solo afecta a `next dev`. Al abrir el formulario desde el móvil por la IP
  // de la red local, Next considera esas peticiones de otro origen y avisa;
  // declarar el origen quita el aviso y evita que una versión futura lo bloquee.
  //
  // Si el router reparte por DHCP, esta IP puede cambiar: comprobarla con
  // `ipconfig` y actualizarla aquí. No tiene ningún efecto en producción.
  allowedDevOrigins: ["192.168.1.38"],
};

export default nextConfig;
