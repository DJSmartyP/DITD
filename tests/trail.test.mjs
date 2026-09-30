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

test("scene titles are themed without exposing later twists", () => {
  assert.deepEqual(trail.scenes.map((scene) => scene.title), [
    "Incoming Transmission",
    "Notices from Beyond the Ridge",
    "Find the Frequency",
    "A Place by the Sea",
    "The Map That Shouldn't Be",
    "Incoming Jonagraph",
    "A Booking Gone Wrong",
    "Strange Activity",
    "The Archived Signal",
    "Transmission Interrupted",
    "A Licence from Another Age",
    "Signal Test",
    "Administrator Message",
    "Local Diagnostic",
    "The Way Out?",
    "Private Frequency",
    "Restricted Attachment",
    "Administrator Calling",
    "In Case of Emergency",
    "Backup in Progress",
    "Boot Sequence",
    "An Old Booking",
    "Cleared for Departure"
  ]);
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

test("each puzzle uses a nudge, stronger nudge, then explicit answer", async () => {
  const hintedIds = [
    "noticeboard",
    "jonavision-207",
    "bodach-bay",
    "corrupted-ridge-map",
    "repair-jonatravel",
    "videomatic-4763",
    "activation-centre",
    "test-videomatic",
    "fake-cancel-plan",
    "jonabot-taunt",
    "recovery-console"
  ];
  for (const id of hintedIds) {
    const scene = trail.scenes.find((candidate) => candidate.id === id);
    assert.equal(scene.hints.length, 3, `${id} has a three-stage hint ladder`);
  }

  const machineCode = await readFile(join(root, "js", "machines.js"), "utf8");
  assert.match(machineCode, /destination's area number/);
  assert.match(machineCode, /\[PLACE NUMBER\] \+ \[CONTACT INITIALS\]/);
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

test("the Field Kit is removed while references remain inline with their puzzles", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  const css = await readFile(join(root, "css", "main.css"), "utf8");
  assert.doesNotMatch(html, /Field Kit|field-kit|panel-field-kit|data-mobile-tool="field-kit"/i);
  assert.doesNotMatch(app, /renderEvidenceList|field-kit/i);
  assert.doesNotMatch(css, /evidence-card|pinned-evidence/i);
  assert.match(html, /data-tool="notes"/);
  assert.match(html, /data-tool="hints"/);
  assert.match(html, /data-tool="history"/);
});

test("corruption begins with the reveal, escalates by scene and clears on reset", async () => {
  const signalTest = trail.scenes.find((scene) => scene.id === "test-videomatic");
  const reveal = trail.scenes.find((scene) => scene.id === "jonabot-reveal");
  const restore = trail.scenes.find((scene) => scene.id === "restore");
  const rebooted = trail.scenes.find((scene) => scene.id === "factory-jonabot");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  const css = await readFile(join(root, "css", "corruption.css"), "utf8");
  assert.equal(signalTest.phase, "uneasy");
  assert.equal(reveal.phase, "corrupted");
  assert.equal(restore.phase, "corrupted");
  assert.equal(rebooted.phase, "restored");
  assert.match(app, /Math\.max\(1, Math\.min\(9, scene\.order - 10\)\)/);
  assert.match(app, /removeProperty\("--corruption-level"\)/);
  assert.match(css, /var\(--corruption-level\)/);
  assert.match(css, /data-corruption-level="9"/);
  assert.doesNotMatch(css, /data-phase="restored"/);
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

test("the restore video is the restoration event, without a duplicate progress machine", () => {
  const restore = trail.scenes.find((scene) => scene.id === "restore");
  assert.equal(restore.mode, "story");
  assert.equal(restore.mediaId, "restore-finale");
  assert.equal(restore.mediaAfterSolve, undefined);
  assert.equal(restore.restoreBeats, undefined);
  assert.equal(restore.cta, "Reboot Jonabot");
});

test("the manual password puzzle sends players to the Discord trail-notes PDFs", () => {
  const channel = trail.scenes.find((scene) => scene.id === "behind-the-scenes");
  const puzzle = trail.scenes.find((scene) => scene.id === "jonabot-taunt");
  const protectedGuide = manifest.items["jonabot-operator-manual-protected"];
  assert.ok(channel.messages.some((message) => message.text.includes("#trail-notes")));
  assert.equal(channel.messages.some((message) => message.links?.some((link) => link.href === protectedGuide.src)), false);
  assert.ok(channel.messages.some((message) => message.links?.some((link) => link.href === "https://discord.com/channels/1036657633907703899/1198249965739331635")));
  assert.ok(puzzle.body.some((paragraph) => paragraph.includes("#trail-notes")));
  assert.ok(puzzle.body.some((paragraph) => paragraph.includes("PDFs uploaded there")));
  assert.equal(puzzle.validation.answer, "4216");
  assert.equal(protectedGuide.sourceLink, false);
  assert.equal(puzzle.modeLabel, "LIVE MESSAGE");
  assert.equal(puzzle.transmissionLabel, "LIVE NOW");
  assert.equal(puzzle.speaker, "Administrator: Jonabot");
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
    for (const previewPage of item.previewPages || []) {
      assert.match(previewPage, /^\.\/assets\/documents\/previews\/[\w/-]+\.png$/, `${id} local preview page`);
      await access(join(root, previewPage.slice(2)));
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

test("the final reward includes tickets and shows the credits video with the written credits", () => {
  const finalCall = trail.scenes.find((scene) => scene.id === "bodach-bay-booking");
  const finale = trail.scenes.find((scene) => scene.id === "trail-complete");
  const tickets = manifest.items[finale.ticketMediaId];
  assert.equal(finalCall.mediaId, "final-jonana-peel");
  assert.equal(finalCall.next, finale.id);
  assert.equal(finale.completeOnEntry, true);
  assert.equal(finale.mediaId, "post-trail-credits");
  assert.ok(finale.credits?.length > 0);
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
  const app = await readFile(join(root, "js", "app.js"), "utf8");
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
  assert.doesNotMatch(html, /id="stage-label"/);
  assert.match(html, /id="desktop-reset"/);
  assert.match(html, /id="success-dialog"/);
  assert.match(html, /id="success-continue"/);
  assert.doesNotMatch(html, /id="success-stay"|>Stay here</);
  assert.doesNotMatch(html, /id="menu-button"|>Console menu</);
  assert.match(app, /\$\("#desktop-reset"\)\.addEventListener\("click", confirmReset\)/);
  assert.match(app, /cache:\s*"no-store"/);
});

test("mobile welcome and landscape console use compact responsive layouts", async () => {
  const html = await readFile(join(root, "index.html"), "utf8");
  const css = await readFile(join(root, "css", "main.css"), "utf8");
  const machines = await readFile(join(root, "css", "machines.css"), "utf8");
  assert.match(css, /min-height:\s*min\(94dvh, 50rem\)/);
  assert.match(css, /@media \(min-width: 700px\) and \(orientation: landscape\), \(min-width: 980px\)/);
  assert.match(css, /grid-template-columns:\s*clamp\(150px, 17vw, 220px\) minmax\(0, 1fr\) clamp\(220px, 25vw, 300px\)/);
  assert.match(css, /trail-entry-complete:is\(:not\(\.trail-entry-retain\)/);
  assert.match(css, /padding-bottom:\s*max\(2rem, calc\(100dvh - 24rem\)\)/);
  assert.match(machines, /orientation: landscape/);
  assert.equal((html.match(/data-mobile-tool=/g) || []).length, 3);
  assert.deepEqual(
    trail.scenes.filter((scene) => scene.retainWithNext).map((scene) => scene.id),
    ["jonavision-207", "system-log", "bodach-bay-booking"]
  );
});

test("answer feedback appears only after submission and has distinct result states", async () => {
  const engine = await readFile(join(root, "js", "trail-engine.js"), "utf8");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  const css = await readFile(join(root, "css", "main.css"), "utf8");
  assert.match(engine, /pendingFeedback = \{ sceneId: scene\.id, message: scene\.success, kind: "success" \}/);
  assert.match(engine, /pendingFeedback\?\.sceneId === scene\.id/);
  assert.doesNotMatch(engine, /if \(solved && scene\.success\)/);
  assert.match(engine, /aria-invalid/);
  assert.match(css, /CORRECT — SYSTEM ACCEPTED/);
  assert.match(css, /NOT ACCEPTED — TRY AGAIN/);
  assert.match(css, /feedback\[data-kind="info"\]/);
  assert.match(engine, /pendingFeedback = \{ sceneId: scene\.id, message: target\.success, kind: "success" \}/);
  assert.doesNotMatch(engine, /state\.currentSceneId = target\.id/);
  assert.match(engine, /Continue: \$\{this\.sceneById\.get\(scene\.next\)\?\.title/);
  assert.match(engine, /message: scene\.success, revealMedia: this\.unlocksMediaOnSuccess\(scene\)/);
  assert.match(engine, /message: target\.success, revealMedia: false/);
  assert.match(engine, /unlocksMediaOnSuccess\(scene\)/);
  assert.match(engine, /scrollToMedia\(sceneId/);
  assert.match(engine, /scrollIntoView\(\{ behavior: "auto", block: "start" \}\)/);
  assert.match(app, /onCorrect: openSuccessDialog/);
  assert.match(app, /if \(result\.revealMedia\) engine\.scrollToMedia\(result\.scene\.id/);
  assert.match(app, /else engine\.advance\(result\.scene\)/);
  assert.match(app, /event\.preventDefault\(\)/);
});

test("every answer-controlled media beat is routed through Continue before a later prompt", () => {
  const visibleBeforeSolveModes = new Set(["story", "investigation", "jonagraph", "document-terminal", "document-locked", "terminal", "restore", "reward"]);
  const lockedMediaScenes = trail.scenes
    .filter((scene) => scene.validation && scene.mediaId && !scene.showMediaBeforeSolve && !visibleBeforeSolveModes.has(scene.mode))
    .map((scene) => scene.id);
  assert.deepEqual(lockedMediaScenes, [
    "jonavision-207",
    "videomatic-4763",
    "activation-centre",
    "test-videomatic",
    "fake-cancel-plan"
  ]);
  const inlineTargets = trail.scenes.map((scene) => scene.inlineMachineSceneId).filter(Boolean);
  assert.deepEqual(inlineTargets, ["jonavision-207"]);
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
  assert.doesNotMatch(visibleCopy, /inline document viewer is unavailable/i);
});

test("correct answers receive clear in-world confirmations", () => {
  for (const scene of trail.scenes.filter((candidate) => candidate.validation)) {
    assert.match(scene.success, /(?:ACCEPTED|ACQUIRED|CONFIRMED|CONNECTED|FOUND|READY|RESTORED|VERIFIED|LOCKED)/, `${scene.id} confirmation`);
  }
});

test("the console renders one chronological growing trail stream", async () => {
  const engine = await readFile(join(root, "js", "trail-engine.js"), "utf8");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  assert.match(engine, /trail-stream/);
  assert.match(engine, /trail-entry-complete/);
  assert.match(engine, /candidate\.order < scene\.order/);
  assert.match(app, /engine\.scrollToScene\(scene\.id/);
  assert.match(app, /engine\.render\(scene\.id, \{ replay: true \}\)/);
  assert.match(app, /Open full replay/);
  assert.doesNotMatch(app, /Replay scene/);
});

test("corrupted diagnostic replaces repeated video dialogue and keeps the counter-command in player memory", async () => {
  const machines = await readFile(join(root, "js", "machines.js"), "utf8");
  const engine = await readFile(join(root, "js", "trail-engine.js"), "utf8");
  const app = await readFile(join(root, "js", "app.js"), "utf8");
  const hints = await readFile(join(root, "js", "hints.js"), "utf8");
  const mainCss = await readFile(join(root, "css", "main.css"), "utf8");
  const diagnostic = trail.scenes.find((scene) => scene.id === "no-more-trails");
  const trap = trail.scenes.find((scene) => scene.id === "fake-cancel-plan");
  const privateFrequency = trail.scenes.find((scene) => scene.id === "behind-the-scenes");
  assert.deepEqual(diagnostic.body, []);
  assert.deepEqual(privateFrequency.body, []);
  assert.match(machines, /Threat scan complete/);
  assert.match(machines, /Next JonAssist request/);
  assert.match(machines, /Manual counter-command required/);
  assert.doesNotMatch(trap.body.join(" "), /cancel-plan/i);
  assert.doesNotMatch(machines.match(/COUNTER-COMMAND ACCESS GRANTED[\s\S]*?Awaiting instruction/)?.[0] || "", /cancel-plan/i);
  assert.equal(trap.hints.at(-1).includes("cancel-plan"), true);
  assert.match(machines, /PRIVATE FREQUENCY INTERCEPT/);
  for (const moderator of ["smarty", "neven", "arty", "gray"]) {
    assert.match(mainCss, new RegExp(`\\.channel-message--${moderator}`));
  }
  assert.doesNotMatch(engine, /scene-number|SCENE \$\{/);
  assert.doesNotMatch(app, /padStart\(2, "0"\)/);
  assert.doesNotMatch(hints, /padStart\(2, "0"\)/);
});

test("the welcome page hands off to the opening video, then Start trail loads the first message", async () => {
  const intro = trail.scenes.find((scene) => scene.id === trail.startSceneId);
  const firstTask = trail.scenes.find((scene) => scene.id === intro.next);
  const engine = await readFile(join(root, "js", "trail-engine.js"), "utf8");
  assert.equal(intro.mediaId, "intro");
  assert.equal(intro.mediaFirst, true);
  assert.equal(intro.openingVideoOnly, true);
  assert.deepEqual(intro.body, []);
  assert.equal(intro.cta, "Start trail");
  assert.equal(intro.next, "noticeboard");
  assert.equal(firstTask.speaker, "Task");
  assert.match(firstTask.body[0], /^Over the last 18 months towns over the Ridge/);
  assert.equal(firstTask.body[1], "Where can you find out more about the bayside town over the Ridge?");
  assert.doesNotMatch(firstTask.body.join(" "), /Jonavision tuner|channel 207|Bodach Bay/);
  assert.match(engine, /if \(scene\.mediaFirst && mediaVisible\)/);
  assert.match(engine, /if \(!scene\.mediaFirst && mediaVisible\)/);
  assert.match(engine, /if \(!scene\.openingVideoOnly\) this\.appendSceneHeadingAndCopy/);
});
