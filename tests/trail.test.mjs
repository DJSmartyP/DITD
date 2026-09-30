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

test("the noticeboard stays available as a zoomable 2JP reference without being collected", () => {
  const noticeboard = trail.scenes.find((scene) => scene.id === "noticeboard");
  const map = trail.scenes.find((scene) => scene.id === "corrupted-ridge-map");
  assert.equal(noticeboard.validation, undefined);
  assert.equal(noticeboard.evidenceGranted, undefined);
  assert.equal(noticeboard.inlineMachineSceneId, "jonavision-207");
  assert.equal(noticeboard.cta, undefined);
  assert.deepEqual(map.referenceMediaIds, ["town-noticeboard"]);
  assert.equal(manifest.items["town-noticeboard"].zoomable, true);
  assert.equal(map.specialResponses["1LF"].includes("dead end"), true);
  assert.equal(map.specialResponses["8HO"].includes("Help route"), true);
});

test("answer-bearing video remains on screen with the Bodach Bay question", () => {
  const tuner = trail.scenes.find((scene) => scene.id === "jonavision-207");
  const question = trail.scenes.find((scene) => scene.id === "bodach-bay");
  assert.equal(tuner.mediaId, "bodach-bay-tourism");
  assert.equal(tuner.next, question.id);
  assert.equal(question.mediaId, undefined);
});

test("video dialogue is not duplicated as scene copy", () => {
  const visibleCopy = trail.scenes
    .flatMap((scene) => [
      ...(scene.body || []),
      scene.success || "",
      ...(scene.restoreBeats || []).map((beat) => beat.text)
    ])
    .join("\n");

  for (const transcriptLine of [
    "So, you like trails?",
    "A vibrant paradise in a desolate land",
    "Hello, thank you for choosing JonaTravel!",
    "Well, well, well, not so high and mighty",
    "I can't believe that worked!",
    "You idiot! That's obviously not a real command",
    "Wait! What are you doing?!",
    "It appears we were disconnected before"
  ]) {
    const escaped = transcriptLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.doesNotMatch(visibleCopy, new RegExp(escaped, "i"));
  }
});

test("restore finale appears only after the restore has completed", () => {
  const restore = trail.scenes.find((scene) => scene.id === "restore");
  assert.equal(restore.mediaAfterSolve, true);
  assert.deepEqual(restore.restoreBeats.map((beat) => beat.at), [10, 40, 70, 100]);
});

test("the manual password puzzle sends players to the Discord trail-notes PDFs", () => {
  const channel = trail.scenes.find((scene) => scene.id === "behind-the-scenes");
  const puzzle = trail.scenes.find((scene) => scene.id === "jonabot-taunt");
  assert.ok(channel.messages.some((message) => message.text.includes("#trail-notes")));
  assert.ok(channel.messages.some((message) => message.links?.some((link) => link.href === "./assets/documents/jonabot-operator-manual-protected.pdf")));
  assert.ok(channel.messages.some((message) => message.links?.some((link) => link.href === "https://discord.com/channels/1036657633907703899/1198249965739331635")));
  assert.ok(puzzle.body.some((paragraph) => paragraph.includes("#trail-notes")));
  assert.ok(puzzle.body.some((paragraph) => paragraph.includes("PDFs uploaded there")));
  assert.equal(puzzle.validation.answer, "4216");
});

test("every scene media ID exists and local mapped assets resolve", async () => {
  for (const scene of trail.scenes) {
    if (scene.mediaId) assert.ok(manifest.items[scene.mediaId], `Missing manifest item: ${scene.mediaId}`);
    if (scene.ticketMediaId) assert.ok(manifest.items[scene.ticketMediaId], `Missing ticket manifest item: ${scene.ticketMediaId}`);
    for (const referenceId of scene.referenceMediaIds || []) {
      assert.ok(manifest.items[referenceId], `Missing reference manifest item: ${referenceId}`);
    }
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
      assert.ok(item.playText, `${id} in-world play text`);
      assert.ok(item.posterStyle, `${id} poster style`);
      assert.ok(item.posterKicker, `${id} poster kicker`);
      assert.ok(item.posterHeadline, `${id} poster headline`);
      assert.ok(item.posterStatus, `${id} poster status`);
      assert.match(item.plannedLocalSrc, /^\.\/assets\/videos\/[\w-]+\.mp4$/, `${id} planned local MP4 path`);
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
  assert.equal(trail.scenes.find((scene) => scene.id === "licence-failure").speaker, "Videomatic");
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
  const css = await readFile(join(root, "css", "main.css"), "utf8");
  assert.equal(/(?:src|href)="\//.test(html), false);
  assert.match(html, /\.\/js\/app\.js/);
  assert.match(html, /\.\/css\/main\.css/);
  assert.match(html, /\.\/assets\/images\/jonabot-favicon\.png/);
  assert.match(html, /\.\/favicon\.ico/);
  assert.match(html, /ditd-social-preview\.jpg/);
  assert.match(html, /twitter:card/);
  assert.match(css, /\.\.\/assets\/images\/ditd-landing-hero\.jpg/);
  assert.match(css, /--mobile-dock-height:/);
  assert.match(css, /#reveal-hint:not\(\[hidden\]\)/);
  assert.match(html, /id="continue-trail"/);
  assert.match(html, /id="welcome-reset"/);
});

test("player-facing copy stays inside the story world", async () => {
  const mediaCode = await readFile(join(root, "js", "media.js"), "utf8");
  const machineCode = await readFile(join(root, "js", "machines.js"), "utf8");
  const trailCopy = await readFile(join(root, "data", "trail.json"), "utf8");
  const visibleCopy = `${mediaCode}\n${machineCode}\n${trailCopy}`;
  assert.doesNotMatch(visibleCopy, /YouTube video loads only/i);
  assert.doesNotMatch(visibleCopy, /Original story artwork/i);
  assert.doesNotMatch(visibleCopy, /TBD ORIGINAL VISUAL/i);
  assert.doesNotMatch(visibleCopy, /fictional trail theatre/i);
  assert.doesNotMatch(visibleCopy, /third-party CAPTCHA/i);
  assert.doesNotMatch(visibleCopy, /Presentation only/i);
});

test("the console renders one chronological growing trail stream", async () => {
  const engine = await readFile(join(root, "js", "trail-engine.js"), "utf8");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  assert.match(engine, /trail-stream/);
  assert.match(engine, /trail-entry-complete/);
  assert.match(engine, /candidate\.order < scene\.order/);
  assert.match(app, /engine\.scrollToScene\(scene\.id/);
  assert.doesNotMatch(app, /Replay scene/);
});
