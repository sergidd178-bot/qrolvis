import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de privacidad · Qrolvis',
  description: 'Política de privacidad de Qrolvis: qué datos se tratan, con qué finalidad y cómo ejercer tus derechos.',
};

const css = `
.ql{
  --ink:#0E2A22; --moss:#0F5C4A; --brass:#A8823C; --stone:#5F6C66;
  --paper:#FBFAF7; --veil:#F1F0EA; --line:#E0DFD8;
  --serif:Georgia,"Iowan Old Style","Times New Roman",serif;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  background:var(--paper); color:var(--ink); font-family:var(--sans);
  font-size:1rem; line-height:1.65; -webkit-font-smoothing:antialiased;
}
.ql *,.ql *::before,.ql *::after{ box-sizing:border-box; }
.ql-wrap{ width:min(44rem,100%); margin-inline:auto; padding:clamp(1.25rem,5vw,2.5rem); }
.ql a{ color:var(--moss); }
.ql :focus-visible{ outline:2.5px solid var(--brass); outline-offset:3px; }
.ql-head{ border-bottom:1px solid var(--line); }
.ql-logo{ font-family:var(--serif); font-size:1.4rem; letter-spacing:-.03em;
  text-decoration:none; color:var(--ink); display:inline-block; padding-block:1rem; }
.ql-logo em{ font-style:normal; color:var(--moss); }
.ql h1{ font-family:var(--serif); font-weight:400; font-size:clamp(2rem,1.5rem + 2vw,2.9rem);
  line-height:1.12; letter-spacing:-.015em; margin:2.5rem 0 .5rem; }
.ql-upd{ color:var(--stone); font-size:.85rem; margin:0 0 2rem; }
.ql h2{ font-family:var(--serif); font-weight:400; font-size:1.35rem; line-height:1.25; margin:2.75rem 0 .75rem; }
.ql p{ margin:0 0 1rem; }
.ql ul{ margin:0 0 1rem; padding-left:1.25rem; }
.ql li{ margin-bottom:.4rem; }
.ql-callout{ background:var(--veil); border-left:3px solid var(--moss);
  padding:1.15rem 1.35rem; margin:0 0 1.5rem; border-radius:0 .6rem .6rem 0; }
.ql-callout p:last-child{ margin-bottom:0; }
.ql table{ width:100%; border-collapse:collapse; margin:0 0 1.5rem; font-size:.9rem; }
.ql th,.ql td{ text-align:left; padding:.7rem .5rem; border-bottom:1px solid var(--line); vertical-align:top; }
.ql th{ font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; color:var(--stone); }
.ql-scroll{ overflow-x:auto; }
.ql-foot{ border-top:1px solid var(--line); margin-top:4rem; padding-block:2rem;
  font-size:.85rem; color:var(--stone); }
.ql-foot a{ color:var(--stone); }
.ql-nopad{ padding-block:0; }
`;

export default function Page() {
  return (
    <div className="ql">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header className="ql-head">
        <div className="ql-wrap ql-nopad">
          <a className="ql-logo" href="/">
            Qrol<em>vis</em>
          </a>
        </div>
      </header>

      <main className="ql-wrap">
        <h1>Política de privacidad</h1>
        <p className="ql-upd">Última actualización: agosto de 2026</p>

        <div className="ql-callout">
          <p>
            <strong>Resumen.</strong> Este sitio web no usa cookies, no tiene analítica y no incorpora ningún
            servicio de terceros que rastree tu navegación. Solo se tratan tus datos si nos escribes tú, y
            únicamente para responderte.
          </p>
          <p>
            El formulario de opinión que rellenan los clientes en los negocios es <strong>anónimo</strong>: no
            pide nombre, ni email, ni teléfono, y no guarda la dirección IP. Tiene su propio aviso de
            privacidad, accesible desde el propio formulario.
          </p>
        </div>

        <h2>1. Responsable del tratamiento</h2>
        <ul>
          <li>
            <strong>Titular:</strong> Sergi de Domingo i Rosas
          </li>
          <li>
            <strong>NIF:</strong> 41671686X
          </li>
          <li>
            <strong>Domicilio:</strong> C/ Rafael Masó, 7, 2º 2ª — 17242 Quart (Girona)
          </li>
          <li>
            <strong>Correo electrónico:</strong> <a href="mailto:soporte@qrolvis.com">soporte@qrolvis.com</a>
          </li>
          <li>
            <strong>Teléfono:</strong> <a href="tel:+34679702934">679 70 29 34</a>
          </li>
        </ul>

        <h2>2. Qué datos se tratan y con qué finalidad</h2>

        <div className="ql-scroll">
          <table>
            <thead>
              <tr>
                <th>Situación</th>
                <th>Datos</th>
                <th>Finalidad</th>
                <th>Base legal</th>
                <th>Conservación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Navegas por este sitio</td>
                <td>Ninguno. No hay cookies, analítica ni registro de visitas por parte del titular</td>
                <td>—</td>
                <td>—</td>
                <td>—</td>
              </tr>
              <tr>
                <td>Nos escribes por email, teléfono o WhatsApp</td>
                <td>Nombre, datos de contacto y lo que nos cuentes</td>
                <td>Responder a tu consulta y, si procede, preparar un presupuesto</td>
                <td>Aplicación de medidas precontractuales a petición del interesado (art. 6.1.b RGPD)</td>
                <td>Un año desde el último contacto, si no hay contratación</td>
              </tr>
              <tr>
                <td>Contratas el servicio</td>
                <td>Datos identificativos y de facturación del negocio y de su titular</td>
                <td>Prestar el servicio, facturarlo y cumplir obligaciones fiscales</td>
                <td>Ejecución de contrato (art. 6.1.b) y obligación legal (art. 6.1.c)</td>
                <td>Durante la relación y, después, los plazos legales de conservación fiscal y mercantil</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          No se realizan decisiones automatizadas ni elaboración de perfiles. No se envían comunicaciones
          comerciales a quien no las haya solicitado.
        </p>

        <h2>3. Cookies</h2>
        <p>
          <strong>Este sitio web no utiliza cookies</strong> propias ni de terceros, ni ninguna otra
          tecnología de seguimiento o almacenamiento en tu dispositivo. No hay Google Analytics, ni píxeles
          publicitarios, ni fuentes tipográficas cargadas desde servidores externos.
        </p>
        <p>Por ese motivo no se muestra ningún banner de consentimiento: no hay nada que consentir.</p>
        <p>
          El formulario de opinión que se utiliza dentro de los locales sí guarda en el navegador un
          identificador técnico aleatorio, con la única finalidad de evitar respuestas duplicadas desde el
          mismo dispositivo. No identifica a nadie, no permite rastrear entre negocios distintos y se elimina
          a los siete días. Se detalla en el aviso de privacidad del propio formulario.
        </p>

        <h2>4. Enlaces a servicios de terceros</h2>
        <p>
          Este sitio enlaza a WhatsApp para facilitar el contacto. Si pulsas ese enlace, sales de qrolvis.com
          y pasas a un servicio operado por Meta Platforms, con sus propias condiciones y política de
          privacidad. El titular no recibe ningún dato de tu navegación por el hecho de mostrar el enlace.
        </p>

        <h2>5. Destinatarios de los datos</h2>
        <p>
          Los datos no se ceden a terceros, salvo obligación legal. Para prestar el servicio se utilizan
          proveedores que actúan como encargados del tratamiento, con contrato firmado y datos alojados en la
          Unión Europea:
        </p>
        <ul>
          <li>
            <strong>Vercel:</strong> alojamiento de la aplicación
          </li>
          <li>
            <strong>Supabase:</strong> base de datos y almacenamiento
          </li>
          <li>
            <strong>Resend:</strong> envío de correo transaccional
          </li>
          <li>
            <strong>Cloudflare:</strong> gestión de dominio y correo
          </li>
        </ul>
        <p>No se realizan transferencias internacionales fuera del Espacio Económico Europeo.</p>

        <h2>6. Relación con los negocios clientes</h2>
        <p>
          Respecto de las opiniones recogidas en el local de un negocio cliente, el{' '}
          <strong>responsable del tratamiento es el propio negocio</strong>, que decide recoger esas
          opiniones. El titular de Qrolvis actúa como <strong>encargado del tratamiento</strong> y trata esos
          datos únicamente siguiendo sus instrucciones, en los términos del contrato de encargo firmado con
          cada cliente conforme al artículo 28 del RGPD.
        </p>

        <h2>7. Seguridad</h2>
        <p>
          Se aplican medidas técnicas y organizativas para proteger la información: cifrado en tránsito,
          control de acceso a la base de datos mediante políticas por fila, acceso restringido a la
          administración y minimización de los datos recogidos, empezando por no pedir datos identificativos
          en el formulario público.
        </p>

        <h2>8. Tus derechos</h2>
        <p>
          Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación del
          tratamiento y portabilidad escribiendo a{' '}
          <a href="mailto:soporte@qrolvis.com">soporte@qrolvis.com</a>, indicando el derecho que ejerces y
          acompañando copia de un documento que acredite tu identidad.
        </p>
        <p>
          Si consideras que tus datos no se han tratado correctamente, puedes presentar una reclamación ante
          la Agencia Española de Protección de Datos{' '}
          <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
            (aepd.es)
          </a>
          .
        </p>
        <p>
          <strong>Advertencia honesta sobre el formulario de opinión:</strong> al ser completamente anónimo,
          no se conserva ningún dato que permita vincular una respuesta con una persona. Eso significa que{' '}
          <em>no es técnicamente posible</em> localizar una opinión concreta para mostrarla o borrarla a
          petición de quien la escribió. Es la consecuencia directa de no recoger datos personales, y se
          considera preferible al riesgo de guardarlos.
        </p>

        <h2>9. Cambios en esta política</h2>
        <p>
          Esta política puede actualizarse para adaptarse a cambios normativos o del servicio. La versión
          vigente es siempre la publicada en esta página, con su fecha de actualización.
        </p>
      </main>

      <footer className="ql-foot">
        <div className="ql-wrap ql-nopad">
          <p>
            Qrolvis · Girona · <a href="/">Inicio</a> · <a href="/aviso-legal">Aviso legal</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
