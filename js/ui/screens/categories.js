import { categories } from "../../data/categories.js";
import { getMode } from "../../data/modes.js";
import { backButton, esc } from "../components.js";

function categoryCard(category, selected) {
  return `<button type="button" class="card${
    selected ? " card-selected" : ""
  }" data-action="select-category" data-value="${esc(category.id)}">
    <span class="card-row">
      <span class="card-title">${esc(category.name)}</span>
      <span class="copy-muted">${category.words.length} prompts</span>
    </span>
    <span class="card-note">${esc(category.description)}</span>
  </button>`;
}

export function renderCategories(state) {
  const mode = getMode(state.modeId);

  return `<section class="screen" tabindex="-1" aria-labelledby="categories-title">
    ${backButton()}

    <header class="stack stack-sm">
      <span class="eyebrow eyebrow-accent">${esc(mode?.name ?? "Promptly")}</span>
      <h1 class="title" id="categories-title">Pick a category</h1>
      <p class="copy">Every prompt this match comes from the category you choose.</p>
    </header>

    <div class="grow stack pad-top">
      <div class="card-list">
        ${categories
          .map((category) => categoryCard(category, category.id === state.settings.categoryId))
          .join("")}
      </div>
    </div>
  </section>`;
}
