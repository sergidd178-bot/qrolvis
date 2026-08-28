import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Aviso legal",
  description:
    "Aviso legal de Qrolvis: titularidad del sitio, condiciones de uso y datos identificativos.",
  alternates: { canonical: "/aviso-legal" },
  openGraph: {
    url: "/aviso-legal",
    title: "Aviso legal · Qrolvis",
    description:
      "Aviso legal de Qrolvis: titularidad del sitio, condiciones de uso y datos identificativos.",
  },
  twitter: {
    title: "Aviso legal · Qrolvis",
    description:
      "Aviso legal de Qrolvis: titularidad del sitio, condiciones de uso y datos identificativos.",
  },
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
.ql-upd{ color:var(--stone); font-size:.85rem; margin:0 0 2.5rem; }
.ql h2{ font-family:var(--serif); font-weight:400; font-size:1.35rem; line-height:1.25; margin:2.75rem 0 .75rem; }
.ql p{ margin:0 0 1rem; }
.ql ul{ margin:0 0 1rem; padding-left:1.25rem; }
.ql li{ margin-bottom:.4rem; }
.ql-datos{ border:1px solid var(--line); border-radius:.9rem; background:#fff;
  padding:1.25rem 1.5rem; margin-bottom:1rem; }
.ql-datos dl{ margin:0; display:grid; gap:.6rem; }
.ql-datos div{ display:flex; flex-wrap:wrap; gap:.35rem 1rem; }
.ql-datos dt{ font-weight:700; font-size:.85rem; min-width:9rem; }
.ql-datos dd{ margin:0; font-size:.95rem; color:var(--stone); }
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
        <h1>Aviso legal</h1>
        <p className="ql-upd">Última actualización: agosto de 2026</p>

        <h2>1. Titular del sitio web</h2>
        <p>
          En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y
          de comercio electrónico (LSSI-CE), se informa de los datos identificativos del titular de este sitio
          web:
        </p>

        <div className="ql-datos">
          <dl>
            <div>
              <dt>Titular</dt>
              <dd>Sergi de Domingo i Rosas</dd>
            </div>
            <div>
              <dt>NIF</dt>
              <dd>41671686X</dd>
            </div>
            <div>
              <dt>Domicilio</dt>
              <dd>C/ Rafael Masó, 7, 2º 2ª — 17242 Quart (Girona)</dd>
            </div>
            <div>
              <dt>Correo electrónico</dt>
              <dd>
                <a href="mailto:soporte@qrolvis.com">soporte@qrolvis.com</a>
              </dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>
                <a href="tel:+34679702934">679 70 29 34</a>
              </dd>
            </div>
            <div>
              <dt>Sitio web</dt>
              <dd>qrolvis.com</dd>
            </div>
            <div>
              <dt>Actividad</dt>
              <dd>Servicios de recogida de opiniones de clientes mediante códigos QR y etiquetas NFC</dd>
            </div>
          </dl>
        </div>

        <p>Qrolvis es un nombre comercial utilizado por el titular indicado. En adelante, «el titular».</p>

        <h2>2. Objeto</h2>
        <p>
          Este aviso legal regula el acceso y el uso del sitio web qrolvis.com. La navegación por el sitio
          atribuye la condición de usuario e implica la aceptación de las condiciones recogidas en este
          documento.
        </p>
        <p>
          El sitio tiene una finalidad informativa: describe el servicio prestado por el titular y facilita
          vías de contacto. No permite la contratación en línea ni la creación de cuentas de usuario.
        </p>

        <h2>3. Condiciones de uso</h2>
        <p>El usuario se compromete a:</p>
        <ul>
          <li>
            Hacer un uso lícito del sitio y no emplearlo con fines contrarios a la ley, a la buena fe o al
            orden público.
          </li>
          <li>No realizar acciones que puedan dañar, sobrecargar o impedir el funcionamiento normal del sitio.</li>
          <li>No intentar acceder a áreas restringidas ni a los sistemas de información del titular.</li>
        </ul>

        <h2>4. Propiedad intelectual e industrial</h2>
        <p>
          Los contenidos de este sitio (textos, diseño, código, imágenes, estructura y denominación Qrolvis)
          son titularidad del titular o dispone de las licencias necesarias para su uso. Queda prohibida su
          reproducción, distribución, comunicación pública o transformación sin autorización expresa y por
          escrito.
        </p>
        <p>
          Las marcas, nombres comerciales y logotipos de terceros que puedan aparecer pertenecen a sus
          respectivos propietarios y se mencionan únicamente a título identificativo.
        </p>

        <h2>5. Responsabilidad</h2>
        <p>
          El titular procura que la información publicada sea correcta y esté actualizada, pero no garantiza
          la ausencia de errores. Los precios y las condiciones del servicio publicados tienen carácter
          informativo y pueden modificarse; las condiciones aplicables a cada cliente son las que consten en
          el contrato de servicio firmado.
        </p>
        <p>
          El titular no se responsabiliza de interrupciones del servicio, fallos técnicos o daños derivados de
          causas ajenas a su control. Tampoco responde del contenido de sitios de terceros a los que se pueda
          acceder mediante enlaces desde este sitio.
        </p>

        <h2>6. Enlaces a terceros</h2>
        <p>
          Este sitio contiene enlaces a servicios de terceros, como WhatsApp. Al utilizarlos, el usuario
          abandona qrolvis.com y queda sujeto a las condiciones y políticas de privacidad de dichos servicios,
          sobre las que el titular no tiene control alguno.
        </p>

        <h2>7. Protección de datos</h2>
        <p>
          El tratamiento de datos personales se rige por la <a href="/privacidad">política de privacidad</a>,
          que forma parte integrante de este aviso legal.
        </p>

        <h2>8. Legislación aplicable y jurisdicción</h2>
        <p>
          Este aviso legal se rige por la legislación española. Para la resolución de cualquier controversia
          serán competentes los juzgados y tribunales que correspondan conforme a la normativa aplicable, sin
          perjuicio del fuero que legalmente corresponda a los consumidores.
        </p>

        <h2>9. Modificaciones</h2>
        <p>
          El titular se reserva el derecho a modificar este aviso legal para adaptarlo a cambios normativos o
          en el servicio. La versión vigente es la publicada en esta página.
        </p>
      </main>

      <footer className="ql-foot">
        <div className="ql-wrap ql-nopad">
          <p>
            Qrolvis · Girona · <a href="/">Inicio</a> · <a href="/privacidad">Privacidad</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
