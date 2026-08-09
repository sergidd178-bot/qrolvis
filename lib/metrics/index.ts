import "server-only";

import { comparativa, computePeriod } from "./compute";
import { loadPeriod } from "./load";
import { monthPeriod, previousMonth } from "./period";
import type { DeltaDimension, MetricState, PeriodMetrics } from "./types";

export * from "./types";
export * from "./compute";
export * from "./period";

export type MonthlyMetrics = PeriodMetrics & {
  month: string;
  businessId: string;
  comparativa: MetricState<DeltaDimension[]>;
};

/**
 * Métricas de un negocio para un mes natural, con su comparativa.
 *
 * Carga los dos periodos y calcula. El mes anterior puede no existir —es el
 * primer mes del cliente— y eso no es un error: la comparativa sale OMITIDA,
 * que es lo que manda R-M1.
 */
export async function monthlyMetrics(
  businessId: string,
  month: string,
): Promise<MonthlyMetrics> {
  const actual = monthPeriod(month);
  const anterior = monthPeriod(previousMonth(month));

  const [ahora, antes] = await Promise.all([
    loadPeriod(businessId, actual),
    loadPeriod(businessId, anterior),
  ]);

  return {
    month,
    businessId,
    ...computePeriod(ahora.responses, ahora.answers),
    comparativa: comparativa(ahora.responses, ahora.answers, antes.responses, antes.answers),
  };
}
