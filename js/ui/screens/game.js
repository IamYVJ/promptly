import { getMode } from "../../data/modes.js";
import { esc, formatClock } from "../components.js";

const FLASH_TEXT = {
  correct: "&#10003; Correct",
  skip: "Skipped",
  time: "Time!",
};

function clock(state) {
  const remaining = Math.max(0, (state.round.endsAt ?? 0) - Date.now());
  return `<span class="timer" data-timer aria-label="Time remaining">${formatClock(remaining)}</span>`;
}

function exitButton() {
  return `<button type="button" class="hud-exit" data-action="request-exit" aria-label="Leave round">
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/>
    </svg>
  </button>`;
}

function flashOverlay(state) {
  const { flash } = state.round;
  if (!flash) return "";

  return `<div class="flash flash-${esc(flash.type)}">
    <p class="flash-text">${FLASH_TEXT[flash.type] ?? ""}</p>
  </div>`;
}

function touchControls() {
  return `<div class="controls">
    <button type="button" class="control-btn control-skip" data-action="skip">Skip</button>
    <button type="button" class="control-btn control-done" data-action="correct">Done</button>
  </div>`;
}

function renderStandardGame(state, mode) {
  const team = state.teams[state.match.activeTeamIndex];

  return `<section class="game screen-flush" tabindex="-1" aria-label="${esc(mode.name)} round">
    <div class="hud">
      <span class="hud-team">${esc(team.name)}</span>
      ${clock(state)}
      ${exitButton()}
    </div>

    <div class="prompt-area">
      ${mode.promptLabel ? `<p class="prompt-label">${esc(mode.promptLabel)}</p>` : ""}
      <p class="prompt">${esc(state.round.currentWord ?? "")}</p>
    </div>

    <div>
      ${touchControls()}
      <p class="score-line">Score <strong>${state.round.correctWords.length}</strong> &middot; Skipped ${
        state.round.skippedWords.length
      }</p>
    </div>

    ${flashOverlay(state)}
  </section>`;
}

function renderForeheadGame(state, mode) {
  const motionControls =
    state.settings.foreheadControlMode === "motion" && state.motion.calibrated;

  return `<section class="game game-forehead screen-flush" tabindex="-1" aria-label="${esc(
    mode.name
  )} round">
    <div class="hud">
      ${clock(state)}
      <span class="hud-spacer"></span>
      <span class="fh-score" aria-label="Correct this round">+${state.round.correctWords.length}</span>
      ${exitButton()}
    </div>

    <div class="prompt-area">
      <p class="fh-prompt">${esc(state.round.currentWord ?? "")}</p>
    </div>

    <div>
      ${motionControls ? "" : touchControls()}
      ${
        motionControls
          ? `<p class="fh-hint">Tilt forward &middot; correct &nbsp; | &nbsp; Tilt back &middot; skip</p>`
          : ""
      }
      <p class="rotate-hint">Turn your phone sideways</p>
    </div>

    ${flashOverlay(state)}
  </section>`;
}

export function renderGame(state) {
  const mode = getMode(state.modeId);
  if (!mode) return "";

  return mode.presentation === "forehead"
    ? renderForeheadGame(state, mode)
    : renderStandardGame(state, mode);
}
