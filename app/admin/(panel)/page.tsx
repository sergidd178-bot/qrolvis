// Panel vacío. Las seis tareas restantes de la Fase 2 —negocios, puntos de
// captación, QR, PDF, respuestas y comentarios— cuelgan de aquí, dentro del
// grupo (panel), así que heredan la guardia de sesión sin tener que repetirla.

import { admin } from "@/lib/i18n/admin";

export default function PanelPage() {
  return (
    <p style={{ color: "#6b7280", fontSize: "0.9375rem", lineHeight: 1.6 }}>{admin.pending}</p>
  );
}
