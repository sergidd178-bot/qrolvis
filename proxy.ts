import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca el token de sesión del panel antes de que caduque.
 *
 * Se llamaba `middleware.ts` hasta Next 16, que renombró la convención a `proxy`
 * para dejar de confundirla con el middleware de Express. Es el mismo mecanismo
 * con otro nombre: mismo matcher, mismo comportamiento.
 *
 * Solo hace eso. La autorización de verdad está en el layout de
 * `app/admin/(panel)/`, que comprueba la sesión en servidor: un proxy no
 * es un buen sitio para decidir accesos, porque su lógica es fácil de rodear si
 * algún día cambia el matcher.
 *
 * EL MATCHER ES CRÍTICO. Solo puede alcanzar `/admin`. Si llegara a cubrir
 * `/f/[code]`, añadiría un salto de red a la ruta crítica del formulario y
 * rompería el criterio de FCP de D21. No ampliar sin volver a medir.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
