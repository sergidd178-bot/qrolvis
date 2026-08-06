import Link from "next/link";

import { listBusinesses } from "@/lib/db/businesses";
import {
  filterQuery,
  formatInZone,
  listResponses,
  PAGE_SIZE,
  parseFilters,
  type FilterSearchParams,
} from "@/lib/db/responseList";
import { admin } from "@/lib/i18n/admin";
import { FiltersForm } from "../FiltersForm";

export const dynamic = "force-dynamic";

const cell: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "0.875rem",
  textAlign: "left",
  whiteSpace: "nowrap",
};

const head: React.CSSProperties = { ...cell, color: "#6b7280", fontSize: "0.8125rem" };

export default async function ResponsesPage({
  searchParams,
}: {
  searchParams: Promise<FilterSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [businesses, { rows, total }] = await Promise.all([
    listBusinesses(),
    listResponses(filters),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) =>
    `/admin/respuestas${filterQuery(sp, n > 1 ? { p: String(n) } : undefined)}`;

  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{admin.responses}</h1>
        {/* El salto entre vistas arrastra el filtro. */}
        <Link
          href={`/admin/comentarios${filterQuery(sp)}`}
          style={{ fontSize: "0.875rem", color: "#2563eb" }}
        >
          {admin.seeComments} →
        </Link>
      </div>

      <FiltersForm action="/admin/respuestas" businesses={businesses} sp={sp} />

      {/* Solo el recuento. Ninguna media ni porcentaje: R5 dice que la media no
          es la métrica principal y R4 exige umbral de muestra mínima antes de
          publicar una métrica. Contar no está sujeto a umbral; promediar sí, y
          eso vive en lib/metrics. */}
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
        {admin.responseCount(total)}
      </p>

      {rows.length === 0 ? (
        <div style={{ padding: "1.5rem 0" }}>
          <p style={{ margin: "0 0 0.375rem", fontSize: "0.9375rem" }}>{admin.noResponses}</p>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#6b7280" }}>
            {admin.noResponsesHint}
          </p>
        </div>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={head}>{admin.colDate}</th>
                <th style={head}>{admin.colBusiness}</th>
                <th style={head}>{admin.colPoint}</th>
                <th style={head}>{admin.colRating}</th>
                <th style={head}>{admin.colStatus}</th>
                <th style={head}>{admin.colComment}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ ...cell, color: "#6b7280" }}>{formatInZone(r.submitted_at)}</td>
                  <td style={cell}>{r.businessName}</td>
                  <td style={cell}>
                    {r.pointLabel}
                    {r.pointCode && (
                      <span style={{ color: "#6b7280", fontSize: "0.75rem" }}> · {r.pointCode}</span>
                    )}
                  </td>
                  <td
                    style={{
                      ...cell,
                      fontWeight: 600,
                      color: r.overall_rating <= 2 ? "#991b1b" : "#1f2937",
                    }}
                  >
                    {r.overall_rating}
                  </td>
                  <td style={{ ...cell, color: "#6b7280" }}>
                    {r.completeness === "complete" ? admin.complete : admin.partial}
                  </td>
                  <td style={{ ...cell, color: r.hasComment ? "#1f2937" : "#6b7280" }}>
                    {r.hasComment ? admin.hasComment : admin.noComment}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {lastPage > 1 && (
            <div
              style={{
                display: "flex",
                gap: "1rem",
                alignItems: "center",
                marginTop: "1rem",
                fontSize: "0.875rem",
              }}
            >
              {filters.page > 1 && <Link href={pageHref(filters.page - 1)}>← {admin.previous}</Link>}
              <span style={{ color: "#6b7280" }}>
                {admin.page} {filters.page} / {lastPage}
              </span>
              {filters.page < lastPage && (
                <Link href={pageHref(filters.page + 1)}>{admin.next} →</Link>
              )}
            </div>
          )}
        </>
      )}

      <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.5 }}>
        {admin.partialNote}
      </p>
    </section>
  );
}
