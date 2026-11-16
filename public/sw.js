// The AS Travel app's service worker (registered by src/main.js). It keeps the
// app shell and its built assets so the app opens straight away, even on a bad
// connection; the API (another origin) is never cached. It also shows the
// pushes from the platform API (Modules\Users\Services\WebPush).
const CACHE = 'as-travel-app-v1';
const SHELL = ['/', '/app/manifest.webmanifest', '/app/icon-192.png', '/app/logo.svg', '/app/logo-mark-white.svg'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // Pages: the network first (a new deploy shows up), the cached shell offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE).then((cache) => cache.put('/', copy));
                    }
                    return response;
                })
                .catch(() => caches.match('/')),
        );
        return;
    }

    // Built assets have hashed names, so a cached copy is always right.
    if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/app/')) {
        event.respondWith(
            caches.match(request).then(
                (cached) =>
                    cached ||
                    fetch(request).then((response) => {
                        if (response.ok) {
                            const copy = response.clone();
                            caches.open(CACHE).then((cache) => cache.put(request, copy));
                        }
                        return response;
                    }),
            ),
        );
    }
});

// A push from the API ({ title, body, url, tag }), e.g. "Request assigned":
// shown even while the app is closed (Android, and iOS once the app is on the
// home screen). An open app is told too, so it redraws the list.
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { body: event.data?.text() };
    }
    event.waitUntil(
        Promise.all([
            self.registration.showNotification(data.title || 'AS Travel', {
                body: data.body || '',
                icon: '/app/icon-192.png',
                badge: '/app/badge-96.png',
                tag: data.tag || `as-${Date.now()}`,
                renotify: true,
                vibrate: [200, 100, 200],
                data: { url: data.url || '/' },
            }),
            self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => windows.forEach((client) => client.postMessage({ type: 'push', url: data.url }))),
        ]),
    );
});

// Tapping a notification brings the app up on the request it is about.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
            const open = windows.find((client) => 'focus' in client);
            if (!open) return self.clients.openWindow(url);
            return open
                .focus()
                .then((client) => (client && 'navigate' in client && client.url !== url ? client.navigate(url) : client))
                .catch(() => open.focus());
        }),
    );
});
