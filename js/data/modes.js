/**
 * Central mode definitions.
 *
 * The match engine is generic: a mode only describes who sees the prompt, how
 * it is presented, and how players submit CORRECT / SKIP. Adding a mode means
 * adding an entry here plus (optionally) a presentation in css/game.css.
 */

export const modes = {
  charades: {
    id: "charades",
    name: "Charades",
    eyebrow: "ACT",
    description: "Act it out. Get your team guessing.",
    inputType: "touch",
    presentation: "standard",
    /** The prompt holder must confirm nobody else is looking before it appears. */
    privateReveal: true,
    /** Mode offers a motion / touch control choice before play. */
    controlChoice: false,
    role: "performer",
    handoffLead: "Pass the phone to the performer.",
    revealNote: "Only the performer should look.",
    promptLabel: null,
    countdownHint: "Get ready to act",
    howTo: [
      "Pick a category.",
      "Pass the phone to the performer.",
      "Reveal the prompt.",
      "Act it out — no talking.",
      "Tap Done when your team guesses it.",
      "Score as many as you can before time runs out.",
    ],
  },

  forehead: {
    id: "forehead",
    name: "Forehead",
    eyebrow: "GUESS",
    description: "Hold it up. Guess what your team can see.",
    inputType: "motion",
    presentation: "forehead",
    privateReveal: false,
    controlChoice: true,
    role: "guesser",
    handoffLead: "Hold the phone against your forehead, screen facing your team.",
    revealNote: null,
    promptLabel: null,
    countdownHint: "Hold it up",
    howTo: [
      "Pick a category.",
      "Hold the phone against your forehead, screen facing your team.",
      "Your team gives clues — they must not say the word.",
      "Tilt the phone forward / down when you guess it.",
      "Tilt it backward / up to skip.",
      "Get as many as you can before time runs out.",
    ],
  },

  draw: {
    id: "draw",
    name: "Draw & Guess",
    eyebrow: "DRAW",
    description: "Draw it. Get your team guessing.",
    inputType: "touch",
    presentation: "standard",
    privateReveal: true,
    controlChoice: false,
    role: "drawer",
    handoffLead: "Pass the phone to the drawer.",
    revealNote: "Only the drawer should look.",
    promptLabel: "Draw this",
    countdownHint: "Get ready to draw",
    howTo: [
      "Pick a category.",
      "Pass the phone to the drawer.",
      "Reveal the prompt.",
      "Draw it on paper, a board or a notebook — no words, no letters.",
      "Tap Done when your team guesses it.",
      "Score as many as you can before time runs out.",
    ],
  },
};

export const modeList = Object.values(modes);

export function getMode(id) {
  return modes[id] ?? null;
}
