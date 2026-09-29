import { renderMedia } from "./media.js";

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function grantEvidence(store, evidenceId) {
  store.update((state) => {
    if (!state.evidenceIds.includes(evidenceId)) state.evidenceIds.push(evidenceId);
  });
}

export function renderEvidenceList({ root, trail, manifest, store, onChange }) {
  root.replaceChildren();
  const state = store.get();
  if (!state.evidenceIds.length) {
    root.append(el("p", "empty-state", "No evidence collected yet. Useful items stay here even after their scene is complete."));
    return;
  }

  state.evidenceIds.forEach((id) => {
    const evidence = trail.evidence[id];
    if (!evidence) return;
    const card = el("article", "evidence-card");
    card.append(el("h3", "", evidence.title), el("p", "", evidence.description));
    const pinned = state.pinnedEvidenceIds.includes(id);
    const button = el("button", "", pinned ? "Unpin evidence" : "Pin beside workspace");
    button.type = "button";
    button.setAttribute("aria-pressed", String(pinned));
    button.addEventListener("click", () => {
      store.update((next) => {
        next.pinnedEvidenceIds = pinned
          ? next.pinnedEvidenceIds.filter((item) => item !== id)
          : [...new Set([...next.pinnedEvidenceIds, id])];
      });
      onChange?.();
    });
    card.append(button);
    root.append(card);
  });
}

export function renderPinnedEvidence({ trail, manifest, state }) {
  const wrapper = el("section", "pinned-evidence");
  wrapper.append(el("h3", "", "Pinned evidence"));
  const grid = el("div", "pinned-grid");
  const pinned = state.pinnedEvidenceIds.filter((id) => state.evidenceIds.includes(id));

  if (!pinned.length) {
    grid.append(el("p", "empty-state", "Nothing is pinned. Open the Field Kit and pin the Gremlin poster beside this map."));
  } else {
    pinned.forEach((id) => {
      const evidence = trail.evidence[id];
      const item = evidence && manifest.items[evidence.mediaId];
      if (item) grid.append(renderMedia(item));
    });
  }
  wrapper.append(grid);
  return wrapper;
}
