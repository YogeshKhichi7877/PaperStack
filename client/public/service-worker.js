/* eslint-disable no-restricted-globals */
/* eslint-env serviceworker */
/* global self, caches, URL */

const CACHE_NAME = 'paperstack-pwa-v2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

function shouldBypassCache(request, url) {
  if (request.method !== 'GET') return true;

  if (url.pathname.startsWith('/api/')) return true;
  if (url.pathname.startsWith('/admin')) return true;
  if (url.pathname.startsWith('/login')) return true;
  if (url.pathname.startsWith('/register')) return true;
  if (url.pathname.includes('/upload')) return true;

  if (url.hostname.includes('cloudinary.com')) return true;
  if (url.hostname.includes('res.cloudinary.com')) return true;

  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          STATIC_ASSETS.map((asset) =>
            cache.add(asset).catch((error) => {
              console.warn('Service worker cache add failed:', asset, error);
              return null;
            })
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (shouldBypassCache(request, url)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        if (!response || !response.ok) return response;

        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone).catch(() => {});
        });

        return response;
      });
    })
  );
});
