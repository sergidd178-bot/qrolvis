"use server";

import { redirect } from "next/navigation";

import { getBusiness } from "@/lib/db/businesses";
import { RecomendacionPendienteError, generateReport, sendReport } from "@/lib/reports";
import { findReport, saveReport } from "@/lib/reports/store";
import { requireOperator } from "@/lib/db/session";
import { admin } from "@/lib/i18n/admin";

/**
 * Genera el informe de un negocio y un mes.
 *
 * Formulario nativo con Server Action, como el resto del panel. Sin JavaScript
 * de cliente no se puede deshabilitar el botón según lo que haya escrito, así
 * que la validación real vive aquí: `required` en el navegador es una comodidad,
 * esto es la barrera.
 */
export async function generateReportAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const month = String(formData.get("month") ?? "");
  const recomendacion = String(formData.get("recommendation") ?? "");
  const confirmado = formData.get("confirm") === "on";

  const volver = (params: Record<string, string>) => {
    const q = new URLSearchParams({ negocio: businessId, mes: month, ...params });
    redirect(`/admin/informes?${q}`);
  };

  const business = await getBusiness(businessId);
  if (!business) volver({ error: "Ese negocio no existe." });

  // Un informe ya enviado no se regenera sin decirlo explícitamente: el cliente
  // tiene esa versión en su correo, y sustituir la nuestra en silencio crearía
  // una discrepancia que nadie vería.
  const existente = await findReport(businessId, month);
  if (existente?.status === "sent" && !confirmado) {
    volver({ error: admin.needsConfirmation, texto: recomendacion });
  }

  try {
    const { pdf, metrics } = await generateReport({
      businessId,
      businessName: business!.name,
      month,
      recomendacion,
      operador: process.env.OPERATOR_NAME?.trim() || "el equipo de Qrolvis",
    });

    const guardado = await saveReport({
      businessId,
      month,
      pdf,
      metrics,
      recommendation: recomendacion.trim(),
    });

    if (!guardado.ok) volver({ error: guardado.message, texto: recomendacion });
  } catch (error) {
    // El texto escrito viaja de vuelta en la URL: perder lo redactado por un
    // error de validación sería la forma más rápida de que nadie use esto.
    if (error instanceof RecomendacionPendienteError) {
      volver({ error: admin.recommendationMissing, texto: recomendacion });
    }
    throw error;
  }

  volver({ generado: "1" });
}

/**
 * Envía al cliente el informe ya generado.
 *
 * Toda la lógica vive en `sendReport()`, que es la misma que usará la tarea
 * programada. Aquí solo se traducen los parámetros del formulario y el resultado
 * a un mensaje para el operador.
 */
export async function sendReportAction(formData: FormData) {
  await requireOperator();

  const businessId = String(formData.get("businessId") ?? "");
  const month = String(formData.get("month") ?? "");
  const confirmado = formData.get("confirmSend") === "on";

  const volver = (params: Record<string, string>) => {
    const q = new URLSearchParams({ negocio: businessId, mes: month, ...params });
    redirect(`/admin/informes?${q}`);
  };

  // Reenviar es legítimo —un correo se pierde, el cliente lo borra— pero hacerlo
  // sin darse cuenta no: el cliente recibiría dos veces el mismo informe.
  const existente = await findReport(businessId, month);
  if (existente?.status === "sent" && !confirmado) {
    volver({ error: admin.needsSendConfirmation });
  }

  const resultado = await sendReport(businessId, month);

  volver(resultado.ok ? { enviado: resultado.to } : { error: resultado.message });
}
