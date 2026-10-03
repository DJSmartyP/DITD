import test from "node:test";
import assert from "node:assert/strict";
import { hasPreparedTrailMedia, preloadTrailMedia } from "../js/media-cache.js";

test("preparation retries an interrupted asset and removes obsolete cached extras", async () => {
  const previous = Object.fromEntries(["document", "location", "window", "caches", "fetch"].map((key) => [key, globalThis[key]]));
  const url = "https://example.test/DITD/assets/videos/test.mp4";
  const obsolete = "https://example.test/DITD/assets/tickets/old.png";
  const entries = new Map([[obsolete, new Response(new Uint8Array([9]))]]);
  let attempts = 0;
  try {
    globalThis.document = { baseURI: "https://example.test/DITD/" };
    globalThis.location = { origin: "https://example.test" };
    globalThis.caches = {
      async open() {
        return {
          async keys() { return [...entries.keys()].map((entry) => ({ url: entry })); },
          async match(key) { return entries.get(key)?.clone(); },
          async delete(key) { return entries.delete(typeof key === "string" ? key : key.url); },
          async put(key, response) { entries.set(key, response); }
        };
      }
    };
    globalThis.window = { setTimeout, clearTimeout, caches: globalThis.caches };
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("Network interrupted");
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "video/mp4", "Content-Length": "3" }
      });
    };
    const progress = [];
    const result = await preloadTrailMedia({ assets: [{ path: "./assets/videos/test.mp4", bytes: 3 }] }, (state) => progress.push(state.loaded));
    assert.equal(attempts, 2);
    assert.equal(result.total, 3);
    assert.equal(entries.has(obsolete), false);
    assert.equal((await entries.get(url).clone().blob()).size, 3);
    assert.equal(progress.at(-1), 3);
    assert.equal(await hasPreparedTrailMedia({ assets: [{ path: "./assets/videos/test.mp4", bytes: 3 }] }), true);
    entries.delete(url);
    assert.equal(await hasPreparedTrailMedia({ assets: [{ path: "./assets/videos/test.mp4", bytes: 3 }] }), false);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("preparation retries when a stream read ignores abort and never settles", async () => {
  const previous = Object.fromEntries(["document", "location", "window", "caches", "fetch"].map((key) => [key, globalThis[key]]));
  const url = "https://example.test/DITD/assets/videos/test.mp4";
  const entries = new Map();
  let attempts = 0;
  let firstSignal;
  try {
    globalThis.document = { baseURI: "https://example.test/DITD/" };
    globalThis.location = { origin: "https://example.test" };
    globalThis.caches = {
      async open() {
        return {
          async keys() { return []; },
          async match(key) { return entries.get(key)?.clone(); },
          async delete(key) { return entries.delete(key); },
          async put(key, response) { entries.set(key, response); }
        };
      }
    };
    globalThis.window = { setTimeout, clearTimeout, caches: globalThis.caches };
    globalThis.fetch = async (_url, options) => {
      attempts += 1;
      if (attempts === 1) {
        firstSignal = options.signal;
        return new Response(new ReadableStream({
          start(controller) { controller.enqueue(new Uint8Array([1])); }
        }), { status: 200, headers: { "Content-Length": "3" } });
      }
      return new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Type": "video/mp4", "Content-Length": "3" }
      });
    };
    const progress = [];
    await preloadTrailMedia({ assets: [{ path: "./assets/videos/test.mp4", bytes: 3 }] },
      (state) => progress.push(state.loaded), { idleTimeoutMs: 20, retryDelayMs: 1 });
    assert.equal(attempts, 2);
    assert.equal(firstSignal.aborted, true);
    assert.ok(progress.includes(1));
    assert.equal(progress.at(-1), 3);
    assert.equal((await entries.get(url).blob()).size, 3);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("preparation retries when fetch itself ignores abort", async () => {
  const previous = Object.fromEntries(["document", "location", "window", "caches", "fetch"].map((key) => [key, globalThis[key]]));
  const entries = new Map();
  let attempts = 0;
  let firstSignal;
  try {
    globalThis.document = { baseURI: "https://example.test/DITD/" };
    globalThis.location = { origin: "https://example.test" };
    globalThis.caches = {
      async open() {
        return {
          async keys() { return []; },
          async match(key) { return entries.get(key)?.clone(); },
          async delete(key) { return entries.delete(key); },
          async put(key, response) { entries.set(key, response); }
        };
      }
    };
    globalThis.window = { setTimeout, clearTimeout, caches: globalThis.caches };
    globalThis.fetch = (_url, options) => {
      attempts += 1;
      if (attempts === 1) {
        firstSignal = options.signal;
        return new Promise(() => {});
      }
      return Promise.resolve(new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "Content-Length": "3" }
      }));
    };
    await preloadTrailMedia({ assets: [{ path: "./assets/videos/test.mp4", bytes: 3 }] }, undefined,
      { idleTimeoutMs: 20, retryDelayMs: 1 });
    assert.equal(attempts, 2);
    assert.equal(firstSignal.aborted, true);
    assert.equal((await entries.values().next().value.blob()).size, 3);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
