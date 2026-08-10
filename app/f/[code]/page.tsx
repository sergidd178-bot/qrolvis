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

import { Fragment } from "react";
import { headers } from "next/headers";

import { createPublicClient } from "@/lib/db/client";
import { readOverallRating } from "@/lib/db/responses";
import {
  getDictionary,
  resolveLanguage,
  type Dictionary,
  type Language,
} from "@/lib/i18n";
import { skipDimensions, startResponse, submitDimensions } from "./actions";
import shell from "./shell.module.css";
import styles from "./screen1.module.css";
import s2 from "./screen2.module.css";
import s3 from "./screen3.module.css";

export const dynamic = "force-dynamic";

/**
 * Bocas de los cinco iconos de valoración, de muy insatisfecho a muy satisfecho.
 *
 * Es lo ÚNICO que cambia entre los cinco: el círculo y los ojos son idénticos.
 * Un solo parámetro variable es lo que hace que el conjunto se lea como un
 * sistema y no como cinco dibujos sueltos.
 *
 * Coordenadas en el viewBox de 24×24. El punto de control de la curva sube o
 * baja respecto de los extremos: por encima da ceño, por debajo da sonrisa, y
 * el centro es una recta.
 */
const MOUTHS = [
  "M8 15.9 Q12 12.6 16 15.9",
  "M8 15.4 Q12 13.6 16 15.4",
  "M8 14.9 H16",
  "M8 14.2 Q12 16 16 14.2",
  "M8 13.8 Q12 17.1 16 13.8",
];

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
    <main className={shell.shell}>
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

/**
 * Cara de valoración. Trazo único y geometría idéntica en los cinco: mismo
 * círculo, mismos ojos, mismo grosor. `currentColor` deja que el color lo
 * decida el estado del botón desde CSS, sin duplicar los SVG por variante.
 */
function RatingFace({ index }: { index: number }) {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.75 9.4 v1.6" />
      <path d="M15.25 9.4 v1.6" />
      <path d={MOUTHS[index]} />
    </svg>
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
    <section className={styles.screen}>
      <p className={styles.business}>{businessName}</p>
      <h1 className={styles.question}>{t.screen1Question}</h1>

      {/* Un solo formulario con cinco botones de envío. El navegador manda el
          name/value del botón pulsado, así que un toque crea la respuesta y
          avanza, sin botón de continuar y sin JavaScript. */}
      <form action={startResponse}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <div className={styles.card}>
          <div className={styles.options} role="group" aria-label={t.screen1Question}>
            {t.ratingLabels.map((label, index) => (
              <button
                key={label}
                type="submit"
                name="rating"
                value={index + 1}
                aria-label={`${index + 1} - ${label}`}
                className={styles.option}
              >
                <span className={styles.iconBox}>
                  <RatingFace index={index} />
                </span>
                {/* Marca del rail: convierte la fila en una escala graduada. */}
                <span className={styles.tick} aria-hidden="true" />
                {/* docs/03, accesibilidad: etiqueta textual visible, no solo el icono */}
                <span className={styles.label}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </section>
  );
}

/**
 * Estrella de valoración. Mismo lenguaje de trazo que las caras de la pantalla
 * 1 —1,75 de grosor, extremos redondeados, geometría de 24×24— para que ambas
 * pantallas se lean como el mismo sistema.
 *
 * El relleno y el contorno los decide el CSS según el radio marcado.
 */
function StarIcon({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 3 14.29 8.85 20.56 9.22 15.71 13.21 17.29 19.28 12 15.9 6.71 19.28 8.29 13.21 3.44 9.22 9.71 8.85 Z" />
    </svg>
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
    <section className={s2.screen}>
      <h1 className={s2.title}>{t.screen2Title}</h1>

      <form action={submitDimensions}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="responseId" value={responseId} />

        <div className={s2.card}>
          {dimensions.map((dimension) => (
            <fieldset key={dimension.id} className={s2.question}>
              <legend className={s2.legend}>{dimension.label}</legend>
              {/* Radios nativos en orden natural 1→5. Ninguno lleva `required`:
                  las cuatro dimensiones son siempre opcionales (docs/03). */}
              <div className={s2.stars}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Fragment key={value}>
                    <input
                      className={s2.srOnly}
                      type="radio"
                      id={`${dimension.id}-${value}`}
                      name={`q_${dimension.id}`}
                      value={value}
                      aria-label={`${value} / 5`}
                    />
                    <label className={s2.star} htmlFor={`${dimension.id}-${value}`}>
                      <StarIcon />
                    </label>
                  </Fragment>
                ))}
              </div>
            </fieldset>
          ))}
        </div>

        {commentLabel && (
          <>
            <label className={s2.commentLabel} htmlFor="comment">
              {commentLabel} <span className={s2.optional}>{t.commentOptional}</span>
            </label>
            <textarea id="comment" name="comment" rows={2} className={s2.textarea} />
          </>
        )}

        <button type="submit" className={s2.submit}>
          {t.send}
        </button>
      </form>

      {/* Saltar es su propio formulario: un <form> no puede anidarse en otro, y
          sin JavaScript no hay forma de que un botón envíe a otra acción. */}
      <form action={skipDimensions} className={s2.skipForm}>
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />
        <input type="hidden" name="responseId" value={responseId} />
        <button type="submit" className={s2.skip}>
          {t.skip}
        </button>
      </form>
    </section>
  );
}

/**
 * Sello de recibido. Mismo círculo y mismo trazo que las caras de la pantalla 1:
 * el formulario abre con círculos que preguntan y cierra con el que confirma.
 */
function SealIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M8.2 12.3 10.9 15 15.8 9.3" />
    </svg>
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

  // Sin enlace no se puede invitar a dejar una reseña: docs/03 dice "sin botón,
  // solo agradecimiento". El texto va emparejado con el botón, no con la
  // valoración, y por eso se elige aquí y no dentro del JSX: si algún día
  // vuelve a desacoplarse, el fallo es que se pide algo que no se puede hacer.
  const body = googleReviewUrl
    ? positive
      ? t.thanksHighBody
      : t.thanksLowBody
    : positive
      ? t.thanksHighBodyNoLink
      : t.thanksLowBodyNoLink;

  return (
    <section className={s3.screen}>
      <span className={s3.seal}>
        <SealIcon />
      </span>

      {/* Solo el TEXTO depende de la valoración. Ni el sello, ni los colores, ni
          el tamaño, ni la posición del botón: las dos versiones de esta pantalla
          son idénticas salvo estas dos cadenas. */}
      <h1 className={s3.title}>{positive ? t.thanksHighTitle : t.thanksLowTitle}</h1>
      <p className={s3.body}>{body}</p>

      {/* El botón se muestra siempre que el negocio tenga URL, sea cual sea la
          valoración. La única condición admisible es la ausencia de URL
          (docs/03, "Casos límite"). Cualquier condicional que ate este botón a
          `rating` es un fallo bloqueante en revisión. */}
      {googleReviewUrl && (
        <a
          className={s3.button}
          href={googleReviewUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <StarIcon size={20} />
          {t.googleButton}
          <span className={s3.srOnly}>{t.googleNewWindow}</span>
        </a>
      )}
    </section>
  );
}

export default async function CapturePointPage({ params, searchParams }: PageProps) {
  const { code } = await params;
  const { s, r, lang, blocked, privacidad } = await searchParams;

  const requestHeaders = await headers();
  const supabase = createPublicClient();

  // La configuración se lee ANTES de resolver el idioma, porque el idioma del
  // negocio es el último escalón de la regla. No añade latencia: esta consulta
  // ya se hacía y sigue siendo la única de la pantalla 1.
  const { data: configRows } = await supabase.rpc("capture_point_config", { p_code: code });
  const config = configRows?.[0];

  const language = resolveLanguage({
    param: lang,
    acceptLanguage: requestHeaders.get("accept-language"),
    businessDefault: config?.default_language,
  });

  const t = getDictionary(language);

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
