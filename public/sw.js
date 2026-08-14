/*
 * Service worker de la demo.
 *
 * Sin esto, "opere sin conexión" solo valía si la pestaña ya estaba abierta:
 * bastaba recargar sin red para recibir el error del navegador en vez de la
 * aplicación. Y sin manifiesto tampoco se podía instalar en la pantalla de
 * inicio, aunque el README la llamara PWA.
 *
 * La aplicación es estática y entera de cliente, así que la estrategia puede
 * ser simple y honesta:
 *
 *  - navegaciones: red primero, y si no hay red se sirve el `index.html`
 *    guardado. Así una recarga sin cobertura abre la demo con sus datos, que
 *    viven en IndexedDB y no dependen de la red.
 *  - recursos con huella (`/assets/index-XXXX.js`): caché primero, porque el
 *    nombre cambia con el contenido y lo cacheado nunca queda obsoleto.
 *
 * No cachea nada de fuera del propio sitio: la demo no habla con ningún host
 * externo y no debe empezar a hacerlo por aquí.
 */

const VERSION = 'inparques-v1';
const ESENCIALES = ['./', './index.html', './manifest.webmanifest', './icono.svg'];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // nada externo

  // Navegar: red primero para recibir despliegues nuevos; caché si no hay red.
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone();
          void caches.open(VERSION).then((c) => c.put('./index.html', copia));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r ?? Response.error())),
    );
    return;
  }

  // Recursos con huella en el nombre: lo cacheado siempre es correcto.
  ev.respondWith(
    caches.match(req).then((enCache) => {
      if (enCache) return enCache;
      return fetch(req).then((res) => {
        if (res.ok && res.type === 'basic') {
          const copia = res.clone();
          void caches.open(VERSION).then((c) => c.put(req, copia));
        }
        return res;
      });
    }),
  );
});
