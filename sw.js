
const CACHE_NAME = 'velgo-v1.0.5';
const DYNAMIC_CACHE = 'velgo-api-v1';

// Assets to pre-cache immediately
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

  if (event.request.mode === 'navigate' && isSameOrigin) {
      event.respondWith(
          fetch(event.request).catch(() => {
              return caches.match('/') || caches.match('/index.html');
          })
      );
      return;
  }

  if (event.request.method === 'GET' && isSameOrigin) {
      event.respondWith(
          caches.match(event.request).then((response) => {
              return response || fetch(event.request).then((networkResponse) => {
                   return caches.open(CACHE_NAME).then((cache) => {
                       if (networkResponse.status === 200) {
                            cache.put(event.request, networkResponse.clone());
                       }
                       return networkResponse;
                   });
              }).catch(() => {
                  return new Response('', { status: 404 });
              });
          })
      );
  }
});

// --- PUSH NOTIFICATION HANDLERS ---
self.addEventListener('push', function(event) {
  if (event.data) {
    let data = { title: 'Velgo', body: 'New Activity', url: '/' };
    try {
        data = event.data.json();
    } catch(e) {
        data.body = event.data.text();
    }

    const options = {
      body: data.body,
      icon: 'https://img.icons8.com/ios-filled/192/008000/shield.png',
      badge: 'https://img.icons8.com/ios-filled/96/008000/shield.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
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
