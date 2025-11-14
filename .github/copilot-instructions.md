# Instrucciones para Agentes de IA - Casamiento Recuerdo

## Arquitectura del Proyecto

Este es un sitio web de **recuerdo de boda** de una sola página HTML (`casamiento-recuerdo.html`) autocontenido. No hay framework JavaScript, build tools ni dependencias locales. Todo el estilo y funcionalidad está embebido en el archivo HTML.

**Filosofía de diseño**: Página nostálgica/recuerdo con estética elegante usando paleta cálida (dorado, rosa, sage) y tipografías premium (Cormorant Garamond, Montserrat, Great Vibes).

## Dependencias Externas (CDN)

- **Bootstrap 5.3.3**: Sistema de grilla y utilidades básicas
- **html2canvas 1.4.1**: Para capturas de pantalla (funcionalidad futura)
- **Google Fonts**: Cormorant Garamond, Montserrat, Great Vibes
- **Unsplash**: Imágenes placeholder vía URLs directas

## Sistema de Temas

El proyecto implementa tema claro/oscuro con:
- `data-theme="light"` o `data-theme="dark"` en `<html>`
- Variable `localStorage`: `KEY = "amor_theme"`
- Script inline anti-FOUC en `<head>` que restaura tema guardado antes del render
- Variables CSS personalizadas en `:root` y `[data-theme="dark"]`

**Al editar estilos**: Siempre definir colores usando las variables CSS (`--memory-warm`, `--memory-gold`, etc.) para mantener compatibilidad con ambos temas.

## Estructura de Secciones

1. **Hero Nostálgico**: Full viewport con overlay de imagen, degradado y animaciones `fadeInUp` escalonadas
2. **Mensaje de Agradecimiento**: Texto centrado con firma script
3. **Stats del Día**: Grid responsivo con números grandes (150 invitados, 1,247 fotos, etc.)
4. **Timeline del Día**: Timeline vertical con puntos dorados, 6 momentos clave (10:00 a 23:00)
5. **Galería con Filtros**: Sistema de filtrado JavaScript por categoría (ceremonia, fiesta, retratos, detalles)
6. **Video Highlights**: Embed de YouTube con aspect-ratio 16:9
7. **Testimonios Masonry**: CSS multi-column layout (3/2/1 columnas según viewport)
8. **Créditos/Proveedores**: Grid de profesionales con íconos emoji

## Patrones de Código Críticos

### Animaciones CSS
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
```
Usadas en hero con delays escalonados (0.2s, 0.4s, 0.6s...) para efecto cascada.

### Sistema de Filtros de Galería
- Botones con `data-filter="categoria"`
- Items con `data-category="categoria"`
- Toggle de clase `.hidden` para mostrar/ocultar
- Listeners en JavaScript al final del `<body>`

### Smooth Scroll
Event listeners en todos los `<a>` que comienzan con `#` usando `scrollIntoView({ behavior: 'smooth' })`

### Parallax en Hero (Opcional)
Scroll listener que aplica `translateY(scrolled * 0.4)` y fade opacity en `.hero-memory-content`

## Convenciones de Estilo

- **Espaciado de secciones**: Variable `--section-padding: 5rem` (3rem en mobile)
- **Breakpoints responsive**: 768px (mobile), 992px (tablet)
- **Nombres de clase**: BEM-like con sufijos `-memory`, `-filtered`, `-day` para evitar conflictos
- **Tipografía**:
  - Headings: `var(--font-serif)` (Cormorant Garamond)
  - Body: `var(--font-sans)` (Montserrat)
  - Decorativo: `var(--font-script)` (Great Vibes) con clase `.script-font`

## Navegación y Branding

- Header fijo con logo "Amor en Páginas" (ruta relativa: `../../assets/brand/`)
- Badge flotante inferior derecho que enlaza a `../../index.html`
- Todos los links externos (proveedores) usan Instagram o sitios web reales

## Modificaciones Comunes

### Cambiar colores del tema
Editar variables en `:root` y `[data-theme="dark"]`:
```css
:root {
  --memory-gold: #d4a574;
  --memory-rose: #d8b4a0;
  /* ... */
}
```

### Agregar fotos a la galería
Duplicar `.gallery-item-filtered` con:
- `data-category="categoria"` (debe coincidir con filtros existentes)
- `<img src="URL">` de Unsplash o CDN
- `<span class="gallery-item-category">Texto</span>`

### Modificar timeline
Cada `.timeline-moment` requiere:
- `.timeline-time-text` con hora
- `.timeline-content-day` con `<h3>` título y `<p>` descripción
- Opcional: `.timeline-mini-photo` con imagen

### Responsive
- Stats: 4 columnas → 2 columnas en 768px
- Testimonios: 3 columnas → 2 → 1 según viewport
- Hero: Texto y botones se ajustan con `clamp()` para tipografía fluida

## Accesibilidad

- `prefers-reduced-motion: reduce` desactiva animaciones
- `aria-label` en badge flotante
- `alt` text en todas las imágenes
- Lazy loading en galería con `loading="lazy"`

## Sistema de Tour Guiado Demo

**Funcionalidad para grabación de videos demostración** - Sistema automático de modales educativos que explican cada sección:

- **Botón flotante**: `🎥 Iniciar Tour Demo` con animación de pulso (bottom-right)
- **8 pasos secuenciales**: Hero, Agradecimiento, Stats, Timeline, Galería, Video, Testimonios, Créditos
- **Autoplay de 6 segundos**: Avanza automáticamente para grabar videos sin intervención
- **Spotlight visual**: Highlight dorado con sombra que resalta la sección activa
- **Modales persuasivos**: Cada paso incluye:
  - Ícono emoji grande
  - Título descriptivo
  - Descripción de funcionalidad
  - Beneficio para el cliente (caja destacada en dorado)
  - Controles de navegación (Siguiente/Saltar)
  - Progress dots

### Uso para Video
```javascript
// Configuración en línea 1467
const AUTOPLAY_DELAY = 6000; // 6 segundos por paso
```

**Pausar autoplay**: Hacer hover sobre el modal  
**Saltar tour**: Clic en "Saltar" o en overlay oscuro  
**Reiniciar**: Refrescar página o clic en botón flotante

### Modificar Contenido del Tour
Editar array `tourSteps` (línea ~1480):
```javascript
{
  id: 'seccion',
  target: '.css-selector',
  icon: '🎯',
  title: 'Título Modal',
  description: 'Explicación técnica...',
  benefit: {
    title: '✨ Beneficio Clave',
    text: 'Por qué esto convence al cliente...'
  },
  position: 'center' // o 'top', 'bottom'
}
```

## NO Hacer

- ❌ No agregar dependencias npm/build tools (mantener archivo único autocontenido)
- ❌ No usar jQuery (vanilla JS únicamente)
- ❌ No modificar la estructura del header/footer sin actualizar rutas relativas a `../../`
- ❌ No cambiar IDs de secciones (`#galeria`, `#video`, `#gracias`) sin actualizar links de navegación y tour targets
