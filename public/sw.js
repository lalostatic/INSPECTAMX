// INSPECTAMX Service Worker v1.0.0
const CACHE_NAME = 'inspectamx-v1';
const MEDIA_QUEUE_DB = 'inspectamx-offline';
const SYNC_TAG = 'sync-media';

// App shell assets to cache
const APP_SHELL = [
  '/',
  '/login',
  '/manifest.json',
];

// Install event - cache app shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't cache API requests
  if (url.pathname.startsWith('/api/')) {
    // For media uploads when offline, queue them
    if (url.pathname === '/api/media/upload' && request.method === 'POST') {
      event.respondWith(handleMediaUpload(request));
      return;
    }
    return; // Let API calls go through normally
  }

  // Cache-first for static assets
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/) ||
    url.pathname.startsWith('/_build/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Network-first for navigation
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request) || caches.match('/'))
    );
    return;
  }
});

// Handle media upload when offline
async function handleMediaUpload(request) {
  try {
    // Try online first
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Queue for later sync
    const formData = await request.formData();
    const file = formData.get('file');
    const entityType = formData.get('entity_type');
    const entityId = formData.get('entity_id');

    if (file) {
      await queueMediaForSync(file, entityType, entityId);
    }

    return new Response(
      JSON.stringify({ queued: true, message: 'Media queued for sync when online' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Queue media in IndexedDB for background sync
async function queueMediaForSync(file, entityType, entityId) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_QUEUE_DB, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('media_queue')) {
        const store = db.createObjectStore('media_queue', { keyPath: 'id' });
        store.createIndex('status', 'status');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('media_queue', 'readwrite');
      const store = tx.objectStore('media_queue');

      const item = {
        id: crypto.randomUUID(),
        entity_type: entityType,
        entity_id: entityId,
        file_blob: file,
        filename: file.name,
        mime_type: file.type,
        created_at: new Date().toISOString(),
        attempts: 0,
        status: 'pending',
      };

      store.add(item);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = (e) => reject(e);
    };

    request.onerror = (e) => reject(e);
  });
}

// Background Sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === SYNC_TAG) {
    event.waitUntil(syncPendingMedia());
  }
});

// Sync pending media uploads
async function syncPendingMedia() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MEDIA_QUEUE_DB, 1);

    request.onsuccess = async (event) => {
      const db = event.target.result;

      try {
        const tx = db.transaction('media_queue', 'readonly');
        const store = tx.objectStore('media_queue');
        const items = await new Promise((res, rej) => {
          const req = store.index('status').getAll('pending');
          req.onsuccess = () => res(req.result);
          req.onerror = rej;
        });

        for (const item of items) {
          try {
            // Get auth token
            const token = await getToken();
            if (!token) continue;

            const formData = new FormData();
            formData.append('file', item.file_blob, item.filename);
            formData.append('entity_type', item.entity_type);
            formData.append('entity_id', item.entity_id);

            const response = await fetch('/api/media/upload', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            });

            if (response.ok) {
              // Mark as synced and delete
              const delTx = db.transaction('media_queue', 'readwrite');
              delTx.objectStore('media_queue').delete(item.id);
              console.log('[SW] Synced media:', item.id);
            }
          } catch (err) {
            console.warn('[SW] Failed to sync item:', item.id, err);
          }
        }

        db.close();
        resolve();
      } catch (err) {
        db.close();
        reject(err);
      }
    };

    request.onerror = (e) => reject(e);
  });
}

// Get auth token from storage
async function getToken() {
  const clients = await self.clients.matchAll({ type: 'window' });
  if (clients.length === 0) return null;

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => resolve(event.data?.token || null);
    clients[0].postMessage({ type: 'GET_TOKEN' }, [channel.port2]);
    setTimeout(() => resolve(null), 1000);
  });
}

// Handle messages from app
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'TRIGGER_SYNC') {
    self.registration.sync?.register(SYNC_TAG).catch(console.warn);
  }
});

console.log('[SW] Service Worker loaded - INSPECTAMX v1.0.0');
