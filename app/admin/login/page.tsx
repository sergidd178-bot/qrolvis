// Login del operador. Queda FUERA del grupo (panel), así que no pasa por la
// guardia de sesión: si estuviera dentro, redirigiría a sí mismo en bucle.

import { admin } from "@/lib/i18n/admin";
import { signIn } from "../actions";

export const dynamic = "force-dynamic";

const field: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.625rem 0.75rem",
  marginTop: "0.25rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  font: "inherit",
  fontSize: "1rem",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main style={{ maxWidth: "22rem", margin: "4rem auto", padding: "0 1.5rem" }}>
      <h1 style={{ fontSize: "1.375rem", margin: "0 0 0.25rem" }}>{admin.loginTitle}</h1>
      <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
        {admin.loginSubtitle}
      </p>

      {error && (
        <p
          role="alert"
          style={{
            margin: "0 0 1rem",
            padding: "0.625rem 0.75rem",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: "0.875rem",
          }}
        >
          {error === "campos" ? admin.missingFields : admin.badCredentials}
        </p>
      )}

      <form action={signIn}>
        <label style={{ display: "block", marginBottom: "1rem", fontSize: "0.875rem" }}>
          {admin.email}
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            autoFocus
            style={field}
          />
        </label>

        <label style={{ display: "block", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
          {admin.password}
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            style={field}
          />
        </label>

        <button
          type="submit"
          style={{
            width: "100%",
            minHeight: "44px",
            border: 0,
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            font: "inherit",
            fontSize: "1rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {admin.signIn}
        </button>
      </form>
    </main>
  );
}
