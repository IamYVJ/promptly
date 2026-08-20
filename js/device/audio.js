/**
 * Short WebAudio cues. No files, no library — a couple of oscillators.
 * Every cue follows a user action or an in-round event, never page load.
 */

export function createAudio(isEnabled) {
  let context = null;

  function ensureContext() {
    if (!isEnabled()) return null;

    const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtor) return null;

    if (context === null) {
      try {
        context = new AudioCtor();
      } catch {
        return null;
      }
    }

    if (context.state === "suspended") context.resume?.();
    return context;
  }

  function tone(frequency, duration, { delay = 0, gain = 0.05, type = "sine" } = {}) {
    const audio = ensureContext();
    if (!audio) return;

    const oscillator = audio.createOscillator();
    const amplifier = audio.createGain();
    const startAt = audio.currentTime + delay;

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    amplifier.gain.setValueAtTime(0.0001, startAt);
    amplifier.gain.linearRampToValueAtTime(gain, startAt + 0.012);
    amplifier.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(amplifier).connect(audio.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  return {
    correct() {
      tone(660, 0.11);
      tone(988, 0.16, { delay: 0.07 });
    },
    skip() {
      tone(300, 0.14, { type: "triangle", gain: 0.04 });
    },
    countdown() {
      tone(520, 0.07, { gain: 0.035 });
    },
    go() {
      tone(784, 0.16);
    },
    locked() {
      tone(880, 0.12);
    },
    timeUp() {
      tone(523, 0.16);
      tone(392, 0.18, { delay: 0.15 });
      tone(294, 0.3, { delay: 0.32 });
    },
  };
}
