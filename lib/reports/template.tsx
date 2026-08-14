import "server-only";

import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

import { formatInZone } from "../time";
import { conSigno, decimal, porcentaje } from "./format";
import { mesLargo } from "./month";
import type { MonthlyMetrics } from "../metrics";
import type { MetricState, PuntoDimensiones } from "../metrics/types";

/**
 * Informe mensual. Estructura literal de docs/05 §3.
 *
 * @react-pdf/renderer y no HTML a PDF: D24. Convertir HTML exigiría Puppeteer con
 * un Chromium empaquetado, unos 75 MB, que esa decisión ya descartó.
 *
 * LA PLANTILLA NO CALCULA NADA. Recibe `MetricState<T>` y hace `switch` sobre
 * `status`. No puede inventarse un cero aunque quiera: TypeScript no la deja leer
 * `.value` sin estrechar antes el tipo, así que el error clásico de pintar 0
 * cuando en realidad no hay datos ni siquiera compila.
 *
 * Longitud: una página si cabe, y crece cuando los comentarios lo piden. La regla
 * "no se recorta" gana sobre la de las dos páginas (D29).
 */

const C = {
  texto: "#1F2937",
  suave: "#6B7280",
  detractor: "#991B1B",
  barra: "#2563EB",
  vacio: "#E5E7EB",
  linea: "#E5E7EB",
  fondoNota: "#F8FAFC",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 48,
    paddingHorizontal: 44,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: C.texto,
  },

  // Portada
  negocio: { fontSize: 20, fontFamily: "Helvetica-Bold" },
  periodo: { fontSize: 11, color: C.suave, marginTop: 2, marginBottom: 18 },
  cifras: { flexDirection: "row", gap: 28, marginBottom: 6 },
  cifraBloque: { flexGrow: 1 },
  cifraNumero: { fontSize: 26, fontFamily: "Helvetica-Bold" },
  cifraNumeroRojo: { fontSize: 26, fontFamily: "Helvetica-Bold", color: C.detractor },
  cifraEtiqueta: { fontSize: 9, color: C.suave, marginTop: 1 },
  mediaPequena: { fontSize: 9, color: C.suave, marginTop: 10 },

  // Bloques
  bloque: { marginTop: 22 },
  titulo: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    paddingBottom: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.linea,
  },
  insuficiente: { fontSize: 9, color: C.suave, lineHeight: 1.4 },

  // Distribución
  fila: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  filaValor: { width: 16, fontSize: 10 },
  filaBarra: { flexGrow: 1, height: 10, backgroundColor: C.vacio, marginRight: 8 },
  filaRelleno: { height: 10, backgroundColor: C.barra },
  filaCifra: { width: 78, fontSize: 9, color: C.suave, textAlign: "right" },

  // Tablas
  th: { flexDirection: "row", paddingBottom: 3, marginBottom: 3, borderBottomWidth: 1, borderBottomColor: C.linea },
  td: { flexDirection: "row", paddingVertical: 3 },
  thTexto: { fontSize: 8, color: C.suave },
  colDim: { flexGrow: 1 },
  colNum: { width: 62, textAlign: "right" },

  // Desglose por punto (§2.8.1). Sangrado para que se lea como lo que es: el
  // detalle de la tabla de arriba, no otra sección.
  tablaPunto: { marginTop: 12, paddingLeft: 10 },
  subtituloPunto: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 3 },

  // Comentarios
  comentario: { marginBottom: 9, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.linea },
  comentarioBajo: { marginBottom: 9, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.detractor },
  comentarioCabecera: { fontSize: 8, color: C.suave, marginBottom: 2 },
  comentarioTexto: { fontSize: 10, lineHeight: 1.4 },

  aviso: { fontSize: 8, color: C.suave, lineHeight: 1.4, marginTop: 6 },

  // Recomendación: SERIF, para que se lea como escrita por una persona.
  reco: {
    marginTop: 24,
    padding: 14,
    backgroundColor: C.fondoNota,
    borderLeftWidth: 3,
    borderLeftColor: C.texto,
  },
  recoTitulo: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  recoTexto: { fontFamily: "Times-Roman", fontSize: 11, lineHeight: 1.5 },
  recoFirma: { fontFamily: "Times-Italic", fontSize: 9, color: C.suave, marginTop: 10 },

  pie: {
    marginTop: 26,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.linea,
    fontSize: 8,
    color: C.suave,
    lineHeight: 1.5,
  },
});

/**
 * Texto para una métrica sin muestra suficiente.
 *
 * Lleva las DOS cifras, la que hace falta y la que hubo. "Datos insuficientes" a
 * secas deja al cliente sin saber si le faltó una respuesta o cuarenta.
 */
function TextoInsuficiente({ estado }: { estado: MetricState<unknown> }) {
  if (estado.status !== "INSUFICIENTE") return null;
  return (
    <Text style={s.insuficiente}>
      Hacen falta al menos {estado.required} respuestas para publicar este dato sin
      que engañe. Este mes hubo {estado.n}.
    </Text>
  );
}

function Distribucion({ m }: { m: MonthlyMetrics }) {
  if (m.distribucion.status === "OMITIDA") return null;

  return (
    <View style={s.bloque}>
      <Text style={s.titulo}>Cómo te han valorado</Text>
      {m.distribucion.status === "INSUFICIENTE" ? (
        <TextoInsuficiente estado={m.distribucion} />
      ) : (
        ([5, 4, 3, 2, 1] as const).map((x) => {
          const n = m.distribucion.status === "OK" ? m.distribucion.value.n[x] : 0;
          const pct = m.distribucion.status === "OK" ? m.distribucion.value.pct[x] : 0;
          return (
            <View key={x} style={s.fila}>
              <Text style={s.filaValor}>{x}</Text>
              <View style={s.filaBarra}>
                {/* Ancho en porcentaje: la barra ES el dato, no un adorno.
                    Este va con punto porque es CSS, no un número que se lee. */}
                <View style={[s.filaRelleno, { width: `${pct}%` }]} />
              </View>
              <Text style={s.filaCifra}>
                {n} · {porcentaje(pct)}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

function PorDimension({ m }: { m: MonthlyMetrics }) {
  if (m.dimensiones.status === "OMITIDA") return null;

  const deltas =
    m.comparativa.status === "OK"
      ? new Map(m.comparativa.value.map((d) => [d.code, d]))
      : new Map();

  return (
    <View style={s.bloque}>
      <Text style={s.titulo}>Por aspecto, de peor a mejor</Text>
      {m.dimensiones.status === "INSUFICIENTE" ? (
        <TextoInsuficiente estado={m.dimensiones} />
      ) : (
        <>
          <View style={s.th}>
            <Text style={[s.thTexto, s.colDim]}>Aspecto</Text>
            <Text style={[s.thTexto, s.colNum]}>Media</Text>
            <Text style={[s.thTexto, s.colNum]}>2 o menos</Text>
            <Text style={[s.thTexto, s.colNum]}>Respuestas</Text>
            {deltas.size > 0 && <Text style={[s.thTexto, s.colNum]}>vs. mes ant.</Text>}
          </View>
          {m.dimensiones.status === "OK" &&
            m.dimensiones.value.map((d) => {
              const delta = deltas.get(d.code);
              return (
                <View key={d.code} style={s.td}>
                  <Text style={s.colDim}>{d.label}</Text>
                  <Text style={s.colNum}>{decimal(d.media)}</Text>
                  <Text style={[s.colNum, d.detractoresPct > 0 ? { color: C.detractor } : {}]}>
                    {porcentaje(d.detractoresPct)}
                  </Text>
                  <Text style={[s.colNum, { color: C.suave }]}>{d.nD}</Text>
                  {deltas.size > 0 && (
                    <Text
                      style={[
                        s.colNum,
                        // Solo se destaca por encima de 0,3: por debajo es ruido
                        // y presentarlo como tendencia sería un error (§2.7).
                        delta?.significativo ? { fontFamily: "Helvetica-Bold" } : { color: C.suave },
                      ]}
                    >
                      {delta ? conSigno(delta.delta) : "—"}
                    </Text>
                  )}
                </View>
              );
            })}
        </>
      )}
    </View>
  );
}

function Comentarios({ m }: { m: MonthlyMetrics }) {
  if (m.comentarios.status === "OMITIDA") return null;

  return (
    <View style={s.bloque}>
      <Text style={s.titulo}>Qué dicen tus clientes</Text>
      {m.comentarios.status !== "OK" ? (
        <Text style={s.insuficiente}>Este mes nadie dejó comentario escrito.</Text>
      ) : (
        // ÍNTEGROS Y TODOS. Sin truncar, sin "y N más", sin resumir (D29, R8).
        // Si son muchos, el informe crece. Es lo acordado.
        m.comentarios.value.map((c, i) => (
          <View key={i} style={c.overallRating <= 2 ? s.comentarioBajo : s.comentario} wrap={false}>
            <Text style={s.comentarioCabecera}>
              {c.overallRating}/5 · {formatInZone(c.submittedAt)} · {c.capturePointLabel}
            </Text>
            <Text style={s.comentarioTexto}>{c.texto}</Text>
          </View>
        ))
      )}
    </View>
  );
}

/**
 * Las dimensiones de un punto (§2.8.1). Una tabla por punto y no una cruzada:
 * con cuatro dimensiones y tres profesionales, la cruzada obliga a leer en dos
 * direcciones a la vez y esto se lee en el móvil.
 *
 * Se pinta aunque todas sus filas salgan en guion: la columna de respuestas
 * explica por qué, y hacer desaparecer al profesional se leería como un fallo.
 */
function TablaDePunto({ punto }: { punto: PuntoDimensiones }) {
  return (
    <View style={s.tablaPunto} wrap={false}>
      <Text style={s.subtituloPunto}>{punto.label}</Text>
      <View style={s.th}>
        <Text style={[s.thTexto, s.colDim]}>Aspecto</Text>
        <Text style={[s.thTexto, s.colNum]}>Media</Text>
        <Text style={[s.thTexto, s.colNum]}>Respuestas</Text>
        <Text style={[s.thTexto, s.colNum]}>vs. mes ant.</Text>
      </View>
      {punto.dimensiones.map((d) => (
        <View key={d.code} style={s.td}>
          <Text style={s.colDim}>{d.label}</Text>
          {/* `media` es `number | null` y el null es el guion. No se puede
              escribir un 0 aquí ni por descuido: TypeScript no lo permite. */}
          <Text style={[s.colNum, d.media === null ? { color: C.suave } : {}]}>
            {d.media === null ? "—" : decimal(d.media)}
          </Text>
          <Text style={[s.colNum, { color: C.suave }]}>{d.nD}</Text>
          <Text style={[s.colNum, { color: C.suave }]}>
            {d.delta === null ? "—" : conSigno(d.delta)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function PorPunto({ m }: { m: MonthlyMetrics }) {
  // OMITIDA: la sección entera desaparece. Sin encabezado huérfano ni
  // "no disponible", que es una forma de enseñar el hueco.
  if (m.puntos.status !== "OK") return null;

  return (
    <View style={s.bloque}>
      <Text style={s.titulo}>Por punto de captación</Text>
      <View style={s.th}>
        <Text style={[s.thTexto, s.colDim]}>Punto</Text>
        <Text style={[s.thTexto, s.colNum]}>Media</Text>
        <Text style={[s.thTexto, s.colNum]}>Respuestas</Text>
      </View>
      {m.puntos.value.map((p) => (
        <View key={p.capturePointId} style={s.td}>
          <Text style={s.colDim}>{p.label}</Text>
          <Text style={s.colNum}>{decimal(p.media)}</Text>
          <Text style={[s.colNum, { color: C.suave }]}>{p.n}</Text>
        </View>
      ))}

      {/* El desglose de cada punto, en el mismo orden que la tabla de arriba. */}
      {m.puntosDimensiones.status === "OK" &&
        m.puntosDimensiones.value.map((p) => <TablaDePunto key={p.capturePointId} punto={p} />)}

      {/* Aviso exigido por §2.8, literal en su intención. Va UNA vez, al final
          del bloque entero: repetirlo bajo cada tabla lo convertiría en ruido y
          dejaría de leerse, que es justo lo contrario de para lo que está. */}
      <Text style={s.aviso}>
        Los volúmenes por punto son pequeños y las diferencias pueden deberse al azar.
        Tómalo como una observación, no como una evaluación de desempeño.
      </Text>
      <Text style={s.aviso}>Los promedios con pocas respuestas pueden no ser representativos.</Text>
    </View>
  );
}

export type ReportInput = {
  businessName: string;
  metrics: MonthlyMetrics;
  /** Escrita por el operador. Sin ella no se genera nada. */
  recomendacion: string;
  /** Quién la firma. Va en el informe: es lo que la hace humana. */
  operador: string;
  periodoTexto: string;
};

function Informe({ businessName, metrics, recomendacion, operador, periodoTexto }: ReportInput) {
  const m = metrics;

  return (
    <Document title={`Informe ${m.month} · ${businessName}`}>
      <Page size="A4" style={s.page}>
        {/* Portada: nombre, mes, volumen, detractores, y la media en pequeño.
            El orden es el de docs/05 y no es casual: R-M2 dice que lo que
            encabeza son la distribución y los detractores, no la media. */}
        <Text style={s.negocio}>{businessName}</Text>
        <Text style={s.periodo}>Informe de {mesLargo(m.month)}</Text>

        <View style={s.cifras}>
          <View style={s.cifraBloque}>
            <Text style={s.cifraNumero}>{m.volumen}</Text>
            <Text style={s.cifraEtiqueta}>respuestas este mes</Text>
          </View>
          <View style={s.cifraBloque}>
            {m.detractoresPct.status === "OK" ? (
              <>
                <Text style={s.cifraNumeroRojo}>{porcentaje(m.detractoresPct.value)}</Text>
                <Text style={s.cifraEtiqueta}>te puntuaron 2 o menos</Text>
              </>
            ) : (
              <>
                <Text style={[s.cifraNumero, { color: C.suave }]}>—</Text>
                <Text style={s.cifraEtiqueta}>
                  {m.detractoresPct.status === "INSUFICIENTE"
                    ? `sin muestra suficiente (${m.detractoresPct.n} de ${m.detractoresPct.required})`
                    : "sin datos"}
                </Text>
              </>
            )}
          </View>
        </View>

        {m.media.status === "OK" && (
          <Text style={s.mediaPequena}>Media global: {decimal(m.media.value)} sobre 5</Text>
        )}

        <Distribucion m={m} />
        <PorDimension m={m} />
        <Comentarios m={m} />
        <PorPunto m={m} />

        {/* Bloque 5. Serif, recuadro y firma: tres señales de que esto lo ha
            escrito una persona y no un cálculo. Ni una cifra dentro: los
            números están arriba, aquí va la opinión. */}
        <View style={s.reco} wrap={false}>
          <Text style={s.recoTitulo}>La recomendación de este mes</Text>
          <Text style={s.recoTexto}>{recomendacion}</Text>
          <Text style={s.recoFirma}>
            Escrito por {operador}, tras revisar tus datos de este mes.
          </Text>
        </View>

        <View style={s.pie}>
          <Text>Periodo: {periodoTexto}</Text>
          <Text>Total de respuestas: {m.n}</Text>
          <Text>Basado en las opiniones recibidas mediante código QR en el local</Text>
        </View>
      </Page>
    </Document>
  );
}

export function renderReport(input: ReportInput): Promise<Buffer> {
  return renderToBuffer(<Informe {...input} />);
}
