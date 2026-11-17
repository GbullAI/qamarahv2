# Qamarah

A cinematic, AI-Game-Mastered text RPG set in a dark political-fantasy port
city where desire is the open currency. One persistent world, 23 named NPCs
with transparent portrait art, a bond ledger that remembers everything, scene
backdrops that follow the action, and autosaved campaigns.

> Mature themes, 18+. Keep the repo **private** — that also works perfectly
> with zread.ai ("Add Private Repo") and Vercel.

## How it works

- **The World Engine** (`src/lib/game/gm.ts`) builds a full GM system prompt
  from `public/world.json` (NPC dossiers, locations, factions, quest, your
  live character state) every turn.
- **Bring your own key (BYOK)**: the GM runs on YOUR open-platform API key
  (Z.ai api.z.ai or open.bigmodel.cn, OpenAI-compatible). The key is stored
  only in your browser (`qamarah-byok-v1`) and sent nowhere except your
  chosen endpoint, per turn.
- **Zero runtime art generation**: all 23 NPC cutouts and every scene
  backdrop are files in `public/`, cached immutably. A turn is exactly ONE
  chat call — nothing else.
- **Saves** live in your browser's localStorage (`qamarah-save-v1`),
  export/import as JSON from the in-game drawer. No server, no accounts.

## Run locally

Requires Bun (or Node 20+ with npm).

```bash
bun install
bun run build        # production build (recommended — no dev-compile lag)
bun run start        # http://localhost:3000
# or: bun run dev
```

Open the game → **Engine key** → paste a Z.ai open-platform API key.

### Speed vs depth (model choice)

| Model | Feel |
| --- | --- |
| `glm-4.7-flash` | Turns land in a few seconds. Recommended for play. |
| `glm-4.6` | Deepest prose and most reliable state-blocks. Default. |

Thinking mode is force-disabled on every path, history is windowed, and art
is cache-forever — the model choice is the last big latency lever.

## Deploy to the cloud

See **[DEPLOY.md](./DEPLOY.md)** — push to GitHub (private), import into
Vercel, play from any device. Takes about ten minutes.

## Repo layout

```
src/app/api/gm/route.ts     the GM endpoint (BYOK + filter + retry logic)
src/lib/game/               world engine, prompt builder, save store
src/components/game/        cinematic, title screen, HUD, engine-key dialog
public/world.json           the world: 23 NPCs, locations, quests, story starts
public/portraits/           NPC art (card + transparent cutout, 752x1008)
public/scenes/              scene backdrops + Serai Lanokh area art
public/music/               looping ambience
```
