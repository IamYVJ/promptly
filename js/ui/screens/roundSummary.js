import { getMode } from "../../data/modes.js";
import { isMatchComplete, roundScore } from "../../game/rules.js";
import { button, esc, linkButton } from "../components.js";

function wordItem(word, correct) {
  return `<li class="word-item ${correct ? "word-item-correct" : "word-item-skipped"}">
    <span class="word-mark" aria-hidden="true">${correct ? "&#10003;" : "&ndash;"}</span>
    <span class="word-text">${esc(word)}</span>
    <span class="sr-only">${correct ? "correct" : "skipped"}</span>
  </li>`;
}

export function renderRoundSummary(state) {
  const mode = getMode(state.modeId);
  const team = state.teams[state.match.activeTeamIndex];
  const { correctWords, skippedWords } = state.round;
  const attempted = [
    ...correctWords.map((word) => ({ word, correct: true })),
    ...skippedWords.map((word) => ({ word, correct: false })),
  ];
  const finished = isMatchComplete(state.match, state.settings.roundsPerTeam);

  return `<section class="screen" tabindex="-1" aria-labelledby="summary-title">
    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Round complete</span>
      <h1 class="title" id="summary-title">${esc(team.name)}</h1>
    </header>

    <div class="grow stack stack-lg pad-top">
      <div class="summary-stats">
        <div class="stat stat-correct">
          <p class="stat-value">${correctWords.length}</p>
          <span class="stat-label">Correct</span>
        </div>
        <div class="stat">
          <p class="stat-value">${skippedWords.length}</p>
          <span class="stat-label">Skipped</span>
        </div>
      </div>

      <div class="meta-strip">
        <span>
          <span class="eyebrow">Round score</span>
          <span class="meta-value">+${roundScore(state.round)}</span>
        </span>
        <span style="text-align: right">
          <span class="eyebrow">Total score</span>
          <span class="meta-value">${team.score}</span>
        </span>
      </div>

      ${
        attempted.length > 0
          ? `<details class="details">
              <summary>Prompts this round (${attempted.length})</summary>
              <ul class="word-list">
                ${attempted.map(({ word, correct }) => wordItem(word, correct)).join("")}
              </ul>
            </details>`
          : `<p class="copy-muted">No prompts were attempted this round.</p>`
      }
    </div>

    <div class="footer-actions">
      ${button({
        label: finished ? "See results" : "Next team",
        action: "next-turn",
        variant: "primary",
        large: true,
      })}
      <div class="utility-row">${linkButton("Quit match", "go-home")}</div>
    </div>
  </section>`;
}
