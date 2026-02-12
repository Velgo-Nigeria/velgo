
/// <reference lib="webworker" />
// @ts-nocheck
const CACHE_NAME = 'velgo-v1.0.9';
const DYNAMIC_CACHE = 'velgo-api-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => { 
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isSupabase = url.href.includes('supabase.co');

  if (!isSameOrigin && !isSupabase) return;

  if (event.request.mode === 'navigate' && isSameOrigin) {
      event.respondWith(
          fetch(event.request).catch(() => {
              return caches.match('/') || caches.match('/index.html');
          })
      );
      return;
  }

  if (isSupabase && event.request.method === 'GET' && !url.href.includes('/auth/v1/')) {
      event.respondWith(
          fetch(event.request).then((networkResponse) => {
              return caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(event.request, networkResponse.clone());
                  return networkResponse;
              });
          }).catch(() => {
              return caches.match(event.request).then(response => {
                  return response || new Response(JSON.stringify({ error: 'Offline', data: [] }), { 
                      status: 200, 
                      headers: { 'Content-Type': 'application/json' } 
                  });
              });
          })
      );
      return;
  }

  if (event.request.method === 'GET' && isSameOrigin) {
      event.respondWith(
          caches.match(event.request).then((response) => {
              const fetchPromise = fetch(event.request).then((networkResponse) => {
                   return caches.open(CACHE_NAME).then((cache) => {
                       if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                       }
                       return networkResponse;
                   });
              });
              return response || fetchPromise;
          })
      );
  }
});

// --- PUSH NOTIFICATION LOGIC ---
self.addEventListener('push', function(event) {
  let data = { title: 'Velgo', body: 'New Activity', url: '/' };
  
  if (event.data) {
    try {
        const payload = event.data.json();
        // Handle both structure formats (direct or nested)
        if (payload.record) {
             // If payload is raw DB record, format it here (fallback)
             data.title = 'Velgo Update';
             data.body = 'Check your activity.';
        } else {
             // If payload is pre-formatted by Edge Function
             data = payload;
        }
    } catch(e) {
        data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: 'https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png',
    badge: 'https://mrnypajnlltkuitfzgkh.supabase.co/storage/v1/object/public/branding/velgo-app-icon.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
        { action: 'open', title: 'Open App' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
      
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
