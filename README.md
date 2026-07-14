# Invierte360 — Fase 1

Invierte360 es una plataforma de planificación financiera que ayuda a calcular la independencia financiera, simular estrategias de retiro y proyectar el crecimiento del patrimonio mediante herramientas intuitivas.

## Estado de esta fase

Incluido en Fase 1:
- `index.html` — página de inicio
- `calculadora.html` — calculadora completa: Número FI, proyección nominal/real, 3 escenarios, Monte Carlo (2.000 iteraciones en JS puro), comparación de estrategias de retiro, guardado automático en LocalStorage, compartir por URL, copiar resultados, exportar a PDF (impresión), modo claro/oscuro.
- `css/` — modular: `variables.css` (tokens de diseño), `base.css`, `layout.css`, `components.css`, `calculator.css`, `home.css`.
- `js/` — modular: `fiEngine.js` (motor de cálculo puro), `charts.js` (Chart.js), `storage.js`, `theme.js`, `utils.js`, `calculator.js`, `main.js`.

Pendiente para próximas fases (aún no incluido): páginas secundarias (Número FI, Regla del 4%, Interés compuesto, FAQ, Contacto, legales, 404), blog SEO, manifest/service worker (PWA), robots.txt/sitemap.xml/ads.txt, JSON-LD, iconos e imágenes finales, README completo de despliegue.

## Previsualizar en local

No hace falta instalar nada. Desde la carpeta del proyecto:

```bash
python3 -m http.server 8000
```

Y abre `http://localhost:8000` en el navegador. (Si abres los archivos `.html` directamente con doble clic también funciona, pero un servidor local evita problemas de rutas).

## Qué probar en esta fase

1. Rellena el formulario de la calculadora y comprueba que el Número FI, la fecha de retiro y los gráficos se actualizan en tiempo real.
2. Cambia entre modo claro/oscuro (icono sol/luna en la barra superior).
3. Pulsa "Ejecutar 2.000 simulaciones" en la sección Monte Carlo.
4. Pulsa "Compartir simulación" y abre el enlace generado en otra pestaña: debe cargar los mismos datos.
5. Recarga la página: tus datos deben seguir ahí (LocalStorage).
6. Prueba "Exportar / imprimir PDF" (usa el diálogo de impresión del navegador).
7. Reduce el ancho de la ventana para comprobar el diseño responsive y el menú móvil.

Cuando lo hayas probado, dime qué ajustar y seguimos con la Fase 2.
