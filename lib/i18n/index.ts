// Diccionario del formulario público. Ningún componente lleva texto en duro.
//
// Los textos de las tres pantallas están copiados de docs/03-flujo-formulario.md.
// Los de la pantalla 3 son sensibles: cambian según la valoración, pero lo único
// que puede cambiar es el texto. El botón de Google se muestra siempre (R2).

export const LANGUAGES = ["es", "ca"] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "es";

export type Dictionary = {
  screen1Question: string;
  ratingLabels: readonly [string, string, string, string, string];
  screen2Title: string;
  commentOptional: string;
  skip: string;
  send: string;
  thanksHighTitle: string;
  thanksHighBody: string;
  thanksLowTitle: string;
  thanksLowBody: string;
  /**
   * Versiones para el negocio SIN `google_review_url`.
   *
   * docs/03, "Casos límite": ahí la pantalla 3 es "sin botón, solo
   * agradecimiento". Los textos normales invitan a dejar una reseña, y sin
   * enlace esa invitación no lleva a ninguna parte: se pide algo y no se da
   * forma de hacerlo.
   */
  thanksHighBodyNoLink: string;
  thanksLowBodyNoLink: string;
  googleButton: string;
  /** Solo para lector de pantalla: el enlace de Google abre en pestaña nueva. */
  googleNewWindow: string;
  unavailable: string;
  alreadyAnswered: string;
  sendError: string;
  sendFailed: string;
  languageName: string;
  privacy: PrivacyNotice;
};

/**
 * Aviso de privacidad. Los siete apartados son los que exige
 * docs/06-privacidad-rgpd.md, sección "Aviso de privacidad", en ese orden.
 *
 * `{business}` se sustituye por el nombre del negocio, que es el responsable del
 * tratamiento. El apartado 6 lleva la advertencia honesta que pide el documento:
 * al ser anónimo, no se puede localizar una respuesta concreta para borrarla.
 */
export type PrivacyNotice = {
  link: string;
  title: string;
  back: string;
  p1Title: string;
  p1Body: string;
  p2Title: string;
  p2Body: string;
  p3Title: string;
  p3Body: string;
  p4Title: string;
  p4Body: string;
  p5Title: string;
  p5Body: string;
  p6Title: string;
  p6Body: string;
  p7Title: string;
  p7Body: string;
};

const dictionary: Record<Language, Dictionary> = {
  es: {
    screen1Question: "¿Cómo ha ido tu visita?",
    ratingLabels: ["Muy mal", "Mal", "Normal", "Bien", "Muy bien"],
    screen2Title: "Valora estos aspectos",
    commentOptional: "(opcional)",
    skip: "Saltar",
    send: "Enviar",
    thanksHighTitle: "¡Gracias!",
    thanksHighBody: "Nos alegra que hayas disfrutado. ¿Nos ayudas dejando una reseña en Google? Nos ayuda muchísimo.",
    thanksLowTitle: "Gracias por decírnoslo",
    thanksLowBody:
      "Sentimos que no haya ido como esperabas. Hemos avisado al responsable y lo tendrá en cuenta. Si quieres, también puedes dejar tu opinión pública en Google.",
    thanksHighBodyNoLink: "Nos alegra que hayas disfrutado. Gracias por dedicarnos estos segundos.",
    thanksLowBodyNoLink:
      "Sentimos que no haya ido como esperabas. Hemos avisado al responsable y lo tendrá en cuenta.",
    googleButton: "Dejar reseña en Google",
    googleNewWindow: "Se abre en una ventana nueva",
    unavailable: "Este código no está disponible",
    alreadyAnswered: "Ya hemos recibido tu opinión, gracias",
    sendError: "No se ha podido enviar. Reintentando…",
    sendFailed: "No se ha podido enviar. Comprueba tu conexión.",
    languageName: "Castellano",
    privacy: {
      link: "Privacidad",
      title: "Cómo tratamos tus respuestas",
      back: "Volver al formulario",

      p1Title: "1. Quién trata tus respuestas",
      p1Body:
        "El responsable es {business}, que es quien ha decidido recoger opiniones de sus clientes. Qrolvis actúa como encargado del tratamiento: gestiona el formulario y guarda las respuestas por cuenta del negocio y siguiendo sus instrucciones.",

      p2Title: "2. No te pedimos ningún dato personal",
      p2Body:
        "No se pide nombre, correo, teléfono ni registro. No se guarda tu dirección IP ni datos de tu navegador. No existe ninguna forma de saber quién ha respondido. El comentario es un campo libre: te pedimos que no escribas en él datos que puedan identificarte a ti o a otra persona.",

      p3Title: "3. Un identificador técnico para no contar dos veces lo mismo",
      p3Body:
        "Se guarda en tu navegador una cookie técnica con un número aleatorio. No procede de ningún dato tuyo y no permite identificarte. Sirve solo para no registrar dos opiniones seguidas desde el mismo navegador, y caduca a las 6 horas. Ese mismo número queda junto a tu respuesta un máximo de 7 días y después se borra. No se usa para publicidad ni para seguirte por otras webs, por eso no se te pide consentimiento de cookies.",

      p4Title: "4. Cuánto tiempo se conservan las opiniones",
      p4Body:
        "Las valoraciones y los comentarios se conservan 24 meses y después se borran. Los informes que recibe el negocio son resúmenes agregados, sin respuestas individuales.",

      p5Title: "5. Con quién se comparten",
      p5Body:
        "No se ceden a terceros. Solo intervienen los proveedores necesarios para que el servicio funcione: Supabase (base de datos, alojada en la Unión Europea), Vercel (alojamiento de la aplicación) y Resend (envío de avisos por correo al negocio).",

      p6Title: "6. Tus derechos, y una advertencia honesta",
      p6Body:
        "Puedes ejercer los derechos de acceso, rectificación, supresión, oposición y limitación del tratamiento. Ahora la parte honesta: como la encuesta es anónima, no es técnicamente posible localizar una respuesta concreta para borrarla ni para mostrártela. No guardamos nada que permita relacionar una respuesta contigo. Es la consecuencia directa de no pedirte datos personales, y preferimos decírtelo a prometerte algo que no podríamos cumplir.",

      p7Title: "7. Contacto",
      p7Body:
        "Para cualquier duda sobre este aviso: privacidad@qrolvis.com. Si tu consulta es sobre la encuesta en sí, puedes dirigirte también a {business}, que es el responsable.",
    },
  },
  ca: {
    screen1Question: "Com ha anat la teva visita?",
    ratingLabels: ["Molt malament", "Malament", "Normal", "Bé", "Molt bé"],
    screen2Title: "Valora aquests aspectes",
    commentOptional: "(opcional)",
    skip: "Ometre",
    send: "Enviar",
    thanksHighTitle: "Gràcies!",
    thanksHighBody: "Ens alegra que ho hagis gaudit. Ens ajudes deixant una ressenya a Google? Ens ajuda moltíssim.",
    thanksLowTitle: "Gràcies per dir-nos-ho",
    thanksLowBody:
      "Lamentem que no hagi anat com esperaves. Hem avisat el responsable i ho tindrà en compte. Si vols, també pots deixar la teva opinió pública a Google.",
    thanksHighBodyNoLink: "Ens alegra que ho hagis gaudit. Gràcies per dedicar-nos aquests segons.",
    thanksLowBodyNoLink:
      "Lamentem que no hagi anat com esperaves. Hem avisat el responsable i ho tindrà en compte.",
    googleButton: "Deixar ressenya a Google",
    googleNewWindow: "S'obre en una finestra nova",
    unavailable: "Aquest codi no està disponible",
    alreadyAnswered: "Ja hem rebut la teva opinió, gràcies",
    sendError: "No s'ha pogut enviar. Reintentant…",
    sendFailed: "No s'ha pogut enviar. Comprova la connexió.",
    languageName: "Català",
    privacy: {
      link: "Privacitat",
      title: "Com tractem les teves respostes",
      back: "Tornar al formulari",

      p1Title: "1. Qui tracta les teves respostes",
      p1Body:
        "El responsable és {business}, que és qui ha decidit recollir opinions dels seus clients. Qrolvis actua com a encarregat del tractament: gestiona el formulari i desa les respostes per compte del negoci i seguint les seves instruccions.",

      p2Title: "2. No et demanem cap dada personal",
      p2Body:
        "No es demana nom, correu, telèfon ni registre. No es desa la teva adreça IP ni dades del teu navegador. No hi ha cap manera de saber qui ha respost. El comentari és un camp lliure: et demanem que no hi escriguis dades que puguin identificar-te a tu o a una altra persona.",

      p3Title: "3. Un identificador tècnic per no comptar dues vegades el mateix",
      p3Body:
        "Es desa al teu navegador una galeta tècnica amb un número aleatori. No prové de cap dada teva i no permet identificar-te. Serveix només per no registrar dues opinions seguides des del mateix navegador, i caduca al cap de 6 hores. Aquest mateix número queda al costat de la teva resposta un màxim de 7 dies i després s'esborra. No s'utilitza per a publicitat ni per seguir-te per altres webs, i per això no se't demana consentiment de galetes.",

      p4Title: "4. Quant de temps es conserven les opinions",
      p4Body:
        "Les valoracions i els comentaris es conserven 24 mesos i després s'esborren. Els informes que rep el negoci són resums agregats, sense respostes individuals.",

      p5Title: "5. Amb qui es comparteixen",
      p5Body:
        "No es cedeixen a tercers. Només hi intervenen els proveïdors necessaris perquè el servei funcioni: Supabase (base de dades, allotjada a la Unió Europea), Vercel (allotjament de l'aplicació) i Resend (enviament d'avisos per correu al negoci).",

      p6Title: "6. Els teus drets, i un advertiment honest",
      p6Body:
        "Pots exercir els drets d'accés, rectificació, supressió, oposició i limitació del tractament. Ara la part honesta: com que l'enquesta és anònima, no és tècnicament possible localitzar una resposta concreta per esborrar-la ni per mostrar-te-la. No desem res que permeti relacionar una resposta amb tu. És la conseqüència directa de no demanar-te dades personals, i preferim dir-t'ho abans que prometre't una cosa que no podríem complir.",

      p7Title: "7. Contacte",
      p7Body:
        "Per a qualsevol dubte sobre aquest avís: privacidad@qrolvis.com. Si la teva consulta és sobre l'enquesta en si, també pots adreçar-te a {business}, que és el responsable.",
    },
  },
};

export function getDictionary(language: Language): Dictionary {
  return dictionary[language];
}

export function isLanguage(value: unknown): value is Language {
  return value === "es" || value === "ca";
}

/**
 * docs/03, "Idioma": si el navegador pide catalán se muestra en catalán; en
 * cualquier otro caso, castellano.
 *
 * No se usa una librería de negociación de contenido: la regla es de dos casos y
 * el presupuesto de esta ruta no admite una dependencia para esto (R9).
 */
export function detectLanguage(acceptLanguage: string | null): Language {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;
  for (const part of acceptLanguage.split(",")) {
    const tag = (part.split(";")[0] ?? "").trim().toLowerCase();
    if (tag === "ca" || tag.startsWith("ca-")) return "ca";
  }
  return DEFAULT_LANGUAGE;
}
