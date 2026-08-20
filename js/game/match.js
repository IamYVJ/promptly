/**
 * Match and round lifecycle. These are the only functions that mutate the
 * match, round or score slices of state — every mode goes through them.
 */

import { createMatchState, createRoundState } from "../core/state.js";
import { nextTeamIndex, pointsFor } from "./rules.js";

export function startMatch(state) {
  state.match = createMatchState();
  state.round = createRoundState();
  state.match.status = "active";
  for (const team of state.teams) team.score = 0;
}

/** Fresh round for the active team. Never carries a prompt across a handoff. */
export function beginTurn(state) {
  state.round = createRoundState();
}

export function startRound(state, { endsAt, word }) {
  state.round.status = "playing";
  state.round.startedAt = Date.now();
  state.round.endsAt = endsAt;
  state.round.countdown = null;
  state.round.currentWord = word;
}

/**
 * Applies one CORRECT / SKIP. Callers must gate on rules.canAcceptAction —
 * this function assumes the action is already legal.
 */
export function recordAction(state, action) {
  const word = state.round.currentWord;
  if (word === null) return null;

  if (action === "correct") state.round.correctWords.push(word);
  else state.round.skippedWords.push(word);

  state.teams[state.match.activeTeamIndex].score += pointsFor(action);

  // Clear the prompt behind the feedback so it cannot leak during the flash.
  state.round.currentWord = null;
  state.round.flash = { type: action, word };
  return word;
}

export function showWord(state, word) {
  state.round.flash = null;
  state.round.currentWord = word;
}

export function finishRound(state) {
  if (state.round.status !== "playing") return false;

  state.round.status = "ended";
  state.round.flash = null;
  state.round.currentWord = null;
  state.match.completedRounds[state.match.activeTeamIndex] += 1;
  return true;
}

export function advanceTurn(state) {
  state.match.activeTeamIndex = nextTeamIndex(state.match, state.teams.length);
}

export function completeMatch(state) {
  state.match.status = "complete";
}
