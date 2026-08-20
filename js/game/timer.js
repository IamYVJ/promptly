/**
 * Timestamp-based round timer.
 *
 * The interval only decides how often we look at the clock; `Date.now()` is
 * the source of truth, so backgrounding the tab or a throttled interval can
 * never hand back time.
 */

export function createTimer({ onTick, onExpire, tickMs = 100 } = {}) {
  let handle = null;
  let endsAt = 0;
  let pausedRemaining = null;

  function clear() {
    if (handle !== null) {
      clearInterval(handle);
      handle = null;
    }
  }

  function tick() {
    const remaining = Math.max(0, endsAt - Date.now());
    onTick?.(remaining);

    if (remaining === 0) {
      clear();
      onExpire?.();
    }
  }

  return {
    start(durationMs) {
      clear();
      pausedRemaining = null;
      endsAt = Date.now() + durationMs;
      handle = setInterval(tick, tickMs);
      onTick?.(durationMs);
      return endsAt;
    },

    stop() {
      clear();
      pausedRemaining = null;
      endsAt = 0;
    },

    pause() {
      if (handle === null) return;
      pausedRemaining = Math.max(0, endsAt - Date.now());
      clear();
    },

    /** Resumes and returns the new expiry timestamp. */
    resume() {
      if (pausedRemaining === null) return endsAt;
      endsAt = Date.now() + pausedRemaining;
      pausedRemaining = null;
      clear();
      handle = setInterval(tick, tickMs);
      return endsAt;
    },

    /** Force an immediate read — used when the tab becomes visible again. */
    sync() {
      if (handle !== null) tick();
    },

    get remaining() {
      return pausedRemaining ?? Math.max(0, endsAt - Date.now());
    },

    get running() {
      return handle !== null;
    },
  };
}
