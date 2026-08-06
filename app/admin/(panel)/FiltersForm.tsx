// Formulario de filtros compartido por /admin/respuestas y /admin/comentarios.
//
// Escrito una sola vez, igual que `applyFilters()` en la capa de datos: si el
// formulario y la consulta divergieran, el operador vería un filtro que no es el
// que se está aplicando.
//
// GET y no POST: el filtro vive en la URL, así se puede guardar en marcadores,
// compartir y deshacer con el botón atrás. Sin JavaScript.

import Link from "next/link";

import type { FilterSearchParams } from "@/lib/db/responseList";
import { admin } from "@/lib/i18n/admin";

const field: React.CSSProperties = {
  padding: "0.375rem 0.5rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  font: "inherit",
  fontSize: "0.875rem",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.75rem",
  color: "#6b7280",
};

export function FiltersForm({
  action,
  businesses,
  sp,
  showState = true,
}: {
  /** Ruta a la que envía el formulario: cada vista se filtra a sí misma. */
  action: string;
  businesses: { id: string; name: string }[];
  sp: FilterSearchParams;
  showState?: boolean;
}) {
  const hasFilters = Boolean(sp.negocio || sp.desde || sp.hasta || sp.valoracion || sp.estado);

  return (
    <form
      method="get"
      action={action}
      style={{
        display: "flex",
        gap: "0.75rem",
        flexWrap: "wrap",
        alignItems: "flex-end",
        padding: "0.875rem",
        background: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        marginBottom: "1rem",
      }}
    >
      <label style={labelStyle}>
        {admin.filterBusiness}
        <select name="negocio" defaultValue={sp.negocio ?? ""} style={field}>
          <option value="">{admin.filterAll}</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label style={labelStyle}>
        {admin.filterFrom}
        <input type="date" name="desde" defaultValue={sp.desde ?? ""} style={field} />
      </label>

      <label style={labelStyle}>
        {admin.filterTo}
        <input type="date" name="hasta" defaultValue={sp.hasta ?? ""} style={field} />
      </label>

      <label style={labelStyle}>
        {admin.filterRating}
        <select name="valoracion" defaultValue={sp.valoracion ?? ""} style={field}>
          <option value="">{admin.filterRatingAll}</option>
          <option value="detractores">{admin.filterDetractors}</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      {/* El estado solo tiene sentido en el listado: un comentario existe con
          respuesta parcial o completa, y ahí no aporta. */}
      {showState && (
        <label style={labelStyle}>
          {admin.filterState}
          {/* Arranca en "todas" a propósito: R-M3 exige que las parciales
              cuenten salvo que el operador pida lo contrario. */}
          <select name="estado" defaultValue={sp.estado ?? ""} style={field}>
            <option value="">{admin.filterStateAll}</option>
            <option value="complete">{admin.filterComplete}</option>
            <option value="partial">{admin.filterPartial}</option>
          </select>
        </label>
      )}

      <button
        type="submit"
        style={{
          minHeight: "34px",
          padding: "0 0.875rem",
          border: 0,
          borderRadius: "8px",
          background: "#2563eb",
          color: "#fff",
          font: "inherit",
          fontSize: "0.875rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {admin.applyFilters}
      </button>

      {hasFilters && (
        <Link href={action} style={{ fontSize: "0.8125rem", color: "#2563eb" }}>
          {admin.clearFilters}
        </Link>
      )}
    </form>
  );
}
