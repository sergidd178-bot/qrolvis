# 08 · Registro de decisiones

Propósito: que nadie, ni humano ni IA, reabra una decisión ya cerrada, y que
nadie dé por cerrada una que sigue abierta.

**Si trabajas en este proyecto y encuentras algo en la sección "Abiertas",
no lo decidas por tu cuenta. Pregunta.**

---

## Decisiones cerradas

| # | Decisión | Motivo | Coste de revertir |
|---|---|---|---|
| D1 | El QR apunta a un punto de captación, no al negocio | Permite desglose por mesa o profesional | **Muy alto**: reimprimir todo el material físico |
| D2 | Formulario totalmente anónimo | Reduce el RGPD, sube la finalización, elimina el riesgo de filtración | Medio |
| D3 | Base de datos: Supabase (PostgreSQL), región UE | Escala sin migración, RLS nativo, gratis al principio | Alto |
| D4 | El enlace a Google se muestra a todos | Filtrar viola las políticas de Google y pondría en riesgo al cliente | No revertible: es una obligación |
| D5 | Informe mensual, no semanal | Con volúmenes bajos, el semanal es ruido y parece vacío | Bajo |
| D6 | Alertas inmediatas ante valoración ≤ 2 | Es el valor percibido diario del servicio | Bajo |
| D7 | Sectores iniciales: hostelería y estética | Mercado local accesible y necesidades bien acotadas | Bajo |
| D8 | Conjuntos de preguntas versionados e inmutables | Editar una pregunta rompe el histórico en silencio | Alto si se descubre tarde |
| D9 | La media no es la métrica principal | Oculta distribuciones bimodales, que son las habituales | Bajo |
| D10 | Reglas de n mínimo aplicadas en código | Un número basado en 6 respuestas destruye la confianza | Bajo |
| D11 | Las respuestas parciales cuentan | Descartarlas sesga hacia quien tiene más paciencia | Bajo |
| D12 | Sin IA en la versión 1 | No hay volumen que lo justifique y añade coste y opacidad | Bajo |
| D13 | El cliente no puede borrar valoraciones | Si pudiera, el informe no valdría nada | Bajo técnicamente, alto comercialmente |
| D14 | Sin panel para el cliente en la versión 1 | El email es suficiente y el panel dispara el alcance | Bajo |
| D15 | Idiomas: castellano y catalán | Mercado objetivo | Bajo |
| D16 | Máximo 4 preguntas de dimensión | Cada pregunta extra reduce la finalización | Bajo |
| D17 | Sin captcha | Destruye la conversión y el riesgo real es mínimo | Bajo |
| D18 | La recomendación mensual la escribe el operador | Es el mayor valor percibido y no hay volumen para automatizarla bien | Bajo |

---

## Cuestiones abiertas

Requieren decisión antes de la fase indicada.

| # | Cuestión | Decidir antes de | Notas |
|---|---|---|---|
| A1 | Precio definitivo de alta y cuota mensual | Fase 5 | Rango propuesto: 90–150 € y 25–45 € |
| A2 | Nombre comercial y dominio | Fase 1 | Necesario para las URL de los QR, que no pueden cambiar después |
| A3 | Número de puntos de captación incluidos en la cuota base | Fase 5 | Propuesta: 3 |
| A4 | Formato físico de los expositores y proveedor de impresión | Fase 5 | Afecta al coste de alta |
| A5 | Umbral de alerta configurable por cliente | Tras el piloto | Ahora fijo en ≤ 2 |
| A6 | Pregunta condicional "¿qué ha fallado?" con valoración baja | Tras el primer trimestre | Mejora el comentario, añade lógica al formulario |
| A7 | Plan semanal para locales de alto volumen | Tras el piloto | Posible plan superior |
| A8 | Qué ocurre con los datos si un cliente se da de baja | Antes del primer contrato | Debe constar en el contrato |
| A9 | Tercer sector a abordar | Tras el piloto | Candidatos: talleres, clínicas dentales, gimnasios |

---

## Decisiones descartadas y por qué

Registradas para que no vuelvan a proponerse.

| Idea | Por qué se descartó |
|---|---|
| Sorteo mensual con email | Rompe el anonimato y dispara la carga de RGPD. Alternativa: incentivo inmediato gestionado por el negocio |
| Excel o Google Sheets como base de datos | Problemas de concurrencia en hora punta, sin permisos por cliente, y mezcla datos de varios negocios en un archivo |
| Mostrar el enlace de Google solo a quien puntúa alto | Es *review gating*, prohibido por Google. Podría provocar la eliminación del perfil del cliente |
| Informe semanal desde el inicio | Con 10 respuestas semanales el informe es ruido y hace parecer vacío el servicio |
| Preguntar por la relación calidad-precio | Siempre puntúa bajo, no es accionable y desanima al dueño sin decirle qué hacer |
| Login o registro del usuario en el formulario | Destruiría la tasa de respuesta |
| Aplicación móvil | El QR abre el navegador. Una app añadiría una barrera enorme sin ningún beneficio |
| Análisis de sentimiento de los comentarios | Sin volumen no aporta nada y los comentarios se leen enteros de todos modos |
