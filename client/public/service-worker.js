// service-worker.js
const CACHE_NAME = 'paperstack-v2';
const STATIC_CACHE = 'paperstack-static-v2';
const PAPER_CACHE = 'paperstack-papers-v1';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/logo192.png',
  '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE && 
              cacheName !== PAPER_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event with caching strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Handle PDF files (papers and solutions)
  if (url.pathname.endsWith('.pdf') || url.hostname.includes('cloudinary')) {
    event.respondWith(
      networkFirstThenCache(event.request, PAPER_CACHE)
    );
    return;
  }
  
  // Handle API requests - network first, fallback to cache if offline
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      networkFirstWithOfflineFallback(event.request)
    );
    return;
  }
  
  // Static assets - cache first, network fallback
  event.respondWith(
    cacheFirstWithNetworkFallback(event.request, STATIC_CACHE)
  );
});

// Strategy: Network first, then cache
async function networkFirstThenCache(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone the response to cache it
    const responseToCache = networkResponse.clone();
    
    // Cache the successful response
    const cache = await caches.open(cacheName);
    await cache.put(request, responseToCache);
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If no cache and offline, show offline page
    if (!navigator.onLine) {
      return caches.match('/offline.html') || 
             new Response('You are offline. Please check your connection.', {
               status: 503,
               headers: { 'Content-Type': 'text/html' }
             });
    }
    
    throw error;
  }
}

// Strategy: Cache first, network fallback
async function cacheFirstWithNetworkFallback(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request, cacheName);
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || 
             new Response('You are offline. Please check your connection.', {
               status: 503,
               headers: { 'Content-Type': 'text/html' }
             });
    }
    throw error;
  }
}

// Strategy: Network first with offline fallback for API
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Clone and cache successful GET API responses
    if (request.method === 'GET') {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // For GET requests, try cache when offline
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE, queue for later sync
    if (!['GET', 'HEAD'].includes(request.method)) {
      queueRequestForSync(request);
    }
    
    throw error;
  }
}

// Background cache update
async function updateCacheInBackground(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    await cache.put(request, networkResponse.clone());
  } catch (error) {
    console.log('Background cache update failed:', error);
  }
}

// Queue requests for background sync
function queueRequestForSync(request) {
  // Store in IndexedDB for later sync
  if ('sync' in self.registration) {
    // Using Background Sync API if available
    self.registration.sync.register('sync-requests')
      .then(() => console.log('Background sync registered'))
      .catch(err => console.log('Background sync failed:', err));
  }
  
  // Store in localStorage as fallback
  const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
  pendingRequests.push({
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? request.clone().text() : null,
    timestamp: Date.now()
  });
  localStorage.setItem('pendingRequests', JSON.stringify(pendingRequests.slice(-10))); // Keep last 10
}

// Handle background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-requests') {
    event.waitUntil(syncPendingRequests());
  }
});

// Sync pending requests when back online
async function syncPendingRequests() {
  const pendingRequests = JSON.parse(localStorage.getItem('pendingRequests') || '[]');
  
  for (const req of pendingRequests) {
    try {
      await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body
      });
      console.log('Synced request:', req.url);
    } catch (error) {
      console.log('Failed to sync request:', req.url, error);
      break; // Stop on first failure
    }
  }
  
  // Clear successfully synced requests
  localStorage.removeItem('pendingRequests');
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New papers available!',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Papers',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PaperStack', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});