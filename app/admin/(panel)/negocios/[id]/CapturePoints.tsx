// Sección de puntos de captación dentro de la ficha del negocio.
//
// Todo con formularios nativos y Server Actions: son controles de una sola
// interacción y no necesitan estado en cliente.

import { POINT_TYPES, type CapturePointRow } from "@/lib/db/capturePoints";
import { admin } from "@/lib/i18n/admin";
import { addCapturePointAction, generateQrAction, toggleCapturePointAction } from "./actions";

export type PointWithQr = CapturePointRow & { qrUrl: string | null; formUrl: string };

const cell: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "0.9375rem",
  textAlign: "left",
  verticalAlign: "top",
};

const head: React.CSSProperties = { ...cell, color: "#6b7280", fontSize: "0.8125rem" };

const input: React.CSSProperties = {
  padding: "0.5rem 0.625rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  font: "inherit",
  fontSize: "0.9375rem",
};

export function CapturePoints({
  businessId,
  points,
  provisionalDomain,
  siteUrl,
}: {
  businessId: string;
  points: PointWithQr[];
  provisionalDomain: boolean;
  siteUrl: string;
}) {
  const active = points.filter((p) => p.is_active).length;

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ fontSize: "1.0625rem", margin: 0 }}>{admin.capturePoints}</h2>
        {/* Cero activos se marca en rojo: el negocio no puede recibir respuestas
            aunque tenga filas en la base. */}
        <span style={{ fontSize: "0.8125rem", color: active === 0 ? "#991b1b" : "#6b7280" }}>
          {admin.activeOfTotal(active, points.length)}
        </span>
      </div>

      {/* Aviso bien visible junto a los QR: mientras el dominio sea provisional,
          cualquiera de estas imágenes impresa es papel muerto. */}
      {provisionalDomain && (
        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.75rem 0.875rem",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            background: "#fffbeb",
            color: "#92400e",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          <strong>{admin.qrProvisional}</strong>
          <br />
          {admin.qrProvisionalDetail(siteUrl)}
        </p>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1.25rem" }}>
        <thead>
          <tr>
            <th style={head}>{admin.colLabel}</th>
            <th style={head}>{admin.colType}</th>
            <th style={head}>{admin.colCode}</th>
            <th style={head}>{admin.colQr}</th>
            <th style={head}>{admin.colStatus}</th>
            <th style={head} />
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.id}>
              <td style={cell}>{p.label}</td>
              <td style={{ ...cell, color: "#6b7280" }}>
                {admin.pointTypeNames[p.type] ?? p.type}
              </td>
              <td style={cell}>
                {/* El código y la URL son lo único de esta pantalla que acaba en
                    el mundo físico: en monoespaciada y copiables para poder
                    probar el enlace antes de mandar a imprimir. */}
                <code style={{ fontSize: "0.9375rem", letterSpacing: "0.04em" }}>{p.code}</code>
                <br />
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>/f/{p.code}</span>
              </td>

              <td style={cell}>
                {p.qrUrl ? (
                  <>
                    {/* Miniatura servida con URL firmada: el bucket es privado. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.qrUrl}
                      alt={`QR de ${p.label}`}
                      width={72}
                      height={72}
                      style={{
                        display: "block",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                        background: "#ffffff",
                      }}
                    />
                    <span style={{ fontSize: "0.6875rem", color: "#6b7280" }}>
                      {admin.qrEncodes} {p.formUrl}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: "0.8125rem", color: "#991b1b" }}>{admin.qrMissing}</span>
                )}
                {/* Un único botón para los tres casos: sin generar, generación
                    fallida, y regeneración al cambiar el dominio. */}
                <form action={generateQrAction} style={{ marginTop: "0.375rem" }}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="capturePointId" value={p.id} />
                  <button
                    type="submit"
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      background: "#ffffff",
                      font: "inherit",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    {p.qrUrl ? admin.regenerateQr : admin.generateQr}
                  </button>
                </form>
              </td>

              <td style={{ ...cell, color: p.is_active ? "#166534" : "#991b1b" }}>
                {p.is_active ? admin.active : admin.inactive}
              </td>
              <td style={cell}>
                <form action={toggleCapturePointAction}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="capturePointId" value={p.id} />
                  <input type="hidden" name="activate" value={p.is_active ? "0" : "1"} />
                  <button
                    type="submit"
                    style={{
                      padding: "0.375rem 0.625rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      background: "#ffffff",
                      font: "inherit",
                      fontSize: "0.8125rem",
                      cursor: "pointer",
                    }}
                  >
                    {p.is_active ? admin.deactivate : admin.reactivate}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* La consecuencia, dicha sin rodeos y visible antes de pulsar: quien
          desactiva está inutilizando cartelería ya colocada. */}
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.8125rem", color: "#6b7280", lineHeight: 1.5 }}>
        {admin.deactivateWarning}
      </p>

      <form
        action={addCapturePointAction}
        style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}
      >
        <input type="hidden" name="businessId" value={businessId} />
        <label style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          {admin.pointLabel}
          <br />
          <input
            name="label"
            required
            placeholder={admin.pointLabelPlaceholder}
            style={{ ...input, width: "12rem" }}
          />
        </label>
        <label style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          {admin.pointType}
          <br />
          {/* `general` no se ofrece, y create_capture_point() lo rechaza aunque
              alguien lo envíe a mano. */}
          <select name="type" defaultValue="table" style={input}>
            {POINT_TYPES.map((t) => (
              <option key={t} value={t}>
                {admin.pointTypeNames[t] ?? t}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          style={{
            alignSelf: "flex-end",
            minHeight: "38px",
            padding: "0 0.875rem",
            border: 0,
            borderRadius: "8px",
            background: "#2563eb",
            color: "#ffffff",
            font: "inherit",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {admin.addPoint}
        </button>
      </form>

      <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#6b7280" }}>
        {admin.generalLocked}
      </p>
    </section>
  );
}
