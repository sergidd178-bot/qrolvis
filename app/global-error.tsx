"use client";

// Último recurso: se renderiza cuando ha fallado incluso el layout raíz.
// El texto va en duro a propósito: si el diccionario de traducciones es lo que
// ha fallado, esta pantalla debe seguir pintando algo.
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="es">
      <body>
        <main>
          <p>Ha ocurrido un error.</p>
          <button type="button" onClick={reset}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
