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
  body.append(el("span", "", `[TBD MEDIA] ${item.title}`));
  body.append(el("small", "", "The original asset or URL was not supplied. This explicit placeholder preserves the scene without inventing canon."));
  shell.append(body);
  return shell;
}

function youtube(item) {
  const id = youtubeId(item.src);
  if (!id) return placeholder(item);
  const shell = el("figure", "media-shell");
  const holder = el("div", "media-placeholder");
  const label = el("span", "", item.title);
  const detail = el("small", "", "Video is loaded only when you choose to play it. No audio will autoplay.");
  const button = el("button", "primary-button", "Load video");
  button.type = "button";
  button.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.className = "document-frame";
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
    iframe.title = item.title;
    iframe.loading = "lazy";
    iframe.allow = "accelerometer; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    holder.replaceWith(iframe);
  }, { once: true });
  holder.append(label, detail, button);
  shell.append(holder);
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
    const link = el("a", "secondary-button", "Download tickets");
    link.href = item.src;
    link.download = item.downloadName || "bodach-bay-blimp-tickets.png";
    caption.append(link);
  }
  shell.append(img, caption);
  return shell;
}

function documentViewer(item, { locked = false } = {}) {
  const shell = el("section", "media-shell");
  const frame = document.createElement("object");
  frame.className = "document-frame";
  frame.type = "application/pdf";
  frame.data = item.src;
  frame.setAttribute("aria-label", item.title);
  const fallback = el("p", "media-caption", "This browser cannot display the PDF inline.");
  frame.append(fallback);
  const caption = el("div", "media-caption");
  caption.append(el("strong", "", item.title));
  if (locked) caption.append(el("p", "", "This source PDF is genuinely password protected. Solve the next scene before opening it."));
  const link = el("a", "secondary-button", "Open PDF in a new tab");
  link.href = item.src;
  link.target = "_blank";
  link.rel = "noopener";
  caption.append(link);
  shell.append(frame, caption);
  return shell;
}

export function renderMedia(item, options = {}) {
  if (!item) return null;
  if (item.kind === "youtube") return youtube(item);
  if (item.kind === "image" || item.kind === "image-region") return image(item);
  if (item.kind === "document") return documentViewer(item, options);
  return placeholder(item);
}
