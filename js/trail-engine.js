import { answerMatches, renderMachine, specialResponse } from "./machines.js";
import { renderMedia } from "./media.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class TrailEngine {
  constructor({ root, trail, manifest, store, onRender, onOpenTool }) {
    this.root = root;
    this.trail = trail;
    this.manifest = manifest;
    this.store = store;
    this.onRender = onRender;
    this.onOpenTool = onOpenTool;
    this.sceneById = new Map(trail.scenes.map((scene) => [scene.id, scene]));
    this.feedback = null;
    this.replaySceneId = null;
  }

  currentScene() {
    return this.sceneById.get(this.store.get().currentSceneId) || this.trail.scenes[0];
  }

  complete(scene, { stay = false } = {}) {
    const next = scene.next ? this.sceneById.get(scene.next) : null;
    this.store.update((state) => {
      if (!state.completedSceneIds.includes(scene.id)) state.completedSceneIds.push(scene.id);
      state.phase = next?.phase || scene.phase;
      if (!stay && next) state.currentSceneId = next.id;
    });
  }

  setFeedback(message, kind = "error") {
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.dataset.kind = kind;
    this.feedback.hidden = false;
    this.feedback.focus({ preventScroll: true });
  }

  submit(scene, value, input, terminalScreen) {
    const special = specialResponse(scene, value);
    this.store.update((state) => {
      state.attemptCounts[scene.id] = Number(state.attemptCounts[scene.id] || 0) + 1;
    });

    if (special) {
      this.setFeedback(special, normalizeSpecialKind(scene, value));
      input?.focus();
      return;
    }

    if (!answerMatches(value, scene.validation)) {
      const attempts = this.store.get().attemptCounts[scene.id] || 1;
      const responses = scene.wrongResponses || ["That does not seem to work."];
      const message = responses[(attempts - 1) % responses.length];
      this.setFeedback(message, "error");
      if (terminalScreen) {
        const line = el("p", "terminal-error", `ERROR: ${message}`);
        terminalScreen.append(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
      }
      input?.focus();
      return;
    }

    this.complete(scene, { stay: true });
    this.render(scene.id);
  }

  advance(scene) {
    if (!this.store.get().completedSceneIds.includes(scene.id)) this.complete(scene, { stay: false });
    else if (scene.next) {
      const next = this.sceneById.get(scene.next);
      this.store.update((state) => {
        state.currentSceneId = scene.next;
        state.phase = next?.phase || state.phase;
      });
    }
    this.feedback = null;
    this.render();
    document.querySelector("#workspace")?.focus({ preventScroll: false });
  }

  mediaShouldShow(scene, solved, replay) {
    if (!scene.mediaId) return false;
    if (replay || solved || scene.showMediaBeforeSolve) return true;
    return ["story", "investigation", "jonagraph", "document-terminal", "document-locked", "terminal", "restore", "reward"].includes(scene.mode);
  }

  render(sceneId = null, { replay = false } = {}) {
    const scene = this.sceneById.get(sceneId || this.store.get().currentSceneId) || this.trail.scenes[0];
    const state = this.store.get();
    const solved = state.completedSceneIds.includes(scene.id);
    this.replaySceneId = replay ? scene.id : null;
    this.root.replaceChildren();

    const header = el("header", "scene-header");
    header.append(
      el("p", "scene-number", `SCENE ${String(scene.order).padStart(2, "0")} / 22`),
      el("h2", "", scene.title),
      el("span", "scene-mode", scene.mode.replaceAll("-", " "))
    );
    this.root.append(header);

    const copy = el("div", "story-copy");
    (scene.body || []).forEach((paragraph, index) => {
      const p = el("p", index === 0 ? "speaker-line" : "", paragraph);
      if (index === 0) p.prepend(el("span", "speaker-label", scene.speaker || "TRAIL CONSOLE"));
      if (/^TBD|\[TBD/i.test(paragraph)) p.classList.add("tbd-copy");
      copy.append(p);
    });
    this.root.append(copy);

    const mediaLayout = el("div", "scene-media-layout");
    if (this.mediaShouldShow(scene, solved, replay)) {
      const item = this.manifest.items[scene.mediaId];
      const media = renderMedia(item, { locked: scene.mode === "document-locked" });
      if (media) mediaLayout.append(media);
    }

    if (scene.referenceMediaIds?.length) {
      const references = el("details", "reference-drawer");
      references.append(el("summary", "", "Open noticeboard reference"));
      const referenceBody = el("div", "reference-drawer-body");
      referenceBody.append(el("p", "reference-help", "This is the full noticeboard from earlier. Open its zoom viewer to inspect the Gremlins poster while solving the map."));
      scene.referenceMediaIds.forEach((id) => {
        const reference = renderMedia(this.manifest.items[id]);
        if (reference) referenceBody.append(reference);
      });
      references.append(referenceBody);
      mediaLayout.append(references);
    }

    if (mediaLayout.childElementCount) this.root.append(mediaLayout);

    if (scene.ticketMediaId) {
      const tickets = renderMedia(this.manifest.items[scene.ticketMediaId]);
      if (tickets) this.root.append(tickets);
    }

    if (replay) {
      const notice = el("p", "feedback", "History replay is read-only. Your current scene has not changed.");
      notice.dataset.kind = "success";
      const actions = el("div", "scene-actions");
      const back = el("button", "primary-button", "Return to current scene");
      back.type = "button";
      back.addEventListener("click", () => this.render());
      actions.append(back);
      this.root.append(notice, actions);
      this.onRender?.(scene, { replay: true });
      return;
    }

    if (!solved) {
      const machine = renderMachine(scene, {
        onSubmit: (value, input, screen) => this.submit(scene, value, input, screen),
        onComplete: () => {
          this.complete(scene, { stay: true });
          this.render(scene.id);
        }
      });
      if (machine) this.root.append(machine);
    } else if (scene.mode === "reward") {
      const machine = renderMachine(scene, { onSubmit: () => {}, onComplete: () => {} });
      if (machine) this.root.append(machine);
    }

    this.feedback = el("p", "feedback", "");
    this.feedback.hidden = true;
    this.feedback.tabIndex = -1;
    this.feedback.setAttribute("role", "status");
    this.root.append(this.feedback);

    if (solved && scene.success) {
      this.setFeedback(scene.success, scene.validation?.intentionalFailure ? "error" : "success");
    }

    const actions = el("div", "scene-actions");
    if (scene.mode === "investigation" && scene.validation?.type === "evidence" && !solved) {
      const collect = el("button", "primary-button", scene.cta || "Collect evidence");
      collect.type = "button";
      collect.addEventListener("click", () => {
        this.complete(scene, { stay: true });
        this.render(scene.id);
      });
      actions.append(collect);
    } else if (!scene.validation && scene.mode !== "restore" && scene.mode !== "reward") {
      const next = el("button", "primary-button", scene.cta || "Continue");
      next.type = "button";
      next.addEventListener("click", () => this.advance(scene));
      actions.append(next);
    } else if (solved && scene.next) {
      const next = el("button", "primary-button", scene.cta || "Continue");
      next.type = "button";
      next.textContent = scene.validation?.intentionalFailure ? "Continue behind the scenes" : `Continue: ${this.sceneById.get(scene.next)?.title || "next scene"}`;
      next.addEventListener("click", () => this.advance(scene));
      actions.append(next);
    } else if (scene.mode === "reward" && !solved) {
      const finish = el("button", "primary-button", "Complete trail");
      finish.type = "button";
      finish.addEventListener("click", () => {
        this.complete(scene, { stay: true });
        this.render(scene.id);
      });
      actions.append(finish);
    } else if (scene.mode === "reward" && solved) {
      actions.append(el("p", "feedback", "TRAIL COMPLETE - booking confirmed and progress saved on this device."));
    }
    if (actions.childElementCount) this.root.append(actions);
    this.onRender?.(scene, { replay: false });
  }
}

function normalizeSpecialKind(scene, value) {
  if (scene.id === "corrupted-ridge-map" && String(value).toUpperCase().replace(/\W/g, "") === "8HO") return "success";
  return "error";
}
