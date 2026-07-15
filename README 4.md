# Invierte360 — Fase 1 + 2 + 3

Calculadora de independencia financiera (FI) en español. 100% HTML/CSS/JS estático, sin backend, lista para GitHub Pages.

## Estado del proyecto

**Fase 1 — Núcleo:** `index.html`, `calculadora.html` + CSS/JS modular (motor de cálculo, gráficos, tema, storage).

**Fase 2 — Monte Carlo y estrategias:** `monte-carlo.html` con histograma real, comparación de tasas de retiro (3/4/5%) y comparación de las 5 estrategias (regla del 4%, 3%, 5%, VPW, Guyton-Klinger) con trayectorias.

**Fase 3 — SEO y PWA (nuevo):**
- `manifest.json` — configuración de la PWA (nombre, iconos, colores, accesos directos a Calculadora y Monte Carlo)
- `sw.js` — service worker: cachea el "app shell" (HTML/CSS/JS/iconos) para que la calculadora y Monte Carlo funcionen sin conexión tras la primera visita; estrategia network-first para HTML y cache-first para estáticos; cachea Chart.js (CDN) en segundo plano
- `offline.html` — página de respaldo que se muestra si se navega sin conexión a una página no cacheada
- `robots.txt` — permite el rastreo completo y apunta al sitemap
- `sitemap.xml` — las 3 páginas actualmente publicadas (se debe ampliar según se añadan páginas nuevas)
- `ads.txt` — plantilla para Google AdSense (**debes sustituir `pub-0000000000000000` por tu ID real**, ver comentario dentro del archivo)
- `assets/icons/` — favicon (SVG + ICO), apple-touch-icon, iconos PWA 192/512 (normales y "maskable")
- `assets/og/og-image.png` — imagen para Open Graph / Twitter Card (1200×630)
- Cada página (`index.html`, `calculadora.html`, `monte-carlo.html`) incluye ahora: meta description, `<link rel="canonical">`, Open Graph, Twitter Card, iconos y enlace al manifest
- JSON-LD añadido: `Organization` y `WebSite` (home), `WebApplication` (home y calculadora), `BreadcrumbList` (calculadora y Monte Carlo), `FAQPage` (home, con una sección de preguntas frecuentes visible en la página)
- `js/main.js` registra el service worker automáticamente

### ⚠️ Antes de publicar, sustituye el dominio de ejemplo

Todas las URLs absolutas (canonical, Open Graph, sitemap, robots.txt) usan el dominio de ejemplo `https://www.invierte360.com/`. Cuando tengas tu dominio real o tu URL de GitHub Pages (`https://tuusuario.github.io/invierte360/`), busca y reemplaza `https://www.invierte360.com/` en: `index.html`, `calculadora.html`, `monte-carlo.html`, `sitemap.xml`, `robots.txt` y `manifest.json` (rutas `start_url`/`scope`, si usas un subdirectorio).

Pendiente para próximas fases: páginas secundarias (Número FI, Regla del 4%, Interés compuesto, FAQ ampliada, Contacto, legales, 404), blog SEO, README final de despliegue paso a paso (GitHub Pages, Search Console, AdSense).

## Previsualizar en local

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`. Nota: el service worker y el modo offline solo funcionan sobre `http://localhost` o `https://` (no al abrir el archivo `.html` con doble clic).

## Qué probar en esta fase

1. Abre las herramientas de desarrollador → pestaña Application/Aplicación → Manifest: comprueba que Chrome detecta la PWA y ofrece "Instalar".
2. En la misma pestaña → Service Workers: confirma que `sw.js` está activo.
3. Visita `index.html`, `calculadora.html` y `monte-carlo.html` una vez online. Luego activa el modo avión (o "Offline" en DevTools → Network) y recarga cada una: deberían seguir funcionando.
4. Visita una URL inexistente sin conexión (o borra la caché de una página no visitada): debería aparecer `offline.html`.
5. En la home, abre y cierra las preguntas frecuentes (sección FAQ).
6. Comparte cualquier página en redes sociales (o usa una herramienta como el "Facebook Sharing Debugger") para comprobar que aparece la imagen y el título correctos — recuerda que hasta que publiques el sitio con el dominio real, estas herramientas externas no podrán acceder a `og-image.png`.
7. Valida `manifest.json` y los JSON-LD con el [Rich Results Test de Google](https://search.google.com/test/rich-results) una vez el sitio esté publicado.

Cuando lo hayas probado, dime qué ajustar y seguimos con la Fase 4 (páginas secundarias: Número FI, Regla del 4%, Interés compuesto, FAQ ampliada, Contacto, legales, 404).
