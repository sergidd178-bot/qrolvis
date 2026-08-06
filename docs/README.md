# Recogida de opiniones por QR

Servicio para negocios de hostelería y estética: los clientes escanean un QR al
pagar, valoran su experiencia en 20 segundos y se les invita a dejar una reseña en
Google. El dueño recibe un aviso inmediato ante valoraciones bajas y un informe
mensual.

---

## Empezar aquí

1. Lee `CLAUDE.md`. Contiene las reglas que no se negocian.
2. Mira el estado del proyecto en `docs/07-plan-implementacion.md`.
3. La Fase 0 se omitió deliberadamente, riesgo asumido por Sergi. Ver `CLAUDE.md`
   y `docs/07-plan-implementacion.md` para qué implica ese riesgo.

## Documentación

| Documento | Contenido |
|---|---|
| `docs/00-vision-producto.md` | Producto, diferenciación, precios, alcance |
| `docs/01-arquitectura.md` | Stack, rutas, rendimiento, seguridad |
| `docs/02-modelo-datos.md` | Esquema completo con DDL |
| `docs/03-flujo-formulario.md` | Las tres pantallas y las reglas de Google |
| `docs/04-banco-preguntas.md` | Preguntas por sector, en castellano y catalán |
| `docs/05-informes-y-alertas.md` | **Única fuente de verdad numérica** |
| `docs/06-privacidad-rgpd.md` | Decisiones de privacidad y obligaciones |
| `docs/07-plan-implementacion.md` | Fases y criterios de salida |
| `docs/08-decisiones.md` | Qué está cerrado, qué está abierto |

## Stack

Next.js · TypeScript · Supabase · Vercel · Resend

## Estado

**Fase 1 (cimientos y formulario público), en curso. Fase 0 omitida
deliberadamente, riesgo asumido por Sergi.**
