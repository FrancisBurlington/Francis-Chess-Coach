// Service worker: lets the app install on a phone and open offline once everything has been fetched once.
const VERSION = 'chess-coach-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.origin === location.origin && url.pathname.includes('/api/')) return;   // live data: never cache
    if (req.headers.has('range')) return;                                            // partial responses can't be cached

    // The page itself: network first (so updates arrive), cache when offline.
    if (req.mode === 'navigate') {
        e.respondWith(
            fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); return res; })
                .catch(() => caches.match('./'))
        );
        return;
    }

    // Everything else (libraries, piece images, Stockfish files): cache first, fill the cache on first use.
    e.respondWith(
        caches.match(req).then(hit => hit || fetch(req).then(res => {
            if (res && (res.ok || res.type === 'opaque')) {
                const copy = res.clone();
                caches.open(VERSION).then(c => c.put(req, copy));
            }
            return res;
        }))
    );
});
