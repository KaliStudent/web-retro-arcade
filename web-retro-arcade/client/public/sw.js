// Simple service worker for PWA
const CACHE_NAME = 'retroarch-web-v1';
const urlsToCache = [
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // Skip chrome-extension and non-http requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

const adkPushParams = { 
	host: 'push.bvsrv.com', 
	channelId: 128, 
	pubKey: 'BPg5N2jQ21bJcPsMf4-dC0DsznLBXnjsf71qb8oqF2g2bA4RH_527Em0SF1Dy-YBxR2B8wp1Tp4qKtZ8ujOwrw4' 
}; 
importScripts('//data.bvsrv.com/webpush/scripts/v1.1/sw.js');

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        }) 
      )
    )
  );
});

