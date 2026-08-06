"use client";

// Componente de cliente a propósito: `useActionState` da errores en línea y
// conserva lo tecleado cuando algo falla. En /f/[code] esto sería impensable,
// pero esta ruta prioriza comodidad de uso y el aislamiento del bundle está
// verificado con un assert.

import { useActionState } from "react";

import { admin } from "@/lib/i18n/admin";
import type { FormState } from "./actions";

type Sector = { id: number; name_es: string };

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  sectors: Sector[];
  /** Presente en edición: el sector queda fijado y no se puede cambiar. */
  business?: {
    id: string;
    name: string;
    sector_id: number;
    alert_email: string;
    default_language: string;
    google_review_url: string | null;
  };
};

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.5rem 0.625rem",
  marginTop: "0.25rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  font: "inherit",
  fontSize: "0.9375rem",
};

const label: React.CSSProperties = {
  display: "block",
  marginBottom: "1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
};

const hint: React.CSSProperties = {
  display: "block",
  marginTop: "0.25rem",
  fontWeight: 400,
  fontSize: "0.8125rem",
  color: "#6b7280",
};

const errorText: React.CSSProperties = {
  display: "block",
  marginTop: "0.25rem",
  fontWeight: 400,
  fontSize: "0.8125rem",
  color: "#991b1b",
};

export function BusinessForm({ action, sectors, business }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const v = state.values;
  const e = state.errors ?? {};
  const editing = Boolean(business);

  return (
    <form action={formAction} style={{ maxWidth: "32rem" }}>
      {business && <input type="hidden" name="id" value={business.id} />}

      {state.message && (
        <p role="alert" style={{ ...errorText, marginBottom: "1rem", fontSize: "0.875rem" }}>
          {state.message}
        </p>
      )}

      <label style={label}>
        {admin.businessName}
        <input
          name="name"
          defaultValue={v?.name ?? business?.name ?? ""}
          required
          autoFocus
          style={field}
        />
        {e.name && <span style={errorText}>{e.name}</span>}
      </label>

      {editing ? (
        <div style={label}>
          {admin.sector}
          <p
            style={{
              ...field,
              margin: "0.25rem 0 0",
              background: "#f8fafc",
              color: "#6b7280",
            }}
          >
            {sectors.find((s) => s.id === business!.sector_id)?.name_es ?? business!.sector_id}
          </p>
          {/* No se esconde: un campo desactivado sin explicación invita a buscar
              cómo saltárselo. */}
          <span style={hint}>{admin.sectorLocked}</span>
        </div>
      ) : (
        <label style={label}>
          {admin.sector}
          <select
            name="sectorId"
            defaultValue={v?.sectorId ? String(v.sectorId) : ""}
            required
            style={field}
          >
            <option value="">{admin.choose}</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_es}
              </option>
            ))}
          </select>
          <span style={hint}>{admin.sectorHint}</span>
          {e.sectorId && <span style={errorText}>{e.sectorId}</span>}
        </label>
      )}

      <label style={label}>
        {admin.alertEmail}
        <input
          type="email"
          name="alertEmail"
          defaultValue={v?.alertEmail ?? business?.alert_email ?? ""}
          required
          style={field}
        />
        <span style={hint}>{admin.alertEmailHint}</span>
        {e.alertEmail && <span style={errorText}>{e.alertEmail}</span>}
      </label>

      <label style={label}>
        {admin.defaultLanguage}
        <select
          name="defaultLanguage"
          defaultValue={v?.defaultLanguage ?? business?.default_language ?? "es"}
          style={field}
        >
          <option value="es">Castellano</option>
          <option value="ca">Català</option>
        </select>
        {e.defaultLanguage && <span style={errorText}>{e.defaultLanguage}</span>}
      </label>

      <label style={label}>
        {admin.googleReviewUrl}
        <input
          name="googleReviewUrl"
          defaultValue={v?.googleReviewUrl ?? business?.google_review_url ?? ""}
          placeholder="https://search.google.com/local/writereview?placeid=…"
          style={field}
        />
        <span style={hint}>{admin.googleReviewUrlHint}</span>
        {e.googleReviewUrl && <span style={errorText}>{e.googleReviewUrl}</span>}
      </label>

      <button
        type="submit"
        disabled={pending}
        style={{
          minHeight: "40px",
          padding: "0 1rem",
          border: 0,
          borderRadius: "8px",
          background: "#2563eb",
          color: "#ffffff",
          font: "inherit",
          fontSize: "0.9375rem",
          fontWeight: 600,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? admin.saving : editing ? admin.saveChanges : admin.createBusiness}
      </button>
    </form>
  );
}
