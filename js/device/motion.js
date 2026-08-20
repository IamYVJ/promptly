/**
 * Device motion → semantic actions ("correct" / "skip").
 *
 * All sensor handling is confined to this module. The game engine never sees a
 * raw reading; it receives the same actions a button would produce.
 *
 * Why the z axis of `accelerationIncludingGravity`:
 *   z points out of the screen, so its share of gravity tells us how far the
 *   screen is tilted from vertical — and it is unaffected by rotation within
 *   the screen plane. That sidesteps the portrait/landscape axis swap and the
 *   gimbal lock that `deviceorientation` beta/gamma hit when a phone is held
 *   upright in landscape, which is exactly the Forehead posture.
 *
 * Direction is learned, not assumed: calibration asks for one deliberate
 * forward tilt and records its sign. Vendors disagree on the sign convention
 * of the raw values, so the player's own gesture defines "forward".
 */

const SAMPLE_TIMEOUT_MS = 2200; // No usable reading in this window → no sensor.
const SMOOTHING = 0.3; // Low-pass factor; higher reacts faster, noisier.
const STILL_TOLERANCE = 0.08; // Allowed spread while capturing neutral.
const STILL_DURATION_MS = 600;
const CALIBRATION_TILT = 0.38; // ~22° from neutral locks the direction.
const ACTION_TILT = 0.42; // ~25° from neutral triggers an action.
const NEUTRAL_BAND = 0.2; // Must return inside this to re-arm.
const COOLDOWN_MS = 380;
const GRAVITY_MIN = 0.55; // Reject samples taken mid-shake.
const GRAVITY_MAX = 1.7;

export function detectSupport() {
  if (typeof window === "undefined" || typeof window.DeviceMotionEvent === "undefined") {
    return "unsupported";
  }
  return typeof window.DeviceMotionEvent.requestPermission === "function"
    ? "needs-permission"
    : "available";
}

/** Must be called from a user gesture — iOS rejects it otherwise. */
export async function requestPermission() {
  const MotionEvent = window.DeviceMotionEvent;
  if (typeof MotionEvent?.requestPermission !== "function") return "unnecessary";

  try {
    const result = await MotionEvent.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export function createMotionController({ onStage, onAction, onError } = {}) {
  let listening = false;
  let stage = "idle"; // "idle" | "neutral" | "gesture" | "ready"
  let neutralOnly = false;

  let smoothed = null;
  let neutral = 0;
  let forwardSign = 0;

  let gate = "wait-neutral"; // "wait-neutral" | "armed"
  let active = false;
  let lastActionAt = 0;

  let stillSince = 0;
  let stillMin = 0;
  let stillMax = 0;

  let watchdog = null;
  let sawSample = false;

  function emitStage(progress) {
    onStage?.({ stage, progress });
  }

  function armWatchdog() {
    clearTimeout(watchdog);
    sawSample = false;
    watchdog = setTimeout(() => {
      watchdog = null;
      if (!sawSample) onError?.("no-sensor");
    }, SAMPLE_TIMEOUT_MS);
  }

  /** Screen-normal share of gravity, in the range -1..1, unit agnostic. */
  function readTilt(event) {
    const reading = event.accelerationIncludingGravity;
    if (!reading) return null;

    const x = reading.x ?? 0;
    const y = reading.y ?? 0;
    const z = reading.z;
    if (typeof z !== "number") return null;

    const magnitude = Math.hypot(x, y, z);
    if (!Number.isFinite(magnitude) || magnitude === 0) return null;

    // Most browsers report m/s², a few report g.
    const gravityRatio = magnitude / (magnitude > 3 ? 9.80665 : 1);
    if (gravityRatio < GRAVITY_MIN || gravityRatio > GRAVITY_MAX) return null;

    return z / magnitude;
  }

  function trackStillness(now) {
    if (stillSince === 0 || stillMax - stillMin > STILL_TOLERANCE) {
      stillSince = now;
      stillMin = smoothed;
      stillMax = smoothed;
    }

    stillMin = Math.min(stillMin, smoothed);
    stillMax = Math.max(stillMax, smoothed);

    const held = now - stillSince;
    emitStage(Math.min(1, held / STILL_DURATION_MS));

    if (held < STILL_DURATION_MS) return;

    neutral = smoothed;
    stillSince = 0;

    if (neutralOnly) {
      stage = "ready";
      gate = "wait-neutral";
      emitStage(1);
    } else {
      stage = "gesture";
      emitStage(0);
    }
  }

  function trackCalibrationGesture() {
    const delta = smoothed - neutral;
    const magnitude = Math.abs(delta);

    if (magnitude < CALIBRATION_TILT) {
      emitStage(Math.min(1, magnitude / CALIBRATION_TILT));
      return;
    }

    forwardSign = Math.sign(delta);
    stage = "ready";
    gate = "wait-neutral";
    emitStage(1);
  }

  function trackActions(now) {
    const delta = smoothed - neutral;

    if (gate === "wait-neutral") {
      if (Math.abs(delta) < NEUTRAL_BAND) gate = "armed";
      return;
    }

    if (!active || now - lastActionAt < COOLDOWN_MS) return;
    if (Math.abs(delta) < ACTION_TILT) return;

    gate = "wait-neutral";
    lastActionAt = now;
    onAction?.(Math.sign(delta) === forwardSign ? "correct" : "skip");
  }

  function handleMotion(event) {
    const tilt = readTilt(event);
    if (tilt === null) return;

    sawSample = true;
    if (watchdog !== null) {
      clearTimeout(watchdog);
      watchdog = null;
    }

    smoothed = smoothed === null ? tilt : smoothed + (tilt - smoothed) * SMOOTHING;

    const now = Date.now();
    if (stage === "neutral") trackStillness(now);
    else if (stage === "gesture") trackCalibrationGesture();
    else if (stage === "ready") trackActions(now);
  }

  return {
    start() {
      if (listening) return;
      window.addEventListener("devicemotion", handleMotion, { passive: true });
      listening = true;
      armWatchdog();
    },

    stop() {
      if (listening) {
        window.removeEventListener("devicemotion", handleMotion);
        listening = false;
      }
      clearTimeout(watchdog);
      watchdog = null;
      active = false;
      if (stage === "neutral" || stage === "gesture") stage = "idle";
    },

    /**
     * `neutralOnly` re-captures the resting position while keeping the learned
     * direction — run silently during the countdown so each new player gets a
     * neutral that matches how they are actually holding the phone.
     */
    calibrate({ neutralOnly: onlyNeutral = false } = {}) {
      neutralOnly = onlyNeutral && forwardSign !== 0;
      stage = "neutral";
      smoothed = null;
      stillSince = 0;
      gate = "wait-neutral";
      active = false;
      armWatchdog();
      emitStage(0);
    },

    /** Accept the previous neutral if the player never held still enough. */
    commitNeutral() {
      if (stage !== "neutral" || forwardSign === 0) return;
      stage = "ready";
      gate = "wait-neutral";
      emitStage(1);
    },

    setActive(next) {
      active = Boolean(next) && stage === "ready";
    },

    /** Forget the learned direction — a full recalibration follows. */
    reset() {
      stage = "idle";
      smoothed = null;
      neutral = 0;
      forwardSign = 0;
      gate = "wait-neutral";
      active = false;
      lastActionAt = 0;
    },

    get calibrated() {
      return forwardSign !== 0;
    },

    get stage() {
      return stage;
    },
  };
}
