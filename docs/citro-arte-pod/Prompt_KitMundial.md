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
4. **Anatomía (v2)**: tras reportes de perros con 3 patas / deformaciones, el prompt ahora pone
   la anatomía correcta como PRIORIDAD MÁXIMA (4 patas, 1 cola, 2 ojos, 2 orejas), usa poses más
   simples y claras, y lista errores a evitar. Se combina con **calidad "high"** (menos errores)
   manteniendo el modelo económico `gpt-image-1-mini`.

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

## 2. Prompt maestro (versión Kit Mundial — v2, anti-errores anatómicos)

> Sincronizado con el prompt real del código (`server/src/kitPreview.mjs`, función `buildPrompt`).
> **v2** agrega barreras fuertes de anatomía (4 patas, 1 cola, 2 ojos, 2 orejas) y poses más
> simples/claras, tras reportes de perros con 3 patas / deformaciones. Va acompañado de subir la
> **calidad a "high"** (menos errores) manteniendo el modelo económico `gpt-image-1-mini`.

```text
Usar la foto subida como referencia principal de la mascota o mascotas.

PRIORIDAD MÁXIMA — ANATOMÍA CORRECTA Y REALISTA (esto es lo más importante de todo):
Cada mascota ilustrada debe tener anatomía natural, correcta y creíble, exactamente como un
animal real:
- Exactamente CUATRO (4) patas, ni más ni menos.
- Exactamente UNA (1) cola.
- Exactamente DOS (2) ojos, bien ubicados y simétricos.
- Exactamente DOS (2) orejas.
- Una (1) sola cabeza y un (1) solo cuerpo, con proporciones naturales de la raza.
Está TERMINANTEMENTE PROHIBIDO: patas de más o de menos, ojos de más, orejas de más, colas de
más, dedos o garras extra, miembros fusionados o pegados, extremidades torcidas en ángulos
imposibles, cuerpos deformados, caras derretidas o distorsionadas, rasgos duplicados. Si una
pose es difícil, elegir una pose más simple y clara antes que arriesgar un error anatómico.
Preferir poses simples, estables y de frente, con el cuerpo completo y las patas bien visibles.

Respetar al máximo la identidad real de cada animal: cara, ojos, hocico, orejas, manchas,
color y patrón exacto del pelaje, textura, expresión, tamaño y proporciones. No cambiar la
raza. No inventar otra mascota. No hacerla genérica. La MISMA mascota debe verse claramente
reconocible y consistente (mismo color, manchas y expresión) en TODOS los productos del kit.

Si la foto de referencia es de baja calidad, a distancia o con reflejos, priorizar el patrón
de color y las siluetas reconocibles por sobre el detalle fino; nunca inventar una mascota
distinta y nunca sacrificar la anatomía correcta.

Crear una preview / mockup completa estilo "Kit Hincha de Argentina" en una sola escena cálida,
premium y comercial. Escena horizontal, estética boutique cálida: mesa de madera, luz suave,
fondo acogedor, plantas, decoración sutil, tonos naturales, aspecto profesional de tienda.

NO hacer collage dividido en cuadros. Mostrar juntos estos productos en una sola escena:
1. Remera blanca colgada en percha de madera.
2. Tote bag color natural.
3. Taza blanca.
4. Cuadro enmarcado grande.
5. Gorra blanca con visera celeste/azul, apoyada como producto físico sobre la mesa.

Cada producto lleva una ilustración de la misma mascota en versión hincha de Argentina, con
poses SIMPLES y CLARAS que dejen ver bien la anatomía completa:
REMERA: la mascota sentada o de pie, de frente, con camiseta argentina celeste y blanca y una
pelota al lado. Centrada, con las cuatro patas visibles, respetando márgenes de impresión.
TOTE: la mascota sentada de frente con una pequeña bandera argentina como capa, pose tranquila.
TAZA: retrato de medio cuerpo junto a una copa dorada estilo trofeo (sin poses forzadas).
CUADRO: la mascota de cuerpo entero, de pie y de frente o en pose calma, 4 patas bien visibles.
GORRA: retrato simple de la cabeza/busto con detalles celestes y blancos.

Estilo: acuarela premium, tierna y realista. Salpicaduras celestes y blancas detrás. Toques
dorados sutiles. Huellitas o corazones pequeños si quedan bien. Impreso de forma realista.
Nombre de la mascota debajo de cada diseño en tipografía script azul (texto exacto del cliente).

Tema Argentina: camiseta celeste y blanca; bandera argentina como capa; pelota; copa dorada;
puede incluir sol argentino. No usar marcas deportivas oficiales.

EVITAR EXPLÍCITAMENTE: perros o gatos con tres o cinco patas, patas/ojos/orejas extra, dos
colas, dedos o garras de más, patas fusionadas, extremidades deformes o en ángulos imposibles,
animal derretido o distorsionado, dos cabezas, rasgos duplicados, mezcla de dos animales,
cuerpo humano, manos humanas.

Reglas: No collage en cuadrados. No productos extra. Variar levemente el encuadre entre
productos pero SIEMPRE con anatomía correcta (4 patas, 1 cola, 2 ojos, 2 orejas en cada uno).
No cuerpo humano. No cambiar la raza. Diseño no gigante en la remera. Área de impresión
realista. La gorra es un producto físico sobre la mesa, no en la cabeza del animal. Cuadro
grande y claro.

Si hay más de una mascota (hasta 5): todas juntas en cada producto, cada una con su anatomía
correcta y sus rasgos reales (color, tamaño, manchas, orejas, expresión). No fusionar mascotas
entre sí. No agregar ni quitar mascotas. No confundir los nombres.

Resultado final: preview premium, cálida y comercial, con el kit completo personalizado como
hinchas de Argentina, todos los productos en una sola escena, y con la anatomía de cada animal
perfectamente correcta y realista.
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
