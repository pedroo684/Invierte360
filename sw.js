/**
 * sw.js — Service Worker de Invierte360
 * Estrategia: "app shell" con cache-first para estáticos propios,
 * network-first con fallback a caché para las páginas HTML,
 * y cache-first en segundo plano para el CDN de Chart.js.
 *
 * Sube la versión (CACHE_VERSION) cada vez que cambies archivos estáticos
 * para forzar la actualización de la caché en los navegadores de tus usuarios.
 */

const CACHE_VERSION = 'invierte360-v1';
const CACHE_STATIC = `${CACHE_VERSION}-static`;
const CACHE_CDN = `${CACHE_VERSION}-cdn`;

const APP_SHELL = [
  './',
  './index.html',
  './calculadora.html',
  './monte-carlo.html',
  './offline.html',
  './manifest.json',
  './css/variables.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/calculator.css',
  './css/home.css',
  './css/montecarlo.css',
  './js/utils.js',
  './js/fiEngine.js',
  './js/storage.js',
  './js/theme.js',
  './js/charts.js',
  './js/calculator.js',
  './js/montecarlo.js',
  './js/main.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) => Promise.all(
      nombres
        .filter((nombre) => nombre.startsWith('invierte360-') && !nombre.startsWith(CACHE_VERSION))
        .map((nombre) => caches.delete(nombre))
    )).then(() => self.clients.claim())
  );
});

function esNavegacionHTML(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function esCDNChartJS(url) {
  return url.hostname === 'cdn.jsdelivr.net';
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Chart.js (CDN): cache-first, se guarda tras la primera visita online
  if (esCDNChartJS(url)) {
    event.respondWith(
      caches.open(CACHE_CDN).then(async (cache) => {
        const cacheada = await cache.match(request);
        if (cacheada) return cacheada;
        try {
          const respuesta = await fetch(request);
          cache.put(request, respuesta.clone());
          return respuesta;
        } catch (err) {
          return cacheada || Response.error();
        }
      })
    );
    return;
  }

  // Navegación HTML: network-first con fallback a caché y a offline.html
  if (esNavegacionHTML(request)) {
    event.respondWith(
      fetch(request)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE_STATIC).then((cache) => cache.put(request, copia));
          return respuesta;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('./offline.html')))
    );
    return;
  }

  // Resto de estáticos propios (css/js/imágenes): cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cacheada) => cacheada || fetch(request).then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_STATIC).then((cache) => cache.put(request, copia));
        return respuesta;
      }))
    );
  }
});
