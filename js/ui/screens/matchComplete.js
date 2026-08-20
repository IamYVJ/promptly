import { matchResult } from "../../game/rules.js";
import { button, esc, linkButton } from "../components.js";

export function renderMatchComplete(state) {
  const result = matchResult(state.teams);
  const winner = state.teams.find((team) => team.id === result.winnerId);
  const headline = result.tie ? "It's a tie" : `${winner.name} wins`;

  return `<section class="screen" tabindex="-1" aria-labelledby="final-title">
    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">Final</span>
      <h1 class="result-headline" id="final-title">${esc(headline)}</h1>
    </header>

    <div class="grow stack pad-top">
      <div class="scoreboard">
        ${state.teams
          .map(
            (team) => `<div class="scoreboard-row${
              !result.tie && team.id === result.winnerId ? " scoreboard-winner" : ""
            }">
              <span class="scoreboard-name">${esc(team.name)}</span>
              <span class="scoreboard-score">${team.score}</span>
            </div>`
          )
          .join("")}
      </div>
      <p class="copy-muted">${state.settings.roundsPerTeam} ${
        state.settings.roundsPerTeam === 1 ? "round" : "rounds"
      } each &middot; ${state.settings.durationSeconds} seconds per round</p>
    </div>

    <div class="footer-actions">
      ${button({ label: "Play again", action: "play-again", variant: "primary", large: true })}
      <div class="utility-row">
        ${linkButton("Change settings", "change-settings")}
        ${linkButton("Home", "go-home")}
      </div>
    </div>
  </section>`;
}
