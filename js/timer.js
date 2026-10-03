export function timerElapsedMs(state, now = Date.now()) {
  if (state?.timerMode !== "timed" || !state.timerStartedAt) return null;
  const startedAt = Date.parse(state.timerStartedAt);
  const finishedAt = state.timerFinishedAt ? Date.parse(state.timerFinishedAt) : now;
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt)) return null;
  return Math.max(0, finishedAt - startedAt);
}

export function formatTrailTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) return null;
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
