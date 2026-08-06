// Formulario público. Ruta crítica de rendimiento (R9, docs/01).
//
// No hay ningún componente de cliente en esta ruta: las tres pantallas son
// formularios HTML nativos cuyo `action` es una Server Action. El flujo avanza
// con navegaciones normales del navegador, así que funciona con JavaScript
// desactivado (docs/03, "Casos límite").
//
// La pantalla se elige por el parámetro `s` de la URL, y `r` lleva el id de la
// respuesta en curso. Sin JavaScript no hay dónde guardar estado en cliente, así
// que el estado va en la URL.
//
// REGLA BLOQUEANTE (docs/03, "Cumplimiento de las políticas de Google"): el
// botón de Google se muestra a todo el que llega a la pantalla 3. Lo único que
// depende de la valoración es el texto que lo acompaña.

import { headers } from "next/headers";

import { createPublicClient } from "@/lib/db/client";
import { readOverallRating } from "@/lib/db/responses";
import {
  detectLanguage,
  getDictionary,
  isLanguage,
  type Dictionary,
  type Language,
} from "@/lib/i18n";
import { skipDimensions, startResponse, submitDimensions } from "./actions";

export const dynamic = "force-dynamic";

const EMOJI = ["😞", "🙁", "😐", "🙂", "😀"];

const touchTarget = {
  minWidth: "56px",
  minHeight: "56px",
  fontSize: "1.5rem",
  margin: "0.25rem",
};

type PageProps = {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ s?: string; r?: string; lang?: string; blocked?: string; privacidad?: string }>;
};

/** Construye una URL de la ruta conservando el estado que haya en curso. */
function href(code: string, params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const query = search.toString();
  return `/f/${code}${query ? `?${query}` : ""}`;
}

function Shell({
  code,
  language,
  s,
  r,
  t,
  children,
}: {
  code: string;
  language: Language;
  s?: string;
  r?: string;
  t: Dictionary;
  children: React.ReactNode;
}) {
  const other: Language = language === "ca" ? "es" : "ca";
  return (
    <main style={{ padding: "1.5rem", maxWidth: "32rem", margin: "0 auto" }}>
      {children}
      <footer style={{ marginTop: "2rem", fontSize: "0.75rem", textAlign: "center" }}>
        {/* Los dos enlaces conservan s y r para no perder la respuesta en curso. */}
        {/* Selector manual de idioma, siempre visible (docs/03, "Idioma") */}
        <a href={href(code, { s, r, lang: other })}>{other === "ca" ? "Català" : "Castellano"}</a>
        {" · "}
        {/* docs/06: enlace discreto en el pie de las tres pantallas, nunca un
            modal que bloquee el uso del formulario. */}
        <a href={href(code, { s, r, lang: language, privacidad: "1" })}>{t.privacy.link}</a>
      </footer>
    </main>
  );
}

/** Aviso de privacidad. Los siete apartados de docs/06, en su orden. */
function PrivacyNotice({
  businessName,
  backHref,
  t,
}: {
  businessName: string;
  backHref: string;
  t: Dictionary;
}) {
  const p = t.privacy;
  const fill = (text: string) => text.replaceAll("{business}", businessName);
  const sections: [string, string][] = [
    [p.p1Title, p.p1Body],
    [p.p2Title, p.p2Body],
    [p.p3Title, p.p3Body],
    [p.p4Title, p.p4Body],
    [p.p5Title, p.p5Body],
    [p.p6Title, p.p6Body],
    [p.p7Title, p.p7Body],
  ];

  return (
    <section>
      <h1>{p.title}</h1>
      {sections.map(([title, body]) => (
        <section key={title}>
          <h2 style={{ fontSize: "1rem" }}>{title}</h2>
          <p>{fill(body)}</p>
        </section>
      ))}
      <p>
        <a href={backHref}>{p.back}</a>
      </p>
    </section>
  );
}

function Screen1({
  code,
  language,
  businessName,
  t,
}: {
  code: string;
  language: Language;
  businessName: string;
  t: Dictionary;
}) {
  return (
    <section style={{ textAlign: "center" }}>
      <h1>{businessName}</h1>
      <p>{t.screen1Question}</p>
      {/* Un solo formulario con cinco botones de envío. El navegador manda el
          name/value del botón pulsado, así que un toque crea la respuesta y
          avanza, sin botón de continuar y sin JavaScript. */}
      <form action={startResponse}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <div role="group" aria-label={t.screen1Question}>
          {t.ratingLabels.map((label, index) => (
            <button
              key={label}
              type="submit"
              name="rating"
              value={index + 1}
              aria-label={`${index + 1} - ${label}`}
              style={{ ...touchTarget, display: "inline-block" }}
            >
              <span aria-hidden="true" style={{ display: "block" }}>
                {EMOJI[index]}
              </span>
              {/* docs/03, accesibilidad: etiqueta textual visible, no solo el emoji */}
              <span style={{ fontSize: "0.75rem" }}>{label}</span>
            </button>
          ))}
        </div>
      </form>
    </section>
  );
}

function Screen2({
  code,
  language,
  responseId,
  dimensions,
  commentLabel,
  t,
}: {
  code: string;
  language: Language;
  responseId: string;
  dimensions: { id: string; label: string }[];
  commentLabel: string | null;
  t: Dictionary;
}) {
  return (
    <section>
      <h1>{t.screen2Title}</h1>
      <form action={submitDimensions}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="responseId" value={responseId} />

        {dimensions.map((dimension) => (
          <fieldset key={dimension.id} style={{ border: 0, padding: 0, margin: "1rem 0" }}>
            <legend>{dimension.label}</legend>
            {/* Radios nativos: accesibles con teclado y lector de pantalla, y
                opcionales porque ninguno lleva `required` (docs/03). */}
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                style={{ ...touchTarget, minWidth: "44px", display: "inline-block" }}
              >
                <input type="radio" name={`q_${dimension.id}`} value={value} />
                {value}
              </label>
            ))}
          </fieldset>
        ))}

        {commentLabel && (
          <p>
            <label htmlFor="comment">
              {commentLabel} {t.commentOptional}
            </label>
            <br />
            <textarea id="comment" name="comment" rows={3} style={{ width: "100%" }} />
          </p>
        )}

        <button type="submit" style={touchTarget}>
          {t.send}
        </button>
      </form>

      {/* Saltar es su propio formulario: un <form> no puede anidarse en otro, y
          sin JavaScript no hay forma de que un botón envíe a otra acción. */}
      <form action={skipDimensions}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="responseId" value={responseId} />
        <button
          type="submit"
          style={{ ...touchTarget, background: "none", border: 0, textDecoration: "underline" }}
        >
          {t.skip}
        </button>
      </form>
    </section>
  );
}

function Screen3({
  rating,
  googleReviewUrl,
  t,
}: {
  rating: number | null;
  googleReviewUrl: string | null;
  t: Dictionary;
}) {
  const positive = rating !== null && rating >= 4;
  return (
    <section style={{ textAlign: "center" }}>
      {/* Solo el TEXTO depende de la valoración. */}
      <h1>{positive ? t.thanksHighTitle : t.thanksLowTitle}</h1>
      <p>{positive ? t.thanksHighBody : t.thanksLowBody}</p>

      {/* El botón se muestra siempre que el negocio tenga URL, sea cual sea la
          valoración. La única condición admisible es la ausencia de URL
          (docs/03, "Casos límite"). */}
      {googleReviewUrl && (
        <p>
          <a
            href={googleReviewUrl}
            rel="noopener noreferrer"
            target="_blank"
            style={{ ...touchTarget, display: "inline-block", padding: "1rem" }}
          >
            {t.googleButton}
          </a>
        </p>
      )}
    </section>
  );
}

export default async function CapturePointPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { s, r, lang, blocked, privacidad } = await searchParams;

  const requestHeaders = await headers();
  const language: Language = isLanguage(lang)
    ? lang
    : detectLanguage(requestHeaders.get("accept-language"));

  const t = getDictionary(language);
  const supabase = createPublicClient();

  const { data: configRows } = await supabase.rpc("capture_point_config", { p_code: code });
  const config = configRows?.[0];

  // docs/03, "Casos límite": código inexistente, punto desactivado y negocio
  // pausado muestran el mismo mensaje neutro. La función unifica los tres.
  if (!config) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>{t.unavailable}</p>
      </main>
    );
  }

  // El aviso de privacidad se sirve en esta misma ruta y sustituye a la pantalla
  // en curso, sin perderla: `s` y `r` viajan en el enlace de vuelta. No es un
  // modal ni bloquea el formulario (docs/06).
  if (privacidad === "1") {
    return (
      <Shell code={code} language={language} s={s} r={r} t={t}>
        <PrivacyNotice
          businessName={config.business_name}
          backHref={href(code, { s, r, lang: language })}
          t={t}
        />
      </Shell>
    );
  }

  if (blocked === "1") {
    return (
      <Shell code={code} language={language} s={s} r={r} t={t}>
        <p style={{ textAlign: "center" }}>{t.alreadyAnswered}</p>
      </Shell>
    );
  }

  if (s === "3" && r) {
    return (
      <Shell code={code} language={language} s={s} r={r} t={t}>
        <Screen3
          rating={await readOverallRating(r)}
          googleReviewUrl={config.google_review_url}
          t={t}
        />
      </Shell>
    );
  }

  if (s === "2" && r) {
    const { data: questions } = await supabase
      .from("questions")
      .select("id, type, text_es, text_ca, position")
      .eq("question_set_id", config.question_set_id)
      .order("position");

    const all = questions ?? [];
    const label = (q: (typeof all)[number]) => (language === "ca" ? q.text_ca : q.text_es);
    const textQuestion = all.find((q) => q.type === "text");

    return (
      <Shell code={code} language={language} s={s} r={r} t={t}>
        <Screen2
          code={code}
          language={language}
          responseId={r}
          dimensions={all
            .filter((q) => q.type === "rating")
            .map((q) => ({ id: q.id, label: label(q) }))}
          commentLabel={textQuestion ? label(textQuestion) : null}
          t={t}
        />
      </Shell>
    );
  }

  return (
    <Shell code={code} language={language} s={s} r={r} t={t}>
      <Screen1 code={code} language={language} businessName={config.business_name} t={t} />
    </Shell>
  );
}
