/**
 * Diccionario del panel de administración.
 *
 * Solo castellano, a diferencia del formulario público, que es bilingüe. El
 * panel lo usa una única persona y mantener catalán aquí sería coste sin
 * beneficio. Excepción deliberada a la convención de idioma de CLAUDE.md, donde
 * queda anotada.
 *
 * Vive aparte de `lib/i18n/index.ts` a propósito: nada del panel debe poder
 * acabar importado desde `/f/[code]`.
 */
export const admin = {
  loginTitle: "Panel de Qrolvis",
  loginSubtitle: "Acceso del operador",
  email: "Correo electrónico",
  password: "Contraseña",
  signIn: "Entrar",
  signOut: "Cerrar sesión",
  // Mensaje deliberadamente genérico: no distingue entre correo inexistente y
  // contraseña incorrecta, para no confirmar qué cuentas existen.
  badCredentials: "No hemos podido entrar con esos datos.",
  missingFields: "Rellena el correo y la contraseña.",
  panelTitle: "Panel",
  signedInAs: "Sesión iniciada como",
  pending: "Las secciones de puntos de captación, QR y respuestas llegan en las siguientes tareas de la Fase 2.",

  // Negocios
  businesses: "Negocios",
  newBusiness: "Nuevo negocio",
  createBusiness: "Crear negocio",
  editBusiness: "Editar negocio",
  saveChanges: "Guardar cambios",
  saving: "Guardando…",
  choose: "Elige una opción",
  edit: "Editar",
  back: "Volver a negocios",
  noBusinesses: "Todavía no hay ningún negocio dado de alta.",

  businessName: "Nombre del negocio",
  sector: "Sector",
  sectorHint: "Determina el banco de preguntas. No se puede cambiar después.",
  sectorLocked:
    "El sector no se puede cambiar: los conjuntos de preguntas son versionados e inmutables, y cambiarlo rompería la comparación con las respuestas ya recogidas.",
  alertEmail: "Correo para las alertas",
  alertEmailHint: "Ahí llegan los avisos cuando alguien puntúa 2 o menos.",
  defaultLanguage: "Idioma por defecto",
  googleReviewUrl: "Enlace de reseña de Google",
  googleReviewUrlHint:
    "Opcional. Debe abrir el cuadro de escribir reseña, no la ficha del negocio. Sin enlace, la pantalla final solo agradece.",

  // Listado
  colName: "Nombre",
  colSector: "Sector",
  colPoints: "Puntos",
  colStatus: "Estado",
  colGoogle: "Google",
  googleSet: "Configurado",
  googleMissing: "Sin enlace",

  // Puntos de captación
  capturePoints: "Puntos de captación",
  activeOfTotal: (active: number, total: number) => `${active} activos de ${total}`,
  colLabel: "Etiqueta",
  colType: "Tipo",
  colCode: "Código",
  addPoint: "Añadir punto",
  pointLabel: "Etiqueta",
  pointLabelPlaceholder: "Mesa 4, Ana, Barra…",
  pointType: "Tipo",
  deactivate: "Desactivar",
  reactivate: "Reactivar",
  active: "activo",
  inactive: "inactivo",
  generalLocked:
    "El punto General se crea con el negocio y no puede añadirse a mano ni duplicarse.",
  deactivateWarning:
    "Al desactivarlo, el QR ya impreso dejará de funcionar y mostrará «Este código no está disponible». No se borra nunca: se puede reactivar.",
  pointTypeNames: {
    general: "General",
    table: "Mesa",
    room: "Sala",
    professional: "Profesional",
    counter: "Barra",
  } as Record<string, string>,
  pointCreated: (label: string, code: string) =>
    `Añadido «${label}» con el código ${code}. Ese código irá impreso en su QR y no cambia nunca.`,
  pointDeactivated: "Punto desactivado. Su QR impreso ya no funciona; puedes reactivarlo cuando quieras.",
  pointReactivated: "Punto reactivado. Su QR vuelve a funcionar.",

  // QR
  colQr: "QR",
  generateQr: "Generar QR",
  regenerateQr: "Regenerar",
  qrMissing: "Sin generar",
  qrGenerated: "QR generado.",
  qrFailed:
    "El punto se ha creado, pero su QR no. No se ha perdido nada: la imagen se reconstruye desde el código. Genérala con el botón de la lista.",
  qrProvisional:
    "QR de prueba, no imprimir todavía: el dominio cambiará antes de producción.",
  qrProvisionalDetail: (url: string) =>
    `Generados contra ${url}. Cuando exista el dominio definitivo, cámbialo en NEXT_PUBLIC_SITE_URL y pulsa «Regenerar» en cada punto: el código no cambia, solo la URL que codifica la imagen.`,
  qrEncodes: "Codifica",

  // El aviso de imagen caducada es distinto del de dominio provisional: aquí el
  // dominio puede ser correcto y aun así la imagen guardada apuntar a otro sitio.
  qrStale: "Caducado, no imprimir",
  qrStaleDetail:
    "Esta imagen codifica una URL distinta de la actual: se generó contra otro dominio, contra localhost o contra una IP de red local. Impresa, no llevaría al formulario. Pulsa «Regenerar».",
  qrUnverifiable: "Sin verificar",
  qrUnverifiableDetail:
    "No se ha podido descargar la imagen para comprobar a dónde apunta. No se da por buena: regenérala antes de imprimir.",
  qrStaleCount: (n: number) =>
    n === 1
      ? "1 QR no coincide con el dominio actual y no debe imprimirse."
      : `${n} QR no coinciden con el dominio actual y no deben imprimirse.`,
  qrVerified: "Comprobado contra el dominio actual",
  // Respuestas
  responses: "Respuestas",
  filterBusiness: "Negocio",
  filterAll: "Todos",
  filterFrom: "Desde",
  filterTo: "Hasta",
  filterRating: "Valoración",
  filterRatingAll: "Todas",
  filterDetractors: "≤ 2 (detractores)",
  filterState: "Estado",
  filterStateAll: "Todas",
  filterComplete: "Solo completas",
  filterPartial: "Solo parciales",
  applyFilters: "Filtrar",
  clearFilters: "Quitar filtros",
  responseCount: (n: number) => (n === 1 ? "1 respuesta" : `${n} respuestas`),
  noResponses: "No hay respuestas con estos filtros.",
  noResponsesHint:
    "No significa que algo falle: un local puede tener un periodo flojo. Prueba a ampliar las fechas o a quitar filtros.",
  colDate: "Fecha",
  colBusiness: "Negocio",
  colPoint: "Punto",
  colRating: "Valoración",
  colComment: "Comentario",
  hasComment: "Sí",
  noComment: "—",
  complete: "completa",
  partial: "parcial",
  // R-M3: las parciales cuentan. Se dice en la interfaz para que nadie
  // interprete el listado como si faltaran datos.
  partialNote:
    "Las respuestas parciales cuentan como respuestas válidas (R-M3): descartarlas sesgaría el resultado hacia quien tiene más paciencia.",
  page: "Página",
  previous: "Anterior",
  next: "Siguiente",

  // Comentarios
  comments: "Comentarios",
  seeComments: "Ver comentarios",
  seeResponses: "Ver listado de respuestas",
  commentCount: (n: number) => (n === 1 ? "1 comentario" : `${n} comentarios`),
  ofResponses: (n: number) => (n === 1 ? "1 respuesta en el mismo periodo" : `${n} respuestas en el mismo periodo`),
  noComments: "No hay comentarios con estos filtros.",
  noCommentsHint:
    "La mayoría de las respuestas no llevan texto: el campo es opcional y va al final. Que no haya comentarios no significa que no haya respuestas.",
  lowFirst: "Ordenados por valoración: primero los más bajos, que son los accionables (docs/05 §2.9).",
  // docs/06: el texto libre es la vía por la que pueden entrar datos personales
  // que la propia persona escribió.
  personalDataWarning:
    "El texto va íntegro, tal como se escribió. Puede contener datos personales que la persona incluyó por su cuenta —un nombre, la descripción de alguien del equipo—. No lo reenvíes fuera de aquí.",

  downloadPdf: "Descargar PDF de QR",
  downloadPdfHint:
    "Un QR por página, con su etiqueta y su código. Solo los puntos activos.",

  // Confirmaciones
  createdWithPoint: (name: string, code: string) =>
    `Creado «${name}». Su punto de captación General ya existe, con el código ${code}. Ese código es el que irá impreso en el QR y no cambia nunca.`,
  updated: (name: string) => `Guardados los cambios de «${name}».`,
} as const;

export type AdminDictionary = typeof admin;
