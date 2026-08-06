import "server-only";

import { createAdminClient } from "./admin";

export const PAGE_SIZE = 50;

/**
 * Zona horaria del periodo, fijada por R-M4 de docs/05.
 *
 * No es un detalle cosmético. `submitted_at` es `timestamptz`, o sea UTC. Si el
 * filtro cortara por la medianoche UTC, en verano estaría cortando a las 02:00
 * de Madrid: las respuestas de un bar entre las 00:00 y las 02:00 del día 1
 * caerían en el mes anterior. En hostelería esa franja es cierre de cocina y
 * copas, no un residuo.
 *
 * Peor todavía: el operador filtraría agosto en el panel y vería un número
 * distinto del que dará el informe mensual, sin que nada avisara. Panel e
 * informe tienen que contar igual.
 */
const TIME_ZONE = "Europe/Madrid";

/** Desfase de la zona respecto a UTC en un instante dado, en milisegundos. */
function zoneOffset(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - utcMs;
}

/**
 * Instante UTC en que empieza un día natural de Madrid.
 *
 * Se corrige dos veces porque el desfase se evalúa en un instante estimado, y en
 * los días de cambio de hora ese instante puede caer al otro lado de la
 * transición.
 */
function startOfDayInZone(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;

  const [, y, m, d] = match;
  let utc = Date.UTC(Number(y), Number(m) - 1, Number(d));
  utc -= zoneOffset(utc);
  utc = Date.UTC(Number(y), Number(m) - 1, Number(d)) - zoneOffset(utc);
  return new Date(utc).toISOString();
}

/** Inicio del día siguiente: el filtro "hasta" incluye el día completo. */
function endOfDayInZone(date: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  return startOfDayInZone(next.toISOString().slice(0, 10));
}

export type ResponseFilters = {
  businessId?: string;
  from?: string;
  to?: string;
  /** "1".."5" o "detractores" (≤ 2). */
  rating?: string;
  /** "partial" | "complete". Vacío = todas, que es lo que exige R-M3. */
  completeness?: string;
  page: number;
};

/** Nombres de los parámetros en la URL, compartidos por las dos vistas. */
export type FilterSearchParams = {
  negocio?: string;
  desde?: string;
  hasta?: string;
  valoracion?: string;
  estado?: string;
  p?: string;
};

/** Lee la query una sola vez, igual para el listado y para los comentarios. */
export function parseFilters(sp: FilterSearchParams): ResponseFilters {
  return {
    businessId: sp.negocio || undefined,
    from: sp.desde || undefined,
    to: sp.hasta || undefined,
    rating: sp.valoracion || undefined,
    completeness: sp.estado || undefined,
    page: Math.max(1, Number(sp.p ?? "1") || 1),
  };
}

export function hasActiveFilters(sp: FilterSearchParams): boolean {
  return Boolean(sp.negocio || sp.desde || sp.hasta || sp.valoracion || sp.estado);
}

/** Conserva los filtros al saltar de una vista a otra. */
export function filterQuery(sp: FilterSearchParams, extra?: Record<string, string>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "p") q.set(k, v);
  for (const [k, v] of Object.entries(extra ?? {})) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

type Filterable<T> = {
  eq(column: string, value: unknown): T;
  gte(column: string, value: unknown): T;
  lt(column: string, value: unknown): T;
  lte(column: string, value: unknown): T;
};

/**
 * Aplica los filtros. ESCRITO UNA SOLA VEZ a propósito.
 *
 * El listado de respuestas y la vista de comentarios lo comparten, así que la
 * conversión horaria no puede divergir entre ellos. Duplicarla sería la forma
 * segura de que dentro de seis meses las dos vistas contaran agosto distinto.
 */
function applyFilters<T extends Filterable<T>>(query: T, filters: ResponseFilters): T {
  let q = query;

  if (filters.businessId) q = q.eq("business_id", filters.businessId);

  const from = filters.from ? startOfDayInZone(filters.from) : null;
  if (from) q = q.gte("submitted_at", from);

  // Límite superior EXCLUSIVO sobre el inicio del día siguiente: así el día
  // "hasta" entra entero, incluida su última hora.
  const to = filters.to ? endOfDayInZone(filters.to) : null;
  if (to) q = q.lt("submitted_at", to);

  if (filters.rating === "detractores") {
    q = q.lte("overall_rating", 2);
  } else if (filters.rating) {
    const value = Number(filters.rating);
    if (value >= 1 && value <= 5) q = q.eq("overall_rating", value);
  }

  // R-M3: una respuesta parcial es una respuesta válida. Este filtro solo se
  // aplica si el operador lo pide; por defecto entran todas.
  if (filters.completeness === "partial" || filters.completeness === "complete") {
    q = q.eq("completeness", filters.completeness);
  }

  return q;
}

export type ResponseRow = {
  id: string;
  submitted_at: string;
  overall_rating: number;
  completeness: string;
  /** Solo si LO TIENE, nunca el texto. El comentario puede contener datos
   *  personales que la persona escribió por su cuenta (docs/06), así que no
   *  sale de esta capa: esta vista no lo necesita. */
  hasComment: boolean;
  businessName: string;
  pointLabel: string;
  pointCode: string;
};

export async function listResponses(
  filters: ResponseFilters,
): Promise<{ rows: ResponseRow[]; total: number }> {
  const supabase = createAdminClient();

  const query = applyFilters(
    supabase
      .from("responses")
      .select(
        "id, submitted_at, overall_rating, completeness, comment, businesses(name), capture_points(label, code)",
        { count: "exact" },
      ),
    filters,
  ).order("submitted_at", { ascending: false });

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(start, start + PAGE_SIZE - 1);

  const rows: ResponseRow[] = (data ?? []).map((r) => ({
    id: r.id,
    submitted_at: r.submitted_at,
    overall_rating: r.overall_rating,
    completeness: r.completeness,
    hasComment: Boolean(r.comment && r.comment.trim()),
    businessName: r.businesses?.name ?? "—",
    pointLabel: r.capture_points?.label ?? "—",
    pointCode: r.capture_points?.code ?? "",
  }));

  return { rows, total: count ?? 0 };
}

export type CommentRow = {
  id: string;
  submitted_at: string;
  overall_rating: number;
  /** Texto ÍNTEGRO, sin editar ni resumir (docs/05 §2.9). */
  comment: string;
  businessName: string;
  pointLabel: string;
  pointCode: string;
};

/**
 * Comentarios del periodo.
 *
 * Orden fijado por docs/05 §2.9: **primero los de valoración baja**, que son los
 * accionables. El desempate por fecha descendente no lo fija el documento; se
 * elige aquí porque entre dos quejas de un 1 interesa antes la de anoche.
 *
 * Sin agrupación, sin clasificación, sin resumen y sin análisis de sentimiento:
 * R8 y docs/05 §2.9. Esta función lee y ordena, nada más.
 */
export async function listComments(
  filters: ResponseFilters,
): Promise<{ rows: CommentRow[]; total: number }> {
  const supabase = createAdminClient();

  const query = applyFilters(
    supabase
      .from("responses")
      .select(
        "id, submitted_at, overall_rating, comment, businesses(name), capture_points(label, code)",
        { count: "exact" },
      ),
    filters,
  )
    // Las respuestas sin comentario se excluyen en la consulta, no al pintar.
    .not("comment", "is", null)
    .order("overall_rating", { ascending: true })
    .order("submitted_at", { ascending: false });

  const start = (filters.page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(start, start + PAGE_SIZE - 1);

  // No se filtra nada en JavaScript: el `count` viene de la consulta, así que
  // descartar filas aquí haría que el recuento y la lista dijeran cosas
  // distintas —el bug que esto tuvo—. La condición está entera en la consulta.
  //
  // Que no haya comentarios en blanco lo garantiza la escritura:
  // addDimensionAnswers guarda `null` cuando el texto llega vacío o solo con
  // espacios. Si alguna vez apareciera uno, se vería como una tarjeta vacía:
  // visible y diagnosticable, en vez de un descuadre silencioso entre números.
  const rows: CommentRow[] = (data ?? [])
    .map((r) => ({
      id: r.id,
      submitted_at: r.submitted_at,
      overall_rating: r.overall_rating,
      comment: r.comment as string,
      businessName: r.businesses?.name ?? "—",
      pointLabel: r.capture_points?.label ?? "—",
      pointCode: r.capture_points?.code ?? "",
    }));

  return { rows, total: count ?? 0 };
}

/** Respuestas del mismo periodo, para poder enseñar los dos recuentos. */
export async function countResponses(filters: ResponseFilters): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await applyFilters(
    supabase.from("responses").select("id", { count: "exact", head: true }),
    filters,
  );
  return count ?? 0;
}

/** Fecha y hora en la zona del periodo, para que coincida con lo filtrado. */
export function formatInZone(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
