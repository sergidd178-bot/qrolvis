'use client';

import { useEffect, useRef, useState } from 'react';

/* Estilos de la landing. Van embebidos a propósito: esta página no debe
   depender del CSS global que consume la ruta del formulario público. */
const css = `
.qv{
  --ink:#0E2A22; --moss:#0F5C4A; --brass:#A8823C; --stone:#5F6C66;
  --paper:#FBFAF7; --veil:#F1F0EA; --line:#E0DFD8;
  --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --pad:clamp(1.25rem,5vw,2.5rem);
  --gap:clamp(3.5rem,9vw,7rem);
  --ease:cubic-bezier(.22,.61,.36,1);
  background:var(--paper); color:var(--ink);
  font-family:var(--sans); font-size:clamp(1rem,.97rem + .2vw,1.0625rem);
  line-height:1.6; -webkit-font-smoothing:antialiased;
}
.qv *,.qv *::before,.qv *::after{ box-sizing:border-box; }
.qv h1,.qv h2,.qv h3{ font-family:var(--serif); font-weight:400; line-height:1.12; margin:0; letter-spacing:-.015em; }
.qv p{ margin:0; }
.qv a{ color:inherit; }
.qv-wrap{ width:min(74rem,100%); margin-inline:auto; padding-inline:var(--pad); }
.qv :focus-visible{ outline:2.5px solid var(--brass); outline-offset:3px; border-radius:2px; }

.qv-top{ position:sticky; top:0; z-index:40; background:rgba(251,250,247,.86);
  backdrop-filter:blur(12px); border-bottom:1px solid transparent; transition:border-color .3s var(--ease); }
.qv-top[data-stuck="true"]{ border-bottom-color:var(--line); }
.qv-topin{ display:flex; align-items:center; justify-content:space-between; gap:1rem; padding-block:1rem; }
.qv-logo{ font-family:var(--serif); font-size:1.5rem; letter-spacing:-.03em; text-decoration:none; }
.qv-logo em{ font-style:normal; color:var(--moss); }

.qv-btn{ display:inline-flex; align-items:center; justify-content:center; gap:.55rem;
  font-family:var(--sans); font-size:.95rem; font-weight:600; padding:.85rem 1.5rem;
  border-radius:999px; text-decoration:none; border:1px solid transparent; cursor:pointer;
  transition:transform .25s var(--ease), box-shadow .25s var(--ease), background-color .25s var(--ease), color .25s var(--ease); }
.qv-solid{ background:var(--moss); color:#fff; box-shadow:0 1px 2px rgba(14,42,34,.18); }
.qv-solid:hover{ transform:translateY(-2px); box-shadow:0 10px 22px -10px rgba(15,92,74,.65); background:#0C4E3F; }
.qv-solid:active{ transform:translateY(0); }
.qv-line{ border-color:var(--line); background:transparent; color:var(--ink); }
.qv-line:hover{ border-color:var(--ink); transform:translateY(-2px); }
.qv-sm{ padding:.6rem 1.15rem; font-size:.875rem; }

.qv-hero{ padding-block:clamp(3rem,8vw,5.5rem) 0; }
.qv-herogrid{ display:grid; gap:clamp(2.5rem,6vw,4rem); grid-template-columns:1fr; align-items:start; }
@media (min-width:62rem){ .qv-herogrid{ grid-template-columns:1.05fr .95fr; align-items:center; } }

.qv-eyebrow{ font-size:.75rem; font-weight:700; letter-spacing:.18em; text-transform:uppercase;
  color:var(--brass); margin-bottom:1.25rem; }
.qv h1{ font-size:clamp(2.35rem,1.5rem + 3.9vw,4.15rem); }
.qv-under{ position:relative; white-space:nowrap;
  background-image:linear-gradient(rgba(168,130,60,.26),rgba(168,130,60,.26));
  background-repeat:no-repeat; background-position:0 .78em; background-size:0% .36em;
  animation:qvsweep .9s .7s var(--ease) forwards; }
@keyframes qvsweep{ to{ background-size:100% .36em; } }

.qv-lede{ margin-top:1.5rem; font-size:clamp(1.05rem,1rem + .35vw,1.2rem); color:var(--stone); max-width:34rem; }
.qv-actions{ display:flex; flex-wrap:wrap; gap:.75rem; margin-top:2rem; }
.qv-note{ margin-top:1.25rem; font-size:.85rem; color:var(--stone); }

.qv-demo{ background:#fff; border:1px solid var(--line); border-radius:1.25rem;
  padding:clamp(1.5rem,4vw,2.25rem); box-shadow:0 30px 60px -40px rgba(14,42,34,.4); }
.qv-demolabel{ font-size:.7rem; font-weight:700; letter-spacing:.16em; text-transform:uppercase;
  color:var(--stone); text-align:center; margin-bottom:.5rem; }
.qv-demoq{ font-family:var(--serif); font-size:1.4rem; text-align:center; margin-bottom:1.5rem; }
@keyframes qvrise{ from{ opacity:0; transform:translateY(14px); } to{ opacity:1; transform:translateY(0); } }

.qv-qr{ display:flex; justify-content:center; margin-top:.5rem; }
.qv-qr img{ width:min(14rem,68%); height:auto; display:block; }
.qv-qrhelp{ text-align:center; font-size:.85rem; color:var(--stone); margin-top:1.5rem; }
.qv-qrlink{ display:block; width:fit-content; margin:.4rem auto 0; text-align:center;
  font-weight:600; font-size:.95rem; color:var(--moss); text-decoration:none;
  border-bottom:1.5px solid rgba(15,92,74,.35); padding-bottom:.15rem;
  transition:border-color .2s var(--ease); word-break:break-all; }
.qv-qrlink:hover{ border-bottom-color:var(--moss); }
.qv-qrnote{ text-align:center; font-size:.8rem; color:var(--stone); line-height:1.5;
  margin-top:1.25rem; }
.qv-warn{ margin-top:1.5rem; padding-top:1.5rem; border-top:1px solid var(--line); }
.qv-warnbox{ background:#FDF6EC; border:1px solid #EBD9BC; border-radius:.9rem; padding:1.1rem 1.25rem; }
.qv-warntag{ font-size:.68rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase;
  color:var(--brass); margin-bottom:.55rem; }
.qv-warntitle{ font-weight:700; font-size:.95rem; margin-bottom:.35rem; }
.qv-warnbody{ font-size:.85rem; color:var(--stone); line-height:1.5; }
.qv-warnbody strong{ color:var(--ink); font-weight:600; }

.qv-sec{ padding-block:var(--gap); }
.qv-veil{ background:var(--veil); }
.qv-head{ max-width:38rem; margin-bottom:clamp(2.5rem,5vw,3.5rem); }
.qv-head h2{ font-size:clamp(1.85rem,1.4rem + 1.7vw,2.7rem); }
.qv-head p{ margin-top:1rem; color:var(--stone); }

.qv-steps{ display:grid; gap:1.5rem; grid-template-columns:1fr; }
@media (min-width:40rem){ .qv-steps{ grid-template-columns:repeat(2,1fr); } }
@media (min-width:64rem){ .qv-steps{ grid-template-columns:repeat(4,1fr); } }
.qv-step{ padding-top:1.25rem; border-top:1px solid var(--line); }
.qv-stepn{ font-family:var(--serif); font-size:.95rem; color:var(--brass); margin-bottom:.6rem; }
.qv-step h3{ font-size:1.15rem; margin-bottom:.5rem; }
.qv-step p{ font-size:.9rem; color:var(--stone); }

.qv-duo{ display:grid; gap:1.25rem; grid-template-columns:1fr; }
@media (min-width:52rem){ .qv-duo{ grid-template-columns:repeat(2,1fr); } }
.qv-panel{ background:#fff; border:1px solid var(--line); border-radius:1.1rem;
  padding:clamp(1.5rem,3.5vw,2.25rem); transition:transform .3s var(--ease), box-shadow .3s var(--ease); }
.qv-panel:hover{ transform:translateY(-4px); box-shadow:0 24px 48px -34px rgba(14,42,34,.45); }
.qv-panel h3{ font-size:1.4rem; margin-bottom:.85rem; }
.qv-panel p{ color:var(--stone); font-size:.95rem; }

.qv-plans{ display:grid; gap:1.25rem; grid-template-columns:1fr; align-items:start; }
@media (min-width:52rem){ .qv-plans{ grid-template-columns:repeat(2,1fr); } }
.qv-plan{ background:#fff; border:1px solid var(--line); border-radius:1.1rem;
  padding:clamp(1.5rem,3.5vw,2.25rem);
  transition:transform .3s var(--ease), box-shadow .3s var(--ease), border-color .3s var(--ease); }
.qv-plan:hover{ transform:translateY(-4px); box-shadow:0 24px 48px -34px rgba(14,42,34,.45); }
.qv-planmain{ border-color:var(--moss); }
.qv-planname{ font-size:.78rem; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--stone); }
.qv-planmain .qv-planname{ color:var(--moss); }
.qv-price{ font-family:var(--serif); font-size:3rem; line-height:1; margin:.75rem 0 1.25rem; }
.qv-price small{ font-family:var(--sans); font-size:.9rem; color:var(--stone); font-weight:500; }
.qv-ticks{ list-style:none; margin:0; padding:0; display:grid; gap:.6rem; }
.qv-ticks li{ position:relative; padding-left:1.6rem; font-size:.925rem; color:var(--stone); }
.qv-ticks li::before{ content:""; position:absolute; left:.15rem; top:.55rem;
  width:.5rem; height:.5rem; border-radius:50%; background:var(--brass); }

.qv-setup{ margin-top:2rem; border-top:1px solid var(--line); padding-top:2rem; }
.qv-setup h3{ font-size:1.15rem; margin-bottom:1.25rem; }
.qv-row{ display:flex; justify-content:space-between; align-items:baseline; gap:1.5rem;
  padding:.85rem 0; border-bottom:1px solid var(--line); font-size:.925rem; }
.qv-row:last-child{ border-bottom:none; }
.qv-row span:last-child{ font-weight:700; white-space:nowrap; }
.qv-fine{ margin-top:1.5rem; font-size:.8rem; color:var(--stone); }

.qv-me{ display:grid; gap:clamp(1.5rem,4vw,3rem); grid-template-columns:1fr; align-items:center; }
@media (min-width:52rem){ .qv-me{ grid-template-columns:auto 1fr; } }
.qv-avatar{ width:8.5rem; height:8.5rem; border-radius:50%; background:var(--moss); color:#fff;
  display:grid; place-items:center; font-family:var(--serif); font-size:3rem; }
.qv-me p + p{ margin-top:1rem; }

.qv-close{ background:var(--ink); color:var(--paper); }
.qv-close h2{ font-size:clamp(1.9rem,1.4rem + 2vw,3rem); max-width:22ch; }
.qv-close p{ margin-top:1.25rem; color:#B9C6C0; max-width:38rem; }
.qv-close .qv-line{ border-color:rgba(251,250,247,.35); color:var(--paper); }
.qv-close .qv-line:hover{ border-color:var(--paper); background:rgba(251,250,247,.08); }
.qv-closeactions{ display:flex; flex-wrap:wrap; gap:.75rem; margin-top:2rem; }

.qv-foot{ background:var(--ink); color:#8FA098; padding-bottom:3rem; font-size:.82rem; }
.qv-footin{ border-top:1px solid rgba(251,250,247,.14); padding-top:2rem;
  display:flex; flex-wrap:wrap; gap:1rem 2rem; justify-content:space-between; }
.qv-footin a{ color:#B9C6C0; text-decoration:none; }
.qv-footin a:hover{ color:var(--paper); text-decoration:underline; }
.qv-footlinks{ display:flex; flex-wrap:wrap; gap:1.25rem; }

.qv-reveal{ opacity:0; transform:translateY(22px); transition:opacity .7s var(--ease), transform .7s var(--ease); }
.qv-reveal.qv-seen{ opacity:1; transform:none; }
.qv-stagger{ opacity:0; transform:translateY(18px); animation:qvrise .8s var(--ease) forwards; }
.qv-d1{ animation-delay:.05s; } .qv-d2{ animation-delay:.18s; }
.qv-d3{ animation-delay:.31s; } .qv-d4{ animation-delay:.44s; }

@media (prefers-reduced-motion:reduce){
  .qv *,.qv *::before,.qv *::after{
    animation-duration:.01ms !important; animation-iteration-count:1 !important;
    transition-duration:.01ms !important;
  }
  .qv-reveal{ opacity:1; transform:none; }
  .qv-stagger{ opacity:1; transform:none; }
  .qv-under{ background-size:100% .36em; }
}
`;

const WA = 'https://wa.me/34679702934';
const DEMO = 'https://www.qrolvis.com/f/865ZGWBQ';

export default function Page() {
  const [stuck, setStuck] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const nodes = root.current?.querySelectorAll('.qv-reveal');
    if (!nodes) return;
    if (!('IntersectionObserver' in window)) {
      nodes.forEach((n) => n.classList.add('qv-seen'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('qv-seen');
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 }
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, []);

  return (
    <div className="qv" ref={root}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="qv-top" data-stuck={stuck ? 'true' : 'false'}>
        <div className="qv-wrap qv-topin">
          <a className="qv-logo" href="#top">
            Qrol<em>vis</em>
          </a>
          <a className="qv-btn qv-solid qv-sm" href={WA} target="_blank" rel="noopener noreferrer">
            Escríbeme por WhatsApp
          </a>
        </div>
      </header>

      <main id="top">
        {/* Portada */}
        <section className="qv-hero">
          <div className="qv-wrap qv-herogrid">
            <div>
              <p className="qv-eyebrow qv-stagger qv-d1">Girona · Hostelería y estética</p>
              <h1 className="qv-stagger qv-d2">
                Tus clientes contentos <span className="qv-under">no dejan reseña</span>.
                <br />
                Los enfadados, sí.
              </h1>
              <p className="qv-lede qv-stagger qv-d3">
                Qrolvis le da la vuelta: tus clientes valoran su visita en 20 segundos, se les invita a
                reseñarte en Google, y si alguien se va descontento lo sabes por email antes de que lo
                escriba en internet.
              </p>
              <div className="qv-actions qv-stagger qv-d4">
                <a className="qv-btn qv-solid" href={WA} target="_blank" rel="noopener noreferrer">
                  Hablemos por WhatsApp
                </a>
                <a className="qv-btn qv-line" href="#precios">
                  Ver precios
                </a>
              </div>
              <p className="qv-note qv-stagger qv-d4">
                Voy a tu local, lo dejo montado y formo a tu equipo. Sin permanencia.
              </p>
            </div>

            <div className="qv-demo qv-stagger qv-d3">
              <p className="qv-demolabel">Pruébalo tú mismo</p>
              <p className="qv-demoq">Escanea y verás lo que ve tu cliente</p>

              <div className="qv-qr">
                <img
                  src="/qr-demo.svg"
                  alt="Código QR que abre el formulario de demostración de Qrolvis"
                  width={224}
                  height={224}
                />
              </div>

              <p className="qv-qrhelp">¿Lo estás leyendo desde el móvil? Ábrelo aquí:</p>
              <a className="qv-qrlink" href={DEMO} target="_blank" rel="noopener noreferrer">
                www.qrolvis.com/f/865ZGWBQ
              </a>

              <p className="qv-qrnote">
                Es el formulario real, el mismo que estaría en tu barra o tu mostrador. Puntúa lo que
                quieras: esto es una demostración y no se publica nada en ningún sitio.
              </p>

              <div className="qv-warn">
                <div className="qv-warnbox">
                  <p className="qv-warntag">Pruébalo: puntúa 1 o 2</p>
                  <p className="qv-warntitle">Ahí es cuando salta el aviso</p>
                  <p className="qv-warnbody">
                    Con una valoración de <strong>2 o menos</strong> te llega un email al instante con
                    la puntuación, el comentario íntegro y el punto del local donde ha pasado. Lo lees
                    de pie, en diez segundos, y todavía estás a tiempo de hablar con esa persona antes
                    de que se vaya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Cómo funciona */}
        <section className="qv-sec">
          <div className="qv-wrap">
            <div className="qv-head qv-reveal">
              <h2>Cuatro pasos, veinte segundos</h2>
              <p>Tu cliente no descarga nada, no se registra y no deja su email. Por eso responde.</p>
            </div>

            <div className="qv-steps">
              <article className="qv-step qv-reveal">
                <p className="qv-stepn">Uno</p>
                <h3>Escanea</h3>
                <p>QR o NFC al pagar, en el expositor de la barra o del mostrador.</p>
              </article>
              <article className="qv-step qv-reveal">
                <p className="qv-stepn">Dos</p>
                <h3>Valora</h3>
                <p>Cuatro preguntas y un comentario, en catalán o castellano. Opcionales.</p>
              </article>
              <article className="qv-step qv-reveal">
                <p className="qv-stepn">Tres</p>
                <h3>Te aviso</h3>
                <p>Si la valoración es baja, recibes un email al momento con el comentario íntegro.</p>
              </article>
              <article className="qv-step qv-reveal">
                <p className="qv-stepn">Cuatro</p>
                <h3>Google</h3>
                <p>Se le invita a dejar la reseña pública. A todos, hayan puntuado lo que hayan puntuado.</p>
              </article>
            </div>
          </div>
        </section>

        {/* Qué recibes */}
        <section className="qv-sec qv-veil">
          <div className="qv-wrap">
            <div className="qv-head qv-reveal">
              <h2>Lo que llega a tu móvil</h2>
            </div>
            <div className="qv-duo">
              <article className="qv-panel qv-reveal">
                <h3>El aviso, al momento</h3>
                <p>
                  Un email corto con la puntuación, el comentario y el punto del local donde ocurrió. Lo lees
                  de pie, en diez segundos, y todavía estás a tiempo de arreglarlo con esa persona.
                </p>
              </article>
              <article className="qv-panel qv-reveal">
                <h3>El informe, cada mes</h3>
                <p>
                  Cómo evoluciona cada aspecto de tu servicio, el desglose por mesa o por profesional, todos
                  los comentarios sin recortar y una recomendación concreta. Una. Escrita por mí, no por una
                  máquina.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* Precios */}
        <section className="qv-sec" id="precios">
          <div className="qv-wrap">
            <div className="qv-head qv-reveal">
              <h2>Precios claros</h2>
              <p>
                Primer mes de prueba. Al mes siguiente se cobran solo los servicios que tengas contratados.
              </p>
            </div>

            <div className="qv-plans">
              <article className="qv-plan qv-planmain qv-reveal">
                <p className="qv-planname">Servicio base</p>
                <p className="qv-price">
                  35 €<small> / mes</small>
                </p>
                <ul className="qv-ticks">
                  <li>Formulario en tu local, en catalán y castellano</li>
                  <li>Invitación a reseñar en Google</li>
                  <li>Aviso inmediato de valoraciones bajas</li>
                  <li>Soporte directo conmigo</li>
                </ul>
              </article>

              <article className="qv-plan qv-reveal">
                <p className="qv-planname">Informe mensual</p>
                <p className="qv-price">
                  25 €<small> / mes</small>
                </p>
                <ul className="qv-ticks">
                  <li>Evolución de la calidad, mes a mes</li>
                  <li>Desglose por mesa o por profesional</li>
                  <li>Todos los comentarios íntegros</li>
                  <li>Una recomendación concreta</li>
                </ul>
              </article>
            </div>

            <div className="qv-setup qv-reveal">
              <h3>Puesta en marcha</h3>
              <div>
                <div className="qv-row">
                  <span>Alta en el programa y configuración de puntos de captación</span>
                  <span>25 €</span>
                </div>
                <div className="qv-row">
                  <span>Expositor de metacrilato con QR + NFC, por punto</span>
                  <span>30 €</span>
                </div>
                <div className="qv-row">
                  <span>Pegatina de vinilo con QR + NFC, por punto</span>
                  <span>8,35 €</span>
                </div>
                <div className="qv-row">
                  <span>Pegatinas de vinilo con QR, pack de 45 unidades</span>
                  <span>0,65 € / ud</span>
                </div>
                <div className="qv-row">
                  <span>Diseño de expositor personalizado</span>
                  <span>15 €</span>
                </div>
              </div>
              <p className="qv-fine">
                Precios sin IVA. La colocación de los materiales y la formación de tu personal están incluidas
                en la visita. Sin permanencia.
              </p>
            </div>
          </div>
        </section>

        {/* Quién */}
        <section className="qv-sec qv-veil">
          <div className="qv-wrap qv-me qv-reveal">
            <div className="qv-avatar" aria-hidden="true">
              S
            </div>
            <div>
              <h2>Soy Sergi, y soy de aquí</h2>
              <p>
                Qrolvis no es una herramienta que te descargas y configuras tú. Voy a tu local, coloco los
                expositores donde tienen sentido, enseño a tu equipo qué decir al cobrar y vuelvo a las dos
                semanas a ver si están entrando respuestas.
              </p>
              <p>
                Esa parte es la que decide si esto funciona, y es la que ninguna aplicación internacional va a
                hacer por ti en Girona.
              </p>
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="qv-sec qv-close">
          <div className="qv-wrap">
            <h2 className="qv-reveal">¿Cuántas reseñas tienes y de cuándo es la última?</h2>
            <p className="qv-reveal">
              Mándame el nombre de tu negocio por WhatsApp y te digo qué veo en tu ficha de Google. Sin
              compromiso y sin llamadas comerciales.
            </p>
            <div className="qv-closeactions qv-reveal">
              <a className="qv-btn qv-solid" href={WA} target="_blank" rel="noopener noreferrer">
                Escríbeme por WhatsApp
              </a>
              <a className="qv-btn qv-line" href="tel:+34679702934">
                679 70 29 34
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="qv-foot">
        <div className="qv-wrap qv-footin">
          <div>
            <p>Qrolvis · Girona</p>
            <p>
              <a href="mailto:soporte@qrolvis.com">soporte@qrolvis.com</a>
            </p>
          </div>
          <nav className="qv-footlinks" aria-label="Enlaces legales">
            <a href="/aviso-legal">Aviso legal</a>
            <a href="/privacidad">Privacidad</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
