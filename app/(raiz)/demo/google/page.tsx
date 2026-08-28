import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demostración',
  description: 'Página de demostración de Qrolvis.',
  robots: { index: false, follow: false },
};

export default function DemoGoogle() {
  return (
    <div className="ql">
      <header className="ql-head">
        <div className="ql-wrap ql-nopad">
          <a className="ql-logo" href="/">
            Qrol<em>vis</em>
          </a>
        </div>
      </header>

      <main className="ql-wrap">
        <h1>Aquí estaría tu ficha de Google</h1>
        <p className="ql-upd">Página de demostración</p>

        <div className="ql-callout">
          <p>
            En un negocio real, este botón lleva directamente al formulario de reseña de tu ficha de
            Google, con las estrellas ya abiertas. Tu cliente solo tiene que escribir y publicar.
          </p>
          <p>
            Como esto es una demostración, no hay ninguna ficha detrás. No se ha publicado nada en
            ningún sitio.
          </p>
        </div>

        <h2>Lo importante de esta pantalla</h2>
        <p>
          El enlace se muestra <strong>a todo el mundo</strong>, haya puntuado 1 o 5. Filtrar quién lo
          ve se llama <em>review gating</em>, va contra las normas de Google y puede costarte la ficha
          entera. Lo único que cambia según la puntuación es el texto que acompaña al botón, y si a ti
          te llega un aviso al momento.
        </p>

        <h2>¿Lo quieres en tu negocio?</h2>
        <p>
          Escríbeme por WhatsApp al{' '}
          <a href="https://wa.me/34679702934" target="_blank" rel="noopener noreferrer">
            679 70 29 34
          </a>{' '}
          y te digo qué veo en tu ficha de Google actual.
        </p>
      </main>

      <footer className="ql-foot">
        <div className="ql-wrap ql-nopad">
          <p>
            Qrolvis · Girona · <a href="/">Inicio</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
