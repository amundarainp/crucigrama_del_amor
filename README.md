# Guía rápida: Tour guiado (demo)

Esta guía resume cómo está implementado el tour guiado en esta landing y qué tocar para adaptarlo en futuras páginas.

## Qué incluye
- Overlay semitransparente + spotlight para resaltar la sección activa.
- Modal centrado con título, descripción, caja de beneficio y controles.
- Botón flotante “Iniciar Tour Demo”.
- Pasos del tour definidos en un array con selectores CSS.
- Navegación manual (sin autoplay).

## Archivos y bloques relevantes
- `index.html`
  - Estilos del tour: bloque `<style>` con clases `.tour-*` (overlay, spotlight, modal, botones).
  - Marcup del tour: botón flotante + contenedores (overlay, spotlight, modal).
  - Lógica del tour: funciones `startTourLove`, `endTourLove`, `showStepLove`, `positionSpotlightLove`, `renderModalLove`, `updateProgressDotsLove` y el array `tourStepsLove`.
- `styles.css`
  - Variables globales del tour en `:root` (claro) y overrides en `html[data-theme="dark"]` (oscuro).

## Variables globales (ajustes rápidos)
Definidas en `styles.css`:
- `--tour-btn-bg`: color de fondo de los botones del tour.
- `--tour-btn-fg`: color de texto de los botones.
- `--tour-btn-shadow` / `--tour-btn-shadow-hover`: sombras (reposo/hover).
- `--tour-btn-radius`: radio de borde.
- `--tour-btn-pad-y` / `--tour-btn-pad-x`: paddings vertical/horizontal.

Modo oscuro (`html[data-theme="dark"]`) redefine estas mismas variables para asegurar contraste y coherencia visual.

## Cómo iniciar el tour
- El tour es manual (sin autoplay). El usuario hace clic en el botón flotante “🎥 Iniciar Tour Demo”.
- Avance: botón “Siguiente”. Salir: “Saltar” o clic fuera (overlay).

## Editar el contenido del tour
En `index.html`, dentro del `<script>` del tour, modificar el array `tourStepsLove`:
```js
const tourStepsLove = [
  {
    id: 'header',
    target: '.sticky-header',
    icon: '🏷️',
    title: 'Encabezado pegajoso',
    description: '…',
    benefit: { title: '✨ …', text: '…' },
    position: 'center'
  },
  // ... más pasos
];
```
Sugerencias:
- `target`: usar selectores claros y estables existentes en la página.
- Mantener el último paso (“¡Infinitas Posibilidades!”) como cierre estándar comercial.

## Reutilizar en otra página
1) Copiar desde `index.html`:
- Bloque de estilos del tour `<style> … .tour-* … </style>` (si no se desea unificar en un CSS global).
- El botón flotante y los contenedores del tour (overlay, spotlight, modal) antes de `</body>`.
- El bloque `<script>` con las funciones del tour y un array `tourSteps…` específico de esa página.
2) Asegurarse de tener las variables globales en `styles.css` (ya están agregadas).
3) Actualizar selectores `target` de cada paso a las secciones reales de la nueva página.

## Cómo reactivar el autoplay (opcional)
Si querés que avance solo cada X segundos, agregá este patrón:

```html
<script>
// arriba del archivo del tour
let autoplayLove = null;
const AUTOPLAY_DELAY_LOVE = 6000; // 6s
let isPausedLove = false;

function showStepLove() {
  // ... lógica actual de posicionamiento y render
  if (autoplayLove) clearTimeout(autoplayLove);
  isPausedLove = false;
  autoplayLove = setTimeout(() => { if (!isPausedLove) nextStepLove(); }, AUTOPLAY_DELAY_LOVE);
}

function endTourLove() {
  // ... ocultar overlay/spotlight/modal
  if (autoplayLove) clearTimeout(autoplayLove);
}

function renderModalLove(step) {
  const m = document.getElementById('tourModalLove');
  // … m.innerHTML = `…`
  m.onmouseenter = () => { isPausedLove = true; if (autoplayLove) clearTimeout(autoplayLove); };
  m.onmouseleave = () => {
    isPausedLove = false;
    autoplayLove = setTimeout(() => { if (!isPausedLove) nextStepLove(); }, AUTOPLAY_DELAY_LOVE);
  };
}
</script>
```

## Accesibilidad y UX
- Modal con `role="dialog"` y `aria-modal="true"`.
- Overlay con `backdrop-filter` y spotlight con transición suave.
- Respeta `prefers-reduced-motion: reduce`.

## Consejos de diseño
- Priorizar contraste AA/AAA para botones y textos del modal.
- Mantener el lenguaje del tour cercano a la estética y tono de la landing.
- Probar en móvil: el modal limita altura (`max-height`) y scroll interno.

---
Cualquier ajuste común (colores, radios, paddings) se hace una sola vez en `styles.css` mediante `--tour-btn-*` y aplica a “Siguiente” y al botón flotante simultáneamente.
