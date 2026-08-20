import { getCategory } from "../../data/categories.js";
import { getMode } from "../../data/modes.js";
import {
  DURATION_PRESETS,
  MAX_TEAM_NAME_LENGTH,
  ROUND_LIMITS,
  ROUND_PRESETS,
} from "../../storage/preferences.js";
import { backButton, button, esc, linkButton, optionChip } from "../components.js";

function teamField(team, index) {
  return `<div class="field">
    <label class="field-label" for="team-${index}">Team ${index + 1}</label>
    <input
      class="input"
      id="team-${index}"
      type="text"
      inputmode="text"
      autocomplete="off"
      maxlength="${MAX_TEAM_NAME_LENGTH}"
      value="${esc(team.name)}"
      placeholder="Team ${index + 1}"
      data-field="team"
      data-index="${index}"
    />
  </div>`;
}

export function renderSetup(state) {
  const mode = getMode(state.modeId);
  const category = getCategory(state.settings.categoryId);
  const { durationSeconds, roundsPerTeam } = state.settings;

  return `<section class="screen" tabindex="-1" aria-labelledby="setup-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">${esc(mode?.name ?? "Promptly")}</span>
      <h1 class="title" id="setup-title">Set up the match</h1>
    </header>

    <div class="grow stack stack-lg pad-top">
      <div class="meta-strip">
        <span>
          <span class="eyebrow">Category</span>
          <span class="meta-value">${esc(category?.name ?? "None selected")}</span>
        </span>
        ${linkButton("Change", "back")}
      </div>

      <div class="stack">
        <span class="field-label">Teams</span>
        ${state.teams.map(teamField).join("")}
      </div>

      <div class="stack">
        <span class="field-label" id="duration-label">Round length</span>
        <div class="option-row" role="group" aria-labelledby="duration-label">
          ${DURATION_PRESETS.map((seconds) =>
            optionChip({
              label: `${seconds}s`,
              action: "set-duration",
              value: seconds,
              pressed: seconds === durationSeconds,
            })
          ).join("")}
        </div>
      </div>

      <div class="stack">
        <span class="field-label" id="rounds-label">Rounds per team</span>
        <div class="option-row" role="group" aria-labelledby="rounds-label">
          ${ROUND_PRESETS.map((rounds) =>
            optionChip({
              label: String(rounds),
              action: "set-rounds",
              value: rounds,
              pressed: !state.ui.customRounds && rounds === roundsPerTeam,
            })
          ).join("")}
          ${optionChip({
            label: "Custom",
            action: "use-custom-rounds",
            value: "custom",
            pressed: state.ui.customRounds,
          })}
        </div>
        ${
          state.ui.customRounds
            ? `<label class="sr-only" for="rounds-custom">Rounds per team</label>
               <input
                 class="input input-narrow"
                 id="rounds-custom"
                 type="number"
                 inputmode="numeric"
                 min="${ROUND_LIMITS.min}"
                 max="${ROUND_LIMITS.max}"
                 value="${roundsPerTeam}"
                 data-field="rounds"
               />`
            : ""
        }
        <p class="copy-muted">Each team plays ${roundsPerTeam} ${
          roundsPerTeam === 1 ? "round" : "rounds"
        } of ${durationSeconds} seconds.</p>
      </div>

      ${
        mode?.controlChoice
          ? `<p class="copy-muted">Next you'll choose motion or touch controls.</p>`
          : ""
      }
    </div>

    <div class="footer-actions">
      ${button({
        label: "Start match",
        action: "start-match",
        variant: "primary",
        large: true,
        disabled: !category,
      })}
    </div>
  </section>`;
}
