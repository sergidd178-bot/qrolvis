import "server-only";

import { formatInZone } from "../time";

/**
 * Plantilla del email de alerta.
 *
 * COPIADA LITERALMENTE de docs/05, sección 4 "Contenido del email". No es un
 * texto de relleno que se pueda mejorar al gusto: el documento lo fija palabra
 * por palabra, incluidas las comillas del comentario y el pie. Si hay que
 * cambiarlo, se cambia primero el documento.
 *
 * Se envía SOLO como texto plano, sin versión HTML. docs/05: "Sin enlaces a
 * paneles. Sin imágenes. Sin formato recargado. Se lee en el móvil, de pie, en
 * 10 segundos." Un email en texto plano es también el que mejor llega a la
 * bandeja principal, que es justo lo que necesita un aviso urgente.
 */

export type AlertDimension = {
  label: string;
  rating: number;
};

export type AlertEmailInput = {
  businessName: string;
  overallRating: number;
  pointLabel: string;
  submittedAt: string;
  comment: string | null;
  dimensions: AlertDimension[];
};

export function alertSubject(businessName: string): string {
  return `Valoración baja en ${businessName}`;
}

export function alertBody(input: AlertEmailInput): string {
  // docs/05 pone el comentario entre comillas, y el texto de reserva dentro de
  // ellas. Se respeta tal cual.
  const comment = input.comment?.trim() ? input.comment.trim() : "No dejó comentario";

  // El documento dice "listado de dimensiones respondidas" pero no fija el
  // formato de cada línea. Se elige el más escueto que se lee de un vistazo.
  // Si alguien salta la pantalla 2, no hay ninguna: se dice, en vez de dejar un
  // encabezado colgando y que parezca que falta información.
  const dimensions =
    input.dimensions.length > 0
      ? input.dimensions.map((d) => `- ${d.label}: ${d.rating} de 5`).join("\n")
      : "No valoró aspectos concretos.";

  return `Acabas de recibir una valoración de ${input.overallRating} sobre 5.

Punto: ${input.pointLabel}
Hora: ${formatInZone(input.submittedAt)}

Comentario del cliente:
"${comment}"

Valoraciones por aspecto:
${dimensions}

---
Recibes este aviso porque tienes activado el servicio de recogida
de opiniones. Responde a este email si quieres cambiar el umbral.
`;
}

/**
 * Resumen agrupado del día, cuando un negocio supera el tope de 5 individuales.
 *
 * docs/05 dice "se agrupa en un único email resumen" y NO especifica su
 * contenido, así que este formato es una decisión de implementación, no una cita
 * del documento. Se mantiene deliberadamente igual que la alerta individual —
 * misma información por respuesta, mismo pie, texto plano— para que quien ya ha
 * recibido alertas sueltas no tenga que aprender a leer otra cosa.
 */
export type DigestItem = {
  overallRating: number;
  pointLabel: string;
  submittedAt: string;
  comment: string | null;
  dimensions: AlertDimension[];
};

export function digestSubject(businessName: string, count: number): string {
  return `Resumen: ${count} valoraciones bajas en ${businessName}`;
}

export function digestBody(businessName: string, day: string, items: DigestItem[]): string {
  const bloques = items
    .map((item, i) => {
      const comment = item.comment?.trim() ? item.comment.trim() : "No dejó comentario";
      // Tres espacios, los mismos que el resto de líneas del bloque: con dos
      // quedaban colgando bajo su propio encabezado.
      const dimensions =
        item.dimensions.length > 0
          ? item.dimensions.map((d) => `   - ${d.label}: ${d.rating} de 5`).join("\n")
          : "   No valoró aspectos concretos.";
      return `${i + 1}. Valoración de ${item.overallRating} sobre 5
   Punto: ${item.pointLabel}
   Hora: ${formatInZone(item.submittedAt)}
   Comentario: "${comment}"
   Valoraciones por aspecto:
${dimensions}`;
    })
    .join("\n\n");

  return `El ${day} recibiste ${items.length} valoraciones de 2 o menos en ${businessName},
por encima del máximo de avisos sueltos que se envían en un día.

Van todas juntas aquí en vez de una por una:

${bloques}

---
Recibes este aviso porque tienes activado el servicio de recogida
de opiniones. Responde a este email si quieres cambiar el umbral.
`;
}

/**
 * Aviso al operador cuando un negocio supera 15 alertas en una semana.
 *
 * docs/05: "es señal de un problema serio en el local o de un uso indebido del
 * sistema". No lo recibe el negocio, sino el operador del servicio, así que no
 * lleva el pie de "responde para cambiar el umbral": no es para el cliente.
 */
export function operatorNoticeSubject(businessName: string): string {
  return `Aviso interno: ${businessName} supera 15 alertas en 7 días`;
}

export function operatorNoticeBody(businessName: string, count: number): string {
  return `${businessName} acumula ${count} alertas de valoración baja en los últimos 7 días.

docs/05 marca 15 como el punto en el que esto deja de ser ruido: o hay un
problema serio en el local, o alguien está usando el sistema de forma
indebida.

Este aviso es para ti, no para el negocio. No se le ha enviado.
`;
}
