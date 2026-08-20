/**
 * Pure game rules. No DOM, no state mutation.
 *
 * Scoring lives here alone so every mode — and every input method — resolves
 * to the same numbers.
 */

import { SCREEN } from "../core/state.js";

const POINTS = {
  correct: 1,
  skip: 0,
};

export function pointsFor(action) {
  return POINTS[action] ?? 0;
}

export function roundScore(round) {
  return round.correctWords.length * POINTS.correct + round.skippedWords.length * POINTS.skip;
}

/** 1-based round number for the team about to play. */
export function currentRoundNumber(match) {
  return match.completedRounds[match.activeTeamIndex] + 1;
}

export function isMatchComplete(match, roundsPerTeam) {
  return match.completedRounds.every((completed) => completed >= roundsPerTeam);
}

export function nextTeamIndex(match, teamCount) {
  return (match.activeTeamIndex + 1) % teamCount;
}

export function matchResult(teams) {
  const topScore = Math.max(...teams.map((team) => team.score));
  const leaders = teams.filter((team) => team.score === topScore);

  return {
    topScore,
    tie: leaders.length !== 1,
    winnerId: leaders.length === 1 ? leaders[0].id : null,
  };
}

/**
 * The single gate for scoring. Blocks input after time expires, during
 * feedback, while a dialog is open, and on any screen that is not gameplay —
 * which is what keeps a double tap or a stray tilt from scoring twice.
 */
export function canAcceptAction(state, now = Date.now()) {
  return (
    state.screen === SCREEN.PLAYING &&
    state.round.status === "playing" &&
    state.round.flash === null &&
    state.dialog === null &&
    typeof state.round.endsAt === "number" &&
    now < state.round.endsAt
  );
}
