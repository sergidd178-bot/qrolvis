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

  // Confirmaciones
  createdWithPoint: (name: string, code: string) =>
    `Creado «${name}». Su punto de captación General ya existe, con el código ${code}. Ese código es el que irá impreso en el QR y no cambia nunca.`,
  updated: (name: string) => `Guardados los cambios de «${name}».`,
} as const;

export type AdminDictionary = typeof admin;
