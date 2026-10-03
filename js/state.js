export const STORAGE_KEY = "ppecTrailState:v1";
export const TICKET_CLASSES = Object.freeze([
  "Luggage",
  "Cattle",
  "Economy Meatbag",
  "Probationary Passenger",
  "Lowest Available",
  "Cargo",
  "Ballast",
  "Mega Budget",
  "Jonas Wannabe",
  "Idiot Tourist"
]);

export function generateTicketClass(random = Math.random) {
  const sample = Math.min(Math.max(Number(random()) || 0, 0), 0.9999999999999999);
  return TICKET_CLASSES[Math.floor(sample * TICKET_CLASSES.length)];
}

function freshState(startSceneId) {
  return {
    schemaVersion: 1,
    currentSceneId: startSceneId,
    completedSceneIds: [],
    watchedSceneIds: [],
    evidenceIds: [],
    pinnedEvidenceIds: [],
    notes: "",
    playerName: "",
    playerClass: "",
    hintLevels: {},
    attemptCounts: {},
    timerMode: null,
    timerStartedAt: null,
    timerFinishedAt: null,
    phase: "normal",
    updatedAt: new Date().toISOString()
  };
}

function uniqueAllowed(values, allowed) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter((value) => allowed.has(value)))];
}

export function validateState(candidate, trail) {
  const sceneIds = new Set(trail.scenes.map((scene) => scene.id));
  const evidenceIds = new Set(Object.keys(trail.evidence || {}));
  const fallback = freshState(trail.startSceneId);
  if (!candidate || typeof candidate !== "object") return fallback;

  const currentSceneId = sceneIds.has(candidate.currentSceneId)
    ? candidate.currentSceneId
    : trail.startSceneId;
  const playerClass = typeof candidate.playerClass === "string"
    ? candidate.playerClass.replace(/ Class$/, "")
    : "";
  const state = {
    ...fallback,
    currentSceneId,
    completedSceneIds: uniqueAllowed(candidate.completedSceneIds, sceneIds),
    watchedSceneIds: uniqueAllowed(candidate.watchedSceneIds, sceneIds),
    evidenceIds: uniqueAllowed(candidate.evidenceIds, evidenceIds),
    pinnedEvidenceIds: uniqueAllowed(candidate.pinnedEvidenceIds, evidenceIds),
    notes: typeof candidate.notes === "string" ? candidate.notes.slice(0, 50000) : "",
    playerName: typeof candidate.playerName === "string"
      ? candidate.playerName.replace(/[\u0000-\u001f\u007f]/g, "").replace(/\s+/g, " ").trim().slice(0, 32)
      : "",
    playerClass: TICKET_CLASSES.includes(playerClass) ? playerClass : "",
    hintLevels: candidate.hintLevels && typeof candidate.hintLevels === "object" ? candidate.hintLevels : {},
    attemptCounts: candidate.attemptCounts && typeof candidate.attemptCounts === "object" ? candidate.attemptCounts : {},
    timerMode: ["timed", "casual"].includes(candidate.timerMode) ? candidate.timerMode : null,
    timerStartedAt: typeof candidate.timerStartedAt === "string" ? candidate.timerStartedAt : null,
    timerFinishedAt: typeof candidate.timerFinishedAt === "string" ? candidate.timerFinishedAt : null,
    phase: ["normal", "uneasy", "corrupted", "restored"].includes(candidate.phase) ? candidate.phase : "normal",
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : fallback.updatedAt
  };

  state.pinnedEvidenceIds = state.pinnedEvidenceIds.filter((id) => state.evidenceIds.includes(id));
  return state;
}

export function createStateStore(trail) {
  let state;
  let recoveredMalformedState = false;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state = raw ? validateState(JSON.parse(raw), trail) : freshState(trail.startSceneId);
  } catch (error) {
    console.warn("Trail state was malformed and has been safely replaced.", error);
    recoveredMalformedState = true;
    state = freshState(trail.startSceneId);
  }

  const listeners = new Set();

  function persist() {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function notify() {
    listeners.forEach((listener) => listener(state));
  }

  return {
    get() { return state; },
    hadProgress() {
      return state.completedSceneIds.length > 0 || state.currentSceneId !== trail.startSceneId || Boolean(state.notes) || Boolean(state.timerMode);
    },
    recoveredMalformedState,
    update(mutator, { save = true } = {}) {
      mutator(state);
      state = validateState(state, trail);
      if (save) persist();
      notify();
      return state;
    },
    save() { persist(); notify(); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      state = freshState(trail.startSceneId);
      persist();
      notify();
      return state;
    }
  };
}
