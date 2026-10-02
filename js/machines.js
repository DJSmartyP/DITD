function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function normalizeAnswer(value, kind = "text") {
  const raw = String(value ?? "").trim();
  if (kind === "digits") return raw.replace(/\D/g, "");
  if (kind === "name") return raw.toLocaleLowerCase("en-GB").replace(/[^a-z\s'-]/g, "").replace(/\s+/g, " ").trim();
  if (kind === "captcha") return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (kind === "jonagraph") return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (kind === "command") {
    return raw
      .toLocaleLowerCase("en-GB")
      .replace(/[-_]+/g, " ")
      .replace(/[^a-z0-9.\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  return raw.toLocaleLowerCase("en-GB").replace(/\s+/g, " ").trim();
}

export function answerMatches(value, validation) {
  if (!validation || validation.answer === undefined) return false;
  const kind = validation.normalizer || "text";
  return normalizeAnswer(value, kind) === normalizeAnswer(validation.answer, kind);
}

export function specialResponse(scene, value) {
  const responses = scene.specialResponses || {};
  const kind = scene.validation?.normalizer || "text";
  const found = Object.entries(responses).find(([answer]) => normalizeAnswer(answer, kind) === normalizeAnswer(value, kind));
  return found ? found[1] : null;
}

function machineFrame(title, label) {
  const machine = el("section", "machine");
  const header = el("div", "machine-header");
  header.append(el("h3", "", title), el("span", "machine-label", label));
  machine.append(header);
  return machine;
}

function standardForm(scene, onSubmit, { inputMode = "text", maxLength = 80, placeholder = "" } = {}) {
  const form = document.createElement("form");
  const row = el("div", "machine-row");
  const field = el("div", "field-grow");
  const id = `answer-${scene.id}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = scene.inputLabel || "Answer";
  const input = document.createElement("input");
  input.id = id;
  input.className = "machine-input";
  input.type = "text";
  input.inputMode = inputMode;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  field.append(label, input);
  const submit = el("button", "primary-button", "Submit");
  submit.type = "submit";
  row.append(field, submit);
  form.append(row);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(input.value, input);
  });
  return form;
}

function jonavision(scene, onSubmit) {
  const machine = machineFrame("JONAVISION TUNER", "3-DIGIT SIGNAL");
  const display = el("div", "digit-display");
  [0, 1, 2].forEach(() => display.append(el("span", "", "–")));
  const form = standardForm(scene, (value, input) => onSubmit(value, input), { inputMode: "numeric", maxLength: 3, placeholder: "000" });
  const input = form.querySelector("input");
  input.setAttribute("aria-label", "Three-digit Jonavision channel");
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 3).padEnd(3, "–");
    [...display.children].forEach((part, index) => { part.textContent = digits[index]; });
  });
  machine.append(display, form);
  return machine;
}

function videomatic(scene, onSubmit) {
  const machine = machineFrame("VIDEOMATIC ARCHIVE", "4-DIGIT INDEX");
  const display = el("div", "digit-display");
  [0, 1, 2, 3].forEach(() => display.append(el("span", "", "–")));
  const form = standardForm(scene, onSubmit, { inputMode: "numeric", maxLength: 4, placeholder: "0000" });
  const input = form.querySelector("input");
  input.setAttribute("aria-label", "Four-digit Videomatic archive number");
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, 4).padEnd(4, "–");
    [...display.children].forEach((part, index) => { part.textContent = digits[index]; });
  });
  machine.append(display, form);
  return machine;
}

function jonagraph(scene, onSubmit) {
  const machine = machineFrame("JONAGRAPH ROUTER", "AREA + CONTACT");
  const help = el("p", "jonagraph-rule", "Every Jonagraph code begins with the destination's area number, followed by the initials of the person you're calling.");
  const format = el("code", "jonagraph-format", "[PLACE NUMBER] + [CONTACT INITIALS]");
  const form = document.createElement("form");
  const builder = el("div", "jonagraph-builder");
  const config = [
    ["Area", "numeric"],
    ["Contact 1", "text"],
    ["Contact 2", "text"]
  ];
  const inputs = config.map(([labelText, inputMode], index) => {
    const wrapper = el("div", "jonagraph-part");
    const id = `jonagraph-${index}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = labelText;
    const input = document.createElement("input");
    input.id = id;
    input.maxLength = 1;
    input.inputMode = inputMode;
    input.autocomplete = "off";
    input.setAttribute("aria-label", labelText === "Area" ? "Area number" : `${labelText} initial`);
    input.addEventListener("input", () => {
      input.value = index === 0 ? input.value.replace(/\D/g, "") : input.value.replace(/[^a-z]/gi, "").toUpperCase();
      if (input.value && inputs[index + 1]) inputs[index + 1].focus();
    });
    wrapper.append(label, input);
    builder.append(wrapper);
    return input;
  });
  const submit = el("button", "primary-button", "Place Jonagraph");
  submit.type = "submit";
  form.append(builder, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit(inputs.map((input) => input.value).join(""), inputs.find((input) => !input.value) || inputs[0]);
  });
  machine.append(help, format, form);
  return machine;
}

function terminal(scene, onSubmit, intentionalFailure = false) {
  const machine = machineFrame(scene.mode === "document-terminal" ? "JONATRAVEL TERMINAL" : "RECOVERY TERMINAL", intentionalFailure ? "UNTRUSTED ROUTE" : "COMMAND LINE");
  if (intentionalFailure) machine.classList.add("fake-diagnostic");
  const screen = el("div", "terminal-screen");
  screen.setAttribute("role", "log");
  screen.setAttribute("aria-live", "polite");
  screen.textContent = intentionalFailure
    ? "ADMINISTRATOR: JONABOT\nCOUNTER-COMMAND ACCESS GRANTED\n\nYou heard the command. Go on. Type it in and try to stop me."
    : "PPEC REMOTE TERMINAL\nSecure connection established.\nAwaiting instruction…";
  const form = standardForm(scene, (value, input) => {
    const line = document.createElement("p");
    line.textContent = `> ${value}`;
    screen.append(line);
    screen.scrollTop = screen.scrollHeight;
    onSubmit(value, input, screen);
  }, { maxLength: 80, placeholder: "type command" });
  machine.append(screen, form);
  return machine;
}

function activation(scene, onSubmit) {
  const machine = machineFrame("LEGACY ACTIVATION CENTRE", "VIDEOMATIC LICENCE");
  const panel = el("div", "activation-panel");
  const notice = el("p", "tbd-copy", "ARCHIVE VISUAL UNAVAILABLE — fallback activation terminal loaded.");
  const fields = el("div", "licence-fields");
  const licence = document.createElement("input");
  licence.value = "PPEC-VIDEOMATIC-LEGACY";
  licence.readOnly = true;
  licence.setAttribute("aria-label", "Legacy licence identifier");
  const machineId = document.createElement("input");
  machineId.value = "VM-4763-RECOVERY";
  machineId.readOnly = true;
  machineId.setAttribute("aria-label", "Videomatic recovery identifier");
  fields.append(licence, machineId);
  const activate = el("button", "primary-button", "Re-activate licence");
  activate.type = "button";
  const captcha = el("div", "captcha-card");
  captcha.hidden = true;
  captcha.append(el("strong", "", "HUMAN VERIFICATION"), el("span", "captcha-code", "WD54L"), el("small", "", "Enter the five-character code shown above."));
  const form = standardForm(scene, onSubmit, { maxLength: 8, placeholder: "five characters" });
  form.hidden = true;
  activate.addEventListener("click", () => {
    activate.disabled = true;
    activate.textContent = "Licence staged";
    captcha.hidden = false;
    form.hidden = false;
    form.querySelector("input").focus();
  });
  panel.append(notice, fields, activate, captcha, form);
  machine.append(panel);
  return machine;
}

function systemLog(scene) {
  const wrapper = machineFrame("SYSTEM EVENT LOG", "READ-ONLY");
  const pre = el("pre", "system-log", scene.log || "[TBD SYSTEM LOG]");
  wrapper.append(pre);
  return wrapper;
}

function diagnostic() {
  const wrapper = machineFrame("DEVICE DIAGNOSTIC", "LOCAL SYSTEM CHECK");
  wrapper.classList.add("fake-diagnostic");
  const summary = el("p", "diagnostic-summary", "Threat scan complete. An unauthorised process has attached itself to the JonAssist launch routine.");
  const readout = el("dl", "diagnostic-grid");
  [
    ["Process", "no-more-trails.exe"],
    ["Signature", "Unauthorised"],
    ["State", "Armed — awaiting trigger"],
    ["Installed by", "Administrator: Jonabot"],
    ["Target", "JonAssist trail loader"],
    ["Trigger", "Next JonAssist request"],
    ["Detected effect", "Interrupt trail access"],
    ["Automatic removal", "Failed"]
  ].forEach(([label, value]) => {
    readout.append(el("dt", "", label), el("dd", "", value));
  });
  const action = el("p", "diagnostic-action", "RECOVERY ROUTE: Manual counter-command required.");
  wrapper.append(el("span", "armed-badge", "THREAT ACTIVE"), summary, readout, action);
  return wrapper;
}

function privateChannel(scene) {
  const wrapper = el("section", "private-channel");
  wrapper.setAttribute("aria-label", "Read-only moderator conversation");

  if (scene.interceptMessage) {
    const incoming = el("article", "channel-intercept channel-message--jonabot");
    const avatar = el("span", "channel-intercept-avatar", "J");
    avatar.setAttribute("aria-hidden", "true");
    const content = el("div", "channel-intercept-content");
    const heading = el("div", "channel-intercept-heading");
    heading.append(
      el("strong", "", "JONABOT"),
      el("span", "channel-intercept-live", "INCOMING NOW")
    );
    content.append(heading, el("p", "", scene.interceptMessage));
    incoming.append(avatar, content);
    wrapper.append(incoming);
  }

  const channel = el("section", "discord-channel");
  channel.setAttribute("aria-label", "Read-only Discord channel: moderator-chat");

  const channelHeader = el("header", "discord-channel-header");
  const channelIdentity = el("div", "discord-channel-identity");
  channelIdentity.append(
    el("span", "discord-channel-hash", "#"),
    el("strong", "", "moderator-chat")
  );
  channelHeader.append(
    channelIdentity,
    el("span", "discord-channel-topic", "PPEC moderators"),
    el("span", "discord-channel-status", "PRIVATE FREQUENCY INTERCEPT · READ ONLY")
  );

  const messageList = el("div", "discord-message-list");
  messageList.setAttribute("aria-label", "Intercepted moderator messages");

  (scene.messages || []).forEach((message) => {
    const isSystem = message.author === "System";
    const authorKey = message.author.toLowerCase();
    const moderatorClass = ["smarty", "neven", "arty", "gray"].includes(authorKey)
      ? ` channel-message--${authorKey}`
      : "";
    const item = el("article", `discord-message${moderatorClass}${isSystem ? " discord-message--system" : ""}`);
    const avatarLabel = isSystem ? "PDF" : message.author.slice(0, 1).toUpperCase();
    const avatar = el("span", "discord-avatar", avatarLabel);
    avatar.setAttribute("aria-hidden", "true");

    const content = el("div", "discord-message-content");
    const meta = el("header", "discord-message-meta");
    meta.append(el("strong", "discord-author", isSystem ? "Trail Console" : message.author));
    if (isSystem) meta.append(el("span", "discord-bot-tag", "SYSTEM"));
    meta.append(el("span", "discord-message-state", "intercepted"));
    content.append(meta);

    if (isSystem) {
      const [fileLead, statusText] = message.text.split(" — ");
      const fileName = fileLead.split(":").slice(1).join(":").trim() || fileLead;
      const attachment = el("div", "discord-attachment");
      const fileIcon = el("span", "discord-attachment-icon", "PDF");
      fileIcon.setAttribute("aria-hidden", "true");
      const fileCopy = el("div", "discord-attachment-copy");
      fileCopy.append(
        el("strong", "", fileName),
        el("span", "", statusText || "Attachment copied to the restricted reader.")
      );
      attachment.append(fileIcon, fileCopy);
      content.append(attachment);
    } else {
      const paragraph = el("p", "discord-message-text", message.text);
      content.append(paragraph);
      (message.links || []).forEach((link) => {
        const anchor = el("a", "channel-link", link.label);
        anchor.href = link.href;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        content.append(anchor);
      });
    }

    item.append(avatar, content);
    messageList.append(item);
  });

  const composer = el("div", "discord-composer");
  composer.setAttribute("aria-label", "Message composer disabled in this read-only intercept");
  composer.append(
    el("span", "discord-composer-plus", "+"),
    el("span", "discord-composer-placeholder", "Message #moderator-chat"),
    el("span", "discord-composer-lock", "READ ONLY")
  );

  channel.append(channelHeader, messageList, composer);
  wrapper.append(channel);
  return wrapper;
}

function restore(scene, onComplete) {
  const machine = machineFrame("JONABOT RESTORE CONSOLE", "DEC-2023 BACKUP");
  machine.classList.add("restore-console");
  const meter = el("div", "restore-meter");
  const fill = document.createElement("span");
  meter.append(fill);
  const percentage = el("div", "restore-percentage", "0%");
  const log = el("div", "restore-log", "Restore package ready.");
  log.setAttribute("aria-live", "polite");
  const start = el("button", "primary-button", "Run restore");
  start.type = "button";
  const confirm = el("button", "secondary-button", scene.cta || "Confirm reboot");
  confirm.type = "button";
  confirm.hidden = true;
  start.addEventListener("click", () => {
    start.disabled = true;
    let progress = 0;
    let beatIndex = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = reduced ? 20 : 5;
    const timer = window.setInterval(() => {
      progress = Math.min(100, progress + step);
      fill.style.width = `${progress}%`;
      percentage.textContent = `${progress}%`;
      const beats = scene.restoreBeats || [];
      while (beats[beatIndex] && progress >= beats[beatIndex].at) {
        log.textContent = beats[beatIndex].text;
        log.dataset.tone = beats[beatIndex].at < 100 ? "panic" : "complete";
        beatIndex += 1;
      }
      if (progress >= 100) {
        clearInterval(timer);
        confirm.hidden = false;
        confirm.focus();
      }
    }, reduced ? 40 : 120);
  }, { once: true });
  confirm.addEventListener("click", onComplete);
  machine.append(percentage, meter, log, start, confirm);
  return machine;
}

function reward(scene) {
  const stack = el("div", "reward-stack");
  const booking = machineFrame("BODACH BAY BOOKING", "CONFIRMED");
  booking.classList.add("reward-booking");
  booking.append(
    el("div", "armed-badge", "BLIMP PASS: RESERVED"),
    el("p", "reward-instructions", "Your collectible completion pass is ready above. Download it, add your details and keep it as proof that you completed the trail.")
  );

  const creditsPanel = el("section", "credits-panel");
  creditsPanel.setAttribute("aria-labelledby", "trail-credits-heading");
  const heading = el("h3", "", "Trail Credits");
  heading.id = "trail-credits-heading";
  const credits = document.createElement("ul");
  (scene.credits || []).forEach((credit) => credits.append(el("li", "", credit)));
  creditsPanel.append(el("span", "credits-kicker", "A JONABOT TRAIL"), heading, credits);
  stack.append(booking, creditsPanel);
  return stack;
}

export function renderMachine(scene, { onSubmit, onComplete }) {
  switch (scene.mode) {
    case "jonavision": return jonavision(scene, onSubmit);
    case "videomatic": return videomatic(scene, onSubmit);
    case "jonagraph": return jonagraph(scene, onSubmit);
    case "activation": return activation(scene, onSubmit);
    case "document-terminal":
    case "terminal": return terminal(scene, onSubmit, false);
    case "terminal-failure": return terminal(scene, onSubmit, true);
    case "text-input":
    case "password": {
      const frame = machineFrame(scene.mode === "password" ? "MANUAL LOCK" : "JONABOT INPUT", scene.mode === "password" ? "4-DIGIT PIN" : "IDENTIFICATION");
      frame.append(standardForm(scene, onSubmit, { inputMode: scene.mode === "password" ? "numeric" : "text", maxLength: scene.mode === "password" ? 4 : 80 }));
      return frame;
    }
    case "system-log": return systemLog(scene);
    case "diagnostic": return diagnostic(scene);
    case "private-channel": return privateChannel(scene);
    case "restore": return restore(scene, onComplete);
    case "reward": return reward(scene);
    default: return null;
  }
}
