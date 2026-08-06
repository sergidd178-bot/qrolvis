// POST público. Pantalla 1 del formulario (docs/01, "Envío de respuestas").
//
// El cliente manda el código del punto de captación, no su id: desde que la
// vista capture_point_config se recortó a cuatro columnas, el navegador ya no
// conoce el id, y es el servidor quien lo resuelve.

import { createResponse } from "@/lib/db/responses";
import { DEFAULT_LANGUAGE, isLanguage } from "@/lib/i18n";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const { code, overallRating, language, deviceToken } = (body ?? {}) as Record<string, unknown>;

  if (typeof code !== "string" || typeof overallRating !== "number") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const result = await createResponse({
    code,
    overallRating,
    language: isLanguage(language) ? language : DEFAULT_LANGUAGE,
    deviceToken: typeof deviceToken === "string" ? deviceToken : null,
  });

  if (result.status === "already_answered") {
    return Response.json({ error: "already_answered" }, { status: 409 });
  }

  // Un código inválido y una valoración fuera de rango devuelven lo mismo: no se
  // da información que permita distinguir códigos existentes de inexistentes.
  if (result.status === "unavailable") {
    return Response.json({ error: "unavailable" }, { status: 404 });
  }

  return Response.json({ responseId: result.responseId }, { status: 201 });
}
