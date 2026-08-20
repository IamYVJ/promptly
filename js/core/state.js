/**
 * State shape and the screen finite state machine.
 */

import { ROUND_PRESETS } from "../storage/preferences.js";

export const SCREEN = {
  HOME: "home",
  CATEGORIES: "categories",
  SETUP: "setup",
  FOREHEAD_CONTROLS: "foreheadControls",
  MOTION_PERMISSION: "motionPermission",
  CALIBRATION: "calibration",
  HANDOFF: "handoff",
  REVEAL: "reveal",
  COUNTDOWN: "countdown",
  PLAYING: "playing",
  ROUND_COMPLETE: "roundComplete",
  MATCH_COMPLETE: "matchComplete",
  HOW_TO_PLAY: "howToPlay",
  SETTINGS: "settings",
};

/** Screens where a match is in flight and leaving needs confirmation. */
export const LIVE_SCREENS = new Set([SCREEN.COUNTDOWN, SCREEN.PLAYING]);

export function createRoundState() {
  return {
    status: "idle",
    currentWord: null,
    correctWords: [],
    skippedWords: [],
    startedAt: null,
    endsAt: null,
    /** Transient CORRECT / SKIP / TIME feedback: { type, word }. */
    flash: null,
    /** Countdown value being shown before play ("3", "2", "1", "GO"). */
    countdown: null,
  };
}

export function createMatchState() {
  return {
    activeTeamIndex: 0,
    completedRounds: [0, 0],
    status: "idle",
  };
}

function createTeams(names) {
  return names.map((name, index) => ({
    id: `team-${index + 1}`,
    name,
    score: 0,
  }));
}

function createMotionState() {
  return {
    /** "unknown" | "unsupported" | "needs-permission" | "available" */
    support: "unknown",
    /** "unknown" | "granted" | "denied" | "unnecessary" */
    permission: "unknown",
    calibrated: false,
    /** "idle" | "neutral" | "gesture" | "ready" */
    stage: "idle",
    /** 0..1 progress for the calibration meter. */
    progress: 0,
    error: null,
  };
}

export function createInitialState(preferences) {
  return {
    screen: SCREEN.HOME,
    modeId: null,

    settings: {
      categoryId: preferences.categoryId,
      durationSeconds: preferences.durationSeconds,
      roundsPerTeam: preferences.roundsPerTeam,
      foreheadControlMode: preferences.foreheadControlMode,
      haptics: preferences.haptics,
      sound: preferences.sound,
    },

    teams: createTeams(preferences.teamNames),
    match: createMatchState(),
    round: createRoundState(),
    motion: createMotionState(),

    /** null | "exit-round" | "reset-preferences" */
    dialog: null,

    ui: {
      howToModeId: "charades",
      customRounds: !ROUND_PRESETS.includes(preferences.roundsPerTeam),
    },
  };
}

/** Serialise the persistable slice of state. */
export function toPreferences(state) {
  return {
    teamNames: state.teams.map((team) => team.name),
    durationSeconds: state.settings.durationSeconds,
    roundsPerTeam: state.settings.roundsPerTeam,
    categoryId: state.settings.categoryId,
    foreheadControlMode: state.settings.foreheadControlMode,
    haptics: state.settings.haptics,
    sound: state.settings.sound,
  };
}
