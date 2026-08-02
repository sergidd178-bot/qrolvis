# 06 · Privacidad y RGPD

> No soy abogado y esto no es asesoramiento jurídico. Es un diseño técnico
> orientado a minimizar la exposición legal. Antes de firmar con el primer cliente
> de pago conviene que un asesor revise el contrato de encargo de tratamiento y el
> aviso de privacidad.

---

## Decisión central: el formulario es anónimo

**Decidido: sí, anónimo.** Sin nombre, sin email, sin teléfono, sin login.

### Por qué

| Motivo | Efecto |
|---|---|
| Reduce drásticamente la carga de RGPD | Sin datos identificativos, casi todas las obligaciones se aligeran |
| Sube la tasa de finalización | Cada campo pedido pierde respuestas, y un campo de email es de los peores |
| Elimina la fricción comercial | No hay que explicar al cliente qué hacemos con los datos de sus clientes |
| Elimina el peor riesgo del negocio | Una filtración de emails de clientes de un restaurante sería el fin del servicio |

### Qué se sacrifica

El sorteo como incentivo, que requiere email. Es una pérdida real: el sorteo sube
la tasa de respuesta.

**Alternativa que funciona y no exige datos:** un incentivo entregado en el
momento y gestionado por el propio negocio. La pantalla final muestra un código o
un mensaje del tipo "enseña esta pantalla para tu café" y el negocio decide si lo
aplica. Nosotros no guardamos nada.

---

## Reparto de responsabilidades

- **Responsable del tratamiento**: el negocio cliente. Es quien decide recoger
  opiniones de sus clientes.
- **Encargado del tratamiento**: nosotros. Tratamos datos por cuenta del negocio.

El artículo 28 del RGPD exige un **contrato de encargo de tratamiento por escrito**
con cada cliente. No es opcional aunque el sistema sea anónimo, porque el campo de
texto libre puede contener datos personales que el usuario introduzca por su cuenta
("el camarero alto y moreno me trató mal", o incluso su propio nombre).

Es una plantilla que se firma una vez por cliente, junto al contrato de servicio.
Debe cubrir como mínimo: objeto y duración, tipo de datos, obligaciones del
encargado, medidas de seguridad, subencargados (Supabase, Vercel, Resend),
y qué ocurre al finalizar el contrato.

---

## Qué se guarda y qué no

| Dato | ¿Se guarda? | Motivo |
|---|---|---|
| Valoraciones | Sí | Es el servicio |
| Comentario en texto libre | Sí | Es el servicio |
| Idioma elegido | Sí | Útil y no identificativo |
| Punto de captación | Sí | Es el servicio |
| Fecha y hora | Sí | Necesario para los informes |
| **Dirección IP** | **No** | Se usa en memoria para limitar abuso y no se persiste |
| **User agent** | **No** | No aporta valor y añade capacidad de rastreo |
| Token de dispositivo | Sí, 7 días | UUID aleatorio, no deriva de ningún dato del usuario |
| Nombre, email, teléfono | Nunca | No se piden |
| Geolocalización | Nunca | No se pide |

### Sobre el token de dispositivo

Es un UUID generado aleatoriamente en el navegador y guardado en `localStorage`.
No se calcula a partir de la IP, del user agent ni de ninguna característica del
dispositivo. No permite identificar a nadie ni correlacionar entre negocios
distintos.

Se usa exclusivamente para evitar envíos repetidos desde el mismo navegador en un
plazo de 6 horas. Se pone a `null` a los 7 días.

**Base legal para no pedir consentimiento de cookies:** es almacenamiento
estrictamente necesario para prestar el servicio solicitado por el usuario
(evitar duplicados). No es seguimiento ni publicidad. Aun así, el aviso de
privacidad lo menciona explícitamente.

---

## Aviso de privacidad

Enlace visible y discreto en el pie del formulario, en las tres pantallas.
No puede ser una ventana modal que bloquee el uso.

Debe indicar, en lenguaje sencillo:

1. Quién es el responsable (el negocio) y quién el encargado (nosotros)
2. Que no se recogen datos identificativos
3. Que se guarda un identificador técnico anónimo durante 7 días para evitar duplicados
4. Que las opiniones se conservan 24 meses
5. Que no se ceden a terceros salvo los proveedores de infraestructura
6. Cómo ejercer derechos, con una advertencia honesta: **al ser anónimo, no es
   técnicamente posible localizar una respuesta concreta para borrarla**, lo cual
   es una consecuencia directa de no recoger datos personales
7. Contacto

Debe estar en castellano y catalán.

---

## Retención y borrado

| Dato | Plazo | Acción |
|---|---|---|
| `responses.device_token` | 7 días | Se pone a `null` |
| `responses` y `answers` | 24 meses | Borrado físico |
| `reports` | Indefinido | Son agregados sin dato individual |
| `alerts` | 12 meses | Borrado físico |
| Datos de un negocio cancelado | 3 meses tras la baja | Borrado o entrega al cliente, según contrato |

Ejecutado por una tarea programada mensual. **Debe existir desde el primer día**:
una política de retención que no se ejecuta es peor que no tenerla, porque queda
por escrito y se incumple.

---

## Política de integridad de las opiniones

Esta política no es legal, es comercial, pero es igual de importante.

**Un negocio cliente no puede eliminar ni editar valoraciones.**

Ocurrirá: un cliente pedirá borrar una valoración de 1 estrella. La respuesta es
no, y conviene anticiparla en la conversación de venta para que no llegue como
sorpresa.

Motivos que se le explican:
- Si se pudieran borrar las malas, el informe no valdría nada y él lo sabría
- El valor del servicio está en enterarse de lo que no le dicen a la cara
- Nosotros perdemos toda credibilidad el día que cedemos con el primero

Excepciones, y solo estas:
- Contenido ilegal, amenazas o insultos graves a una persona identificable
- Datos personales de terceros introducidos en el texto libre

En ambos casos decide el operador, no el cliente, y queda registrado.

Técnicamente: no existe función de borrado de respuestas en el panel. Si hay que
hacerlo, se hace directamente en base de datos y de forma deliberada.

---

## Proveedores (subencargados)

Deben figurar en el contrato de encargo y en el aviso de privacidad:

| Proveedor | Función | Ubicación de datos |
|---|---|---|
| Supabase | Base de datos y almacenamiento | Elegir región **UE** al crear el proyecto |
| Vercel | Alojamiento de la aplicación | Configurar región UE |
| Resend | Envío de email | Verificar condiciones y ubicación |

**Acción obligatoria en la configuración inicial:** crear el proyecto de Supabase
en una región de la Unión Europea. Cambiar de región después implica migrar todo.

---

## Checklist antes del primer cliente de pago

- [ ] Proyecto de Supabase creado en región UE
- [ ] Aviso de privacidad redactado en castellano y catalán y publicado
- [ ] Plantilla de contrato de encargo de tratamiento revisada por un asesor
- [ ] Tarea de retención implementada y probada
- [ ] Verificado que no se persiste ninguna IP en ningún log
- [ ] Política de integridad de opiniones explicada en el material de venta
