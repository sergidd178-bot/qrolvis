import Link from "next/link";

import { listBusinesses, listSectors } from "@/lib/db/businesses";
import { admin } from "@/lib/i18n/admin";

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "0.9375rem",
  textAlign: "left",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ creado?: string; codigo?: string; actualizado?: string }>;
}) {
  const { creado, codigo, actualizado } = await searchParams;
  const [businesses, sectors] = await Promise.all([listBusinesses(), listSectors()]);
  const sectorName = (id: number) => sectors.find((s) => s.id === id)?.name_es ?? String(id);

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.25rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{admin.businesses}</h1>
        <Link
          href="/admin/negocios/nuevo"
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          {admin.newBusiness}
        </Link>
      </div>

      {/* El código del punto General se enseña aquí, en el momento del alta: es
          lo que acabará impreso y no cambia nunca. */}
      {creado && codigo && (
        <p
          role="status"
          style={{
            margin: "0 0 1.25rem",
            padding: "0.75rem 0.875rem",
            borderRadius: "8px",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          {admin.createdWithPoint(creado, codigo)}
        </p>
      )}

      {actualizado && (
        <p
          role="status"
          style={{
            margin: "0 0 1.25rem",
            padding: "0.75rem 0.875rem",
            borderRadius: "8px",
            background: "#f0fdf4",
            color: "#166534",
            fontSize: "0.875rem",
          }}
        >
          {admin.updated(actualizado)}
        </p>
      )}

      {businesses.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.9375rem" }}>{admin.noBusinesses}</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }}>{admin.colName}</th>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }}>{admin.colSector}</th>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }}>{admin.colPoints}</th>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }}>{admin.colGoogle}</th>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }}>{admin.colStatus}</th>
              <th style={{ ...cell, color: "#6b7280", fontSize: "0.8125rem" }} />
            </tr>
          </thead>
          <tbody>
            {businesses.map((b) => (
              <tr key={b.id}>
                <td style={cell}>{b.name}</td>
                <td style={cell}>{sectorName(b.sector_id)}</td>
                {/* Activos sobre total. Cero activos se marca en rojo: ese
                    negocio no puede recibir ni una respuesta. */}
                <td style={{ ...cell, color: b.activeCapturePoints === 0 ? "#991b1b" : "#1f2937" }}>
                  {b.activeCapturePoints}/{b.capturePoints}
                </td>
                <td style={{ ...cell, color: b.google_review_url ? "#166534" : "#6b7280" }}>
                  {b.google_review_url ? admin.googleSet : admin.googleMissing}
                </td>
                <td style={{ ...cell, color: "#6b7280" }}>{b.status}</td>
                <td style={cell}>
                  <Link href={`/admin/negocios/${b.id}`} style={{ color: "#2563eb" }}>
                    {admin.edit}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
