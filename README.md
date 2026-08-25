# promptly

**Act. Draw. Guess.**

A local party game for one phone and two teams. Pick a mode, pick a category,
pass the phone around. No accounts, no server, no internet after the first load.

Promptly is a single static site: plain HTML, CSS and ES modules. There is no
build step, no bundler and no npm dependency — the files in this repository are
the app exactly as it runs.

---

## The three modes

| Mode | Who holds the phone | How it works |
| --- | --- | --- |
| **Charades** | The performer | Reveal the prompt privately, act it out, no talking. |
| **Forehead** | The guesser | Turn the phone sideways and hold it against your forehead, screen facing your team. They give clues; you guess. Tilt forward for correct, back to skip. |
| **Draw & Guess** | The drawer | Reveal the prompt privately, draw it on paper or a whiteboard. No words, no letters. |

All three share one match engine. A mode only decides **who sees the prompt**,
**how it is presented** and **how Correct / Skip are submitted** — never the
scoring, the timer or the turn order.

Correct is worth 1 point. Skip is worth 0. Both teams get the same number of
rounds (default 3 each, 60 seconds each).

There is deliberately no drawing canvas. Draw & Guess players draw on real
paper, which is better than a phone-sized canvas and keeps the app small.

---

## Architecture

The rule that shapes everything: **state is the single source of truth and the
DOM is never authoritative.** Every interaction follows one direction.

```
   DOM event (delegated)
        │
        ▼
   js/main.js            action table: data-action → one controller call
        │
        ▼
   js/game/controller.js  the only module that writes state
        │
        ├── js/game/rules.js     pure scoring / turn / gate logic
        ├── js/game/match.js     round + match lifecycle
        ├── js/game/timer.js     timestamp-based clock
        ├── js/game/wordDeck.js  shuffled, non-repeating prompt supply
        └── js/device/*          motion, haptics, audio
        │
        ▼
   js/core/store.js       commit() notifies subscribers
        │
        ▼
   js/ui/render.js        state → HTML string → #app
```

### Directory layout

```
index.html               shell: #app, #live ARIA region, module entry
manifest.webmanifest     PWA metadata
sw.js                    offline precache (cache name = version)

css/tokens.css           design tokens — every value elsewhere comes from here
css/base.css             reset, layout primitives, typography
css/components.css       buttons, cards, fields, dialog, tabs
css/game.css             gameplay screens and mode presentations

js/main.js               entry point: event delegation, keyboard, SW, wiring
js/core/state.js         state shape + screen finite state machine
js/core/store.js         commit / quiet / replace
js/core/events.js        tiny bus for high-frequency paints
js/data/modes.js         mode definitions (copy, roles, how-to steps)
js/data/categories.js    prompt decks
js/game/controller.js    all state transitions
js/game/match.js         start / end round, switch team, finish match
js/game/rules.js         scoring, turn order, the canAcceptAction gate
js/game/timer.js         endsAt-based timer with pause / resume / sync
js/game/wordDeck.js      Fisher-Yates shuffle, full-pool cycling
js/device/motion.js      DeviceMotion → "correct" / "skip"
js/device/haptics.js     navigator.vibrate wrapper
js/device/audio.js       WebAudio blips, no audio files
js/storage/preferences.js  localStorage load / save / clear + sanitising
js/ui/render.js          screen switch + partial patching
js/ui/components.js      shared HTML builders, esc() for escaping
js/ui/screens/*.js       one module per screen
```

### Things worth knowing

**Screens are a finite state machine.** `SCREEN` in `js/core/state.js` lists
every screen; the controller is the only thing that moves between them. There is
no URL routing, which is what lets the app sit at any path or subdirectory
without configuration.

**One delegated listener per event type.** `js/main.js` listens on `#app` and
maps `data-action` to exactly one controller call. Nothing attaches listeners
per render, so re-rendering cannot leak handlers.

**Rendering is HTML strings.** No virtual DOM. Full-screen re-render on state
change; the timer digits and the calibration meter are patched in place through
`js/core/events.js`, because those change many times per second. Every dynamic
value passes through `esc()` — team names are user input and go straight into
markup.

**The timer is timestamp-based.** A round stores `endsAt = Date.now() +
durationMs`, so backgrounding the phone cannot buy extra seconds. Returning to
the tab calls `syncTimer()` and the clock catches up.

**One gate guards all scoring.** `canAcceptAction()` in `js/game/rules.js` is
the only thing that decides whether a Correct or Skip counts. It rejects input
after time expires, during feedback, while a dialog is open, and on any screen
that is not gameplay. A double tap, or a tap plus a stray tilt, cannot score
twice.

**Forehead rotates its own board.** Forehead is played with the phone turned
sideways, but a rotation-locked phone keeps reporting a portrait viewport however
it is physically held — and that is the common case. So rather than asking the
player to rotate a screen that will not rotate, `@media (orientation: portrait)`
rotates the whole Forehead board: `width: 100svh`, `height: 100svw`, and a
`rotate(90deg)`. Inside that box the viewport axes are swapped, so anything sized
against the *visual* horizontal uses `svh` and anything against the *visual*
vertical uses `svw`. The word lands at the same size either way — 73px on a
375×812 phone, whether the phone reports landscape or is locked to portrait.
Only `.game-forehead` is rotated; Charades and Draw & Guess are untouched.

**Prompt size is bound by the scarcer axis.** `.prompt` uses
`clamp(2.25rem, min(11vw, 13vh), 3.5rem)`. The `13vh` term only ever binds on
landscape phones, which are wide but short — sizing on width alone pinned the
font to its maximum there and a two-line prompt then overran the gap between the
HUD and the controls.

**Prompts must not leak.** Handoff and reveal screens are load-bearing, not
decoration. The handoff screen never contains the prompt in its markup, scoring
nulls `currentWord` before the feedback overlay draws, and Forehead prompts are
kept out of the ARIA live region so a screen reader cannot announce the word to
the room.

---

## Prompt categories

Eleven categories, 150 prompts each — 1650 total: Movies, Bollywood, Animals,
Actions, Around the House, Famous Names, Food & Drink, Jobs, Sports & Games,
Travel & Places, Music.

A prompt may appear in two decks — Ludo is a Bollywood film and a board game,
and Actions shares a dozen sport names with Sports & Games. That is harmless:
one match draws from one category, so a player never sees the repeat.

150 is deliberate. A 60-second round burns 10–15 prompts and a default match is
six rounds, so ~90 is the realistic ceiling for one sitting. At 150 a match
never exhausts the pool — so it never repeats — and playing the same category
twice in a row still deals a different shuffle.

Everything lives in `js/data/categories.js` as one array:

```js
export const categories = [
  {
    id: "movies",
    name: "Movies",
    description: "Films everyone knows",
    words: ["Titanic", "Jurassic Park", "..."],
  },
];
```

- **To add prompts:** append strings to a `words` array.
- **To add a category:** append one object. It appears on the category screen
  automatically; no other file changes.
- **To remove one:** delete the object. If a saved preference still points at
  the deleted `id`, setup shows "None selected" and starting a match returns to
  the category screen instead of failing.

Keep `id` stable — it is what gets saved to localStorage.

Prompts render at display size, so keep them short. 24 characters is the most
that wraps cleanly on a small phone in landscape, and nothing in the shipped
decks exceeds it. Aim for prompts that work in all three modes: guessable from
clues, actable without props, and drawable without words.

---

## Motion controls (Forehead)

All sensor code is confined to `js/device/motion.js`. The game engine never sees
a raw reading — it receives `"correct"` or `"skip"`, the same actions a button
produces.

**Motion is never required.** Every failure path — unsupported device, denied
permission, silent sensor — lands on touch controls with an explanation. There
is no way to get stuck on a permission screen.

### Why the z axis of `accelerationIncludingGravity`

`z` points out of the screen, so its share of gravity measures how far the
screen is tilted from vertical, and it is unaffected by rotation *within* the
screen plane. That avoids the portrait/landscape axis swap and the gimbal lock
that `deviceorientation`'s beta/gamma hit when a phone is held upright in
landscape — which is exactly the Forehead posture. The value is normalised by
the full acceleration vector's magnitude, so it works whether the browser
reports m/s² or g.

### Direction is learned, not assumed

Vendors disagree on the sign convention of the raw values. Calibration asks for
one deliberate forward tilt and records its sign, so the player's own gesture
defines "forward". Nothing is hardcoded per platform.

### Calibration

Once per match, in two stages:

1. **Neutral** — hold still against your forehead for 600 ms within a tight
   tolerance. This becomes the zero point, so posture differences between
   players do not matter.
2. **Direction** — one forward tilt past ~22°.

Before every subsequent round the 3-2-1 countdown silently re-captures neutral
only (`calibrate({ neutralOnly: true })`), which absorbs drift between players.
If nobody holds still, the previous neutral is kept rather than a bad one being
written.

### Rejecting accidental triggers

| Guard | Value | Purpose |
| --- | --- | --- |
| Low-pass filter | 0.3 | Smooths sensor noise |
| Action threshold | 0.42 (~25°) | Requires a deliberate tilt |
| Neutral band | 0.20 | Must return to neutral before the next action |
| Cooldown | 380 ms | No double-trigger from one gesture |
| Gravity window | 0.55–1.7 | Discards samples taken mid-shake |
| Sample watchdog | 2200 ms | No reading → fall back to touch |

The wait-for-neutral gate is what makes one tilt produce exactly one action: the
sensor re-arms only after the phone comes back inside the neutral band.

iOS needs `DeviceMotionEvent.requestPermission()`, which only works from a user
gesture. It is called from the "Allow motion access" button and **never** on
page load — asking on load fails permanently and burns the prompt. Listeners are
removed whenever motion is not actively needed.

---

## Offline and installing

`sw.js` precaches the whole app on first visit and serves cache-first for
same-origin GET requests, so it plays offline afterwards. Navigations fall back
to `./index.html`.

`manifest.webmanifest` makes it installable — Add to Home Screen on iOS, Install
on Android — where it runs standalone without browser chrome.

Every path is relative (`./css/…`, `./js/…`), the service worker registers from
`./sw.js` so its scope follows wherever the app is hosted, and the manifest uses
a relative `start_url` and `scope`. There is no routing to configure.

**When changing a shipped file,** bump `CACHE_NAME` in `sw.js` (`promptly-v1` →
`promptly-v2`). Installed copies keep serving the old cache until the name
changes. If you add or rename a file, add it to the `PRECACHE` array in the same
edit — a missing entry makes `install` fail and the update silently never lands.

Nothing is ever sent anywhere. Preferences live in localStorage on the device.

---

## Browser notes

- **Chrome / Edge / Safari / Firefox**, current versions. Uses ES modules,
  optional chaining and `??`, all of which need a 2021-or-later browser.
- **iOS Safari** requires the motion permission prompt described above. Home
  Screen installs are the best experience — no address bar eating vertical space.
- **Android Chrome** reports motion without a permission prompt.
- **Desktop** is fully playable with touch/keyboard, centred in a 640px column.
  Keyboard shortcuts exist mainly for development: `→` / `D` / `Space` for
  correct, `←` / `S` for skip, `Escape` to leave a match.
- Motion is opt-in: every transition and animation sits inside
  `@media (prefers-reduced-motion: no-preference)`, so a device asking for
  reduced motion gets none of it.

---

## Known limitations

- **Decks are culturally scoped.** Movies is English-language and Bollywood is
  Hindi cinema, so the right one to pick depends on the room. Famous Names still
  leans Western. Any group with a different centre of gravity will want its own
  category — which is a one-object edit.
- **Icons are SVG only.** iOS ignores SVG for Add to Home Screen and will
  generate a screenshot-based icon instead. Proper PNGs (192px, 512px, and a
  maskable variant) would need a raster tool, which this repo deliberately does
  not depend on.
- **Two teams, fixed.** Team count is not configurable. The engine treats teams
  as an array, so widening it is contained, but the UI assumes two.
- **No match resume.** Preferences persist; an interrupted match does not.
  Reloading mid-round loses that match, by design — resuming a party game
  nobody is still sitting around for is worse than starting fresh.
- **Motion is Forehead-only**, and only on phones that report a sensor.
- **No sound files.** Audio cues are synthesised WebAudio tones, so they are
  functional rather than designed.

---

## License

See [LICENSE](LICENSE).
