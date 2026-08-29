// Service Worker: cachea el "cascarón" de la app (HTML/CSS/JS de librerías)
// para que abra instantáneamente y funcione sin internet.
// Los DATOS (transacciones, deudas) se manejan aparte con localStorage,
// ver la lógica de caché/cola dentro de index.html.

const CACHE_NAME = 'presupuesto-shell-v22';

const ARCHIVOS_CASCARON = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  './js/globals.js',
  './js/theme.js',
  './js/ui.js',
  './js/auth.js',
  './js/offline.js',
  './js/utils.js',
  './js/navigation.js',
  './js/selectors.js',
  './js/modals.js',
  './js/data.js',
  './js/presupuestos.js',
  './js/metas.js',
  './js/configCategorias.js',
  './js/filtros.js',
  './js/deudas.js',
  './js/transacciones.js',
  './js/edicion.js',
  './js/render.js',
  './js/stats.js',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // No falla la instalación si algún recurso externo no se puede cachear todavía
      return Promise.allSettled(
        ARCHIVOS_CASCARON.map((url) => cache.add(url).catch((err) => console.warn('No se pudo cachear:', url, err)))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Nunca interceptar llamadas a Supabase: siempre deben ir a la red
  // (los datos offline se manejan con localStorage dentro de la app, no con el SW).
  if (request.url.includes('supabase.co')) {
    return;
  }

  // Navegación (abrir/recargar la app): red primero, sin usar la caché HTTP del
  // navegador (cache: 'no-store'), así siempre se ve la versión más reciente
  // publicada mientras haya internet. Si falla (sin conexión), usa el cascarón cacheado.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Resto de recursos estáticos: caché primero, red como respaldo
  event.respondWith(
    caches.match(request).then((cacheado) => {
      if (cacheado) return cacheado;
      return fetch(request).then((respuesta) => {
        const clonada = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clonada));
        return respuesta;
      }).catch(() => cacheado);
    })
  );
});
