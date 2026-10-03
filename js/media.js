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

function typewriterText(context, canvas, text, x, y, { fontSize, maxWidth, rotation = 0 } = {}) {
  if (!text) return;
  const scale = canvas.width / 1774;
  const inkCanvas = document.createElement("canvas");
  inkCanvas.width = canvas.width;
  inkCanvas.height = canvas.height;
  const ink = inkCanvas.getContext("2d");
  let pixels = fontSize * scale;
  const limit = maxWidth * scale;
  ink.font = `700 ${pixels}px "Courier New", Courier, monospace`;
  ink.textAlign = "center";
  ink.textBaseline = "middle";
  while (ink.measureText(text).width > limit && pixels > 14 * scale) {
    pixels -= scale;
    ink.font = `700 ${pixels}px "Courier New", Courier, monospace`;
  }
  const measuredWidth = Math.min(ink.measureText(text).width, limit);
  ink.save();
  ink.translate(x * scale, y * scale);
  ink.rotate(rotation);

  // Build a heavy, imperfect imprint: the first strike supplies the dark body,
  // while the offset second strike mimics a slightly tired typewriter ribbon.
  ink.globalAlpha = 0.94;
  ink.fillStyle = "#6f2824";
  ink.strokeStyle = "#5a211e";
  ink.lineWidth = Math.max(0.85, scale * 1.15);
  ink.strokeText(text, 0, 0, limit);
  ink.fillText(text, 0, 0, limit);
  ink.globalAlpha = 0.3;
  ink.translate(scale * 0.85, -scale * 0.55);
  ink.strokeText(text, 0, 0, limit);
  ink.fillText(text, 0, 0, limit);
  ink.translate(-scale * 0.85, scale * 0.55);

  // Hairline cracks and tiny faded flecks make the ribbon ink feel used without
  // reducing the legibility of long passenger or class names.
  ink.globalCompositeOperation = "destination-out";
  ink.globalAlpha = 0.26;
  ink.lineWidth = Math.max(0.7, scale);
  ink.lineCap = "round";
  const skipCount = Math.max(3, Math.ceil(measuredWidth / (92 * scale)));
  for (let index = 0; index < skipCount; index += 1) {
    const startX = -measuredWidth / 2 + (measuredWidth * (index + 0.5)) / skipCount;
    const startY = ((index % 3) - 1) * pixels * 0.17;
    ink.beginPath();
    ink.moveTo(startX - pixels * 0.12, startY - pixels * 0.34);
    ink.lineTo(startX - pixels * 0.07, startY - pixels * 0.08);
    ink.lineTo(startX + pixels * 0.08, startY + pixels * 0.12);
    ink.lineTo(startX + pixels * 0.11, startY + pixels * 0.34);
    ink.stroke();
  }
  ink.globalAlpha = 0.18;
  const fleckCount = Math.max(5, Math.ceil(measuredWidth / (70 * scale)));
  const seed = [...text].reduce((value, character) => value + character.charCodeAt(0), 0);
  for (let index = 0; index < fleckCount; index += 1) {
    const position = ((seed * (index + 5) * 37) % 997) / 997;
    const vertical = (((seed + index * 71) % 89) / 88 - 0.5) * pixels * 0.72;
    const radius = Math.max(scale * 0.7, pixels * (0.018 + (index % 3) * 0.006));
    ink.beginPath();
    ink.ellipse(-measuredWidth / 2 + position * measuredWidth, vertical, radius * 1.8, radius, 0, 0, Math.PI * 2);
    ink.fill();
  }
  ink.restore();
  context.drawImage(inkCanvas, 0, 0);
}

async function prepareCompletionPass(item, { playerName = "", playerClass = "", completionTimeLabel = null } = {}) {
  const timed = Boolean(completionTimeLabel);
  const source = new Image();
  source.src = timed && item.timedSrc ? item.timedSrc : item.src;
  await source.decode();
  const canvas = document.createElement("canvas");
  canvas.width = source.naturalWidth;
  canvas.height = source.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(source, 0, 0);
  removeExteriorBackground(context, canvas);
  typewriterText(context, canvas, playerName, 510, 775, { fontSize: 62, maxWidth: 675 });
  if (timed) {
    typewriterText(context, canvas, completionTimeLabel, 1280, 775, { fontSize: 62, maxWidth: 620 });
  } else {
    typewriterText(context, canvas, playerClass, 1280, 775, { fontSize: 56, maxWidth: 620 });
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not prepare the personalised blimp ticket.");
  return URL.createObjectURL(blob);
}

function removeExteriorBackground(context, canvas) {
  const { width, height } = canvas;
  const imageData = context.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const isExteriorColor = (index) => {
    const offset = index * 4;
    const red = pixels[offset];
    const green = pixels[offset + 1];
    const blue = pixels[offset + 2];
    const range = Math.max(red, green, blue) - Math.min(red, green, blue);
    const brightness = (red + green + blue) / 3;
    return range < 16 && (brightness > 150 || brightness < 36);
  };
  const enqueue = (index) => {
    if (visited[index] || !isExteriorColor(index)) return;
    visited[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    pixels[index * 4 + 3] = 0;
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < width * height) enqueue(index + width);
  }
  context.putImageData(imageData, 0, 0);
}

function image(item, options = {}) {
  const shell = el("figure", "media-shell");
  const img = document.createElement("img");
  const timed = Boolean(options.completionTimeLabel);
  const sourcePath = timed && item.timedSrc ? item.timedSrc : item.src;
  img.src = sourcePath;
  img.alt = `${item.alt || item.title}${options.playerName ? ` Passenger: ${options.playerName}.` : ""}${timed ? ` Official trail time: ${options.completionTimeLabel}.` : options.playerClass ? ` Class: ${options.playerClass}.` : ""}`;
  img.loading = "lazy";
  const caption = el("figcaption", "media-caption");
  caption.append(el("strong", "", item.title));
  if (item.kind === "image-region") {
    caption.append(el("p", "", "The cypher poster is in the lower-right area of the noticeboard image."));
  }
  if (item.download) {
    const personalised = Boolean(item.personalised);
    const link = el("a", "secondary-button download-button", personalised ? "Preparing your blimp ticket…" : item.downloadLabel || "Download reward");
    link.download = item.downloadName || "trail-reward.png";
    if (personalised) {
      img.hidden = true;
      link.removeAttribute("href");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("aria-busy", "true");
      link.tabIndex = -1;
      if (options.playerName) caption.append(el("p", "ticket-name-caption", `PASSENGER: ${options.playerName}`));
      if (!timed && options.playerClass) caption.append(el("p", "ticket-class-caption", `CLASS: ${options.playerClass}`));
      if (timed) caption.append(el("p", "ticket-time-caption", `OFFICIAL TRAIL TIME: ${options.completionTimeLabel}`));
      prepareCompletionPass(item, options).then((url) => {
        img.src = url;
        img.hidden = false;
        link.href = url;
        link.textContent = timed ? "Download your timed blimp ticket" : "Download your blimp ticket";
        link.removeAttribute("aria-disabled");
        link.removeAttribute("aria-busy");
        link.removeAttribute("tabindex");
      }).catch((error) => {
        console.error(error);
        link.textContent = "Personalised blimp ticket unavailable";
        link.setAttribute("aria-label", "Personalised blimp ticket could not be prepared; it is not available to download.");
        link.removeAttribute("aria-busy");
      });
    } else {
      link.href = item.src;
    }
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

function generatedInterface(item) {
  const shell = el("figure", "media-shell activation-visual");
  const panel = el("div", "activation-visual-panel");
  const header = el("header", "activation-visual-header");
  header.append(
    el("span", "activation-visual-brand", "JONACO SYSTEMS"),
    el("span", "activation-visual-generation", "LEGACY UNIT · VM/04")
  );
  const screen = el("div", "activation-visual-screen");
  const status = el("div", "activation-visual-status");
  status.append(el("span", "activation-visual-alert", "ALERT"), el("strong", "", "LICENCE VALIDATION FAILED"));
  const telemetry = el("div", "activation-visual-telemetry");
  const metric = (label, value) => {
    const row = el("span", "activation-visual-metric");
    row.append(el("span", "", label), el("strong", "", value));
    return row;
  };
  telemetry.append(metric("PLAYBACK", "INTERRUPTED"), metric("CONTROLLER", "LOCAL LINK READY"), metric("OPERATOR CHECK", "REQUIRED"));
  const challenge = el("div", "activation-visual-challenge");
  challenge.append(el("span", "", "VALIDATION RECORD"), el("strong", "activation-visual-code", "— — — — —"));
  screen.append(
    el("span", "activation-visual-kicker", "VIDEOMATIC ACTIVATION CENTRE"),
    status,
    el("p", "", "The legacy licence has expired. An operator must restore validation before playback can resume."),
    telemetry,
    challenge
  );
  const lamps = el("div", "activation-visual-lamps");
  lamps.append(el("span", "", "NETWORK · LOCAL"), el("span", "", "LICENCE · EXPIRED"), el("span", "", "OPERATOR · REQUIRED"));
  panel.append(header, screen, lamps);
  const caption = el("figcaption", "media-caption");
  caption.append(el("strong", "", item.title));
  shell.append(panel, caption);
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
  const panControls = el("div", "image-pan-controls");
  const panLeft = el("button", "secondary-button", "Pan left");
  const panRight = el("button", "secondary-button", "Pan right");
  [panLeft, panRight].forEach((button) => { button.type = "button"; });
  panControls.append(panLeft, panRight);
  controls.append(zoomOut, reset, zoomIn, status, panControls);

  const viewport = el("div", "image-viewer-viewport");
  const enlarged = document.createElement("img");
  enlarged.className = "image-viewer-image";
  enlarged.src = item.src;
  enlarged.alt = item.alt || item.title;
  enlarged.draggable = false;
  viewport.append(enlarged);

  let zoom = 100;
  const updatePanControls = () => {
    const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    panLeft.disabled = zoom === 100 || viewport.scrollLeft <= 1;
    panRight.disabled = zoom === 100 || viewport.scrollLeft >= maximum - 1;
  };
  const setZoom = (next) => {
    zoom = Math.max(100, Math.min(400, next));
    enlarged.style.width = `${zoom}%`;
    enlarged.style.minWidth = `${zoom}%`;
    status.textContent = `${zoom}%`;
    zoomOut.disabled = zoom === 100;
    zoomIn.disabled = zoom === 400;
    if (zoom === 100) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
    requestAnimationFrame(updatePanControls);
  };
  zoomOut.addEventListener("click", () => setZoom(zoom - 50));
  reset.addEventListener("click", () => setZoom(100));
  zoomIn.addEventListener("click", () => setZoom(zoom + 50));
  panLeft.addEventListener("click", () => viewport.scrollBy({ left: -viewport.clientWidth * .7, behavior: "smooth" }));
  panRight.addEventListener("click", () => viewport.scrollBy({ left: viewport.clientWidth * .7, behavior: "smooth" }));
  viewport.addEventListener("scroll", updatePanControls, { passive: true });

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
  if (!locked && item.sourceLink !== false) {
    const link = el("a", "secondary-button", "Open original PDF in a new tab");
    link.href = item.src;
    link.target = "_blank";
    link.rel = "noopener";
    caption.append(link);
  }
  shell.append(caption);
  return shell;
}

export function renderMedia(item, options = {}) {
  if (!item) return null;
  if (item.kind === "youtube") return youtube(item);
  if (item.kind === "image" || item.kind === "image-region") return image(item, options);
  if (item.kind === "document") return documentViewer(item, options);
  if (item.kind === "generated-interface") return generatedInterface(item);
  return placeholder(item);
}
