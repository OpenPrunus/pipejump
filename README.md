# Pipejump

[![CI](https://github.com/OpenPrunus/pipejump/actions/workflows/ci.yml/badge.svg)](https://github.com/OpenPrunus/pipejump/actions/workflows/ci.yml)

A side-scrolling platformer in the browser, with no account, installable and playable offline: run, jump on the enemies, bump the
blocks from below and reach the flag before the clock runs out. Four levels (meadow, caves, dusk, snowfield).

## Features

- **Platforming that feels right**: acceleration and braking, hold the jump to go high and release it to hop, running (B) to jump further,
  a few frames of "coyote time" after leaving a ledge and a jump buffer before landing.
- **Blocks**: `?` blocks give a coin or a mushroom, bricks bounce when you are small and shatter when you are big, pipes, hard blocks.
- **Mushroom**: grow once; a hit shrinks you instead of killing you (with a moment of invulnerability).
- **Enemies**: *grumps* are squashed by jumping on them; *turtles* become a shell you can kick, and a moving shell knocks over everything
  on its way (including you). Pits and the clock are deadly. Stomp chains score more.
- **Four levels** with their own look, scores and 1–3 stars (no death, 60 % of the coins) kept in the browser; levels unlock in order.
- **Keyboard** (arrows / A D, Up or Space to jump, Shift or X to run, P pause, R restart, Esc leave), and **touch** with on-screen buttons
  (◀ ▶, B, A) that follow one finger each, so you can run, jump and steer at once. In landscape the buttons float over the screen.
- French and English, synthesized sounds, **installable and playable offline** (PWA: manifest, icons, network-first service worker).

## Run it

```bash
docker compose up -d --build     # http://localhost:8102
# or, without Docker, any static server on web/:
npm run serve                    # python3 -m http.server 8102 --directory web
```

It is a static site: `web/` is the whole game (HTML, CSS and JavaScript modules, no build step, no dependency). Everything on screen is
drawn from small character-based sprites and rectangles on a 256 × 224 canvas, scaled without smoothing.

## Tests

```bash
npm test            # unit tests, then the browser tests
npm run test:unit   # engine, levels, translations, PWA (Node 22, no dependency)
npm run test:browser  # a real headless Chrome drives the page (CHROME_BIN to choose it)
```

The engine is deterministic and never touches the DOM, so it is tested on its own: physics, jump height, blocks, mushroom, stomping,
shells, pits, the clock, the flag. A **bot that simulates a few gestures on a copy of the game and picks one that does not kill it**
must finish every level (without enemies for the terrain; level 1 also with its enemies and no death), which proves each level can be
completed. The browser tests cover the menus in both languages, keyboard play, pause, the result screen, portrait and landscape phone
layouts (no scrolling, buttons of at least 40 px, multi-finger input) and offline use.

## Layout

```
web/js/engine.js   physics, tiles, enemies, blocks, flag, test bot
web/js/levels.js   the four levels (built by small helpers, rendered as 14 text rows)
web/js/render.js   canvas drawing and the sprites
web/js/main.js     screens, 60 steps/s loop, keyboard and touch buttons
```

MIT licence. Inspired by classic platformers; the characters and levels are original.
