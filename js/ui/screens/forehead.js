import { backButton, banner, button, esc, linkButton } from "../components.js";

const MOTION_ERRORS = {
  unsupported: {
    title: "Motion controls aren't available on this device.",
    body: "You can still play using the on-screen controls.",
  },
  denied: {
    title: "Motion access was blocked.",
    body: "You can still play using the on-screen controls, or allow motion access in your browser settings and try again.",
  },
  "no-sensor": {
    title: "We couldn't read this device's motion sensor.",
    body: "You can still play using the on-screen controls.",
  },
};

function gestureDiagram() {
  return `<div class="gesture-diagram">
    <div class="gesture gesture-correct">
      <span class="gesture-phone" aria-hidden="true"></span>
      <span class="gesture-label">Tilt forward</span>
      <span class="gesture-hint">Correct</span>
    </div>
    <div class="gesture gesture-skip">
      <span class="gesture-phone" aria-hidden="true"></span>
      <span class="gesture-label">Tilt back</span>
      <span class="gesture-hint">Skip</span>
    </div>
  </div>`;
}

export function renderForeheadControls(state) {
  const error = MOTION_ERRORS[state.motion.error];
  const motionBlocked = state.motion.support === "unsupported" || state.motion.error === "denied";

  return `<section class="screen" tabindex="-1" aria-labelledby="controls-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Forehead</span>
      <h1 class="title" id="controls-title">How do you want to play?</h1>
    </header>

    <div class="grow stack stack-lg pad-top">
      ${error ? banner({ title: error.title, body: error.body }) : ""}

      <div class="card-list">
        <button
          type="button"
          class="card mode-card"
          data-action="choose-controls"
          data-value="motion"
          ${motionBlocked ? "disabled" : ""}
        >
          <span class="eyebrow eyebrow-accent">Recommended</span>
          <span class="mode-name">Motion controls</span>
          <span class="mode-desc">Tilt the phone forward for correct, back to skip. Nobody touches the screen.</span>
        </button>

        <button type="button" class="card mode-card" data-action="choose-controls" data-value="touch">
          <span class="eyebrow">Always works</span>
          <span class="mode-name">Touch controls</span>
          <span class="mode-desc">Big Done and Skip buttons on screen.</span>
        </button>
      </div>

      ${gestureDiagram()}
    </div>
  </section>`;
}

export function renderMotionPermission() {
  return `<section class="screen" tabindex="-1" aria-labelledby="permission-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Forehead</span>
      <h1 class="title" id="permission-title">Allow motion access</h1>
      <p class="copy">Your browser needs permission to read how the phone is tilted. Nothing leaves this device.</p>
    </header>

    <div class="grow"></div>

    <div class="footer-actions">
      ${button({ label: "Allow motion access", action: "grant-motion", variant: "primary", large: true })}
      ${button({ label: "Use touch controls instead", action: "choose-controls", value: "touch", variant: "ghost" })}
    </div>
  </section>`;
}

const CALIBRATION_COPY = {
  neutral: {
    step: "Hold the phone against your forehead and keep still.",
    hint: "Screen facing your team.",
  },
  gesture: {
    step: "Now tilt it forward once, like you nailed the answer.",
    hint: "That teaches Promptly which way is forward on your phone.",
  },
  ready: {
    step: "Ready to play.",
    hint: "Tilt forward for correct, back to skip.",
  },
};

export function renderCalibration(state) {
  const stage = CALIBRATION_COPY[state.motion.stage] ? state.motion.stage : "neutral";
  const copy = CALIBRATION_COPY[stage];
  const ready = stage === "ready";

  return `<section class="screen" tabindex="-1" aria-labelledby="calibration-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Forehead</span>
      <h1 class="title" id="calibration-title">Quick calibration</h1>
    </header>

    <div class="grow stack stack-lg pad-top">
      <div class="calibration-status">
        <p class="calibration-step${ready ? " calibration-step-done" : ""}">${
          ready ? "&#10003; " : ""
        }${esc(copy.step)}</p>
        <p class="copy-muted">${esc(copy.hint)}</p>
        ${
          ready
            ? ""
            : `<span class="meter"><span class="meter-fill" data-meter style="width: ${Math.round(
                state.motion.progress * 100
              )}%"></span></span>`
        }
      </div>

      ${gestureDiagram()}
    </div>

    <div class="footer-actions">
      ${
        ready
          ? button({ label: "Continue", action: "finish-calibration", variant: "primary", large: true })
          : ""
      }
      <div class="utility-row">
        ${linkButton("Start over", "recalibrate")}
        ${linkButton("Use touch controls", "use-touch-controls")}
      </div>
    </div>
  </section>`;
}
