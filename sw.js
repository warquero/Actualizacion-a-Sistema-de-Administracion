/**
 * Service Worker para ShuryStore Inventario PWA
 * Versión de caché: shurystore-inventario-v0.21.1
 */

const CACHE = 'shurystore-inventario-v0.21.1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/config.js',
  '/manifest.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-512.png',
  '/apple-touch-icon.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning (some assets might be bundled):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE) {
            console.log('[SW] Borrando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Ignorar llamadas de chrome extensions o no HTTP(S)
  if (!event.request.url.startsWith('http')) return;

  // Para peticiones de navegación o estáticos locales: Cache First con Network Fallback
  // Para APIs remotas (Supabase, BCV): Network First
  const isApi = event.request.url.includes('/rest/v1/') || 
                event.request.url.includes('/auth/v1/') ||
                event.request.url.includes('bcv.org.ve') ||
                event.request.url.includes('/functions/v1/');

  if (isApi) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Assets estáticos de la aplicación
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // En background actualizar cache si es posible (Stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Modo offline esperado */});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      });
    })
  );
});
