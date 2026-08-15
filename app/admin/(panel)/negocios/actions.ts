"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createBusiness,
  listSectors,
  updateBusiness,
  validateBusiness,
  type BusinessInput,
  type FieldErrors,
} from "@/lib/db/businesses";
import { listCapturePoints } from "@/lib/db/capturePoints";
import { requireOperator } from "@/lib/db/session";
import { generateQr } from "@/lib/qr";

export type FormState = {
  errors?: FieldErrors;
  message?: string;
  values?: Partial<BusinessInput>;
};

function readForm(formData: FormData): BusinessInput {
  return {
    name: String(formData.get("name") ?? ""),
    sectorId: Number(formData.get("sectorId") ?? 0),
    alertEmail: String(formData.get("alertEmail") ?? ""),
    defaultLanguage: String(formData.get("defaultLanguage") ?? ""),
    googleReviewUrl: String(formData.get("googleReviewUrl") ?? ""),
  };
}

export async function createBusinessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOperator();

  const input = readForm(formData);
  const sectors = await listSectors();
  const errors = validateBusiness(
    input,
    sectors.map((s) => s.id),
  );

  // Si algo falla, no se crea nada y se devuelven los valores tecleados para no
  // obligar a reescribirlos.
  if (Object.keys(errors).length > 0) {
    return { errors, values: input };
  }

  const result = await createBusiness(input);
  if (!result.ok) {
    return { message: result.message, values: input };
  }

  // El punto "General" lo crea la misma transacción; su QR se genera después.
  // Si falla, el negocio y el punto se quedan: la imagen es dato derivado y el
  // botón de la ficha la regenera.
  const points = await listCapturePoints(result.id);
  const general = points.find((p) => p.code === result.code);
  if (general) {
    await generateQr(general.id, general.code);
  }

  revalidatePath("/admin/negocios");
  // El código del punto "General" viaja en la URL para poder enseñárselo al
  // operador: es lo que acabará impreso en el QR y no cambia nunca.
  redirect(
    `/admin/negocios?creado=${encodeURIComponent(input.name.trim())}&codigo=${result.code}`,
  );
}

export async function updateBusinessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireOperator();

  const id = String(formData.get("id") ?? "");
  const input = readForm(formData);

  // El sector no se valida ni se envía a la base: updateBusiness no lo escribe
  // aunque llegue en el formulario (D8).
  const errors = validateBusiness({ ...input, sectorId: -1 }, [-1]);
  if (Object.keys(errors).length > 0) {
    return { errors, values: input };
  }

  const result = await updateBusiness(id, input);
  if (!result.ok) {
    return { message: result.message, values: input };
  }

  revalidatePath("/admin/negocios");
  redirect(`/admin/negocios?actualizado=${encodeURIComponent(input.name.trim())}`);
}
