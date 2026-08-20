/**
 * Entry point: build the store, controller and renderer, then wire the DOM to
 * them. Every interaction arrives here as a `data-action` and leaves as a
 * single controller call — there are no per-element listeners anywhere else.
 */

import { createBus } from "./core/events.js";
import { createStore } from "./core/store.js";
import { LIVE_SCREENS, SCREEN, createInitialState } from "./core/state.js";
import { createController } from "./game/controller.js";
import { loadPreferences } from "./storage/preferences.js";
import { createRenderer, paintMotionProgress, paintTimer } from "./ui/render.js";

const root = document.getElementById("app");
const liveRegion = document.getElementById("live");

const store = createStore(createInitialState(loadPreferences()));
const bus = createBus();
const controller = createController({ store, bus });
const render = createRenderer({ root, liveRegion });

/* --- action table ------------------------------------------------------- */

const ACTIONS = {
  back: () => controller.goBack(),
  "go-home": () => controller.goHome(),
  "how-to-play": () => controller.openScreen(SCREEN.HOW_TO_PLAY),
  "open-settings": () => controller.openScreen(SCREEN.SETTINGS),
  "change-settings": () => controller.openScreen(SCREEN.SETUP),

  "select-mode": (value) => controller.selectMode(value),
  "select-category": (value) => controller.selectCategory(value),
  "set-duration": (value) => controller.setDuration(Number(value)),
  "set-rounds": (value) => controller.setRoundsPerTeam(Number(value)),
  "use-custom-rounds": () => controller.useCustomRounds(),
  "start-match": () => controller.startMatch(),

  "confirm-ready": () => controller.confirmReady(),
  "reveal-word": () => controller.revealPrompt(),
  correct: () => controller.submitAction("correct"),
  skip: () => controller.submitAction("skip"),
  "next-turn": () => controller.nextTurn(),
  "play-again": () => controller.playAgain(),

  "choose-controls": (value) => controller.chooseControls(value),
  "grant-motion": () => controller.grantMotionPermission(),
  recalibrate: () => controller.beginCalibration(),
  "finish-calibration": () => controller.finishCalibration(),
  "use-touch-controls": () => controller.chooseControls("touch"),

  "request-exit": () => controller.requestExit(),
  "open-dialog": (value) => controller.openDialog(value),
  "dismiss-dialog": () => controller.dismissDialog(),
  "confirm-dialog": () => controller.confirmDialog(),

  "toggle-setting": (value) => controller.toggleSetting(value),
  "set-how-to-mode": (value) => controller.setHowToMode(value),
};

/* --- delegated input ---------------------------------------------------- */

root.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger) return;

  // A click inside a `data-stop` region never reaches an outer action, so the
  // dialog panel does not dismiss through its own backdrop.
  const stop = event.target.closest("[data-stop]");
  if (stop && trigger.contains(stop)) return;

  const handler = ACTIONS[trigger.dataset.action];
  if (!handler) return;

  handler(trigger.dataset.value);
});

root.addEventListener("input", (event) => {
  const field = event.target.closest("[data-field='team']");
  if (!field) return;
  controller.editTeamName(Number(field.dataset.index), field.value);
});

root.addEventListener("change", (event) => {
  const field = event.target.closest("[data-field]");
  if (!field) return;

  if (field.dataset.field === "team") {
    controller.commitTeamName(Number(field.dataset.index), field.value);
  } else if (field.dataset.field === "rounds") {
    controller.setRoundsPerTeam(Number(field.value));
  }
});

/* --- keyboard shortcuts -------------------------------------------------- */

const CORRECT_KEYS = new Set(["arrowright", "d", " "]);
const SKIP_KEYS = new Set(["arrowleft", "s"]);

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target.closest?.("input, textarea, select")) return;

  const key = event.key.toLowerCase();
  const state = store.state;

  if (key === "escape") {
    if (state.dialog) controller.dismissDialog();
    else if (LIVE_SCREENS.has(state.screen)) controller.requestExit();
    return;
  }

  if (state.screen !== SCREEN.PLAYING || state.dialog) return;

  if (CORRECT_KEYS.has(key)) {
    event.preventDefault();
    controller.submitAction("correct");
  } else if (SKIP_KEYS.has(key)) {
    event.preventDefault();
    controller.submitAction("skip");
  }
});

/* --- lifecycle ----------------------------------------------------------- */

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) controller.syncTimer();
});

bus.on("timer:tick", paintTimer);
bus.on("motion:progress", paintMotionProgress);

store.subscribe(render);
render(store.state);

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    // Relative path so the worker's scope matches a GitHub Pages subpath.
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* Offline play is a bonus, never a requirement. */
    });
  });
}
