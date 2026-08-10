import { describe, expect, it } from "vitest";

import { preferredLanguage, resolveLanguage } from "./index";

describe("preferredLanguage: solo lo que el navegador dice de verdad", () => {
  it("reconoce catalán, con y sin región", () => {
    expect(preferredLanguage("ca")).toBe("ca");
    expect(preferredLanguage("ca-ES,ca;q=0.9")).toBe("ca");
  });

  it("reconoce castellano, con y sin región", () => {
    expect(preferredLanguage("es")).toBe("es");
    expect(preferredLanguage("es-ES,es;q=0.9")).toBe("es");
  });

  it("devuelve null cuando el navegador no pide ninguna de las dos", () => {
    // Este es el caso que antes se confundía con "quiere castellano".
    expect(preferredLanguage("en-GB,en;q=0.9")).toBeNull();
    expect(preferredLanguage("fr-FR,fr;q=0.8,de;q=0.6")).toBeNull();
    expect(preferredLanguage(null)).toBeNull();
    expect(preferredLanguage("")).toBeNull();
  });

  it("respeta el orden: gana la primera de las dos que aparezca", () => {
    expect(preferredLanguage("en,ca;q=0.8,es;q=0.6")).toBe("ca");
    expect(preferredLanguage("en,es;q=0.8,ca;q=0.6")).toBe("es");
  });
});

describe("resolveLanguage: los tres escalones de docs/03", () => {
  const negocioCa = { businessDefault: "ca" };
  const negocioEs = { businessDefault: "es" };

  it("1. el selector del pie gana a todo", () => {
    expect(resolveLanguage({ param: "es", acceptLanguage: "ca", ...negocioCa })).toBe("es");
    expect(resolveLanguage({ param: "ca", acceptLanguage: "es", ...negocioEs })).toBe("ca");
  });

  it("2. sin selector, manda el navegador si pide una de las dos", () => {
    expect(resolveLanguage({ param: undefined, acceptLanguage: "ca-ES", ...negocioEs })).toBe("ca");
    expect(resolveLanguage({ param: undefined, acceptLanguage: "es-ES", ...negocioCa })).toBe("es");
  });

  it("3. navegador en otro idioma: manda el negocio", () => {
    // El caso que motivó el cambio: un turista con el móvil en inglés entra en
    // una peluquería que atiende en catalán. Antes veía castellano.
    expect(resolveLanguage({ param: undefined, acceptLanguage: "en-GB,en", ...negocioCa })).toBe("ca");
    expect(resolveLanguage({ param: undefined, acceptLanguage: "fr-FR", ...negocioEs })).toBe("es");
  });

  it("sin cabecera ninguna, también manda el negocio", () => {
    expect(resolveLanguage({ param: undefined, acceptLanguage: null, ...negocioCa })).toBe("ca");
  });

  it("un parámetro inventado no cuela: se ignora y se sigue bajando", () => {
    expect(resolveLanguage({ param: "de", acceptLanguage: "ca", ...negocioEs })).toBe("ca");
    expect(resolveLanguage({ param: "<script>", acceptLanguage: null, ...negocioCa })).toBe("ca");
    expect(resolveLanguage({ param: 42, acceptLanguage: null, ...negocioCa })).toBe("ca");
  });

  it("negocio sin idioma válido: castellano, que es el defecto del producto", () => {
    expect(resolveLanguage({ param: undefined, acceptLanguage: "en", businessDefault: null })).toBe("es");
    expect(resolveLanguage({ param: undefined, acceptLanguage: "en", businessDefault: undefined })).toBe("es");
    expect(resolveLanguage({ param: undefined, acceptLanguage: "en", businessDefault: "pt" })).toBe("es");
  });

  it("código inexistente: sin negocio del que sacar idioma, no revienta", () => {
    // La página resuelve el idioma antes de saber si el código existe, porque
    // el mensaje de "no disponible" también hay que escribirlo en algún idioma.
    expect(resolveLanguage({ param: undefined, acceptLanguage: "ca", businessDefault: undefined })).toBe("ca");
    expect(resolveLanguage({ param: undefined, acceptLanguage: null, businessDefault: undefined })).toBe("es");
  });
});
