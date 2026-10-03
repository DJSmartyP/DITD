export const MEDIA_CACHE = "ppec-trail-media-v3";

let workerPromise;

export function registerMediaWorker() {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) return false;
    const scriptUrl = new URL("../sw.js?v=3", import.meta.url);
    const registration = await navigator.serviceWorker.register(scriptUrl, {
      scope: new URL("../", import.meta.url).pathname
    });
    await registration.update();
    await navigator.serviceWorker.ready;
    const deadline = performance.now() + 10000;
    while (performance.now() < deadline) {
      if (navigator.serviceWorker.controller?.scriptURL === scriptUrl.href) return true;
      await new Promise((resolve) => window.setTimeout(resolve, 200));
    }
    workerPromise = null;
    return false;
  })().catch((error) => {
    console.warn("Trail media worker unavailable", error);
    workerPromise = null;
    return false;
  });
  return workerPromise;
}

export async function clearTrailMediaCache() {
  if ("caches" in window) await caches.delete(MEDIA_CACHE);
}

function resolveAssets(index) {
  if (!Array.isArray(index?.assets) || !index.assets.length) throw new Error("Trail media list is unavailable.");
  const assets = index.assets.map((asset) => {
    const url = new URL(asset.path, document.baseURI);
    const allowed = asset.path.startsWith("./assets/") || asset.path === "./favicon.ico";
    if (!allowed || url.origin !== location.origin || !Number.isSafeInteger(asset.bytes) || asset.bytes < 1) {
      throw new Error("Trail media list contains an invalid entry.");
    }
    return { url, bytes: asset.bytes };
  });
  if (new Set(assets.map((asset) => asset.url.href)).size !== assets.length) {
    throw new Error("Trail media list contains duplicate entries.");
  }
  return assets;
}

export async function hasPreparedTrailMedia(index) {
  if (!("caches" in window)) return false;
  const assets = resolveAssets(index);
  const cache = await caches.open(MEDIA_CACHE);
  for (const asset of assets) {
    const saved = await cache.match(asset.url.href);
    if (!saved || (await saved.blob()).size !== asset.bytes) return false;
  }
  return true;
}

export async function preloadTrailMedia(index, onProgress, { signal } = {}) {
  if (!("caches" in window)) throw new Error("Browser media storage is unavailable.");
  const assets = resolveAssets(index);

  let total = assets.reduce((sum, asset) => sum + asset.bytes, 0);
  const cache = await caches.open(MEDIA_CACHE);
  const requiredUrls = new Set(assets.map((asset) => asset.url.href));
  for (const request of await cache.keys()) {
    if (!requiredUrls.has(request.url)) await cache.delete(request);
  }
  let loaded = 0;
  let transferred = 0;
  const startedAt = performance.now();
  const update = () => onProgress?.({ loaded, total, transferred, elapsedMs: performance.now() - startedAt });
  update();

  for (const [index, asset] of assets.entries()) {
    if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
    const saved = await cache.match(asset.url.href);
    if (saved) {
      const savedSize = Number(saved.headers.get("Content-Length")) || (await saved.blob()).size;
      if (savedSize === asset.bytes) {
        loaded += asset.bytes;
        update();
        continue;
      }
      await cache.delete(asset.url.href);
    }

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
      const loadedBeforeAttempt = loaded;
      const controller = new AbortController();
      const cancelAttempt = () => controller.abort();
      signal?.addEventListener("abort", cancelAttempt, { once: true });
      let idleTimer;
      const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = window.setTimeout(cancelAttempt, 30000);
      };
      try {
        resetIdleTimer();
        const response = await fetch(asset.url.href, { signal: controller.signal, cache: "no-store" });
        if (!response.ok || response.status !== 200) throw new Error("A trail asset could not be prepared.");
        const reader = response.body?.getReader();
        const chunks = [];
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            resetIdleTimer();
            chunks.push(value);
            transferred += value.byteLength;
            loaded += value.byteLength;
            update();
          }
        } else {
          const data = await response.arrayBuffer();
          chunks.push(data);
          transferred += data.byteLength;
          loaded += data.byteLength;
          update();
        }
        clearTimeout(idleTimer);
        const blob = new Blob(chunks, { type: response.headers.get("Content-Type") || "application/octet-stream" });
        const servedSize = Number(response.headers.get("Content-Length"));
        if (Number.isSafeInteger(servedSize) && servedSize > 0 && blob.size !== servedSize) {
          throw new Error("A trail asset did not finish downloading.");
        }
        if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
        await cache.put(asset.url.href, new Response(blob, {
          headers: { "Content-Type": blob.type, "Content-Length": String(blob.size) }
        }));
        total += blob.size - asset.bytes;
        update();
        break;
      } catch (error) {
        loaded = loadedBeforeAttempt;
        update();
        if (signal?.aborted) throw new DOMException("Download cancelled", "AbortError");
        if (error?.name === "QuotaExceededError" || attempt === 3) {
          error.assetIndex = index + 1;
          error.assetCount = assets.length;
          throw error;
        }
        await new Promise((resolve) => window.setTimeout(resolve, attempt * 1200));
      } finally {
        clearTimeout(idleTimer);
        signal?.removeEventListener("abort", cancelAttempt);
      }
    }
  }
  return { total, transferred };
}
