# Prompt de preview — Bolso de lujo pintado a mano (para calibrar con Victoria)

> Adaptación del prompt maestro del brief ("Kit Hincha de Argentina") a **UN solo bolso de
> cuero de lujo con la mascota pintada a mano**. Objetivo: generar un **mockup ilustrativo**
> ("cómo quedaría"), NO el producto final. La pieza real es pintada a mano.
>
> Cómo usar este documento: Victoria corre **5–10 pruebas** con fotos reales de mascotas,
> evalúa con el checklist del final y ajusta las palabras que hagan falta antes de exponerlo
> a clientes. Recién cuando el prompt esté calibrado se automatiza (ManyChat/Make → OpenAI).

---

## 1. Cómo hacer la prueba (paso a paso, sin tecnicismos)

1. Entrá a ChatGPT (o a la API cuando esté montado) con un modelo que genere/edite imágenes.
2. **Subí la foto de la mascota como referencia** (idealmente de frente, buena luz, sin flash).
3. Pegá el **Prompt maestro** (§2) y debajo el **Template por pedido** (§3) completando las
   variables entre corchetes con los datos de esa mascota.
4. Mirá el resultado con el **Checklist de fidelidad** (§5).
5. Si algo falla (raza cambiada, manchas mal, se ve impreso y no pintado, etc.), ajustá la
   línea correspondiente del prompt y volvé a probar. Anotá qué cambiaste.

> Regla de oro: el objetivo NO es un bolso "lindo genérico", es **la mascota real reconocible**
> pintada sobre el bolso. Si no se reconoce a la mascota, el preview no sirve.

---

## 2. Prompt maestro (versión Bolso — v1 para calibrar)

```text
Usar la foto subida como referencia principal de la mascota.

Respetar al máximo la identidad real del animal:
cara, ojos, hocico, orejas, manchas, color del pelaje, textura, expresión, tamaño y
proporciones. No cambiar la raza. No inventar otra mascota. No hacerla genérica.
No modificar rasgos importantes.

Crear una preview / mockup realista de UN SOLO bolso de cuero de lujo, con la mascota
PINTADA A MANO sobre el cuero, en una sola escena cálida, premium y comercial, lista para
mostrar a la clienta.

La escena debe ser horizontal, estética boutique cálida: mesa o superficie noble, luz suave,
fondo acogedor, tonos naturales, aspecto profesional de tienda de lujo. Un solo bolso como
protagonista, bien centrado y grande.

Estilo de la ilustración sobre el bolso:
La mascota debe verse PINTADA A MANO (pincelada artística, textura de pintura sobre cuero),
NO impresa, NO como sticker, NO como foto pegada. Retrato expresivo y tierno, con alma.
Integrar la pintura al cuero de forma realista (que respete curvatura, textura y brillo del
material). Ubicar el retrato en la zona frontal del bolso, con márgenes realistas.

Producto:
Un bolso de cuero de lujo, modelo [MODELO_BOLSO], color de cuero [COLOR_CUERO].
Herrajes y costuras finas, aspecto artesanal premium.

Texto (opcional):
Si se indica, escribir el nombre de la mascota de forma sutil y elegante: "[NOMBRE_MASCOTA]".
Tipografía fina, integrada, sin tapar el retrato. Si no se indica nombre, no poner texto.

Marca de agua:
Incluir de forma sutil la firma/logo CITRO en una esquina de la imagen (no sobre el retrato).

Reglas importantes:
No deformar la anatomía. No agregar patas ni ojos extra. No cambiar la raza.
No poner cuerpo humano. No hacer collage ni varios cuadros. No mostrar más de un bolso.
No agregar productos extra (ni taza, ni cuadro, ni remera). No tapar rasgos de la mascota.
No que parezca impresión industrial: debe leerse como arte pintado a mano.
Mantener proporción realista entre el retrato y el tamaño del bolso.

Si hay más de una mascota en la foto de referencia:
Incluir a todas juntas en el mismo bolso, respetando cuál es cada una (color, tamaño, manchas,
orejas, expresión, proporciones). No agregar mascotas que no estén. No eliminar mascotas.

Resultado final:
Una imagen de preview premium, cálida y comercial, mostrando UN bolso de cuero de lujo con la
mascota pintada a mano, lista para enamorar a la clienta y transmitir artesanía de lujo.
```

---

## 3. Template por pedido (variables que completa Make/ManyChat en cada ejecución)

```text
Usar prompt maestro (versión Bolso).
Nombre de la mascota: [NOMBRE_MASCOTA]
Mascota/s: [descripción breve — ej: "gato atigrado naranja"]
Rasgos importantes a respetar: [manchas, color, ojos, orejas, tamaño, expresión]
Modelo de bolso: [MODELO_BOLSO]  (ej: Siena / Roma / Capri)
Color de cuero: [COLOR_CUERO]    (ej: natural / negro / cognac)
Incluir nombre en el bolso: [SÍ / NO]
```

En automatización, `[NOMBRE_MASCOTA]`, `[MODELO_BOLSO]` y `[COLOR_CUERO]` salen de los campos
capturados en el formulario/ManyChat; `[RASGOS]` y `[descripción]` pueden autogenerarse con un
modelo de texto (gpt-4o-mini) a partir de la foto, o quedar opcionales.

---

## 4. Ejemplos ya completados (para arrancar las pruebas hoy)

**Ejemplo 1 — perro caniche blanco**
```text
Usar prompt maestro (versión Bolso).
Nombre de la mascota: Coco
Mascota/s: caniche pequeño de pelaje blanco crema
Rasgos importantes a respetar: pelo rizado, orejas caídas, ojos oscuros redondos, hocico corto
Modelo de bolso: Siena
Color de cuero: natural
Incluir nombre en el bolso: SÍ
```

**Ejemplo 2 — gato atigrado**
```text
Usar prompt maestro (versión Bolso).
Nombre de la mascota: Michi
Mascota/s: gato atigrado naranja y blanco
Rasgos importantes a respetar: rayas naranjas, pecho blanco, ojos verdes, orejas puntiagudas
Modelo de bolso: Roma
Color de cuero: cognac
Incluir nombre en el bolso: NO
```

**Ejemplo 3 — dos mascotas juntas**
```text
Usar prompt maestro (versión Bolso).
Nombre de la mascota: Luna y Toby
Mascota/s: un gato negro (Luna) y un perro salchicha marrón (Toby)
Rasgos importantes a respetar: Luna negra ojos amarillos; Toby cuerpo alargado marrón, orejas largas caídas
Modelo de bolso: Capri
Color de cuero: negro
Incluir nombre en el bolso: SÍ
```

---

## 5. Checklist de fidelidad (para evaluar cada resultado)

Marcar cada preview generado. Si falla algún ✅ crítico, ajustar el prompt y repetir:

- [ ] **(crítico)** Se reconoce que es LA mascota de la foto (no una genérica).
- [ ] **(crítico)** La raza / especie es correcta.
- [ ] **(crítico)** Manchas, color y patrón del pelaje coinciden.
- [ ] Orejas, ojos y hocico fieles.
- [ ] Proporciones correctas (no deforme, sin patas/ojos extra).
- [ ] **(crítico)** Se ve PINTADO A MANO sobre cuero, no impreso ni foto pegada.
- [ ] Hay UN solo bolso (no collage, no productos extra).
- [ ] El retrato tiene tamaño y ubicación realistas en el bolso.
- [ ] Escena cálida/premium, coherente con marca de lujo.
- [ ] Marca de agua CITRO presente y sutil.
- [ ] Si se pidió nombre: está bien escrito y no tapa el retrato.
- [ ] Si hay varias mascotas: aparecen todas, correctas, sin agregar ni quitar.

**Registro sugerido de pruebas** (para calibrar rápido):

| # | Foto usada | Qué falló | Línea del prompt ajustada | Resultado |
|---|------------|-----------|---------------------------|-----------|
| 1 | 3 mascotas a través de vidrio, baja calidad (`assets/preview-bolso-test-01.png`) | (a) inventó marca de agua falsa "Atelier Louise"; (b) no respetó color de cuero "natural" (salió cognac); (c) manchas aproximadas por foto pobre | pendiente: quitar marca de agua del prompt (se hace por software), reforzar color de cuero, agregar regla para fotos de baja calidad | ✅ Vendible. Estilo pintado a mano logrado, 3 mascotas reconocibles, collar verde conservado |
| 2 |            |           |                           |           |
| 3 |            |           |                           |           |

> **Aprendizaje clave de la prueba 1:** la **marca de agua** NO debe pedirse al prompt (el
> modelo inventa firmas falsas) → superponer el logo CITRO por software en Make/backend.
> El **color de cuero** se interpreta libremente → reforzarlo mucho o pasar un swatch como 2ª referencia.

---

## 6. Notas para la fase de automatización (después de calibrar)

- Usar **edición con imagen de referencia** (la foto), no generación desde texto puro, para
  máxima fidelidad. Confirmar modelo/endpoint vigente de OpenAI al implementar.
- El preview aprobado se entrega SIEMPRE tras el visto bueno de Victoria (human-in-the-loop).
- Microcopy obligatorio junto al preview: *"Preview ilustrativo — el bolso final es pintado a
  mano, pieza única"*, para no romper la promesa de artesanía.
```
