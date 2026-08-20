import { getMode, modeList } from "../../data/modes.js";
import { backButton, esc } from "../components.js";

function tab(mode, selected) {
  return `<button
    type="button"
    class="tab"
    role="tab"
    aria-selected="${selected ? "true" : "false"}"
    data-action="set-how-to-mode"
    data-value="${esc(mode.id)}"
  >${esc(mode.name)}</button>`;
}

export function renderHowToPlay(state) {
  const activeId = state.ui.howToModeId;
  const mode = getMode(activeId) ?? modeList[0];

  return `<section class="screen" tabindex="-1" aria-labelledby="how-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">How to play</span>
      <h1 class="title" id="how-title">Two teams, one phone</h1>
      <p class="copy">Each team takes turns. One point per correct prompt, nothing for a skip. Highest score when the rounds run out wins.</p>
    </header>

    <div class="grow stack stack-lg pad-top">
      <div class="tabs" role="tablist" aria-label="Game modes">
        ${modeList.map((item) => tab(item, item.id === mode.id)).join("")}
      </div>

      <div class="stack">
        <h2 class="section-heading">${esc(mode.name)}</h2>
        <p class="copy-muted">${esc(mode.description)}</p>
        <ol class="steps">
          ${mode.howTo.map((stepText) => `<li class="step">${esc(stepText)}</li>`).join("")}
        </ol>
      </div>
    </div>
  </section>`;
}
