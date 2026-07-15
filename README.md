# Invierte360 — Fase 1 + Fase 2

Calculadora de independencia financiera (FI) en español. 100% HTML/CSS/JS estático, sin backend, lista para GitHub Pages.

## Estado del proyecto

**Fase 1 — Núcleo:**
- `index.html` — página de inicio
- `calculadora.html` — calculadora completa: Número FI, proyección nominal/real, 3 escenarios, Monte Carlo rápido, tabla comparativa de estrategias, guardado automático en LocalStorage, compartir por URL, copiar resultados, exportar a PDF (impresión), modo claro/oscuro
- `css/variables.css`, `base.css`, `layout.css`, `components.css`, `calculator.css`, `home.css`
- `js/fiEngine.js` (motor de cálculo puro), `charts.js`, `storage.js`, `theme.js`, `utils.js`, `calculator.js`, `main.js`

**Fase 2 — Monte Carlo y estrategias de retiro (nuevo):**
- `monte-carlo.html` — página dedicada:
  - Explicación en 3 pasos de qué es y cómo funciona el método Monte Carlo
  - Formulario de configuración: gasto anual, tasa de retiro base, duración del retiro, rentabilidad media esperada, volatilidad, inflación y número de simulaciones (500 / 2.000 / 5.000)
  - Resultado principal: probabilidad de éxito en un anillo visual + percentiles 10/50/90
  - **Histograma real** de la distribución completa de patrimonios finales (barras en rojo = simulaciones donde el patrimonio se agotó)
  - **Tabla comparativa de tasas de retiro** (3% / 4% / 5%): patrimonio necesario, ingreso anual y probabilidad de éxito de cada una
  - **Gráfico de trayectorias** comparando las 5 estrategias de retiro (regla del 4%, 3%, 5%, VPW, Guyton-Klinger) partiendo del mismo patrimonio
  - Tarjetas explicativas de cada estrategia (cómo funciona, ventaja, desventaja)
- `css/montecarlo.css` — estilos de la página
- `js/montecarlo.js` — controlador de la página
- Ampliaciones en `js/fiEngine.js`: `construirHistograma()`, `compararTasasRetiroMC()`, `simularTrayectoriaEstrategia()` (trayectoria año a año de una estrategia de retiro concreta), `compararEstrategiasRetiro()` ahora incluye el campo `comoFunciona`
- Ampliaciones en `js/charts.js`: `graficoDistribucionMC()` (histograma), `graficoTrayectoriasEstrategias()`, `graficoComparativaEstrategias()`
- La página reutiliza automáticamente los datos guardados desde la calculadora principal (LocalStorage) si existen

Pendiente para próximas fases (aún no incluido): páginas secundarias (Número FI, Regla del 4%, Interés compuesto, FAQ, Contacto, legales, 404), blog SEO, manifest/service worker (PWA), robots.txt/sitemap.xml/ads.txt, JSON-LD, iconos e imágenes finales, README completo de despliegue.

## Previsualizar en local

No hace falta instalar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Y abre `http://localhost:8000` en el navegador. (Si abres los archivos `.html` directamente con doble clic también funciona, pero un servidor local evita problemas de rutas).

## Qué probar en esta fase

**De la calculadora (Fase 1):**
1. Rellena el formulario y comprueba que el Número FI, la fecha de retiro y los gráficos se actualizan en tiempo real.
2. Cambia entre modo claro/oscuro.
3. Pulsa "Compartir simulación" y ábrelo en otra pestaña: debe cargar los mismos datos.
4. Recarga la página: tus datos deben seguir ahí (LocalStorage).

**De la página Monte Carlo (Fase 2):**
5. Entra en `monte-carlo.html` — debería precargar el gasto anual y la tasa que pusiste en la calculadora.
6. Cambia la volatilidad a un valor alto (25-30%) y ejecuta la simulación: la probabilidad de éxito debería bajar y el histograma debería verse más disperso.
7. Revisa la tabla de comparación de tasas: la tasa del 3% debe mostrar mayor probabilidad de éxito que la del 5%.
8. Comprueba que el gráfico de trayectorias muestra las 5 estrategias con colores distintos y que las tarjetas de abajo explican cada una.
9. Reduce el ancho de la ventana para comprobar el diseño responsive.

Cuando lo hayas probado, dime qué ajustar y seguimos con la Fase 3.
