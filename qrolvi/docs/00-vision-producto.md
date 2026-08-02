# 00 · Visión de producto

## Problema real del cliente

El dueño de un bar o de una peluquería tiene dos problemas que sí le quitan el sueño:

1. **Tiene pocas reseñas en Google y las que llegan son aleatorias.** Los clientes
   contentos no reseñan; los enfadados sí. Su puntuación pública no refleja su
   negocio y eso le cuesta clientes nuevos.
2. **Se entera tarde de los problemas.** Cuando descubre que la camarera del turno
   de noche trata mal a la gente, ya lleva tres meses pasando.

Lo que **no** le quita el sueño es tener un panel de métricas de satisfacción.
Eso es la consecuencia, no la venta.

## Propuesta de valor

> Convertimos a tus clientes satisfechos en reseñas de Google, y te avisamos por
> email en cuanto alguien se va descontento, antes de que lo escriba en internet.

El informe mensual es el tercer argumento, no el primero.

## Cómo funciona, en una frase

El cliente escanea un QR al pagar, responde en 20 segundos, y al terminar se le
ofrece dejar una reseña en Google. Si su valoración ha sido baja, el dueño recibe
un aviso inmediato con el comentario.

---

## Diferenciación

No competimos por tecnología. Cualquiera puede montar un formulario con QR.
Competimos por:

| Ventaja | Por qué es defendible |
|---|---|
| Presencia local | Vamos al local, colocamos los materiales y formamos al personal. Ninguna herramienta internacional lo hace |
| Catalán y castellano nativos | Preguntas escritas para el sector, no traducidas |
| Servicio hecho | El dueño no configura absolutamente nada |
| Protocolo de captación | Vendemos el método para conseguir respuestas, no solo el formulario |
| Interpretación del informe | La recomendación mensual es consultoría, y es lo que más se valora |

---

## El protocolo de captación forma parte del producto

Este es el punto que decide si el servicio funciona. Un QR colocado sin más
genera tasas de respuesta muy bajas. La entrega al cliente incluye:

1. **QR impreso en el ticket de caja**, no solo en expositor de mesa.
2. **Guion de 8 palabras para el personal** al entregar la cuenta.
3. **Expositores físicos** para mesa, mostrador o espejo.
4. **Incentivo opcional** que asume el negocio (café gratis, descuento en la
   próxima visita). No lo financiamos nosotros.
5. **Revisión a las dos semanas** del volumen de respuestas y ajuste de la
   colocación si es bajo.

El volumen de respuestas es una métrica de salud **de nuestro servicio**, no del
negocio del cliente. Si baja, actuamos nosotros.

---

## Modelo de negocio

| Concepto | Importe | Notas |
|---|---|---|
| Alta única | 90 – 150 € | Visita, configuración, materiales impresos, formación |
| Cuota mensual por local | 25 – 45 € | Incluye alertas, informe mensual y soporte |
| Punto de captación adicional | A definir | A partir del cuarto punto |

**Restricción de diseño obligatoria:** con 30 clientes activos, el tiempo mensual
total de operación manual debe ser inferior a 5 horas. Cualquier funcionalidad que
no cumpla esto se rediseña o se descarta.

Cadencia de entrega:
- **Alerta por valoración baja: inmediata.** Es lo que mantiene el producto presente.
- **Informe: mensual.** Semanal produce ruido con volúmenes bajos y hace parecer
  vacío el servicio. Un plan semanal puede existir más adelante para locales de
  alto volumen, como plan superior.

---

## Sectores iniciales

1. **Hostelería**: bares, restaurantes, cafeterías.
2. **Estética**: peluquerías, salones de uñas, centros de estética.

Cada sector tiene su propio banco de preguntas versionado. Ver `04-banco-preguntas.md`.

---

## Alcance de la versión 1

### Dentro

- Formulario público por punto de captación, anónimo, en castellano y catalán
- Bancos de preguntas para hostelería y estética
- Enlace a Google Reviews al finalizar, mostrado a todos
- Alerta por email al dueño ante valoración baja
- Panel de administración interno: alta de negocios, puntos de captación,
  generación de QR imprimibles, consulta de respuestas
- Informe mensual en PDF generado automáticamente

### Fuera de la versión 1

Aunque parezca fácil añadirlo, queda fuera:

- Panel de acceso para el cliente final
- Idiomas más allá de castellano y catalán
- Facturación automática (se cobra por transferencia o Bizum)
- Integraciones con TPV o software de reservas
- Cualquier funcionalidad con IA
- Aplicación móvil
- Sorteos, cupones o cualquier mecánica que exija recoger un email

---

## Criterio de éxito de la versión 1

El proyecto se considera validado si, tras tres meses con cinco clientes de pago:

- La mediana de respuestas mensuales por local supera **40**
- Al menos **cuatro de los cinco** clientes renuevan el tercer mes
- El tiempo mensual de operación manual es inferior a **1 hora por cliente**

Si no se cumplen, el problema está en la captación de respuestas, no en el
software, y hay que resolverlo antes de añadir funcionalidades.
