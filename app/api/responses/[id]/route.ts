// PATCH público. Pantallas 2 y 3 (docs/01, "Envío de respuestas").
//
//   step = "answers"   pantalla 2, dimensiones y comentario
//   step = "complete"  pantalla 3, marca la respuesta como completa

import { addDimensionAnswers, completeResponse, type DimensionAnswer } from "@/lib/db/responses";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const { step, answers, comment } = (body ?? {}) as Record<string, unknown>;

  if (step === "complete") {
    const result = await completeResponse(id);
    return result.status === "ok"
      ? Response.json({ ok: true })
      : Response.json({ error: "not_updatable" }, { status: 409 });
  }

  if (step !== "answers") {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed: DimensionAnswer[] = Array.isArray(answers)
    ? answers
        .filter(
          (a): a is { questionId: string; ratingValue: number } =>
            typeof a === "object" &&
            a !== null &&
            typeof (a as Record<string, unknown>).questionId === "string" &&
            typeof (a as Record<string, unknown>).ratingValue === "number",
        )
        .map((a) => ({ questionId: a.questionId, ratingValue: a.ratingValue }))
    : [];

  const result = await addDimensionAnswers(
    id,
    parsed,
    typeof comment === "string" ? comment : null,
  );

  return result.status === "ok"
    ? Response.json({ ok: true })
    : Response.json({ error: "not_updatable" }, { status: 409 });
}
