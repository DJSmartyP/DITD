function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function youtubeId(url) {
  if (typeof url !== "string") return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return match ? match[1] : null;
}

function placeholder(item) {
  const shell = el("figure", "media-shell");
  const body = el("div", "media-placeholder");
  body.append(el("span", "", `[ARCHIVE UNAVAILABLE] ${item.title}`));
  body.append(el("small", "", "The Trail Console could not recover this visual record."));
  shell.append(body);
  return shell;
}

function youtube(item) {
  const id = youtubeId(item.src);
  if (!item.localSrc && !id) return placeholder(item);
  const shell = el("figure", `media-shell video-shell video-shell-${item.posterStyle || "archive"}`);
  const poster = el("button", "video-poster");
  poster.type = "button";
  poster.setAttribute("aria-label", item.playLabel || `Play ${item.title}`);

  if (item.thumbnail) {
    const image = document.createElement("img");
    image.src = item.thumbnail;
    image.alt = item.thumbnailAlt || "";
    image.loading = "lazy";
    image.decoding = "async";
    poster.append(image);
  }

  const archiveLabel = el("span", "video-archive-label", item.posterKicker || "VIDEO ARCHIVE");
  const headline = el("span", "video-poster-headline", item.posterHeadline || item.title);
  const status = el("span", "video-poster-status", item.posterStatus || "RECORDING READY");
  const playGlyph = el("span", "video-play-glyph");
  playGlyph.setAttribute("aria-hidden", "true");
  const playText = el("span", "video-play-text", item.playText || "Play recording");
  poster.append(archiveLabel, headline, status, playGlyph, playText);

  const caption = el("figcaption", "media-caption video-caption");
  caption.append(el("strong", "", item.title));

  poster.addEventListener("click", () => {
    if (item.localSrc) {
      const video = document.createElement("video");
      video.className = "document-frame video-frame";
      video.src = item.localSrc;
      video.poster = item.thumbnail || "";
      video.controls = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute("aria-label", item.title);
      poster.replaceWith(video);
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.className = "document-frame video-frame";
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&autoplay=1`;
    iframe.title = item.title;
    iframe.loading = "lazy";
    iframe.allow = "autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    poster.replaceWith(iframe);
  }, { once: true });
  shell.append(poster, caption);
  return shell;
}

function image(item) {
  const shell = el("figure", "media-shell");
  const img = document.createElement("img");
  img.src = item.src;
  img.alt = item.alt || item.title;
  img.loading = "lazy";
  const caption = el("figcaption", "media-caption");
  caption.append(el("strong", "", item.title));
  if (item.kind === "image-region") {
    caption.append(el("p", "", "The cypher poster is in the lower-right area of the noticeboard image."));
  }
  if (item.download) {
    const link = el("a", "secondary-button", item.downloadLabel || "Download reward");
    link.href = item.src;
    link.download = item.downloadName || "trail-reward.png";
    caption.append(link);
  }
  if (item.zoomable) {
    const zoomButton = el("button", "secondary-button zoom-button", "Open zoom viewer");
    zoomButton.type = "button";
    zoomButton.addEventListener("click", () => openImageViewer(item));
    caption.append(zoomButton);
  }
  shell.append(img, caption);
  return shell;
}

function openImageViewer(item) {
  const dialog = el("dialog", "image-viewer");
  dialog.setAttribute("aria-label", `${item.title} zoom viewer`);

  const header = el("header", "image-viewer-header");
  header.append(el("strong", "", item.title));
  const close = el("button", "quiet-button image-viewer-close", "Close");
  close.type = "button";
  close.addEventListener("click", () => dialog.close());
  header.append(close);

  const controls = el("div", "image-viewer-controls");
  const zoomOut = el("button", "secondary-button", "Zoom out");
  const reset = el("button", "secondary-button", "Reset");
  const zoomIn = el("button", "secondary-button", "Zoom in");
  [zoomOut, reset, zoomIn].forEach((button) => { button.type = "button"; });
  const status = el("output", "image-zoom-status", "100%");
  status.setAttribute("aria-live", "polite");
  controls.append(zoomOut, reset, zoomIn, status);

  const viewport = el("div", "image-viewer-viewport");
  const enlarged = document.createElement("img");
  enlarged.className = "image-viewer-image";
  enlarged.src = item.src;
  enlarged.alt = item.alt || item.title;
  enlarged.draggable = false;
  viewport.append(enlarged);

  let zoom = 100;
  const setZoom = (next) => {
    zoom = Math.max(100, Math.min(400, next));
    enlarged.style.width = `${zoom}%`;
    status.textContent = `${zoom}%`;
    zoomOut.disabled = zoom === 100;
    zoomIn.disabled = zoom === 400;
    if (zoom === 100) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  };
  zoomOut.addEventListener("click", () => setZoom(zoom - 50));
  reset.addEventListener("click", () => setZoom(100));
  zoomIn.addEventListener("click", () => setZoom(zoom + 50));

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  dialog.append(header, controls, viewport);
  document.body.append(dialog);
  setZoom(100);
  dialog.showModal();
  close.focus();
}

function documentViewer(item, { locked = false } = {}) {
  const shell = el("section", "media-shell document-shell");
  if (locked) {
    const gate = el("div", "document-lock-card");
    gate.setAttribute("role", "img");
    gate.setAttribute("aria-label", `${item.title} is locked with a four-digit PIN`);
    gate.append(
      el("strong", "", "ENCRYPTED DOCUMENT"),
      el("span", "", "4-DIGIT PIN REQUIRED"),
      el("p", "", "Unlock the Owners Guide to activate its in-page reader.")
    );
    shell.append(gate);
  } else if (item.previewPages?.length) {
    const preview = el("details", "document-preview");
    preview.open = true;
    preview.append(el("summary", "", `Read ${item.title} in page`));
    const pages = el("div", "document-page-stack");
    item.previewPages.forEach((src, index) => {
      const page = document.createElement("img");
      page.src = src;
      page.alt = `${item.title}, page ${index + 1} of ${item.previewPages.length}`;
      page.loading = index === 0 ? "eager" : "lazy";
      page.decoding = "async";
      pages.append(page);
    });
    preview.append(pages);
    shell.append(preview);
  } else {
    const frame = document.createElement("iframe");
    frame.className = "document-frame";
    frame.src = item.src;
    frame.title = item.title;
    frame.loading = "lazy";
    shell.append(frame);
  }
  const caption = el("div", "media-caption");
  caption.append(el("strong", "", item.title));
  if (locked) caption.append(el("p", "", "This PDF is password protected. Solve the next scene to unlock the in-page reader."));
  const link = el("a", "secondary-button", locked ? "Open protected PDF" : "Open original PDF in a new tab");
  link.href = item.src;
  link.target = "_blank";
  link.rel = "noopener";
  caption.append(link);
  shell.append(caption);
  return shell;
}

export function renderMedia(item, options = {}) {
  if (!item) return null;
  if (item.kind === "youtube") return youtube(item);
  if (item.kind === "image" || item.kind === "image-region") return image(item);
  if (item.kind === "document") return documentViewer(item, options);
  return placeholder(item);
}
