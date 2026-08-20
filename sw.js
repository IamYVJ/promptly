/**
 * Offline shell for Promptly.
 *
 * Every path is relative so the worker's scope follows wherever the site is
 * served from — including a GitHub Pages project subpath like /promptly/.
 *
 * Bump CACHE_NAME whenever you ship changes, otherwise returning players keep
 * the precached copy.
 */

const CACHE_NAME = "promptly-v1";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.webmanifest",

  "./css/tokens.css",
  "./css/base.css",
  "./css/components.css",
  "./css/game.css",

  "./js/main.js",
  "./js/core/events.js",
  "./js/core/state.js",
  "./js/core/store.js",
  "./js/data/categories.js",
  "./js/data/modes.js",
  "./js/device/audio.js",
  "./js/device/haptics.js",
  "./js/device/motion.js",
  "./js/game/controller.js",
  "./js/game/match.js",
  "./js/game/rules.js",
  "./js/game/timer.js",
  "./js/game/wordDeck.js",
  "./js/storage/preferences.js",
  "./js/ui/components.js",
  "./js/ui/render.js",
  "./js/ui/screens/categories.js",
  "./js/ui/screens/forehead.js",
  "./js/ui/screens/game.js",
  "./js/ui/screens/handoff.js",
  "./js/ui/screens/home.js",
  "./js/ui/screens/howToPlay.js",
  "./js/ui/screens/matchComplete.js",
  "./js/ui/screens/roundSummary.js",
  "./js/ui/screens/settings.js",
  "./js/ui/screens/setup.js",

  "./assets/icons/icon.svg",
  "./assets/icons/icon-maskable.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Assets match exactly so a `?v=` query still reaches the network; only
  // navigations ignore the query string, since links may carry tracking params.
  const options = request.mode === "navigate" ? { ignoreSearch: true } : undefined;

  event.respondWith(
    caches.match(request, options).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          if (request.mode === "navigate") {
            const shell = await caches.match("./index.html");
            if (shell) return shell;
          }
          return Response.error();
        });
    })
  );
});
