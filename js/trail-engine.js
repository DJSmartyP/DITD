import { answerMatches, renderMachine, specialResponse } from "./machines.js?v=20261002-2";
import { renderMedia } from "./media.js?v=20260930-5";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class TrailEngine {
  constructor({ root, trail, manifest, store, onRender, onOpenTool, onCorrect }) {
    this.root = root;
    this.trail = trail;
    this.manifest = manifest;
    this.store = store;
    this.onRender = onRender;
    this.onOpenTool = onOpenTool;
    this.onCorrect = onCorrect;
    this.sceneById = new Map(trail.scenes.map((scene) => [scene.id, scene]));
    this.feedback = null;
    this.pendingFeedback = null;
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
      if (!stay && next) {
        state.currentSceneId = next.id;
        if (next.completeOnEntry && !state.completedSceneIds.includes(next.id)) {
          state.completedSceneIds.push(next.id);
        }
      }
    });
  }

  setFeedback(message, kind = "error", sceneId = this.currentScene().id) {
    this.pendingFeedback = { message, kind, sceneId };
    if (!this.feedback) return;
    this.feedback.textContent = message;
    this.feedback.dataset.kind = kind;
    this.feedback.hidden = false;
    this.feedback.focus();
  }

  submit(scene, value, input, terminalScreen) {
    input?.removeAttribute("aria-invalid");
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
      input?.setAttribute("aria-invalid", "true");
      if (terminalScreen) {
        const line = el("p", "terminal-error", `ERROR: ${message}`);
        terminalScreen.append(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
      }
      input?.focus();
      return;
    }

    this.pendingFeedback = { sceneId: scene.id, message: scene.success, kind: "success" };
    this.complete(scene, { stay: true });
    this.render(scene.id);
    this.scrollToScene(scene.id, { focus: true });
    this.onCorrect?.({ scene, message: scene.success, revealMedia: this.unlocksMediaOnSuccess(scene) });
  }

  submitInline(scene, target, value, input, terminalScreen) {
    input?.removeAttribute("aria-invalid");
    const special = specialResponse(target, value);
    this.store.update((state) => {
      state.attemptCounts[target.id] = Number(state.attemptCounts[target.id] || 0) + 1;
    });

    if (special) {
      this.setFeedback(special, normalizeSpecialKind(target, value));
      input?.focus();
      return;
    }

    if (!answerMatches(value, target.validation)) {
      const attempts = this.store.get().attemptCounts[target.id] || 1;
      const responses = target.wrongResponses || ["That does not seem to work."];
      const message = responses[(attempts - 1) % responses.length];
      this.setFeedback(message, "error");
      input?.setAttribute("aria-invalid", "true");
      if (terminalScreen) {
        const line = el("p", "terminal-error", `ERROR: ${message}`);
        terminalScreen.append(line);
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
      }
      input?.focus();
      return;
    }

    this.pendingFeedback = { sceneId: scene.id, message: target.success, kind: "success" };
    this.store.update((state) => {
      [scene.id, target.id].forEach((id) => {
        if (!state.completedSceneIds.includes(id)) state.completedSceneIds.push(id);
      });
      state.phase = target.phase || state.phase;
    });
    this.feedback = null;
    this.render(scene.id);
    this.scrollToScene(scene.id, { focus: true });
    this.onCorrect?.({ scene, message: target.success, revealMedia: false });
  }

  advance(scene) {
    this.pendingFeedback = null;
    if (!this.store.get().completedSceneIds.includes(scene.id)) this.complete(scene, { stay: false });
    else if (scene.next) {
      const next = this.sceneById.get(scene.next);
      this.store.update((state) => {
        state.currentSceneId = scene.next;
        state.phase = next?.phase || state.phase;
        if (next?.completeOnEntry && !state.completedSceneIds.includes(next.id)) {
          state.completedSceneIds.push(next.id);
        }
      });
    }
    this.feedback = null;
    this.render();
    this.scrollToScene(this.store.get().currentSceneId, { focus: true });
  }

  mediaShouldShow(scene, solved, replay) {
    if (!scene.mediaId) return false;
    if (scene.mediaAfterSolve && !solved && !replay) return false;
    if (replay || solved || scene.showMediaBeforeSolve) return true;
    return ["story", "investigation", "jonagraph", "document-terminal", "document-locked", "terminal", "restore", "reward"].includes(scene.mode);
  }

  unlocksMediaOnSuccess(scene) {
    return Boolean(scene.mediaId
      && !this.mediaShouldShow(scene, false, false)
      && this.mediaShouldShow(scene, true, false));
  }

  appendSceneHeadingAndCopy(container, scene, { completed = false } = {}) {
    const header = el("header", "scene-header");
    header.append(
      el("h2", "", scene.title),
      el("span", "scene-mode", scene.modeLabel || scene.mode.replaceAll("-", " "))
    );
    container.append(header);

    const copy = el("div", "story-copy");
    (scene.body || []).forEach((paragraph, index) => {
      const p = el("p", index === 0 ? "speaker-line" : "", paragraph);
      if (index === 0) {
        const livePrefix = scene.transmissionLabel ? `${scene.transmissionLabel} // ` : "";
        p.prepend(el("span", "speaker-label", `${livePrefix}${scene.speaker || "TRAIL CONSOLE"}`));
        if (scene.transmissionLabel) p.classList.add("speaker-line-live");
      }
      if (/^TBD|\[TBD/i.test(paragraph)) p.classList.add("tbd-copy");
      copy.append(p);
    });
    container.append(copy);
  }

  appendSceneMedia(container, scene, { locked = false } = {}) {
    const mediaLayout = el("div", "scene-media-layout");
    if (scene.mediaId) {
      const media = renderMedia(this.manifest.items[scene.mediaId], { locked });
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

    if (mediaLayout.childElementCount) container.append(mediaLayout);
    if (scene.ticketMediaId) {
      const tickets = renderMedia(this.manifest.items[scene.ticketMediaId]);
      if (tickets) container.append(tickets);
    }
  }

  renderCompletedScene(scene) {
    const section = el("section", "trail-entry trail-entry-complete");
    if (scene.retainWithNext) section.classList.add("trail-entry-retain");
    section.id = `trail-scene-${scene.id}`;
    section.setAttribute("aria-label", `Completed trail section: ${scene.title}`);
    this.appendSceneHeadingAndCopy(section, scene, { completed: true });
    const remainsLocked = scene.mode === "document-locked"
      && !this.store.get().completedSceneIds.includes(scene.next);
    this.appendSceneMedia(section, scene, { locked: remainsLocked });
    if (["system-log", "private-channel", "diagnostic"].includes(scene.mode)) {
      const machine = renderMachine(scene, { onSubmit: () => {}, onComplete: () => {} });
      if (machine) section.append(machine);
    }
    return section;
  }

  scrollToScene(sceneId, { focus = false } = {}) {
    const section = document.getElementById(`trail-scene-${sceneId}`);
    if (!section) return;
    section.scrollIntoView({ behavior: "auto", block: "start" });
    if (focus) {
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    }
  }

  scrollToMedia(sceneId, { focus = false } = {}) {
    const section = document.getElementById(`trail-scene-${sceneId}`);
    const target = section?.querySelector(".scene-media-layout") || section;
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "start" });
    if (focus) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
    }
  }

  render(sceneId = null, { replay = false } = {}) {
    const scene = this.sceneById.get(sceneId || this.store.get().currentSceneId) || this.trail.scenes[0];
    const state = this.store.get();
    const solved = state.completedSceneIds.includes(scene.id);
    const inlineMachineScene = scene.inlineMachineSceneId ? this.sceneById.get(scene.inlineMachineSceneId) : null;
    const inlineMachineSolved = inlineMachineScene ? state.completedSceneIds.includes(inlineMachineScene.id) : false;
    this.replaySceneId = replay ? scene.id : null;
    this.root.replaceChildren();
    const stream = el("div", "trail-stream");
    this.root.append(stream);
    this.trail.scenes
      .filter((candidate) => candidate.order < scene.order && state.completedSceneIds.includes(candidate.id))
      .forEach((candidate) => stream.append(this.renderCompletedScene(candidate)));

    const currentRoot = el("section", "trail-entry trail-entry-current");
    currentRoot.id = `trail-scene-${scene.id}`;
    currentRoot.setAttribute("aria-label", `Current trail section: ${scene.title}`);
    currentRoot.setAttribute("aria-live", "polite");
    stream.append(currentRoot);
    const mediaVisible = this.mediaShouldShow(scene, solved, replay);
    if (scene.mediaFirst && mediaVisible) {
      this.appendSceneMedia(currentRoot, scene, { locked: scene.mode === "document-locked" });
    }
    if (!scene.openingVideoOnly) this.appendSceneHeadingAndCopy(currentRoot, scene);

    const mountFeedback = () => {
      this.feedback = el("p", "feedback", "");
      this.feedback.hidden = true;
      this.feedback.tabIndex = -1;
      this.feedback.setAttribute("role", "status");
      currentRoot.append(this.feedback);
    };
    if (!scene.mediaFirst && mediaVisible) {
      this.appendSceneMedia(currentRoot, scene, { locked: scene.mode === "document-locked" });
    }

    if (replay) {
      const notice = el("p", "feedback", "History replay is read-only. Your current scene has not changed.");
      notice.dataset.kind = "success";
      const actions = el("div", "scene-actions");
      const back = el("button", "primary-button", "Return to current scene");
      back.type = "button";
      back.addEventListener("click", () => {
        this.render();
        this.scrollToScene(this.currentScene().id, { focus: true });
      });
      actions.append(back);
      currentRoot.append(notice, actions);
      this.onRender?.(scene, { replay: true });
      return;
    }

    if (inlineMachineScene && !inlineMachineSolved) {
      const machine = renderMachine(inlineMachineScene, {
        onSubmit: (value, input, screen) => this.submitInline(scene, inlineMachineScene, value, input, screen),
        onComplete: () => {}
      });
      if (machine) currentRoot.append(machine);
    } else if (!solved) {
      const machine = renderMachine(scene, {
        onSubmit: (value, input, screen) => this.submit(scene, value, input, screen),
        onComplete: () => {
          this.complete(scene, { stay: true });
          this.render(scene.id);
          this.scrollToScene(scene.id, { focus: true });
        }
      });
      if (machine) currentRoot.append(machine);
    } else if (scene.mode === "reward") {
      const machine = renderMachine(scene, { onSubmit: () => {}, onComplete: () => {} });
      if (machine) currentRoot.append(machine);
    }

    mountFeedback();

    if (this.pendingFeedback?.sceneId === scene.id) {
      this.setFeedback(this.pendingFeedback.message, this.pendingFeedback.kind, scene.id);
    }

    const actions = el("div", "scene-actions");
    if (scene.mode === "investigation" && scene.validation?.type === "evidence" && !solved) {
      const collect = el("button", "primary-button", scene.cta || "Collect evidence");
      collect.type = "button";
      collect.addEventListener("click", () => {
        this.complete(scene, { stay: true });
        this.render(scene.id);
        this.scrollToScene(scene.id, { focus: true });
      });
      actions.append(collect);
    } else if (!scene.validation && (!inlineMachineScene || inlineMachineSolved) && scene.mode !== "restore" && scene.mode !== "reward") {
      const next = el("button", "primary-button", scene.cta || "Continue");
      next.type = "button";
      if (inlineMachineScene && inlineMachineSolved && !scene.cta) {
        next.textContent = `Continue: ${this.sceneById.get(scene.next)?.title || "next section"}`;
      }
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
        this.scrollToScene(scene.id, { focus: true });
      });
      actions.append(finish);
    } else if (scene.mode === "reward" && solved) {
      actions.append(el("p", "feedback", "TRAIL COMPLETE - booking confirmed and progress saved on this device."));
    }
    if (actions.childElementCount) currentRoot.append(actions);
    this.onRender?.(scene, { replay: false });
  }
}

function normalizeSpecialKind(scene, value) {
  if (scene.id === "corrupted-ridge-map" && String(value).toUpperCase().replace(/\W/g, "") === "8HO") return "info";
  return "error";
}
