function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderHints({ scene, store, listRoot, countRoot, button }) {
  const hints = Array.isArray(scene.hints) ? scene.hints : [];
  const level = Math.min(Number(store.get().hintLevels[scene.id] || 0), hints.length);
  listRoot.replaceChildren();
  hints.slice(0, level).forEach((hint) => listRoot.append(el("div", "hint-item", hint)));
  if (!level && hints.length) listRoot.append(el("p", "empty-state", "Hints appear one at a time and never affect progress."));
  if (!hints.length) listRoot.append(el("p", "empty-state", "No hint is needed for this scene."));
  countRoot.textContent = `${level} / ${hints.length}`;
  button.disabled = level >= hints.length;
  button.hidden = hints.length === 0;
  button.textContent = level ? "Reveal another hint" : "Ask Jonabot for a hint";
}

export function revealNextHint(scene, store) {
  const max = Array.isArray(scene.hints) ? scene.hints.length : 0;
  store.update((state) => {
    const current = Number(state.hintLevels[scene.id] || 0);
    state.hintLevels[scene.id] = Math.min(max, current + 1);
  });
}
