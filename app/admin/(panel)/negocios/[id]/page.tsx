import Link from "next/link";
import { notFound } from "next/navigation";

import { getBusiness, listSectors } from "@/lib/db/businesses";
import { listCapturePoints } from "@/lib/db/capturePoints";
import { admin } from "@/lib/i18n/admin";
import { formUrlFor, isProvisionalDomain, qrStatusFor, signedQrUrl, siteUrl } from "@/lib/qr";
import { updateBusinessAction } from "../actions";
import { BusinessForm } from "../BusinessForm";
import { CapturePoints } from "./CapturePoints";

export const dynamic = "force-dynamic";

const notice = (bg: string, color: string): React.CSSProperties => ({
  margin: "0 0 1.25rem",
  padding: "0.75rem 0.875rem",
  borderRadius: "8px",
  background: bg,
  color,
  fontSize: "0.875rem",
  lineHeight: 1.5,
});

export default async function EditBusinessPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    puntoCreado?: string;
    qrFallido?: string;
    qr?: string;
    codigo?: string;
    punto?: string;
    errorPunto?: string;
  }>;
}) {
  const { id } = await params;
  const { puntoCreado, codigo, punto, errorPunto, qrFallido, qr } = await searchParams;

  const [business, sectors, rawPoints] = await Promise.all([
    getBusiness(id),
    listSectors(),
    listCapturePoints(id),
  ]);

  if (!business) notFound();

  // Las miniaturas se firman en cada visita: el bucket es privado y la columna
  // guarda la ruta del objeto, no una URL, que caducaría.
  //
  // `qrStatusFor` descarga el SVG de cada punto para comprobar a dónde apunta de
  // verdad. Cuesta una descarga por punto, en paralelo y de un par de KB. Es
  // barato comparado con imprimir cartelería que no lleva a ninguna parte.
  const points = await Promise.all(
    rawPoints.map(async (p) => {
      const [qrUrl, qrStatus] = await Promise.all([
        p.qr_asset_url ? signedQrUrl(p.qr_asset_url) : null,
        qrStatusFor(p),
      ]);
      return { ...p, qrUrl, qrStatus, formUrl: formUrlFor(p.code) };
    }),
  );

  return (
    <section>
      <Link href="/admin/negocios" style={{ color: "#2563eb", fontSize: "0.875rem" }}>
        ← {admin.back}
      </Link>
      <h1 style={{ fontSize: "1.25rem", margin: "0.75rem 0 1.25rem" }}>{admin.editBusiness}</h1>

      {errorPunto && (
        <p role="alert" style={notice("#fef2f2", "#991b1b")}>
          {errorPunto}
        </p>
      )}
      {puntoCreado && codigo && (
        <p role="status" style={notice("#f0fdf4", "#166534")}>
          {admin.pointCreated(puntoCreado, codigo)}
        </p>
      )}
      {qrFallido === "1" && (
        <p role="alert" style={notice("#fffbeb", "#92400e")}>
          {admin.qrFailed}
        </p>
      )}
      {qr === "generado" && (
        <p role="status" style={notice("#f0fdf4", "#166534")}>
          {admin.qrGenerated}
        </p>
      )}
      {punto === "desactivado" && (
        <p role="status" style={notice("#fffbeb", "#92400e")}>
          {admin.pointDeactivated}
        </p>
      )}
      {punto === "reactivado" && (
        <p role="status" style={notice("#f0fdf4", "#166534")}>
          {admin.pointReactivated}
        </p>
      )}

      <BusinessForm action={updateBusinessAction} sectors={sectors} business={business} />

      <CapturePoints
        businessId={id}
        points={points}
        provisionalDomain={isProvisionalDomain()}
        siteUrl={siteUrl()}
      />
    </section>
  );
}
