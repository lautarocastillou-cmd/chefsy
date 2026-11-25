// ─────────────────────────────────────────────────────
// app/carta/sw.js/route.ts
// Service Worker exclusivo con alcance `/carta`.
// Permite ver la Carta Digital sin conexión (HTML, estilos,
// fuentes e imágenes WebP) sin interferir con el resto de Chefsy.
// ─────────────────────────────────────────────────────

import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const SW_SCRIPT = `/* Chefsy Carta Digital — Service Worker (scope: /carta) */
const SHELL_CACHE = 'chefsy-carta-shell-v1';
const IMAGES_CACHE = 'chefsy-carta-images-v1';
const VALID_CACHES = new Set([SHELL_CACHE, IMAGES_CACHE]);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(['/carta', '/logo.jpg']).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('chefsy-carta-') && !VALID_CACHES.has(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function cachearImagen(cache, url) {
  try {
    const yaExiste = await cache.match(url);
    if (yaExiste) return;
    let res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res || (!res.ok && res.type !== 'opaque')) {
      res = await fetch(new Request(url, { mode: 'no-cors' }));
    }
    if (res && (res.ok || res.type === 'opaque')) {
      await cache.put(url, res.clone());
    }
  } catch {
    // Si falla una imagen por red inestable, se intentará luego
  }
}

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || data.type !== 'SYNC_CARTA_ASSETS' || !Array.isArray(data.urls)) return;

  const urlsValidas = data.urls
    .filter((u) => typeof u === 'string' && u.length > 0)
    .map((u) => {
      try {
        return new URL(u, self.location.origin).href;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
  const setUrls = new Set(urlsValidas);

  event.waitUntil(
    (async () => {
      const cache = await caches.open(IMAGES_CACHE);
      // Pre-descargar todas las hojas activas en segundo plano
      await Promise.all(urlsValidas.map((url) => cachearImagen(cache, url)));
      // Limpiar imágenes viejas que ya no están en la carta
      const existentes = await cache.keys();
      await Promise.all(
        existentes
          .filter((req) => !setUrls.has(req.url))
          .map((req) => cache.delete(req))
      );
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const esMismoOrigen = url.origin === self.location.origin;

  // Nunca cachear endpoints de API
  if (esMismoOrigen && url.pathname.startsWith('/api/')) return;

  // 1. Navegación a /carta: Network-First con respaldo offline
  if (request.mode === 'navigate' && esMismoOrigen && url.pathname === '/carta') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put('/carta', networkRes.clone());
          }
          return networkRes;
        } catch {
          const cached = (await cache.match('/carta')) || (await cache.match(request));
          if (cached) return cached;
          return new Response(
            '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión | Carta Chefsy</title><body style="font-family:system-ui,sans-serif;background:#efede8;color:#1c1917;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div><h1 style="font-size:20px;margin:0 0 8px">Sin conexión a internet</h1><p style="font-size:14px;color:#57534e;margin:0">Conectate una vez para guardar la carta en tu teléfono.</p></div></body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // 2. Assets estáticos de Next.js (JS, CSS, fuentes de /carta) y logo: Cache-First
  if (
    esMismoOrigen &&
    (url.pathname.startsWith('/_next/static/') || url.pathname === '/logo.jpg')
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkRes = await fetch(request);
          if (networkRes && networkRes.ok) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // 3. Imágenes de las láminas de la carta (Supabase Storage u origen local): Cache-First
  const esImagenCarta =
    request.destination === 'image' ||
    url.pathname.includes('/storage/v1/object/public/images/');

  if (esImagenCarta) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGES_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const networkRes = await fetch(request);
          if (networkRes && (networkRes.ok || networkRes.type === 'opaque')) {
            cache.put(request, networkRes.clone());
          }
          return networkRes;
        } catch {
          return cached || Response.error();
        }
      })()
    );
  }
});
`

export function GET() {
  return new NextResponse(SW_SCRIPT, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Service-Worker-Allowed': '/carta',
    },
  })
}
