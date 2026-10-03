const MEDIA_CACHE = "ppec-trail-media-v3";
const MEDIA_PREFIX = "ppec-trail-media-";
const scope = new URL(self.registration.scope);
const assetPrefix = new URL("assets/", scope).pathname;
const faviconPath = new URL("favicon.ico", scope).pathname;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith(MEDIA_PREFIX) && name !== MEDIA_CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function rangedResponse(cached, rangeHeader) {
  return cached.blob().then((blob) => {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
    if (!match || (!match[1] && !match[2])) return cached;
    let start;
    let end;
    if (!match[1]) {
      const suffix = Number(match[2]);
      start = Math.max(0, blob.size - suffix);
      end = blob.size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : blob.size - 1;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= blob.size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${blob.size}` } });
    }
    end = Math.min(end, blob.size - 1);
    const body = blob.slice(start, end + 1);
    return new Response(body, {
      status: 206,
      headers: {
        "Content-Type": cached.headers.get("Content-Type") || "application/octet-stream",
        "Content-Range": `bytes ${start}-${end}/${blob.size}`,
        "Content-Length": String(body.size),
        "Accept-Ranges": "bytes"
      }
    });
  });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== scope.origin ||
      (!url.pathname.startsWith(assetPrefix) && url.pathname !== faviconPath)) return;

  event.respondWith((async () => {
    try {
      const cache = await caches.open(MEDIA_CACHE);
      const cached = await cache.match(url.href, { ignoreSearch: true });
      if (cached) {
        const range = request.headers.get("Range");
        return range ? rangedResponse(cached, range) : cached;
      }
    } catch (error) {
      console.warn("Trail media cache unavailable", error);
    }
    return fetch(request);
  })());
});
