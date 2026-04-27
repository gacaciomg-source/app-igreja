// Service Worker básico para permitir a instalação como PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Apenas repassa as requisições (necessário para o critério do Chrome/Android)
  event.respondWith(fetch(event.request));
});
