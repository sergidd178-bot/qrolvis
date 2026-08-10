import { cache } from "react";

import { createPublicClient } from "./client";

/**
 * Configuración pública de un punto de captación.
 *
 * `cache()` de React deduplica la llamada DENTRO de una misma petición, y eso es
 * justo lo que hace viable que el layout y la página la necesiten los dos: el
 * layout resuelve el idioma del `<html>` y la página pinta el formulario, pero a
 * Supabase se va una sola vez. Sin esto serían dos viajes en la ruta crítica y
 * D21 no lo admite.
 */
export type CapturePointConfig = {
  business_name: string;
  default_language: string;
  google_review_url: string | null;
  question_set_id: string;
};

export const getCapturePointConfig = cache(
  async (code: string): Promise<CapturePointConfig | null> => {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("capture_point_config", { p_code: code });
    return (data?.[0] as CapturePointConfig | undefined) ?? null;
  },
);
