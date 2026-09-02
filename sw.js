// Service Worker: cachea el "cascarón" de la app (HTML/CSS/JS de librerías y módulos)
// para que abra instantáneamente y funcione sin internet.
// Los DATOS (transacciones, deudas) se manejan aparte con localStorage y Supabase.

const CACHE_NAME = 'presupuesto-shell-v31';

const ARCHIVOS_CASCARON = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/config.js',
  './js/state.js',
  './js/services/storageService.js',
  './js/services/rateService.js',
  './js/services/supabaseService.js',
  './js/ui/theme.js',
  './js/ui/toast.js',
  './js/ui/navigation.js',
  './js/ui/customSelect.js',
  './js/ui/modals.js',
  './js/modules/debts.js',
  './js/modules/goals.js',
  './js/modules/budgets.js',
  './js/modules/history.js',
  './js/modules/comparison.js',
  './js/ui/charts.js',
  './js/modules/transactions.js',
  './js/app.js',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
  'https://npmcdn.com/flatpickr/dist/themes/dark.css',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/monthSelect/style.css',
  'https://cdn.jsdelivr.net/npm/flatpickr',
  'https://npmcdn.com/flatpickr/dist/l10n/es.js',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/plugins/monthSelect/index.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // No falla la instalación si algún recurso externo no se puede cachear todavía
      return Promise.allSettled(
        ARCHIVOS_CASCARON.map((url) =>
          cache.add(url).catch((err) => console.warn('No se pudo cachear:', url, err))
        )
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

  // Nunca interceptar llamadas a Supabase ni a la API de tasas
  if (
    request.url.includes('supabase.co') ||
    request.url.includes('api.alcambio.app') ||
    request.url.includes('rates.dolarvzla.com')
  ) {
    return;
  }

  // Navegación (abrir/recargar la app): red primero, sin usar la caché HTTP del navegador
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
