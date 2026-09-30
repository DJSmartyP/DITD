import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { answerMatches, normalizeAnswer } from "../js/machines.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const trail = JSON.parse(await readFile(join(root, "data", "trail.json"), "utf8"));
const manifest = JSON.parse(await readFile(join(root, "data", "media-manifest.json"), "utf8"));

test("canonical flow contains exactly scenes 00-22 in one chain", () => {
  assert.equal(trail.scenes.length, 23);
  assert.deepEqual(trail.scenes.map((scene) => scene.order), [...Array(23).keys()]);
  assert.equal(trail.startSceneId, "intro");
  for (let index = 0; index < trail.scenes.length - 1; index += 1) {
    assert.equal(trail.scenes[index].next, trail.scenes[index + 1].id);
  }
  assert.equal(trail.scenes.at(-1).next, null);
});

test("critical answers and deliberate failure remain exact", () => {
  const expected = new Map([
    ["jonavision-207", "207"],
    ["bodach-bay", "Jonana Peel"],
    ["corrupted-ridge-map", "2JP"],
    ["repair-jonatravel", "reboot-jonanapeel.exe"],
    ["videomatic-4763", "4763"],
    ["activation-centre", "WD54L"],
    ["test-videomatic", "8345"],
    ["fake-cancel-plan", "cancel-plan"],
    ["jonabot-taunt", "4216"],
    ["recovery-console", "INITIATE JONABOT RESTORE"]
  ]);
  expected.forEach((answer, id) => {
    const scene = trail.scenes.find((candidate) => candidate.id === id);
    assert.equal(scene.validation.answer, answer);
  });
  assert.equal(trail.scenes.find((scene) => scene.id === "fake-cancel-plan").validation.intentionalFailure, true);
});

test("normalizers accept harmless variations without weakening answers", () => {
  assert.equal(normalizeAnswer("  Jonana   Peel  ", "name"), "jonana peel");
  assert.equal(normalizeAnswer("!jonagraph 2jp", "jonagraph"), "2JP");
  assert.equal(normalizeAnswer("!jonabot reboot-jonanapeel.exe", "command"), "reboot jonanapeel.exe");
  assert.equal(normalizeAnswer("initiate-jonabot-restore", "command"), "initiate jonabot restore");
  assert.equal(answerMatches(" initiate-jonabot-restore ", { answer: "INITIATE JONABOT RESTORE", normalizer: "command" }), true);
  assert.equal(answerMatches("2LF", { answer: "2JP", normalizer: "jonagraph" }), false);
});

test("noticeboard evidence is retained for the 2JP investigation", () => {
  const noticeboard = trail.scenes.find((scene) => scene.id === "noticeboard");
  const map = trail.scenes.find((scene) => scene.id === "corrupted-ridge-map");
  assert.deepEqual(noticeboard.evidenceGranted, ["gremlin-cypher-poster"]);
  assert.deepEqual(map.requiresEvidence, ["gremlin-cypher-poster"]);
  assert.equal(map.specialResponses["1LF"].includes("dead end"), true);
  assert.equal(map.specialResponses["8HO"].includes("Help route"), true);
});

test("every scene media ID exists and local mapped assets resolve", async () => {
  for (const scene of trail.scenes) {
    if (scene.mediaId) assert.ok(manifest.items[scene.mediaId], `Missing manifest item: ${scene.mediaId}`);
    if (scene.ticketMediaId) assert.ok(manifest.items[scene.ticketMediaId], `Missing ticket manifest item: ${scene.ticketMediaId}`);
  }
  for (const [id, item] of Object.entries(manifest.items)) {
    if (typeof item.src === "string" && item.src.startsWith("./")) {
      await access(join(root, item.src.slice(2)));
    }
    if (item.kind === "youtube") {
      assert.match(item.src, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/i, `${id} YouTube URL`);
      assert.match(item.thumbnail, /^\.\/assets\/video-thumbnails\/[\w-]+\.webp$/, `${id} local story-art thumbnail`);
      assert.ok(item.thumbnailAlt, `${id} thumbnail alt text`);
      assert.ok(item.playLabel, `${id} play label`);
      assert.equal(item.thumbnailStatus, "generated-original-story-art", `${id} thumbnail source`);
      await access(join(root, item.thumbnail.slice(2)));
    }
  }
});

test("every scene has an accurate visible speaker label", () => {
  for (const scene of trail.scenes) {
    assert.ok(scene.speaker, `${scene.id} speaker label`);
  }
  assert.equal(trail.scenes.find((scene) => scene.id === "jonatravel-call").speaker, "Jonana Peel");
  assert.equal(trail.scenes.find((scene) => scene.id === "licence-failure").speaker, "Unknown Intruder");
  assert.equal(trail.scenes.find((scene) => scene.id === "bodach-bay-booking").speaker, "Jonana Peel");
});

test("the final reward includes downloadable Bodach Bay tickets", () => {
  const finale = trail.scenes.find((scene) => scene.id === "trail-complete");
  const tickets = manifest.items[finale.ticketMediaId];
  assert.equal(finale.ticketMediaId, "bodach-bay-tickets");
  assert.equal(tickets.kind, "image");
  assert.equal(tickets.download, true);
  assert.equal(tickets.status, "generated-reward-asset");
  assert.match(tickets.src, /completion-pass\.png$/);
  assert.equal(tickets.downloadLabel, "Download your completion pass");
});

test("HTML uses repository-relative local URLs", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  assert.equal(/(?:src|href)="\//.test(html), false);
  assert.match(html, /\.\/js\/app\.js/);
  assert.match(html, /\.\/css\/main\.css/);
  assert.match(html, /\.\/assets\/images\/jonabot-favicon\.png/);
  assert.match(html, /twitter:card/);
});
