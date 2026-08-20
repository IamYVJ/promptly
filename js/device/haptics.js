/**
 * Vibration feedback. Always optional — the game never depends on it.
 */

export function createHaptics(isEnabled) {
  function vibrate(pattern) {
    if (!isEnabled()) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* Unsupported or blocked: silently skip. */
    }
  }

  return {
    correct: () => vibrate(40),
    skip: () => vibrate([16, 60, 16]),
    locked: () => vibrate([24, 50, 24]),
    roundEnd: () => vibrate([90, 70, 90]),
  };
}
