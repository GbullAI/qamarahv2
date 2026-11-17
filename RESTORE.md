# Qamarah — Restore instructions (package 7)

This package is a complete, self-contained copy of the game. No art generation
happens at runtime — every portrait and scene is a file on disk.

## Restore

1. Unzip so that `src/`, `public/`, and `package.json` sit at the project root
   (e.g. `/home/z/my-project/`).
2. `bun install`
3. Production (recommended): `bun run build` then `bun run start` —
   http://localhost:3000 (precompiled pages, no dev-server compile lag,
   immutable asset caching).
   Dev: `bun run dev` (same port, slower first loads).

## Package 7 (2026-11-17) — full cast cutouts, scene follows the bodies, tightened engine

### 1. Every named NPC now has a proper transparent cutout in the turn animation

- Previously only 12 NPCs had cutouts; the other 11 showed a grey initials
  rectangle (the "f***ing rectangle") when they spoke — exactly the Serai
  women who speak during chamber scenes (Cempaka, Laila, Dewi, Rajah, the
  keepers, the brokers, Pak Usop, Nakhoda Beting).
- This package adds 12 new 752x1008 transparent cutouts, generated ONCE and
  shipped as files (zero runtime generation): `mak-chendana`, `ibu-ruhayya`,
  `pak-usop`, `ibu-larasati`, `chik-fatimah`, `najib-hamid`, `cempaka`,
  `laila`, `rajah-the-bouncer`, `dewi`, `mak-suriyah`, `nakhoda-beting`
  (cut from his existing card). All 23 NPCs in `world.json` now carry a
  `portrait` field; verified clean (VLM pass: no frames, no grey blocks).
- **Mak Suriyah added as a full NPC** (`world.json`): the Serai's matriarch
  was all over the location lore but had no NPC entry, so the GM voiced her
  faceless. Her dossier is built strictly from the world file's own text
  (iron hand behind silk gloves, reads a guest in one cup of tea, rooftop
  wine, Veil Sisters listening network).
- Cinematic fallback box REMOVED: a speaker with no art now shows no figure
  at all — scene + words only. A placeholder rectangle can never appear.

### 2. The scene follows the bodies (the "bring Maria to bed" fix)

- GM prompt hardened (`gm.ts`): "THE SCENE FOLLOWS THE BODIES" — when the
  player leads/carries anyone to a chamber, bath, rooftop or back room, the
  turn ends THERE and the state block's `area` records the final place. No
  staging delay, no standing in the salon.
- Local safety net (`store.ts` + `world.ts` `areaMentionedIn`): if the model
  ever drops its `<state>` block (which used to freeze the backdrop), the
  backdrop follows the player's own declared destination — "up to the private
  chambers" moves the picture to the private-chambers art. Verified live:
  salon → private chambers repaint works end-to-end.
- All five Serai Lanokh areas have pinned art wired in `world.json`
  (`areaImages`: courtyard, main salon, steam bath, private chambers,
  rooftop); every other location has its banner. The pill and both backdrops
  (main screen + cinematic) follow `game.area`.

### 3. Tightened, fast, zero wasted generation (the lag fix)

- **No image generation at runtime, period.** The old `/api/scene-image`
  painted-scene route and the `paintScene` store machinery are DELETED (it
  was keyed per-turn so its cache could never hit — dead weight and a
  usage-burn risk). Turns are exactly one chat call.
- Thinking mode force-disabled on every path (sandbox SDK + BYOK); on BYOK
  hosts that reject the `thinking` field with a 400, the route retries once
  without it instead of failing the turn.
- History window 30 → 20 messages; max tokens 2000 → 1500 (turns) /
  500 → 400 (asides). CURRENT STATE in the system prompt keeps continuity,
  so older prose is pure latency.
- Immutable `Cache-Control` (`public, max-age=31536000, immutable`) on
  `/portraits/*`, `/scenes/*`, `/music/*` (`next.config.ts`) — art is
  cache-busted by `?v=` query, so a returning player repaints from disk.
- Production build (`output: standalone`) — precompiled pages answer in
  ~5 ms; the dev server's on-demand compiling was a large part of the lag.

## Engine key (BYOK) — unchanged

- Title screen and the in-game drawer both have **Engine key**.
- Paste a full Z.ai open-platform key (api.z.ai or open.bigmodel.cn), model
  `glm-4.6` by default. Turns then run on that key — independent of any chat
  session's rate window. The key lives only in the browser's localStorage
  (`qamarah-byok-v1`); clear it with the dialog's **Clear key**.
- No key/secret is ever sent anywhere except your chosen endpoint, per turn.

## Do not

- Do not regenerate any art — 23 cutouts + 12 scene files are all included.
- Do not retry-spam 429s; the engine already retries with a backoff ladder
  (4/9/18/30 s) before showing "the harbour is crowded".

## Contents

- `src/` — Next.js app (GM route, world engine, UI)
- `public/world.json` — full world (23 NPCs, all with cutouts; quests, story starts)
- `public/portraits/` — NPC art (card + transparent cutout per NPC, 752x1008)
- `public/scenes/` — scene backdrops + Serai area art
- `postcss.config.mjs` — REQUIRED (Tailwind v4; without it every page 500s)
- `next.config.ts` — standalone output, image local patterns, immutable cache

## Music — unchanged

- `public/music/qamarah-ambience.ogg` loops everywhere (starts on first
  gesture; toggle persists; volume 0.75). Controller
  `src/lib/game/ambience.ts`.

## Saves

- Autosave every turn to localStorage (`qamarah-save-v1`); export/import
  JSON from the in-game drawer. Old saves keep working — the new portraits
  appear immediately, no migration needed.

## Package 8 — GitHub-ready cloud build (supersedes 7 for deploying)

Same game as package 7, plus exactly what a repo needs to go to the cloud:

- `.gitignore` (node_modules, .next, logs, .env, local db — keys never commit)
- `README.md` + this `DEPLOY.md` (GitHub → Vercel walkthrough, zread guidance)
- `bun.lock` included (reproducible installs; npm users can ignore it)
- GM route `maxDuration` 120 → 60 s — Vercel Hobby-safe ceiling; flash-model
  turns land well inside it
- Engine-key dialog: model field now offers quick picks — `glm-4.7-flash`
  (fastest turns, recommended) and `glm-4.6` (deepest prose, default);
  free-text entry still works for any model ID
- No other game changes: saves, world, art, and prompts are identical to
  package 7. Old saves keep working.
