import { answerMatches, renderMachine, specialResponse } from "./machines.js?v=20261003-3";
import { renderMedia } from "./media.js?v=20261003-7";
import { formatTrailTime, timerElapsedMs } from "./timer.js?v=20261002-1";
import { generateTicketClass } from "./state.js?v=20261003-4";

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
      this.applyTimerTransition(state, scene, next);
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

  applyTimerTransition(state, scene, next) {
    if (state.timerMode === "timed" && scene.id === this.trail.startSceneId && !state.timerStartedAt) {
      state.timerStartedAt = new Date().toISOString();
    }
    if (state.timerMode === "timed" && next?.mode === "reward" && state.timerStartedAt && !state.timerFinishedAt) {
      state.timerFinishedAt = new Date().toISOString();
    }
    if (next?.mode === "reward" && state.timerMode !== "timed" && !state.playerClass) {
      state.playerClass = generateTicketClass();
    }
  }

  completionTimeLabel() {
    return formatTrailTime(timerElapsedMs(this.store.get()));
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
        this.applyTimerTransition(state, scene, next);
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

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alreadySolved = this.store.get().completedSceneIds.includes(scene.id);
    const shouldType = Boolean(scene.typewriterTransmission && !completed && !alreadySolved && scene.body?.length && !reducedMotion);
    const copy = el("div", `story-copy${scene.typewriterTransmission && scene.transmissionTone !== "green" ? " story-copy-live-transmission" : ""}${scene.transmissionTone === "green" ? " story-copy-transmission-green" : ""}`);
    if (scene.speaker?.toLowerCase().includes("jonabot")) copy.dataset.voice = "jonabot";
    const typedParagraphs = [];
    (scene.body || []).forEach((paragraph, index) => {
      const p = el("p", index === 0 ? "speaker-line" : "", shouldType ? "" : paragraph);
      if (index === 0) {
        const livePrefix = scene.transmissionLabel ? `${scene.transmissionLabel} // ` : "";
        p.prepend(el("span", "speaker-label", `${livePrefix}${scene.speaker || "TRAIL CONSOLE"}`));
        if (scene.transmissionLabel) p.classList.add("speaker-line-live");
      }
      if (/^TBD|\[TBD/i.test(paragraph)) p.classList.add("tbd-copy");
      if (shouldType) {
        p.setAttribute("aria-hidden", "true");
        const textNode = document.createTextNode("");
        p.append(textNode);
        typedParagraphs.push({ paragraph, p, textNode });
      }
      copy.append(p);
    });
    if (shouldType) {
      const accessibleMessage = el("span", "sr-only", `${scene.transmissionLabel || "Incoming message"} ${scene.speaker}: ${scene.body.join(" ")}`);
      accessibleMessage.setAttribute("role", "status");
      copy.append(accessibleMessage);
      container.classList.add("scene-transmission-typing");
      const cursor = el("span", "channel-typing-cursor", "");
      cursor.setAttribute("aria-hidden", "true");
      typedParagraphs[0].p.append(cursor);
      let paragraphIndex = 0;
      let characterIndex = 0;
      const typeNextCharacter = () => {
        const current = typedParagraphs[paragraphIndex];
        characterIndex += 1;
        current.textNode.data = current.paragraph.slice(0, characterIndex);
        if (characterIndex < current.paragraph.length) {
          window.setTimeout(typeNextCharacter, 24);
          return;
        }
        if (paragraphIndex < typedParagraphs.length - 1) {
          paragraphIndex += 1;
          characterIndex = 0;
          typedParagraphs[paragraphIndex].p.append(cursor);
          window.setTimeout(typeNextCharacter, 280);
          return;
        }
        cursor.remove();
        container.classList.add("scene-transmission-hold");
        window.setTimeout(() => {
          container.classList.remove("scene-transmission-typing", "scene-transmission-hold");
          container.classList.add("scene-transmission-ready");
        }, 1250);
      };
      window.setTimeout(typeNextCharacter, 350);
    } else if (scene.typewriterTransmission) {
      container.classList.add("scene-transmission-ready");
    }
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
      scene.referenceMediaIds.forEach((id) => {
        const reference = renderMedia(this.manifest.items[id]);
        if (reference) referenceBody.append(reference);
      });
      references.append(referenceBody);
      mediaLayout.append(references);
    }

    if (mediaLayout.childElementCount) container.append(mediaLayout);
    if (scene.ticketMediaId) {
      const tickets = renderMedia(this.manifest.items[scene.ticketMediaId], {
        playerName: this.store.get().playerName,
        playerClass: this.store.get().playerClass,
        completionTimeLabel: this.completionTimeLabel()
      });
      if (tickets) container.append(tickets);
    }
  }

  renderCompletedScene(scene) {
    const section = el("section", "trail-entry trail-entry-complete");
    if (scene.typewriterTransmission) section.classList.add("scene-live-transmission");
    if (scene.retainWithNext) section.classList.add("trail-entry-retain");
    section.id = `trail-scene-${scene.id}`;
    section.setAttribute("aria-label", `Completed trail section: ${scene.title}`);
    this.appendSceneHeadingAndCopy(section, scene, { completed: true });
    const remainsLocked = scene.mode === "document-locked"
      && !this.store.get().completedSceneIds.includes(scene.next);
    this.appendSceneMedia(section, scene, { locked: remainsLocked });
    if (["system-log", "private-channel", "diagnostic"].includes(scene.mode)) {
      const machine = renderMachine(scene, { onSubmit: () => {}, onComplete: () => {}, animate: false });
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
    if (scene.mode === "reward" && this.store.get().timerMode !== "timed" && !this.store.get().playerClass) {
      this.store.update((currentState) => { currentState.playerClass = generateTicketClass(); });
    }
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
    if (scene.mode === "diagnostic" && !solved) currentRoot.classList.add("diagnostic-loading");
    if (scene.typewriterTransmission) currentRoot.classList.add("scene-live-transmission");
    currentRoot.id = `trail-scene-${scene.id}`;
    currentRoot.setAttribute("aria-label", `Current trail section: ${scene.title}`);
    currentRoot.setAttribute("aria-live", "polite");
    stream.append(currentRoot);
    const mediaVisible = this.mediaShouldShow(scene, solved, replay);
    if (scene.mediaFirst && mediaVisible) {
      this.appendSceneMedia(currentRoot, scene, { locked: scene.mode === "document-locked" });
    }
    if (!scene.openingVideoOnly) this.appendSceneHeadingAndCopy(currentRoot, scene, { completed: replay });

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
        },
        onScanComplete: () => currentRoot.classList.remove("diagnostic-loading")
      });
      if (machine) currentRoot.append(machine);
    } else if (scene.mode === "reward") {
      const machine = renderMachine(scene, { onSubmit: () => {}, onComplete: () => {}, animate: false, completionTimeLabel: this.completionTimeLabel() });
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
