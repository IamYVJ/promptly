import { backButton, button, esc, toggleRow } from "../components.js";

const MOTION_NOTES = {
  unsupported: "This device doesn't report motion, so Forehead will use on-screen controls.",
  "needs-permission": "Forehead will ask for motion access the first time you choose motion controls.",
  available: "Motion controls are available for Forehead.",
};

export function renderSettings(state) {
  const { settings, motion } = state;
  const motionNote = MOTION_NOTES[motion.support];

  return `<section class="screen" tabindex="-1" aria-labelledby="settings-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Settings</span>
      <h1 class="title" id="settings-title">Preferences</h1>
    </header>

    <div class="grow stack stack-lg pad-top">
      <div class="stack">
        <h2 class="section-heading">Feedback</h2>
        ${toggleRow({
          label: "Vibration",
          hint: "A short buzz on correct, skip and time up.",
          action: "toggle-setting",
          value: "haptics",
          enabled: settings.haptics,
        })}
        ${toggleRow({
          label: "Sound",
          hint: "Quiet tones for the countdown and scoring.",
          action: "toggle-setting",
          value: "sound",
          enabled: settings.sound,
        })}
      </div>

      <div class="stack">
        <h2 class="section-heading">Forehead controls</h2>
        <p class="copy-muted">Currently defaulting to ${
          settings.foreheadControlMode === "motion" ? "motion" : "on-screen"
        } controls. You can change this at the start of any Forehead match.${
          motionNote ? ` ${esc(motionNote)}` : ""
        }</p>
      </div>

      <div class="stack">
        <h2 class="section-heading">Saved data</h2>
        <p class="copy-muted">Promptly stores your team names, round length and rounds per team on this device only. Nothing is sent anywhere.</p>
        ${button({
          label: "Reset preferences",
          action: "open-dialog",
          value: "reset-preferences",
          variant: "ghost",
        })}
      </div>
    </div>

    <div class="footer-actions">
      <p class="copy-muted">Promptly &middot; version 1.0.0 &middot; plays offline once loaded.</p>
    </div>
  </section>`;
}
