// Generación manual de informes (docs/07, Fase 4, tarea 7).
//
// Dos pasos, con formularios nativos y sin JavaScript de cliente, como el resto
// del panel: primero se elige negocio y mes por GET, y con esos dos parámetros
// la página muestra el resumen, el candidato y el campo donde se escribe.

import { getBusiness, listBusinesses } from "@/lib/db/businesses";
import { monthlyMetrics } from "@/lib/metrics";
import { dayInZone } from "@/lib/time";
import { draftFor, proposeCandidate } from "@/lib/reports/candidate";
import { findReport, signedReportUrl } from "@/lib/reports/store";
import { admin } from "@/lib/i18n/admin";
import { formatInZone } from "@/lib/time";
import { generateReportAction, sendReportAction } from "./actions";

export const dynamic = "force-dynamic";

const caja: React.CSSProperties = {
  padding: "0.875rem 1rem",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  marginBottom: "1rem",
};

const etiqueta: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  color: "#6b7280",
  marginBottom: "0.25rem",
};

const control: React.CSSProperties = {
  padding: "0.5rem 0.625rem",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  font: "inherit",
  fontSize: "0.9375rem",
};

const boton: React.CSSProperties = {
  minHeight: "40px",
  padding: "0 1rem",
  border: 0,
  borderRadius: "8px",
  background: "#2563eb",
  color: "#ffffff",
  font: "inherit",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

type Params = {
  negocio?: string;
  mes?: string;
  error?: string;
  texto?: string;
  generado?: string;
  enviado?: string;
};

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const sp = await searchParams;
  const businesses = await listBusinesses();

  // `max` en el mes actual: un informe del futuro no tiene sentido y el
  // navegador lo bloquea sin JavaScript.
  const mesActual = dayInZone().slice(0, 7);
  const seleccionado = sp.negocio && sp.mes ? { negocio: sp.negocio, mes: sp.mes } : null;

  return (
    <section>
      <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.5rem" }}>{admin.reportsTitle}</h1>
      <p style={{ margin: "0 0 1.25rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
        {admin.reportsIntro}
      </p>

      {/* PASO 1. GET, así el periodo queda en la URL y se puede compartir o
          recargar sin reenviar nada. */}
      <form
        method="GET"
        style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginBottom: "1.5rem" }}
      >
        <label>
          <span style={etiqueta}>{admin.chooseBusiness}</span>
          <select name="negocio" defaultValue={sp.negocio ?? ""} required style={control}>
            <option value="" disabled>
              {admin.choose}
            </option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span style={etiqueta}>{admin.chooseMonth}</span>
          <input
            type="month"
            name="mes"
            defaultValue={sp.mes ?? ""}
            max={mesActual}
            required
            style={control}
          />
        </label>
        <button type="submit" style={{ ...boton, background: "#ffffff", color: "#2563eb", border: "1px solid #e5e7eb" }}>
          {admin.loadPeriod}
        </button>
      </form>

      {sp.error && (
        <p role="alert" style={{ ...caja, background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b", fontSize: "0.875rem" }}>
          {sp.error}
        </p>
      )}
      {sp.generado === "1" && seleccionado && (
        <Generado negocio={seleccionado.negocio} mes={seleccionado.mes} />
      )}
      {sp.enviado && (
        <p role="status" style={{ ...caja, background: "#f0fdf4", borderColor: "#86efac", color: "#166534", fontSize: "0.875rem" }}>
          {admin.reportSentOk(sp.enviado)}
        </p>
      )}

      {seleccionado && (
        <Periodo negocio={seleccionado.negocio} mes={seleccionado.mes} textoPrevio={sp.texto} />
      )}
    </section>
  );
}

async function Generado({ negocio, mes }: { negocio: string; mes: string }) {
  const existente = await findReport(negocio, mes);
  const url = existente?.pdfPath ? await signedReportUrl(existente.pdfPath) : null;

  return (
    <p role="status" style={{ ...caja, background: "#f0fdf4", borderColor: "#86efac", color: "#166534", fontSize: "0.875rem" }}>
      {admin.reportGenerated}{" "}
      {url && (
        <a href={url} style={{ color: "#166534", fontWeight: 600 }}>
          {admin.downloadReport}
        </a>
      )}
    </p>
  );
}

async function Periodo({
  negocio,
  mes,
  textoPrevio,
}: {
  negocio: string;
  mes: string;
  textoPrevio?: string;
}) {
  const [m, existente, datosNegocio] = await Promise.all([
    monthlyMetrics(negocio, mes),
    findReport(negocio, mes),
    getBusiness(negocio),
  ]);
  // Se enseña la dirección ANTES de enviar: es la misma que recibe las alertas,
  // y conviene que el operador lo vea y no lo dé por supuesto.
  const emailDestino = datosNegocio?.alert_email ?? "—";

  const candidato = proposeCandidate({
    dimensiones: m.dimensiones,
    comparativa: m.comparativa,
    volumenActual: m.n,
    volumenAnterior: m.volumenAnterior,
  });

  // Prioridad del texto: lo que se acaba de escribir y falló la validación,
  // luego lo ya guardado, y solo si no hay nada, el borrador.
  const texto = textoPrevio ?? existente?.recommendation ?? draftFor(candidato);
  const yaEnviado = existente?.status === "sent";

  return (
    <>
      {m.n === 0 && (
        <p style={{ ...caja, background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e", fontSize: "0.875rem" }}>
          {admin.noResponsesInPeriod}
        </p>
      )}

      <div style={caja}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.625rem" }}>{admin.periodSummary}</h2>
        <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
          <Cifra
            etiqueta={admin.metricVolume}
            valor={m.volumen.status === "OK" ? String(m.volumen.value) : "—"}
          />
          <Cifra
            etiqueta={admin.metricDetractors}
            valor={
              m.detractoresPct.status === "OK"
                ? `${m.detractoresPct.value} %`
                : m.detractoresPct.status === "INSUFICIENTE"
                  ? admin.metricNoSample(m.detractoresPct.n, m.detractoresPct.required)
                  : "—"
            }
            rojo={m.detractoresPct.status === "OK" && m.detractoresPct.value > 0}
          />
          <Cifra
            etiqueta={admin.metricAverage}
            valor={
              m.media.status === "OK"
                ? String(m.media.value)
                : m.media.status === "INSUFICIENTE"
                  ? admin.metricNoSample(m.media.n, m.media.required)
                  : "—"
            }
          />
        </div>

        {m.dimensiones.status === "OK" && (
          <div style={{ marginTop: "0.875rem" }}>
            <p style={{ ...etiqueta, marginBottom: "0.375rem" }}>{admin.dimensionsTitle}</p>
            {m.dimensiones.value.map((d) => (
              <div key={d.code} style={{ fontSize: "0.875rem", padding: "0.125rem 0" }}>
                {d.label}: <strong>{d.media}</strong>{" "}
                <span style={{ color: "#6b7280" }}>
                  · {d.detractoresPct} % de 2 o menos · {d.nD} respuestas
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* El candidato, con el porqué. Que el operador vea qué regla lo eligió
          evita que lo tome como una orden del sistema. */}
      <div style={{ ...caja, background: "#f8fafc" }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.375rem" }}>{admin.candidateTitle}</h2>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.9375rem", lineHeight: 1.5 }}>
          {textoCandidato(candidato)}
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "#6b7280", lineHeight: 1.5 }}>
          {admin.candidateRuleNote}
        </p>
      </div>

      {existente && (
        <div
          style={{
            ...caja,
            background: yaEnviado ? "#fffbeb" : "#ffffff",
            borderColor: yaEnviado ? "#fcd34d" : "#e5e7eb",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", color: yaEnviado ? "#92400e" : "#6b7280" }}>
            {yaEnviado && existente.sentAt
              ? admin.reportSent(formatInZone(existente.sentAt))
              : existente.generatedAt
                ? admin.reportExists(formatInZone(existente.generatedAt))
                : ""}
          </p>
          {yaEnviado && (
            <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.5 }}>
              {admin.reportSentWarning}
            </p>
          )}
        </div>
      )}

      {/* Enviar solo tiene sentido con un PDF ya guardado. Si no lo hay, ni se
          ofrece el botón: no se puede adjuntar lo que no existe. */}
      {existente?.pdfPath && (
        <div style={{ ...caja, background: "#f8fafc" }}>
          <form action={sendReportAction}>
            <input type="hidden" name="businessId" value={negocio} />
            <input type="hidden" name="month" value={mes} />
            <p style={{ margin: "0 0 0.625rem", fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
              {admin.sendReportHelp(emailDestino)}
            </p>
            {yaEnviado && (
              <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.625rem", fontSize: "0.875rem" }}>
                <input type="checkbox" name="confirmSend" />
                {admin.confirmResend}
              </label>
            )}
            <button type="submit" style={{ ...boton, background: "#166534" }}>
              {yaEnviado ? admin.resendReport : admin.sendReport}
            </button>
          </form>
        </div>
      )}

      <form action={generateReportAction}>
        <input type="hidden" name="businessId" value={negocio} />
        <input type="hidden" name="month" value={mes} />

        <label>
          <span style={{ ...etiqueta, fontSize: "0.875rem", color: "#1f2937", fontWeight: 600 }}>
            {admin.recommendationLabel}
          </span>
          <span style={{ ...etiqueta, marginBottom: "0.375rem" }}>{admin.recommendationHelp}</span>
          {/* `required` lo bloquea en el navegador; la barrera de verdad es
              RecomendacionPendienteError en servidor, que además rechaza el
              borrador sin rellenar por sus corchetes. */}
          <textarea
            name="recommendation"
            required
            rows={7}
            defaultValue={texto}
            style={{ ...control, display: "block", width: "100%", lineHeight: 1.5, resize: "vertical" }}
          />
        </label>

        {yaEnviado && (
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0.75rem 0", fontSize: "0.875rem" }}>
            <input type="checkbox" name="confirm" />
            {admin.confirmRegenerate}
          </label>
        )}

        <button type="submit" style={{ ...boton, marginTop: "0.875rem" }}>
          {existente ? admin.regenerateReport : admin.generateReport}
        </button>
      </form>
    </>
  );
}

function Cifra({ etiqueta: e, valor, rojo }: { etiqueta: string; valor: string; rojo?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: rojo ? "#991b1b" : "#1f2937" }}>
        {valor}
      </div>
      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{e}</div>
    </div>
  );
}

function textoCandidato(c: ReturnType<typeof proposeCandidate>): string {
  switch (c.tipo) {
    case "dimension_peor":
      return admin.candidateWorst(c.label, c.media, c.nD, c.detractoresPct);
    case "dimension_caida":
      return admin.candidateDrop(c.label, c.delta);
    case "volumen":
      return admin.candidateVolume(c.actual, c.anterior, c.caidaPct);
    case "ninguno":
      return admin.candidateNone;
  }
}
