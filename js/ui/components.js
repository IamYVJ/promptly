/**
 * Markup helpers shared by screens.
 *
 * Screens return HTML strings. Anything dynamic — team names, prompts,
 * category names — must go through `esc`.
 */

const ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ESCAPE_MAP[character]);
}

const VARIANT_CLASS = {
  primary: "btn-primary",
  outline: "btn-outline",
  ghost: "btn-ghost",
};

export function button({
  label,
  action,
  value,
  variant = "outline",
  block = true,
  large = false,
  disabled = false,
}) {
  const classes = ["btn", VARIANT_CLASS[variant] ?? ""];
  if (block) classes.push("btn-block");
  if (large) classes.push("btn-lg");

  return `<button type="button" class="${classes.filter(Boolean).join(" ")}"${
    action ? ` data-action="${esc(action)}"` : ""
  }${value === undefined ? "" : ` data-value="${esc(value)}"`}${
    disabled ? " disabled" : ""
  }>${esc(label)}</button>`;
}

export function linkButton(label, action) {
  return `<button type="button" class="link-button" data-action="${esc(action)}">${esc(
    label
  )}</button>`;
}

export function backButton(label = "Back") {
  return `<button type="button" class="back-button" data-action="back">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    ${esc(label)}
  </button>`;
}

export function optionChip({ label, action, value, pressed }) {
  return `<button type="button" class="option" data-action="${esc(action)}" data-value="${esc(
    value
  )}" aria-pressed="${pressed ? "true" : "false"}">${esc(label)}</button>`;
}

export function toggleRow({ label, hint, action, value, enabled }) {
  return `<button type="button" class="toggle" data-action="${esc(action)}" data-value="${esc(
    value
  )}" aria-pressed="${enabled ? "true" : "false"}">
    <span>
      <span class="meta-value">${esc(label)}</span>
      ${hint ? `<span class="card-note">${esc(hint)}</span>` : ""}
    </span>
    <span class="toggle-state">${enabled ? "On" : "Off"}</span>
  </button>`;
}

export function banner({ title, body }) {
  return `<div class="banner">
    ${title ? `<span class="banner-title">${esc(title)}</span>` : ""}
    <span>${esc(body)}</span>
  </div>`;
}

export function arrowIcon() {
  return `<svg class="mode-arrow" width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
    <path d="M7 4l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

export function formatClock(remainingMs) {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const DIALOGS = {
  "exit-round": {
    title: "Leave this round?",
    body: "Your current round will end. Points scored so far still count.",
    confirm: "Leave round",
    dismiss: "Keep playing",
  },
  "reset-preferences": {
    title: "Reset preferences?",
    body: "Team names, round length and rounds per team go back to their defaults.",
    confirm: "Reset",
    dismiss: "Cancel",
  },
};

export function renderDialog(kind) {
  const dialog = DIALOGS[kind];
  if (!dialog) return "";

  return `<div class="dialog-backdrop" data-action="dismiss-dialog">
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" data-stop>
      <h2 class="card-title" id="dialog-title">${esc(dialog.title)}</h2>
      <p class="copy">${esc(dialog.body)}</p>
      <div class="dialog-actions">
        ${button({ label: dialog.dismiss, action: "dismiss-dialog", variant: "primary" })}
        ${button({ label: dialog.confirm, action: "confirm-dialog", variant: "ghost" })}
      </div>
    </div>
  </div>`;
}
