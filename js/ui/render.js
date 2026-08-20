/**
 * State → DOM. One screen renderer per FSM state, no virtual DOM.
 *
 * Full re-render on every commit, with two exceptions patched in place: the
 * round clock and the calibration meter. Both tick far too often to justify
 * rebuilding a screen.
 */

import { SCREEN } from "../core/state.js";
import { getMode } from "../data/modes.js";
import { formatClock, renderDialog } from "./components.js";
import { renderHome } from "./screens/home.js";
import { renderCategories } from "./screens/categories.js";
import { renderSetup } from "./screens/setup.js";
import { renderCalibration, renderForeheadControls, renderMotionPermission } from "./screens/forehead.js";
import { renderCountdown, renderHandoff, renderReveal } from "./screens/handoff.js";
import { renderGame } from "./screens/game.js";
import { renderRoundSummary } from "./screens/roundSummary.js";
import { renderMatchComplete } from "./screens/matchComplete.js";
import { renderHowToPlay } from "./screens/howToPlay.js";
import { renderSettings } from "./screens/settings.js";

const RENDERERS = {
  [SCREEN.HOME]: renderHome,
  [SCREEN.CATEGORIES]: renderCategories,
  [SCREEN.SETUP]: renderSetup,
  [SCREEN.FOREHEAD_CONTROLS]: renderForeheadControls,
  [SCREEN.MOTION_PERMISSION]: renderMotionPermission,
  [SCREEN.CALIBRATION]: renderCalibration,
  [SCREEN.HANDOFF]: renderHandoff,
  [SCREEN.REVEAL]: renderReveal,
  [SCREEN.COUNTDOWN]: renderCountdown,
  [SCREEN.PLAYING]: renderGame,
  [SCREEN.ROUND_COMPLETE]: renderRoundSummary,
  [SCREEN.MATCH_COMPLETE]: renderMatchComplete,
  [SCREEN.HOW_TO_PLAY]: renderHowToPlay,
  [SCREEN.SETTINGS]: renderSettings,
};

const WARNING_MS = 10_000;
const CRITICAL_MS = 5_000;

export function paintTimer(remainingMs) {
  const clocks = document.querySelectorAll("[data-timer]");
  if (clocks.length === 0) return;

  const text = formatClock(remainingMs);
  const critical = remainingMs <= CRITICAL_MS;
  const warning = !critical && remainingMs <= WARNING_MS;

  for (const clock of clocks) {
    if (clock.textContent !== text) clock.textContent = text;
    clock.classList.toggle("timer-warning", warning);
    clock.classList.toggle("timer-critical", critical);
  }
}

export function paintMotionProgress(progress) {
  const meter = document.querySelector("[data-meter]");
  if (meter) meter.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
}

function announcementFor(state) {
  switch (state.screen) {
    case SCREEN.COUNTDOWN:
      return state.round.countdown;

    case SCREEN.PLAYING: {
      const { flash, currentWord } = state.round;
      if (flash) {
        if (flash.type === "correct") return "Correct";
        if (flash.type === "skip") return "Skipped";
        return "Time is up";
      }
      // Never read the prompt out loud in Forehead — the holder must not know it.
      if (getMode(state.modeId)?.presentation === "forehead") return null;
      return currentWord ? `Prompt: ${currentWord}` : null;
    }

    case SCREEN.ROUND_COMPLETE: {
      const team = state.teams[state.match.activeTeamIndex];
      return `Round complete. ${team.name}: ${state.round.correctWords.length} correct, ${state.round.skippedWords.length} skipped.`;
    }

    case SCREEN.MATCH_COMPLETE:
      return `Match complete. ${state.teams.map((team) => `${team.name} ${team.score}`).join(", ")}.`;

    default:
      return null;
  }
}

export function createRenderer({ root, liveRegion }) {
  let lastScreen = null;
  let lastAnnouncement = null;

  return function render(state) {
    const renderScreen = RENDERERS[state.screen] ?? renderHome;
    root.innerHTML = renderScreen(state) + (state.dialog ? renderDialog(state.dialog) : "");

    document.body.dataset.screen = state.screen;
    document.body.dataset.mode = state.modeId ?? "";

    if (state.dialog) {
      root.querySelector(".dialog button")?.focus();
    } else if (state.screen !== lastScreen) {
      root.querySelector("[tabindex='-1']")?.focus({ preventScroll: true });
    }
    lastScreen = state.screen;

    const announcement = announcementFor(state);
    if (announcement && announcement !== lastAnnouncement) {
      liveRegion.textContent = announcement;
    }
    lastAnnouncement = announcement;
  };
}
