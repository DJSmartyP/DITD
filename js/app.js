import { createStateStore, STORAGE_KEY } from "./state.js";
import { TrailEngine } from "./trail-engine.js";
import { renderEvidenceList } from "./evidence.js";
import { renderHints, revealNextHint } from "./hints.js";

const $ = (selector) => document.querySelector(selector);

async function loadJson(relativePath) {
  const response = await fetch(new URL(relativePath, import.meta.url));
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

  let activeTool = "field-kit";
  const toolRail = $("#tool-rail");
  const notes = $("#trail-notes");
  const welcomeDialog = $("#welcome-dialog");
  const menuDialog = $("#menu-dialog");

  function selectTool(tool, { open = true } = {}) {
    if (!["field-kit", "notes", "hints", "history"].includes(tool)) return;
    activeTool = tool;
    document.querySelectorAll("[data-tool]").forEach((tab) => {
      const selected = tab.dataset.tool === tool;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    document.querySelectorAll(".tool-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${tool}`;
    });
    if (open && matchMedia("(max-width: 759px)").matches) toolRail.dataset.open = "true";
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
      heading.textContent = `${String(scene.order).padStart(2, "0")} — ${scene.title}`;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Replay scene";
      button.addEventListener("click", () => {
        toolRail.dataset.open = "false";
        engine.render(scene.id, { replay: true });
        $("#workspace").focus();
      });
      card.append(heading, button);
      root.append(card);
    });
  }

  function renderInterface(scene, { replay = false } = {}) {
    const state = store.get();
    const phase = state.phase || scene.phase;
    document.body.dataset.phase = phase;
    const labels = {
      normal: "SYSTEM: CLEAN",
      uneasy: "SYSTEM: UNSTABLE",
      corrupted: "ADMINISTRATOR: JONABOT",
      restored: "SYSTEM: RESTORED"
    };
    setText("#phase-label", labels[phase]);
    setText("#stage-label", replay ? `HISTORY ${String(scene.order).padStart(2, "0")}` : `STAGE ${String(scene.order).padStart(2, "0")} / 22`);
    setText("#trail-progress", `${Math.round((state.completedSceneIds.length / trail.scenes.length) * 100)}%`);
    setText("#evidence-count", `${state.evidenceIds.length} item${state.evidenceIds.length === 1 ? "" : "s"}`);
    setText("#narrator-name", phase === "corrupted" ? "Administrator: Jonabot" : phase === "restored" ? "Jonabot (Dec 2023)" : "Jonabot v2.3");
    setText("#narrator-status", replay ? "Replaying a completed scene." : phase === "corrupted" ? "Access elevated. Temper deteriorating." : phase === "restored" ? "Factory backup online. Incident not remembered." : phase === "uneasy" ? "Connected. Minor anomalies detected." : "Connected and standing by.");

    renderEvidenceList({
      root: $("#evidence-list"),
      trail,
      manifest,
      store,
      onChange: () => {
        engine.render();
        renderInterface(engine.currentScene());
      }
    });
    setText("#pin-status", state.pinnedEvidenceIds.length ? `${state.pinnedEvidenceIds.length} pinned` : "Nothing pinned");
    renderHints({ scene: replay ? engine.currentScene() : scene, store, listRoot: $("#hint-list"), countRoot: $("#hint-count"), button: $("#reveal-hint") });
    renderHistory();
  }

  const engine = new TrailEngine({
    root: $("#scene-root"),
    trail,
    manifest,
    store,
    onRender: renderInterface,
    onOpenTool: (tool) => selectTool(tool)
  });

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
      const tools = ["field-kit", "notes", "hints", "history"];
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

  $("#menu-button").addEventListener("click", () => menuDialog.showModal());
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

  $("#reset-trail").addEventListener("click", () => {
    if (confirmReset()) menuDialog.close();
  });
  $("#welcome-reset").addEventListener("click", () => {
    if (confirmReset()) welcomeDialog.close();
  });
  $("#continue-trail").addEventListener("click", () => welcomeDialog.close());

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toolRail.dataset.open === "true") toolRail.dataset.open = "false";
  });

  selectTool("field-kit", { open: false });
  engine.render();

  const hasProgress = store.hadProgress();
  $("#continue-trail").textContent = hasProgress ? "Resume trail" : "Start trail";
  $("#welcome-reset").hidden = !hasProgress;
  if (store.recoveredMalformedState) {
    $("#welcome-message").textContent = "Saved progress was unreadable, so the Trail Console recovered safely with a fresh trail. Other browser data was untouched.";
  } else if (hasProgress) {
    const current = engine.currentScene();
    $("#welcome-message").textContent = `Progress found on this device at Scene ${String(current.order).padStart(2, "0")}: ${current.title}.`;
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
