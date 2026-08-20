import { modeList } from "../../data/modes.js";
import { arrowIcon, esc, linkButton } from "../components.js";

function modeCard(mode) {
  return `<button type="button" class="card mode-card" data-action="select-mode" data-value="${esc(
    mode.id
  )}">
    <span class="eyebrow eyebrow-accent">${esc(mode.eyebrow)}</span>
    <span class="mode-name">${esc(mode.name)}</span>
    <span class="mode-desc">${esc(mode.description)}</span>
    ${arrowIcon()}
  </button>`;
}

export function renderHome() {
  return `<section class="screen" tabindex="-1" aria-labelledby="home-title">
    <header class="brand">
      <h1 class="wordmark" id="home-title">promptly<span class="wordmark-dot" aria-hidden="true">.</span></h1>
      <p class="tagline">Act. Draw. Guess.</p>
    </header>

    <div class="grow stack stack-lg">
      <h2 class="section-heading">What are we playing?</h2>
      <div class="card-list">${modeList.map(modeCard).join("")}</div>
    </div>

    <footer class="utility-row">
      ${linkButton("How to Play", "how-to-play")}
      ${linkButton("Settings", "open-settings")}
    </footer>
  </section>`;
}
