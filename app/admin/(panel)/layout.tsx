// GUARDIA DE SESIÓN del panel.
//
// Vive en el layout del grupo (panel), no en cada página: así toda ruta que se
// añada dentro de este grupo queda protegida por omisión. Proteger página a
// página es el patrón que se rompe el día que alguien olvida el check.
//
// El login está fuera de este grupo, en app/admin/login, precisamente para que
// no pase por aquí y no redirija a sí mismo en bucle.

import Link from "next/link";
import { redirect } from "next/navigation";

import { getOperator } from "@/lib/db/session";
import { admin } from "@/lib/i18n/admin";
import { signOut } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const operator = await getOperator();

  if (!operator) {
    redirect("/admin/login");
  }

  return (
    <div style={{ maxWidth: "60rem", margin: "0 auto", padding: "1.5rem" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <strong style={{ fontSize: "1rem" }}>{admin.panelTitle}</strong>
        <nav style={{ display: "flex", gap: "1rem", fontSize: "0.875rem" }}>
          <Link href="/admin/negocios">{admin.businesses}</Link>
          <Link href="/admin/respuestas">{admin.responses}</Link>
          <Link href="/admin/comentarios">{admin.comments}</Link>
          <Link href="/admin/informes">{admin.reports}</Link>
        </nav>
        <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          {admin.signedInAs} {operator.email}
        </span>
        <form action={signOut}>
          <button
            type="submit"
            style={{
              minHeight: "36px",
              padding: "0 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: "#ffffff",
              font: "inherit",
              fontSize: "0.8125rem",
              cursor: "pointer",
            }}
          >
            {admin.signOut}
          </button>
        </form>
      </header>

      {children}
    </div>
  );
}
