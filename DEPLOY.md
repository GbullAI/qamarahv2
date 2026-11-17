# Deploying Qamarah — GitHub → Vercel, and the honest word on zread

## First: what zread can and cannot do (read this before anything)

**zread cannot be the game's GM.** Two hard reasons:

1. **zread is a reader, not a writer.** The zread MCP server exposes exactly
   three tools — `search_doc`, `get_repo_structure`, `read_file` — all for
   READING GitHub repositories. It answers questions like "how does the GM
   route work?". It does not generate narration, run NPCs, or produce the
   `<state>` blocks the game runs on.
2. **MCP needs a host app.** MCP is a protocol that AI *apps* (Claude Code,
   Cline, Cursor, ...) use to call tools. A browser game cannot host an MCP
   connection — and even if it could, zread still only reads repos.

What the game needs is a **chat-completions endpoint** — which it already
has via the Engine key (BYOK) dialog. So the speed fix is a faster MODEL,
not a different protocol (see the last section).

**Where zread genuinely helps you** (once the game is on GitHub):

- Paste the repo into **zread.ai** → instant AI-generated docs/playground
  for your own codebase (supports private repos via "Add Private Repo").
- Add the **zread MCP** to Claude Code / Cline while you mod the game, and
  ask it things like "where is the bond ledger applied?" — it reads YOUR
  repo through your GLM Coding Plan (same account/email you already linked;
  nothing extra to wire).

That is the full extent of it: zread is your **co-developer**, never your
GM.

---

## The order of operations (answers "GitHub first?")

**Yes — GitHub first.** One push serves both hosting (Vercel deploys FROM
the GitHub repo) and zread (it indexes the repo). Exact steps below.

### Step 1 — Unzip this package

Unzip `qamarah-github-ready-v8.zip`. The folder `qamarah/` is the repo
(already includes `.gitignore`, `README.md`, this file, and `bun.lock`).

Optional but smart — verify it runs locally first:

```bash
cd qamarah
bun install
bun run build
bun run start        # open http://localhost:3000, take one turn
```

### Step 2 — Create the GitHub repo

1. github.com → **New repository**
2. Name: `qamarah` — **Private** (mature game; private works fine everywhere)
3. Do NOT initialize with README/.gitignore (this package has them)
4. Create repository

### Step 3 — Push the code

Terminal (from inside the `qamarah/` folder):

```bash
git init
git add .
git commit -m "Qamarah v8 — cinematic AI-GM RPG"
git branch -M main
git remote add origin https://github.com/<your-username>/qamarah.git
git push -u origin main
```

(Or GitHub Desktop: File → Add Local Repository → Publish.)

### Step 4 — Host it free on Vercel

1. vercel.com → **Continue with GitHub** (same account — one less password)
2. **Add New… → Project** → Import `qamarah`
3. Framework preset: **Next.js** (auto-detected). Leave build settings as-is.
4. **Deploy** → ~2 minutes → you get `qamarah-<hash>.vercel.app`

Every future `git push` auto-redeploys. Art is served with immutable
cache headers (already configured), so returning players repaint instantly.

One setting worth touching: **Settings → Functions → Max Duration** → set
to **60s** (the GM route already caps itself at 60s for this). Turns
normally land in seconds; this only matters on rare retry nights.

### Step 5 — Engine key on the cloud

The hosted game has NO built-in engine (the chat-session fallback only
exists in the dev sandbox). On the title screen:

1. **Engine key** → paste a Z.ai open-platform API key
   (create one at z.ai → API keys — same account as your GitHub-linked
   email; note a Coding-Plan token is for Claude Code/MCP, the game wants
   an **open-platform API key**)
2. Endpoint: `api.z.ai (global)` — default
3. Model: `glm-4.7-flash` (a few seconds a turn) or `glm-4.6` (deepest)

The key never leaves the browser except to call your endpoint per turn.
Saves stay in each device's browser; export/import JSON from the drawer to
move a campaign between laptop and phone.

---

## Why she felt slow — and the actual fixes (all in this build)

| Cause | Fix (status) |
| --- | --- |
| Runtime image generation every turn | **Deleted** in v7 — all art is files on disk, cached forever |
| Thinking/chain-of-thought latency | Force-disabled on every path |
| Huge history sent each turn | Windowed to 20 turns; CURRENT STATE carries continuity |
| Dev-server compile lag | Production build + hosting on Vercel |
| Slow flagship model | **You are here** → set model to `glm-4.7-flash` |

With a flash model + hosted build, a turn is one small chat call and
typically lands in a handful of seconds.
