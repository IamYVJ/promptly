/**
 * The controller: every semantic action enters here, is validated against the
 * rules, mutates state through the match engine, and then the renderer runs.
 *
 * All three modes share this file. A mode only changes which screens appear
 * (via its metadata) and where actions come from (touch, motion, keyboard).
 */

import {
  LIVE_SCREENS,
  SCREEN,
  createInitialState,
  createMatchState,
  createRoundState,
  toPreferences,
} from "../core/state.js";
import { getMode } from "../data/modes.js";
import { getCategory } from "../data/categories.js";
import { ROUND_LIMITS, ROUND_PRESETS, clearPreferences, savePreferences } from "../storage/preferences.js";
import { createAudio } from "../device/audio.js";
import { createHaptics } from "../device/haptics.js";
import { createMotionController, detectSupport, requestPermission } from "../device/motion.js";
import * as match from "./match.js";
import { canAcceptAction, isMatchComplete } from "./rules.js";
import { createTimer } from "./timer.js";
import { createWordDeck } from "./wordDeck.js";

const FLASH_MS = 420;
const TIME_FLASH_MS = 950;
const COUNTDOWN_STEP_MS = 620;
const COUNTDOWN_SEQUENCE = ["3", "2", "1", "GO"];

const BACK_TARGETS = {
  [SCREEN.CATEGORIES]: SCREEN.HOME,
  [SCREEN.SETUP]: SCREEN.CATEGORIES,
  [SCREEN.FOREHEAD_CONTROLS]: SCREEN.SETUP,
  [SCREEN.MOTION_PERMISSION]: SCREEN.FOREHEAD_CONTROLS,
  [SCREEN.CALIBRATION]: SCREEN.FOREHEAD_CONTROLS,
  [SCREEN.HOW_TO_PLAY]: SCREEN.HOME,
  [SCREEN.SETTINGS]: SCREEN.HOME,
};

export function createController({ store, bus }) {
  let deck = null;
  let flashTimeout = null;
  let countdownTimeout = null;

  const state = () => store.state;
  const haptics = createHaptics(() => state().settings.haptics);
  const audio = createAudio(() => state().settings.sound);

  const timer = createTimer({
    onTick: (remaining) => bus.emit("timer:tick", remaining),
    onExpire: () => {
      if (state().round.status === "playing") endRound("time");
    },
  });

  const motion = createMotionController({
    onStage: ({ stage, progress }) => {
      if (stage === state().motion.stage) {
        bus.emit("motion:progress", progress);
        return;
      }

      store.commit((next) => {
        next.motion.stage = stage;
        next.motion.progress = progress;
        if (stage === "ready") next.motion.calibrated = true;
      });

      if (stage === "ready" && state().screen === SCREEN.CALIBRATION) {
        haptics.locked();
        audio.locked();
      }
    },
    onAction: (action) => submitAction(action),
    onError: () => handleMotionFailure("no-sensor"),
  });

  /* --- helpers --------------------------------------------------------- */

  function persist() {
    savePreferences(toPreferences(state()));
  }

  function clearPendingTimeouts() {
    clearTimeout(flashTimeout);
    clearTimeout(countdownTimeout);
    flashTimeout = null;
    countdownTimeout = null;
  }

  function stopEverything() {
    clearPendingTimeouts();
    timer.stop();
    motion.stop();
  }

  function usesMotionControls(current = state()) {
    const mode = getMode(current.modeId);
    return (
      Boolean(mode?.controlChoice) &&
      current.settings.foreheadControlMode === "motion" &&
      current.motion.calibrated
    );
  }

  /* --- navigation ------------------------------------------------------ */

  function goHome() {
    stopEverything();
    deck = null;
    store.commit((next) => {
      next.screen = SCREEN.HOME;
      next.modeId = null;
      next.match = createMatchState();
      next.round = createRoundState();
      next.dialog = null;
      for (const team of next.teams) team.score = 0;
    });
  }

  function goBack() {
    const target = BACK_TARGETS[state().screen];
    if (!target) {
      goHome();
      return;
    }

    motion.stop();
    store.commit((next) => {
      next.screen = target;
    });
  }

  function selectMode(modeId) {
    if (!getMode(modeId)) return;
    store.commit((next) => {
      next.modeId = modeId;
      next.screen = SCREEN.CATEGORIES;
    });
  }

  function selectCategory(categoryId) {
    if (!getCategory(categoryId)) return;
    store.commit((next) => {
      next.settings.categoryId = categoryId;
      next.screen = SCREEN.SETUP;
    });
    persist();
  }

  function openScreen(screen) {
    store.commit((next) => {
      next.screen = screen;
    });
  }

  /* --- setup ----------------------------------------------------------- */

  function editTeamName(index, value) {
    store.quiet((next) => {
      const team = next.teams[index];
      if (team) team.name = value;
    });
  }

  function commitTeamName(index, value) {
    store.commit((next) => {
      const team = next.teams[index];
      if (team) team.name = value.trim() || `Team ${index + 1}`;
    });
    persist();
  }

  function setDuration(seconds) {
    store.commit((next) => {
      next.settings.durationSeconds = seconds;
    });
    persist();
  }

  function setRoundsPerTeam(rounds) {
    const clamped = Math.min(ROUND_LIMITS.max, Math.max(ROUND_LIMITS.min, rounds));
    store.commit((next) => {
      next.settings.roundsPerTeam = clamped;
      next.ui.customRounds = !ROUND_PRESETS.includes(clamped);
    });
    persist();
  }

  function useCustomRounds() {
    store.commit((next) => {
      next.ui.customRounds = true;
    });
  }

  /* --- match lifecycle ------------------------------------------------- */

  function startMatch() {
    const current = state();
    const mode = getMode(current.modeId);
    const category = getCategory(current.settings.categoryId);

    if (!mode) {
      goHome();
      return;
    }

    if (!category) {
      openScreen(SCREEN.CATEGORIES);
      return;
    }

    deck = createWordDeck(category.words);
    const support = mode.controlChoice ? detectSupport() : state().motion.support;

    store.commit((next) => {
      next.teams.forEach((team, index) => {
        team.name = team.name.trim() || `Team ${index + 1}`;
      });
      match.startMatch(next);
      next.motion.support = support;
      next.screen = mode.controlChoice ? SCREEN.FOREHEAD_CONTROLS : SCREEN.HANDOFF;
    });

    persist();

    if (mode.controlChoice && support === "unsupported") {
      handleMotionFailure("unsupported");
    }
  }

  function confirmReady() {
    const mode = getMode(state().modeId);
    if (!mode) return;

    store.commit((next) => {
      match.beginTurn(next);
      next.screen = mode.privateReveal ? SCREEN.REVEAL : SCREEN.COUNTDOWN;
    });

    if (!mode.privateReveal) startCountdown();
  }

  function revealPrompt() {
    if (state().screen !== SCREEN.REVEAL) return;
    openScreen(SCREEN.COUNTDOWN);
    startCountdown();
  }

  function startCountdown() {
    clearPendingTimeouts();

    if (usesMotionControls()) {
      motion.start();
      motion.setActive(false);
      motion.calibrate({ neutralOnly: true });
    }

    let index = 0;

    const step = () => {
      if (state().screen !== SCREEN.COUNTDOWN) return;

      const value = COUNTDOWN_SEQUENCE[index];
      store.commit((next) => {
        next.round.countdown = value;
      });

      if (index === COUNTDOWN_SEQUENCE.length - 1) audio.go();
      else audio.countdown();

      index += 1;

      countdownTimeout =
        index < COUNTDOWN_SEQUENCE.length
          ? setTimeout(step, COUNTDOWN_STEP_MS)
          : setTimeout(beginPlay, Math.round(COUNTDOWN_STEP_MS * 0.6));
    };

    step();
  }

  function beginPlay() {
    countdownTimeout = null;
    if (state().screen !== SCREEN.COUNTDOWN) return;

    const word = deck?.next() ?? null;
    const endsAt = timer.start(state().settings.durationSeconds * 1000);

    store.commit((next) => {
      match.startRound(next, { endsAt, word });
      next.screen = SCREEN.PLAYING;
    });

    if (usesMotionControls()) {
      motion.commitNeutral();
      motion.setActive(true);
    }
  }

  /** The single entry point for scoring, whatever the input was. */
  function submitAction(action) {
    if (action !== "correct" && action !== "skip") return;
    if (!canAcceptAction(state())) return;

    store.commit((next) => {
      match.recordAction(next, action);
    });

    if (action === "correct") {
      haptics.correct();
      audio.correct();
    } else {
      haptics.skip();
      audio.skip();
    }

    clearTimeout(flashTimeout);
    flashTimeout = setTimeout(advanceWord, FLASH_MS);
  }

  function advanceWord() {
    flashTimeout = null;
    const current = state();
    if (current.screen !== SCREEN.PLAYING || current.round.status !== "playing") return;

    if (Date.now() >= current.round.endsAt) {
      endRound("time");
      return;
    }

    const word = deck?.next() ?? null;
    store.commit((next) => {
      match.showWord(next, word);
    });
  }

  function endRound(reason) {
    clearPendingTimeouts();
    timer.stop();
    motion.stop();
    haptics.roundEnd();

    if (reason !== "time") {
      store.commit((next) => {
        match.finishRound(next);
        next.dialog = null;
        next.screen = SCREEN.ROUND_COMPLETE;
      });
      return;
    }

    audio.timeUp();
    store.commit((next) => {
      match.finishRound(next);
      next.dialog = null;
      next.round.flash = { type: "time", word: null };
    });

    flashTimeout = setTimeout(() => {
      flashTimeout = null;
      store.commit((next) => {
        next.round.flash = null;
        next.screen = SCREEN.ROUND_COMPLETE;
      });
    }, TIME_FLASH_MS);
  }

  function nextTurn() {
    const current = state();

    if (isMatchComplete(current.match, current.settings.roundsPerTeam)) {
      store.commit((next) => {
        match.completeMatch(next);
        next.screen = SCREEN.MATCH_COMPLETE;
      });
      return;
    }

    store.commit((next) => {
      match.advanceTurn(next);
      match.beginTurn(next);
      next.screen = SCREEN.HANDOFF;
    });
  }

  function playAgain() {
    const category = getCategory(state().settings.categoryId);
    if (category) deck = createWordDeck(category.words);

    store.commit((next) => {
      match.startMatch(next);
      next.screen = SCREEN.HANDOFF;
    });
  }

  /* --- forehead controls ----------------------------------------------- */

  function chooseControls(kind) {
    if (kind === "touch") {
      motion.stop();
      store.commit((next) => {
        next.settings.foreheadControlMode = "touch";
        next.motion.error = null;
        next.screen = SCREEN.HANDOFF;
      });
      persist();
      return;
    }

    const support = detectSupport();
    store.commit((next) => {
      next.settings.foreheadControlMode = "motion";
      next.motion.support = support;
      next.motion.error = null;
    });
    persist();

    if (support === "unsupported") {
      handleMotionFailure("unsupported");
      return;
    }

    if (support === "needs-permission" && state().motion.permission !== "granted") {
      openScreen(SCREEN.MOTION_PERMISSION);
      return;
    }

    beginCalibration();
  }

  async function grantMotionPermission() {
    const result = await requestPermission();

    store.commit((next) => {
      next.motion.permission = result;
    });

    if (result === "granted" || result === "unnecessary") beginCalibration();
    else handleMotionFailure("denied");
  }

  function beginCalibration() {
    motion.reset();
    store.commit((next) => {
      next.motion.calibrated = false;
      next.motion.stage = "neutral";
      next.motion.progress = 0;
      next.motion.error = null;
      next.screen = SCREEN.CALIBRATION;
    });
    motion.start();
    motion.calibrate();
  }

  /** Calibration done: park the sensor until the countdown re-arms it. */
  function finishCalibration() {
    if (state().screen !== SCREEN.CALIBRATION) return;
    motion.stop();
    openScreen(SCREEN.HANDOFF);
  }

  /** Motion is never required: any failure lands the player on touch controls. */
  function handleMotionFailure(reason) {
    motion.stop();
    const wasSettingUp = [SCREEN.MOTION_PERMISSION, SCREEN.CALIBRATION].includes(state().screen);

    store.commit((next) => {
      next.settings.foreheadControlMode = "touch";
      next.motion.error = reason;
      next.motion.calibrated = false;
      next.motion.stage = "idle";
      if (wasSettingUp) next.screen = SCREEN.FOREHEAD_CONTROLS;
    });

    persist();
  }

  /* --- dialogs and interruptions --------------------------------------- */

  function requestExit() {
    const current = state();

    if (!LIVE_SCREENS.has(current.screen)) {
      goHome();
      return;
    }

    clearPendingTimeouts();
    timer.pause();
    motion.setActive(false);

    store.commit((next) => {
      next.dialog = "exit-round";
    });
  }

  function dismissDialog() {
    const wasExit = state().dialog === "exit-round";

    store.commit((next) => {
      next.dialog = null;
    });

    if (!wasExit) return;

    const current = state();
    if (current.screen === SCREEN.PLAYING) {
      const endsAt = timer.resume();
      store.commit((next) => {
        next.round.endsAt = endsAt;
      });
      if (usesMotionControls()) motion.setActive(true);
    } else if (current.screen === SCREEN.COUNTDOWN) {
      startCountdown();
    }
  }

  function confirmDialog() {
    const dialog = state().dialog;

    if (dialog === "exit-round") {
      store.commit((next) => {
        next.dialog = null;
      });

      if (state().round.status === "playing") endRound("exit");
      else goHome();
      return;
    }

    if (dialog === "reset-preferences") {
      stopEverything();
      deck = null;
      store.replace(createInitialState(clearPreferences()));
    }
  }

  function openDialog(kind) {
    store.commit((next) => {
      next.dialog = kind;
    });
  }

  /* --- settings -------------------------------------------------------- */

  function toggleSetting(key) {
    if (key !== "haptics" && key !== "sound") return;
    store.commit((next) => {
      next.settings[key] = !next.settings[key];
    });
    persist();
  }

  function setHowToMode(modeId) {
    if (!getMode(modeId)) return;
    store.commit((next) => {
      next.ui.howToModeId = modeId;
    });
  }

  /** Re-read the clock after the tab was hidden, in case the round expired. */
  function syncTimer() {
    timer.sync();
  }

  return {
    goHome,
    goBack,
    openScreen,
    selectMode,
    selectCategory,
    editTeamName,
    commitTeamName,
    setDuration,
    setRoundsPerTeam,
    useCustomRounds,
    startMatch,
    confirmReady,
    revealPrompt,
    submitAction,
    nextTurn,
    playAgain,
    chooseControls,
    grantMotionPermission,
    beginCalibration,
    finishCalibration,
    requestExit,
    openDialog,
    dismissDialog,
    confirmDialog,
    toggleSetting,
    setHowToMode,
    syncTimer,
  };
}
