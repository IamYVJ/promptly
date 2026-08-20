import { getMode } from "../../data/modes.js";
import { currentRoundNumber } from "../../game/rules.js";
import { button, esc, linkButton } from "../components.js";

function contextLine(state) {
  const mode = getMode(state.modeId);
  const round = currentRoundNumber(state.match);

  return `<p class="handoff-context">
    <span>${esc(mode?.name ?? "Promptly")}</span>
    <span class="handoff-dot" aria-hidden="true"></span>
    <span>Round ${round} of ${state.settings.roundsPerTeam}</span>
  </p>`;
}

export function renderHandoff(state) {
  const mode = getMode(state.modeId);
  const team = state.teams[state.match.activeTeamIndex];
  const usesMotion = Boolean(mode?.controlChoice) && state.settings.foreheadControlMode === "motion";

  return `<section class="screen" tabindex="-1" aria-labelledby="handoff-title">
    ${contextLine(state)}

    <div class="center-block stack">
      <span class="eyebrow eyebrow-accent">You're up</span>
      <h1 class="handoff-team" id="handoff-title">${esc(team.name)}</h1>
      <p class="handoff-lead">${esc(mode?.handoffLead ?? "")}</p>
    </div>

    <div class="footer-actions">
      ${button({ label: "I'm ready", action: "confirm-ready", variant: "primary", large: true })}
      <div class="utility-row">
        ${usesMotion ? linkButton("Recalibrate", "recalibrate") : ""}
        ${linkButton("Quit match", "request-exit")}
      </div>
    </div>
  </section>`;
}

export function renderReveal(state) {
  const mode = getMode(state.modeId);

  return `<section class="screen" tabindex="-1" aria-labelledby="reveal-title">
    ${contextLine(state)}

    <div class="center-block stack">
      <span class="eyebrow eyebrow-accent">Heads up</span>
      <h1 class="handoff-team" id="reveal-title">${esc(mode?.revealNote ?? "")}</h1>
      <p class="handoff-lead">The timer starts as soon as you reveal it.</p>
    </div>

    <div class="footer-actions">
      ${button({ label: "Reveal prompt", action: "reveal-word", variant: "primary", large: true })}
    </div>
  </section>`;
}

export function renderCountdown(state) {
  const mode = getMode(state.modeId);

  return `<section class="screen screen-flush countdown" tabindex="-1" aria-label="Round starting">
    <p class="countdown-value">${esc(state.round.countdown ?? "3")}</p>
    <p class="countdown-hint">${esc(mode?.countdownHint ?? "Get ready")}</p>
  </section>`;
}
