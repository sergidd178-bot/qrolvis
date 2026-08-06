import Link from "next/link";

import { listBusinesses } from "@/lib/db/businesses";
import {
  countResponses,
  filterQuery,
  formatInZone,
  listComments,
  PAGE_SIZE,
  parseFilters,
  type FilterSearchParams,
} from "@/lib/db/responseList";
import { admin } from "@/lib/i18n/admin";
import { FiltersForm } from "../FiltersForm";

export const dynamic = "force-dynamic";

export default async function CommentsPage({
  searchParams,
}: {
  searchParams: Promise<FilterSearchParams>;
}) {
  const sp = await searchParams;
  const filters = parseFilters(sp);

  const [businesses, { rows, total }, responses] = await Promise.all([
    listBusinesses(),
    listComments(filters),
    countResponses(filters),
  ]);

  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (n: number) =>
    `/admin/comentarios${filterQuery(sp, n > 1 ? { p: String(n) } : undefined)}`;

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
        <h1 style={{ fontSize: "1.25rem", margin: 0 }}>{admin.comments}</h1>
        {/* El salto entre vistas arrastra el filtro: ver el listado de agosto de
            un bar y pasar a sus comentarios sin volver a filtrar. */}
        <Link
          href={`/admin/respuestas${filterQuery(sp)}`}
          style={{ fontSize: "0.875rem", color: "#2563eb" }}
        >
          {admin.seeResponses} →
        </Link>
      </div>

      {/* El filtro de estado no se ofrece aquí: un comentario existe igual con
          respuesta parcial o completa, y ahí no aporta nada. */}
      <FiltersForm action="/admin/comentarios" businesses={businesses} sp={sp} showState={false} />

      {/* Dos recuentos por separado. NO se dividen: una "tasa de comentarios"
          sería una métrica nueva y docs/05 no la define (R1). */}
      <p style={{ margin: "0 0 0.25rem", fontSize: "0.875rem", color: "#6b7280" }}>
        {admin.commentCount(total)} · {admin.ofResponses(responses)}
      </p>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.75rem", color: "#6b7280" }}>
        {admin.lowFirst}
      </p>

      {rows.length === 0 ? (
        <div style={{ padding: "1.5rem 0" }}>
          <p style={{ margin: "0 0 0.375rem", fontSize: "0.9375rem" }}>{admin.noComments}</p>
          <p style={{ margin: 0, fontSize: "0.8125rem", color: "#6b7280" }}>
            {admin.noCommentsHint}
          </p>
        </div>
      ) : (
        <>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {rows.map((c) => (
              <li
                key={c.id}
                style={{
                  padding: "0.875rem 1rem",
                  marginBottom: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderLeft: `4px solid ${c.overall_rating <= 2 ? "#991b1b" : "#e5e7eb"}`,
                  borderRadius: "10px",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    alignItems: "baseline",
                    marginBottom: "0.5rem",
                    fontSize: "0.8125rem",
                    color: "#6b7280",
                  }}
                >
                  <strong
                    style={{
                      fontSize: "1rem",
                      color: c.overall_rating <= 2 ? "#991b1b" : "#1f2937",
                    }}
                  >
                    {c.overall_rating}
                  </strong>
                  <span>{formatInZone(c.submitted_at)}</span>
                  <span>{c.businessName}</span>
                  <span>
                    {c.pointLabel}
                    {c.pointCode && ` · ${c.pointCode}`}
                  </span>
                </div>

                {/* Texto ÍNTEGRO (docs/05 §2.9): sin truncar, sin "ver más", sin
                    resaltar nada. `pre-wrap` conserva los saltos de línea tal
                    como se escribieron.

                    Se renderiza como TEXTO, nunca como HTML: React escapa el
                    contenido, así que un comentario con <script> se ve escrito,
                    no se ejecuta. Nada de dangerouslySetInnerHTML aquí. */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.9375rem",
                    lineHeight: 1.55,
                    color: "#1f2937",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {c.comment}
                </p>
              </li>
            ))}
          </ul>

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

      <p
        style={{
          marginTop: "1.5rem",
          padding: "0.75rem 0.875rem",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          fontSize: "0.75rem",
          color: "#6b7280",
          lineHeight: 1.5,
        }}
      >
        {admin.personalDataWarning}
      </p>
    </section>
  );
}
