// Los dos servicios opcionales de la ficha del negocio (D37).
//
// Un formulario por servicio, con su botón: es el mismo patrón que los puntos de
// captación, y por el mismo motivo. Una casilla que se enviara sola necesitaría
// JavaScript de cliente, y aquí el clic ya es la confirmación: no hay botón de
// guardar aparte ni estado intermedio que se pueda perder.
//
// Debajo de cada servicio apagado se explica QUÉ deja de pasar. Un interruptor
// que no dice qué apaga se acaba dejando como está por miedo.

import { admin } from "@/lib/i18n/admin";
import { toggleOptionalServiceAction } from "./actions";

const fila: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0.875rem 0",
  borderBottom: "1px solid #e5e7eb",
};

const boton: React.CSSProperties = {
  padding: "0.375rem 0.75rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  background: "#ffffff",
  font: "inherit",
  fontSize: "0.8125rem",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

function Servicio({
  businessId,
  service,
  label,
  apagado,
  enabled,
}: {
  businessId: string;
  service: string;
  label: string;
  apagado: string;
  enabled: boolean;
}) {
  return (
    <div style={fila}>
      <div>
        <p style={{ margin: 0, fontSize: "0.9375rem" }}>
          <span aria-hidden="true" style={{ marginRight: "0.5rem" }}>
            {enabled ? "☑" : "☐"}
          </span>
          {label}
        </p>
        <p
          style={{
            margin: "0.25rem 0 0 1.5rem",
            fontSize: "0.8125rem",
            color: enabled ? "#6b7280" : "#991b1b",
          }}
        >
          {enabled ? admin.serviceContracted : apagado}
        </p>
      </div>

      <form action={toggleOptionalServiceAction}>
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="service" value={service} />
        <input type="hidden" name="enable" value={enabled ? "0" : "1"} />
        <button type="submit" style={boton}>
          {enabled ? admin.deactivate : admin.activate}
        </button>
      </form>
    </div>
  );
}

export function OptionalServices({
  businessId,
  instantAlerts,
  monthlyReports,
}: {
  businessId: string;
  instantAlerts: boolean;
  monthlyReports: boolean;
}) {
  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.0625rem", marginBottom: "0.25rem" }}>
        {admin.optionalServicesTitle}
      </h2>
      <p style={{ margin: "0 0 0.5rem", fontSize: "0.8125rem", color: "#6b7280" }}>
        {admin.optionalServicesIntro}
      </p>

      <Servicio
        businessId={businessId}
        service="instant_alerts_enabled"
        label={admin.instantAlerts}
        apagado={admin.instantAlertsOff}
        enabled={instantAlerts}
      />
      <Servicio
        businessId={businessId}
        service="monthly_reports_enabled"
        label={admin.monthlyReports}
        apagado={admin.monthlyReportsOff}
        enabled={monthlyReports}
      />
    </section>
  );
}
