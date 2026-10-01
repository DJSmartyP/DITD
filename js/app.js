import { createStateStore, STORAGE_KEY } from "./state.js";
import { TrailEngine } from "./trail-engine.js?v=20260930-12";
import { renderHints, revealNextHint } from "./hints.js";

const $ = (selector) => document.querySelector(selector);

async function loadJson(relativePath) {
  const response = await fetch(new URL(relativePath, import.meta.url), { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${relativePath}: ${response.status}`);
  return response.json();
}

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

function debounce(callback, delay = 350) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

try {
  const [trail, manifest] = await Promise.all([
    loadJson("../data/trail.json"),
    loadJson("../data/media-manifest.json")
  ]);
  const store = createStateStore(trail);
  const sceneById = new Map(trail.scenes.map((scene) => [scene.id, scene]));

  let activeTool = "hints";
  let hintSceneId = null;
  const toolRail = $("#tool-rail");
  const notes = $("#trail-notes");
  const welcomeDialog = $("#welcome-dialog");
  const menuDialog = $("#menu-dialog");
  const successDialog = $("#success-dialog");
  let pendingSuccess = null;
  let lastRenderedPhase = null;
  let phaseTransitionTimer = null;

  function setSuccessVariant(sceneId) {
    const variants = {
      "activation-centre": {
        name: "warning",
        eyebrow: "SECURITY LAYER REMOVED",
        signal: "!",
        title: "Administrative access granted"
      },
      "test-videomatic": {
        name: "takeover",
        eyebrow: "ACCESS CONTROL OVERRIDE",
        signal: "!",
        title: "Administrator connected"
      },
      "fake-cancel-plan": {
        name: "trap",
        eyebrow: "INPUT INTERCEPTED",
        signal: "×",
        title: "Jonabot was waiting"
      },
      "recovery-console": {
        name: "recovery",
        eyebrow: "RECOVERY ROUTE OPEN",
        signal: "↻",
        title: "Restore instruction accepted"
      }
    };
    const variant = variants[sceneId] || {
      name: "success",
      eyebrow: "ANSWER CONFIRMED",
      signal: "✓",
      title: "Signal accepted"
    };
    successDialog.dataset.variant = variant.name;
    successDialog.querySelector(".eyebrow").textContent = variant.eyebrow;
    successDialog.querySelector(".success-signal").textContent = variant.signal;
    setText("#success-title", variant.title);
  }

  function showPhaseTransition(previousPhase, phase) {
    document.body.classList.remove("phase-transition-uneasy", "phase-transition-corrupted", "phase-transition-restored");
    if (!previousPhase || previousPhase === phase) return;
    const className = phase === "corrupted"
      ? "phase-transition-corrupted"
      : phase === "restored"
        ? "phase-transition-restored"
        : phase === "uneasy"
          ? "phase-transition-uneasy"
          : "";
    if (!className) return;
    document.body.classList.add(className);
    clearTimeout(phaseTransitionTimer);
    phaseTransitionTimer = setTimeout(() => document.body.classList.remove(className), 1800);
  }

  function openSuccessDialog(result) {
    pendingSuccess = result;
    const { message, scene } = result;
    setSuccessVariant(scene.id);
    setText("#success-message", message);
    setText("#success-continue", "Continue");
    if (!successDialog.open) successDialog.showModal();
  }

  function selectTool(tool, { open = true } = {}) {
    if (!["notes", "hints", "history"].includes(tool)) return;
    activeTool = tool;
    document.querySelectorAll("[data-tool]").forEach((tab) => {
      const selected = tab.dataset.tool === tool;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".tool-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${tool}`;
    });
    if (open && matchMedia("(max-width: 979px)").matches) toolRail.dataset.open = "true";
    if (tool === "notes" && open) setTimeout(() => notes.focus(), 0);
  }

  function renderHistory() {
    const root = $("#history-list");
    root.replaceChildren();
    const completed = store.get().completedSceneIds
      .map((id) => sceneById.get(id))
      .filter(Boolean)
      .sort((a, b) => a.order - b.order);
    if (!completed.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Completed scenes will appear here. Replaying one never changes current progress.";
      root.append(empty);
      return;
    }
    completed.forEach((scene) => {
      const card = document.createElement("article");
      card.className = "history-card";
      const heading = document.createElement("h3");
      heading.textContent = scene.title;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Open full replay";
      button.addEventListener("click", () => {
        toolRail.dataset.open = "false";
        engine.render(scene.id, { replay: true });
        engine.scrollToScene(scene.id, { focus: true });
      });
      card.append(heading, button);
      root.append(card);
    });
  }

  function renderInterface(scene, { replay = false } = {}) {
    const state = store.get();
    const phase = state.phase || scene.phase;
    const effectScene = replay ? engine.currentScene() : scene;
    const previousPhase = lastRenderedPhase;
    document.body.dataset.phase = phase;
    document.body.dataset.currentScene = effectScene.id;
    if (phase === "uneasy") {
      const uneasyLevel = Math.max(1, Math.min(9, effectScene.order - 2));
      document.body.dataset.uneasyLevel = String(uneasyLevel);
      document.body.style.setProperty("--uneasy-level", String(uneasyLevel));
    } else {
      delete document.body.dataset.uneasyLevel;
      document.body.style.removeProperty("--uneasy-level");
    }
    if (phase === "corrupted") {
      const corruptionLevel = Math.max(1, Math.min(9, effectScene.order - 10));
      document.body.dataset.corruptionLevel = String(corruptionLevel);
      document.body.style.setProperty("--corruption-level", String(corruptionLevel));
    } else {
      delete document.body.dataset.corruptionLevel;
      document.body.style.removeProperty("--corruption-level");
    }
    showPhaseTransition(previousPhase, phase);
    lastRenderedPhase = phase;
    const labels = {
      normal: "SYSTEM: CLEAN",
      uneasy: "SYSTEM: UNSTABLE",
      corrupted: "ADMINISTRATOR: JONABOT",
      restored: "SYSTEM: RESTORED"
    };
    setText("#phase-label", labels[phase]);
    setText("#trail-progress", `${Math.round((state.completedSceneIds.length / trail.scenes.length) * 100)}%`);
    setText("#narrator-name", phase === "corrupted" ? "Administrator: Jonabot" : phase === "restored" ? "Jonabot (Dec 2023)" : "Jonabot v2.3");
    const uneasyLevel = Number(document.body.dataset.uneasyLevel || 0);
    const corruptionLevel = Number(document.body.dataset.corruptionLevel || 0);
    const uneasyStatus = uneasyLevel >= 9
      ? "External administrator signature detected."
      : uneasyLevel >= 7
        ? "Administrative safeguards failing."
        : uneasyLevel >= 5
          ? "Unauthorised access trace detected."
          : uneasyLevel >= 3
            ? "JonaTravel fault pattern spreading."
            : "Connected. Minor anomalies detected.";
    const corruptedStatus = corruptionLevel >= 9
      ? "Recovery collision detected. System integrity critical."
      : corruptionLevel >= 7
        ? "Access elevated. System integrity critical."
        : corruptionLevel >= 4
          ? "Access elevated. Interface corruption spreading."
          : "Access elevated. Temper deteriorating.";
    setText("#narrator-status", replay ? "Replaying a completed scene." : phase === "corrupted" ? corruptedStatus : phase === "restored" ? "Factory backup online. Incident not remembered." : phase === "uneasy" ? uneasyStatus : "Connected and standing by.");
    const hintScene = replay ? engine.currentScene() : scene;
    const hintSceneChanged = hintScene.id !== hintSceneId;
    renderHints({ scene: hintScene, store, listRoot: $("#hint-list"), countRoot: $("#hint-count"), button: $("#reveal-hint") });
    if (hintSceneChanged) {
      hintSceneId = hintScene.id;
      if (activeTool === "hints") toolRail.scrollTop = 0;
    }
    renderHistory();
  }

  const engine = new TrailEngine({
    root: $("#scene-root"),
    trail,
    manifest,
    store,
    onRender: renderInterface,
    onOpenTool: (tool) => selectTool(tool),
    onCorrect: openSuccessDialog
  });

  $("#success-continue").addEventListener("click", () => {
    const result = pendingSuccess;
    pendingSuccess = null;
    successDialog.close();
    if (!result) return;
    if (result.revealMedia) engine.scrollToMedia(result.scene.id, { focus: true });
    else engine.advance(result.scene);
  });
  successDialog.addEventListener("cancel", (event) => event.preventDefault());

  notes.value = store.get().notes;
  const saveNotes = debounce(() => {
    setText("#notes-status", "Saving…");
    store.update((state) => { state.notes = notes.value; });
    setText("#notes-status", "Saved locally");
  });
  notes.addEventListener("input", saveNotes);

  document.querySelectorAll("[data-tool]").forEach((tab) => {
    tab.addEventListener("click", () => selectTool(tab.dataset.tool, { open: false }));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const tools = ["notes", "hints", "history"];
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = tools[(tools.indexOf(activeTool) + delta + tools.length) % tools.length];
      selectTool(next, { open: false });
      $(`[data-tool="${next}"]`).focus();
    });
  });

  document.querySelectorAll("[data-mobile-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.mobileTool === "menu") {
        menuDialog.showModal();
        return;
      }
      const alreadyOpen = toolRail.dataset.open === "true" && activeTool === button.dataset.mobileTool;
      if (alreadyOpen) toolRail.dataset.open = "false";
      else selectTool(button.dataset.mobileTool);
    });
  });

  document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("[data-menu-tool]").forEach((button) => button.addEventListener("click", () => {
    menuDialog.close();
    selectTool(button.dataset.menuTool);
  }));

  $("#reveal-hint").addEventListener("click", () => {
    const scene = engine.currentScene();
    revealNextHint(scene, store);
    renderHints({ scene, store, listRoot: $("#hint-list"), countRoot: $("#hint-count"), button: $("#reveal-hint") });
  });

  function confirmReset() {
    const approved = window.confirm(`Start again? This removes only ${STORAGE_KEY} from this browser. Your other site data is untouched.`);
    if (!approved) return false;
    store.reset();
    notes.value = "";
    toolRail.dataset.open = "false";
    engine.render();
    return true;
  }

  $("#desktop-reset").addEventListener("click", confirmReset);
  $("#reset-trail").addEventListener("click", () => {
    if (confirmReset()) menuDialog.close();
  });
  $("#welcome-reset").addEventListener("click", () => {
    if (confirmReset()) welcomeDialog.close();
  });
  $("#continue-trail").addEventListener("click", () => {
    welcomeDialog.close();
    engine.scrollToScene(engine.currentScene().id, { focus: true });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toolRail.dataset.open === "true") toolRail.dataset.open = "false";
  });

  selectTool("hints", { open: false });
  engine.render();

  const hasProgress = store.hadProgress();
  $("#continue-trail").textContent = hasProgress ? "Resume trail" : "Start trail";
  $("#welcome-reset").hidden = !hasProgress;
  if (store.recoveredMalformedState) {
    $("#welcome-message").textContent = "Saved progress was unreadable, so the Trail Console recovered safely with a fresh trail. Other browser data was untouched.";
  } else if (hasProgress) {
    const current = engine.currentScene();
    $("#welcome-message").textContent = `Progress found on this device at ${current.title}.`;
  }
  welcomeDialog.showModal();
} catch (error) {
  console.error(error);
  const root = document.querySelector("#scene-root");
  root.innerHTML = "";
  const message = document.createElement("div");
  message.className = "feedback";
  message.dataset.kind = "error";
  message.textContent = "The Trail Console could not load its data. Run it through a local web server or GitHub Pages, then reload.";
  root.append(message);
}
