const CACHE_NAME = 'skill-pilot-v1';
const APP_SHELL = [
    './',
    './index.html',
    './login.html',
    './styles.css',
    './auth.js',
    './shared-nav.js',
    './pwa.js',
    './manifest.webmanifest',
    './assets/skill-pilot-logo.png'
];

self.addEventListener('install', function (event) {
    event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
        return cache.addAll(APP_SHELL);
    }));
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(caches.keys().then(function (keys) {
        return Promise.all(keys.filter(function (key) {
            return key !== CACHE_NAME;
        }).map(function (key) {
            return caches.delete(key);
        }));
    }));
    self.clients.claim();
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(fetch(event.request).then(function (response) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
        });
        return response;
    }).catch(function () {
        return caches.match(event.request);
    }));
});
