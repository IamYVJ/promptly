/**
 * Visitor counter — decorative fine print beneath the app.
 *
 * Reads the all-time pageview count for this path from GoatCounter and reveals
 * the footnote only once a real number arrives. Every failure path — adblocker,
 * offline load, or the site's "Allow adding visitor counts on your website"
 * setting being off — leaves it hidden rather than showing a broken em dash.
 */

/*
 * A fixed date predating Promptly's first-ever pageview, so this stays an
 * all-time count (all-time is the default, so `start` changes nothing about
 * WHAT is counted).
 *
 * It is pinned because `start` is also part of the response's cache key. A path
 * with no data yet answers 404, and GoatCounter caches that 404 for up to four
 * hours — so the bare URL can sit on "no data" for hours AFTER the first real
 * visit lands, hiding the counter on a fresh deploy. A distinct cache key
 * sidesteps a 404 that was cached before any data existed.
 *
 * Never a relative period like `week` or `year`: those are rolling windows that
 * would silently stop being an all-time count. One constant value also means
 * every visitor shares a single cached response instead of forcing a recompute.
 */
const START = "2026-01-01";

export function showVisitorCount() {
  const box = document.querySelector(".visitor-counter");
  const out = document.getElementById("visitor-count");
  if (!box || !out) return;

  // Derived from the beacon tag so the GoatCounter site lives in exactly one
  // place — index.html — and cannot drift out of sync with what count.js writes.
  const tag = document.querySelector("script[data-goatcounter]");
  const endpoint = tag?.dataset.goatcounter;
  if (!endpoint) return;

  /*
   * Per-path, never /counter/TOTAL.json: TOTAL sums every page on the
   * GoatCounter site, which is shared across projects, so it would report other
   * sites' traffic as if it were Promptly's.
   *
   * index.html has no <link rel="canonical">, so count.js files the pageview
   * under location.pathname + location.search. This queries pathname only. The
   * asymmetry is deliberate: a visitor arriving with tracking params (?fbclid=…)
   * has their view recorded under that longer path but is still shown the
   * aggregate for the clean path — matching count.js exactly would 404 for
   * precisely those visitors and hide the counter from them.
   *
   * Read live rather than pinned to a constant: Promptly has no URL routing, so
   * pathname never changes during a session, and reading it live is what lets
   * the app keep counting correctly from any subdirectory it is hosted at.
   */
  const path = window.location.pathname;

  // GoatCounter caches this response for ~4h, so a fresh visit will not move the
  // number immediately. That is expected, not a bug.
  fetch(`${endpoint.replace(/\/count$/, "")}/counter/${encodeURIComponent(path)}.json?start=${START}`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
    .then((data) => {
      // `count` arrives pre-formatted with thousands separators ("1,234").
      if (data && data.count != null) {
        out.textContent = String(data.count);
        box.hidden = false;
      }
    })
    .catch(() => {
      /* Purely decorative: leave the footnote hidden on every failure. */
    });
}
