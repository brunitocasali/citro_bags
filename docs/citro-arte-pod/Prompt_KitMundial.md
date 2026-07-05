# Prompt "Kit Mundial" — estilo Hincha de Argentina (para calibrar con Victoria)

> Prompt maestro para generar el **mockup del kit completo** (remera + tote + taza + cuadro +
> gorra) con la mascota ilustrada en estilo acuarela, temática argentina, en una sola escena
> de tienda. Es la versión lista para **calibrar** del prompt del brief
> (`../automatizacion/Brief_Desarrollador_CITRO_Automatizacion.md`), con los aprendizajes ya
> incorporados.
>
> El resultado es un **preview para mostrar al cliente antes de imprimir**, NO el archivo de
> producción. La aprobación manual de Victoria (Telegram) sigue siendo obligatoria.

---

## 0. Cambios respecto al prompt del brief (por qué esta versión)

Aprendizajes ya validados que se aplican acá:

1. **La marca de agua NO va en el prompt.** En pruebas, el modelo inventa firmas falsas.
   → El logo CITRO se superpone **por software** (módulo de imagen en Make o microservicio),
   en el paso de entrega. Por eso este prompt **no** pide watermark.
2. **Fotos de baja calidad / a distancia** (el caso real más común): se agrega una regla para
   priorizar patrón de color y siluetas reconocibles por sobre el detalle fino.
3. **Fidelidad primero**: si el animal no se reconoce, el preview no sirve, por más lindo que sea.

---

## 1. Cómo hacer la prueba (paso a paso, sin tecnicismos)

1. Entrá a ChatGPT (o a la API cuando esté montado) con un modelo que genere/edite imágenes.
2. **Subí la/las foto(s) de la mascota como referencia** (de frente, buena luz, sin flash;
   si son varias mascotas, una foto por mascota).
3. Pegá el **Prompt maestro** (§2) y debajo el **Template por pedido** (§3) completando las
   variables entre corchetes.
4. Evaluá con el **Checklist de fidelidad** (§5) y anotá qué ajustar (§5, tabla).
5. Repetir 5-10 veces con casos variados (1 perro, 1 gato, 2-3 mascotas, foto regular).

---

## 2. Prompt maestro (versión Kit Mundial — v1 para calibrar)

```text
Usar la foto subida como referencia principal de la mascota o mascotas.

Respetar al máximo la identidad real de cada animal:
cara, ojos, hocico, orejas, manchas, color del pelaje, textura, expresión, tamaño y
proporciones. No cambiar la raza. No inventar otra mascota. No hacerla genérica.
No modificar rasgos importantes.

Si la foto de referencia es de baja calidad, a distancia o con reflejos, priorizar el
patrón de color y las siluetas reconocibles de cada mascota por sobre el detalle fino;
nunca inventar una mascota distinta.

Crear una preview / mockup completa estilo "Kit Hincha de Argentina" en una sola escena
cálida, premium y comercial, lista para mostrar al cliente. Escena horizontal, estética
boutique cálida: mesa de madera, luz suave, fondo acogedor, plantas, decoración sutil,
tonos naturales y aspecto profesional de tienda online.

NO hacer collage dividido en cuadros. Mostrar juntos estos productos en una sola escena:

1. Remera blanca colgada en percha de madera.
2. Tote bag color natural.
3. Taza blanca.
4. Cuadro enmarcado grande.
5. Gorra blanca con visera celeste/azul, apoyada como producto físico sobre la mesa.

Cada producto lleva una ilustración diferente de la misma mascota (o grupo de mascotas) en
versión hincha de Argentina:

REMERA: la mascota con camiseta argentina celeste y blanca, con una pelota de fútbol cerca.
Una sola ilustración centrada, respetando área real de impresión y márgenes blancos.
TOTE: la mascota con bandera argentina como capa, en pose tierna de hincha.
TAZA: la mascota abrazando o sosteniendo una copa dorada estilo trofeo.
CUADRO: la mascota en pose más dinámica (corriendo, festejando o jugando con pelota).
GORRA: retrato simple de la mascota con detalles celestes y blancos.

Estilo de ilustración:
Acuarela premium, tierna y realista. Salpicaduras celestes y blancas detrás de la mascota.
Toques dorados sutiles. Huellitas o corazones pequeños si quedan bien.
Nombre de la mascota escrito debajo de cada diseño en tipografía script azul.
El diseño debe verse impreso de forma realista sobre cada producto.

Tema Argentina:
Camiseta celeste y blanca; bandera argentina como capa en un diseño; pelota de fútbol;
copa dorada; puede incluir sol argentino decorativo. No usar marcas deportivas oficiales.

Reglas importantes:
No collage separado en cuadrados. No agregar almohadón ni productos extra.
No repetir exactamente la misma pose en todos los productos. No poner cuerpo humano.
No deformar anatomía. No agregar patas ni ojos extra. No cambiar la raza.
No hacer el diseño demasiado grande en la remera. No tapar rasgos importantes.
Mantener área de impresión realista en cada producto.
La gorra es un producto físico dentro del mockup, no puesta en la cabeza del animal.
El cuadro debe verse grande y claro.

Si hay más de una mascota (hasta 5):
Deben aparecer todas juntas en cada producto. Respetar cuál es cada una según las fotos.
Mantener diferencias reales: color, tamaño, manchas, orejas, expresión, pelaje, proporciones.
No agregar ni eliminar mascotas. No confundir los nombres.
El texto debe decir exactamente los nombres indicados por el cliente.

Resultado final:
Una imagen de preview premium, cálida y comercial, con el kit completo personalizado de la
mascota o mascotas como hinchas de Argentina, con todos los productos juntos en una sola escena.
```

> Nota: la **marca de agua CITRO** se agrega por software en la entrega, NO en este prompt.

---

## 3. Template por pedido (variables que completa Make/ManyChat en cada ejecución)

```text
Usar prompt maestro (versión Kit Mundial).
Nombre/s de la mascota: [NOMBRES]
Mascota/s: [descripción breve — ej: "un beagle y un gato negro"]
Rasgos importantes a respetar: [manchas, color, ojos, orejas, tamaño, expresión]
Cantidad de mascotas: [1 a 5]
Kit a mostrar: completo (remera, tote, taza, cuadro y gorra).
```

En automatización, `[NOMBRES]` y `[cantidad]` salen de los campos capturados (`nombre_mascota`,
`cantidad_mascotas`); `[descripción]` y `[rasgos]` pueden autogenerarse con gpt-4o-mini a partir
de la foto, o quedar opcionales.

---

## 4. Ejemplos ya completados (para arrancar las pruebas hoy)

**Ejemplo 1 — una mascota (perro)**
```text
Usar prompt maestro (versión Kit Mundial).
Nombre/s de la mascota: Rocky
Mascota/s: labrador dorado
Rasgos importantes a respetar: pelaje dorado uniforme, orejas caídas, ojos color miel, hocico ancho
Cantidad de mascotas: 1
Kit a mostrar: completo.
```

**Ejemplo 2 — una mascota (gato)**
```text
Usar prompt maestro (versión Kit Mundial).
Nombre/s de la mascota: Pelusa
Mascota/s: gata blanca de pelo largo
Rasgos importantes a respetar: pelaje blanco largo, ojos azules, orejas triangulares, hocico rosado
Cantidad de mascotas: 1
Kit a mostrar: completo.
```

**Ejemplo 3 — varias mascotas (caso real difícil)**
```text
Usar prompt maestro (versión Kit Mundial).
Nombre/s de la mascota: Duna, Toby y Michi
Mascota/s: border collie blanco y negro (Duna), perro blanco y gris con collar verde (Toby), gato calico (Michi)
Rasgos importantes a respetar: Duna pelo largo blanco y negro orejas paradas; Toby blanco y gris collar verde; Michi tricolor blanco-naranja-negro
Cantidad de mascotas: 3
Kit a mostrar: completo.
```

---

## 5. Checklist de fidelidad (para evaluar cada resultado)

Puntos **críticos** marcados. Si falla un crítico, ajustar el prompt y repetir:

- [ ] **(crítico)** Se reconoce a la/las mascota/s de la foto (no genéricas).
- [ ] **(crítico)** Raza / especie correcta en cada una.
- [ ] **(crítico)** Manchas, color y patrón del pelaje coinciden.
- [ ] Orejas, ojos y hocico fieles.
- [ ] Proporciones correctas (sin patas/ojos extra, sin deformar).
- [ ] Escena única de tienda (NO collage en cuadrados).
- [ ] Están los 5 productos (remera, tote, taza, cuadro, gorra) y ninguno extra.
- [ ] Poses distintas entre productos (no todas iguales).
- [ ] Gorra como producto físico sobre la mesa (no en la cabeza del animal).
- [ ] Estilo acuarela premium + temática argentina (celeste/blanco, bandera, copa, pelota).
- [ ] Nombre/s escritos correctamente en tipografía script azul.
- [ ] Si hay varias mascotas: aparecen TODAS, correctas, sin agregar ni quitar, nombres bien.
- [ ] Área de impresión realista (diseño no gigante en la remera).

**Registro de pruebas** (para calibrar rápido):

| # | Foto/s usada/s | Qué falló | Línea del prompt ajustada | Resultado |
|---|----------------|-----------|---------------------------|-----------|
| 1 |                |           |                           |           |
| 2 |                |           |                           |           |
| 3 |                |           |                           |           |

---

## 6. Notas para la automatización (después de calibrar)

- Usar **edición con imagen de referencia** (la/las foto/s), no generación desde texto puro.
  Confirmar modelo/endpoint vigente de OpenAI al implementar.
- **Marca de agua CITRO**: superponer por software en la entrega (Make/microservicio), nunca
  en el prompt (el modelo inventa firmas falsas).
- **Aprobación humana obligatoria** antes de enviar al cliente (Telegram: Aprobar / Regenerar /
  Rechazar-pedir-otra-foto).
- **Rechazo por foto mala** dispara automáticamente el mensaje al cliente pidiendo otra foto
  (caso C del brief), reabriendo la captura.
- **Delay intencional de entrega (40-60 min):** aunque la IA genera en segundos, el preview NO
  se entrega instantáneo — se retiene para sostener la ilusión de "arte hecho a mano" (el
  público 40+ paga por lo artesanal, no por un "filtro"). Es un requisito, no un bug. Detalle y
  lógica de tiempos en `Evaluacion_Opciones_KitMundial.md` §6.b.
- El **cierre de venta sigue manual** y el **checkout en Tiendanube**; este prompt solo produce
  el preview que enamora al cliente.
```
