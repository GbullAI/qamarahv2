"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { WORLD, ATTR_KEYS, SKILL_KEYS, npcByName, areaMentionedIn } from "./world";
import type {
  GameState,
  PlayerCharacter,
  AttrKey,
  GmRequest,
  GmTurnResponse,
  GmStateUpdate,
  ObjectiveStatus,
  TurnGain,
} from "./types";
import { clamp, bondStage, ATTR_SHORT } from "./types";

export type Screen = "title" | "create" | "playing";

export interface ParsedLine {
  speaker: string | null; // null = Narrator / unattributed
  text: string;
}

export interface BondChangeDisplay {
  name: string;
  delta: number;
  note?: string;
  score: number;
}

export interface TurnEntry {
  id: string;
  kind: "action" | "gm" | "system";
  text?: string; // for action / system entries
  lines?: ParsedLine[]; // for gm entries
  bonds?: BondChangeDisplay[];
  gains?: TurnGain[]; // earned progression this turn (bonds included)
}

export interface AsideMessage {
  id: string;
  role: "pc" | "npc";
  text: string;
  ts: number;
}

/** Full-screen immersive turn presentation state. */
export type CinematicState =
  | { phase: "loading" }
  | { phase: "playing"; entryId: string }
  | null;

export interface CharConfig {
  name: string;
  pronouns: string;
  background: string;
  attributes: Record<AttrKey, number>;
  skills: string[];
  storyStartKey: string;
}

interface GameStore {
  screen: Screen;
  game: GameState | null;
  turnLog: TurnEntry[];
  loading: boolean;
  error: string | null;
  lastBondChanges: BondChangeDisplay[];
  hasSave: boolean;

  // private NPC asides (no turn cost, reflected in the next turn)
  asides: Record<string, AsideMessage[]>; // key: NPC name
  asideOpen: string | null;
  asideLoading: boolean;
  pendingAsides: boolean;

  // NPC character-sheet popout (click a portrait anywhere)
  npcSheetOpen: string | null;
  openNpcSheet: (name: string) => void;
  closeNpcSheet: () => void;

  // immersive turn cinematic
  cinematic: CinematicState;

  goTitle: () => void;
  goCreate: () => void;
  beginGame: (config: CharConfig) => void;
  sendAction: (action: string) => Promise<void>;
  sendAside: (npcName: string, text: string) => Promise<void>;
  openAside: (npcName: string) => void;
  closeAside: () => void;
  closeCinematic: () => void;
  travelTo: (locationName: string) => Promise<void>;
  applyState: (update: GmStateUpdate) => Partial<GameState> | null;
  resetGame: () => void;
  dismissWin: () => void;
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Parse raw GM narration into transcript lines. */
export function parseNarration(raw: string): ParsedLine[] {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) => {
    const m = line.match(/^([A-Z][A-Za-z0-9 ''\-\.]{1,40}):\s+([\s\S]*)$/);
    if (m) {
      const speaker = m[1].trim();
      const text = m[2].trim();
      if (speaker.toLowerCase() === "narrator") return { speaker: null, text };
      return { speaker, text };
    }
    return { speaker: null, text: line };
  });
}

/** Build the initial GameState from a character config + world data. */
export function makeInitialState(config: CharConfig): GameState {
  const ss = WORLD.storyStarts[config.storyStartKey];
  const q = WORLD.quest;

  const bonds: GameState["bonds"] = {};
  for (const npc of Object.values(WORLD.npcs)) {
    bonds[npc.name] = { score: npc.initialRelationship, met: false };
  }
  // NPCs named in the story start are present at the opening.
  const presentAtStart = new Set<string>(ss?.startingPartyNPCs ?? []);
  for (const npc of Object.values(WORLD.npcs)) {
    if (presentAtStart.has(npc.name)) bonds[npc.name].met = true;
  }

  const inventory: PlayerCharacter["inventory"] = [];
  for (const it of ss?.startingItems ?? []) {
    const def = WORLD.items[it.item];
    inventory.push({ name: def?.name ?? it.item, qty: it.quantity });
  }

  const questStatus: Record<string, ObjectiveStatus> = {};
  if (q) {
    for (const o of Object.values(q.objectives)) {
      questStatus[o.id] = o.status;
    }
  }

  const pc: PlayerCharacter = {
    name: config.name.trim() || "The Newcomer",
    pronouns: config.pronouns,
    background: config.background.trim(),
    attributes: config.attributes,
    skills: config.skills,
    ability: "Crest of Rasa",
    hp: WORLD.health.initial,
    hpMax: WORLD.health.max,
    marks: inventory.find((i) => i.name.toLowerCase() === "mark")?.qty ?? 0,
    inventory: inventory.filter((i) => i.name.toLowerCase() !== "mark"),
  };

  return {
    pc,
    time: "Day 1, Evening",
    location: ss?.locations?.[0] ?? Object.keys(WORLD.locations)[0],
    area: ss?.locationAreas?.[0] ?? "",
    bonds,
    questStatus,
    visitedLocations: ss?.locations ? [...ss.locations] : [],
    metNpcs: [...presentAtStart],
    turn: 0,
    storyStartKey: config.storyStartKey,
    history: [],
    suggestions: [],
    status: "playing",
    startedAt: Date.now(),
  };
}

/** Match a GM-awarded skill string to a valid world skill key. */
function resolveSkillKey(raw: string): string | null {
  const r = raw.trim().toLowerCase();
  for (const key of SKILL_KEYS) {
    if (key.toLowerCase() === r) return key;
    if (WORLD.skills[key]?.name?.toLowerCase() === r) return key;
  }
  return null;
}

function applyUpdateToGame(
  game: GameState,
  update: GmStateUpdate
): { game: GameState; bonds: BondChangeDisplay[]; gains: TurnGain[]; won: boolean } {
  const next: GameState = {
    ...game,
    pc: {
      ...game.pc,
      inventory: [...game.pc.inventory],
      attributes: { ...game.pc.attributes },
      skills: [...game.pc.skills],
      grantedAbilities: [...(game.pc.grantedAbilities ?? [])],
    },
    bonds: { ...game.bonds },
    questStatus: { ...game.questStatus },
    visitedLocations: [...game.visitedLocations],
    metNpcs: [...game.metNpcs],
  };
  const gains: TurnGain[] = [];

  if (update.time) next.time = update.time;

  // ---- place: validate the location, canonicalize the area ----------------
  // The GM's state block is not always verbatim — "Serai Lanokh — rooftop",
  // "the Rooftop", stray casing. Snap whatever comes back onto the world's
  // real names so the location pill and the area backdrop actually follow
  // the story (rooftop scene → rooftop painting, not the same old banner).
  let locationChanged = false;
  if (update.location) {
    const raw = update.location.trim();
    const exact = Object.values(WORLD.locations).find(
      (l) => l.name.toLowerCase() === raw.toLowerCase()
    );
    if (exact && exact.name !== next.location) {
      next.location = exact.name;
      locationChanged = true;
    }
    // unrecognized location text is ignored — never corrupt a known place
  }
  if (update.area) {
    const raw = update.area.trim();
    const loc = Object.values(WORLD.locations).find(
      (l) => l.name.toLowerCase() === next.location.toLowerCase()
    );
    const areas = loc ? Object.keys(loc.areas ?? {}) : [];
    const norm = (s: string) =>
      s.toLowerCase().replace(/^the\s+/, "").replace(/[.,!?;:]+$/, "").trim();
    const n = norm(raw);
    const hit =
      areas.find((a) => a.toLowerCase() === raw.toLowerCase()) ??
      areas.find(
        (a) => norm(a) === n || norm(a).includes(n) || n.includes(norm(a))
      );
    next.area = hit ?? raw;
  } else if (locationChanged) {
    // moved to a new location with no area given — don't keep the old
    // location's area pinned in the pill/backdrop
    next.area = "";
  }
  if (typeof update.hp === "number") {
    const hp = clamp(Math.round(update.hp), 0, next.pc.hpMax);
    if (hp !== next.pc.hp) {
      gains.push({
        kind: "hp",
        label: `HP ${next.pc.hp} → ${hp}`,
        delta: hp - next.pc.hp,
      });
      next.pc.hp = hp;
    }
  }
  if (typeof update.marks === "number") {
    const marks = Math.max(0, Math.round(update.marks));
    if (marks !== next.pc.marks) {
      gains.push({
        kind: "marks",
        label: `${next.pc.marks} → ${marks} marks`,
        delta: marks - next.pc.marks,
      });
      next.pc.marks = marks;
    }
  }

  for (const name of update.inventory_add ?? []) {
    const found = next.pc.inventory.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (found) found.qty += 1;
    else next.pc.inventory.push({ name, qty: 1 });
    gains.push({ kind: "item", label: name, delta: 1 });
  }
  for (const name of update.inventory_remove ?? []) {
    const idx = next.pc.inventory.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (idx >= 0) {
      const item = next.pc.inventory[idx];
      if (item.qty > 1) item.qty -= 1;
      else next.pc.inventory.splice(idx, 1);
      gains.push({ kind: "item", label: name, delta: -1 });
    }
  }

  // ---- turn progression: attribute points -------------------------------
  for (const [k, delta] of Object.entries(update.attribute_updates ?? {})) {
    const key = k as AttrKey;
    const before = next.pc.attributes[key];
    if (typeof before !== "number" || typeof delta !== "number") continue;
    const after = clamp(
      Math.round(before + delta),
      WORLD.attributes.min,
      WORLD.attributes.max
    );
    if (after !== before) {
      next.pc.attributes[key] = after;
      gains.push({
        kind: "attribute",
        label: `${ATTR_SHORT[key]} ${before} → ${after}`,
        delta: after - before,
      });
    }
  }

  // ---- turn progression: trained skills ----------------------------------
  for (const raw of update.skills_add ?? []) {
    const key = resolveSkillKey(raw);
    if (!key || next.pc.skills.includes(key)) continue;
    next.pc.skills.push(key);
    gains.push({
      kind: "skill",
      label: WORLD.skills[key]?.name ?? key,
      detail: "trained skill earned",
    });
  }

  // ---- turn progression: rare granted powers -----------------------------
  if (update.ability_grant?.name) {
    const g = update.ability_grant;
    const exists = next.pc.grantedAbilities?.some(
      (a) => a.name.toLowerCase() === g.name.toLowerCase()
    );
    if (!exists) {
      next.pc.grantedAbilities = [
        ...(next.pc.grantedAbilities ?? []),
        { name: g.name, description: g.description ?? "" },
      ];
      gains.push({ kind: "ability", label: g.name, detail: g.description });
    }
  }

  const bondChanges: BondChangeDisplay[] = [];
  for (const upd of update.npc_updates ?? []) {
    // fuzzy match: the GM sometimes writes short names ("Fazlina", "Damara")
    const npc = npcByName(upd.name);
    if (!npc) continue;
    const prev = next.bonds[npc.name] ?? { score: 0, met: false };
    const score = clamp(prev.score + (upd.delta ?? 0), -100, 100);
    next.bonds[npc.name] = { score, met: true };
    bondChanges.push({ name: npc.name, delta: upd.delta ?? 0, note: upd.note, score });
    gains.push({
      kind: "bond",
      label: npc.name,
      detail: upd.note,
      delta: upd.delta ?? 0,
      name: npc.name,
    });
  }
  for (const name of update.met_npcs ?? []) {
    const npc = npcByName(name);
    if (npc) {
      if (!next.bonds[npc.name]) next.bonds[npc.name] = { score: 0, met: true };
      next.bonds[npc.name].met = true;
      if (!next.metNpcs.includes(npc.name)) next.metNpcs.push(npc.name);
    }
  }

  let won = false;
  for (const [k, v] of Object.entries(update.quest_updates ?? {})) {
    if (k in next.questStatus) next.questStatus[k] = v;
  }
  const objectives = Object.values(next.questStatus);
  if (objectives.length > 0 && objectives.every((s) => s === "complete")) {
    won = true;
    next.status = "won";
  }

  for (const name of update.visited_locations ?? []) {
    const loc = Object.values(WORLD.locations).find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    );
    if (loc && !next.visitedLocations.includes(loc.name)) {
      next.visitedLocations.push(loc.name);
    }
  }

  if (update.suggestions?.length) next.suggestions = update.suggestions.slice(0, 5);

  return { game: next, bonds: bondChanges, gains, won };
}

/** BYOK: the player's own open-platform key, kept ONLY in this browser
 *  (localStorage). When set, engine turns call the open API with it instead
 *  of the sandbox SDK — independent of any chat rate window. */
const BYOK_STORE = "qamarah-byok-v1";

export interface ByokConfig {
  key: string;
  base: string;
  model: string;
}

export function getByok(): ByokConfig | null {
  try {
    const raw = localStorage.getItem(BYOK_STORE);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as ByokConfig;
    return cfg?.key?.trim() ? cfg : null;
  } catch {
    return null;
  }
}

export function setByok(cfg: ByokConfig | null) {
  try {
    if (cfg?.key?.trim()) localStorage.setItem(BYOK_STORE, JSON.stringify(cfg));
    else localStorage.removeItem(BYOK_STORE);
  } catch {
    /* storage unavailable — fall back to the chat engine silently */
  }
}

async function callGm(req: GmRequest): Promise<GmTurnResponse> {
  const byok = getByok();
  if (byok) {
    req.apiKey = byok.key;
    req.apiUrl = byok.base;
    req.apiModel = byok.model;
  }
  const res = await fetch("/api/gm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  const data = (await res.json()) as GmTurnResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "The World Engine is unreachable.");
  return data;
}

function buildGmRequest(
  game: GameState,
  action: string,
  isStart: boolean
): GmRequest {
  const nearbyBonds = Object.entries(game.bonds)
    .filter(([, b]) => b.met)
    .map(([name, b]) => ({ name, score: b.score }));
  return {
    action,
    isStart,
    pc: game.pc,
    snapshot: {
      time: game.time,
      location: game.location,
      area: game.area,
      hp: game.pc.hp,
      marks: game.pc.marks,
      inventory: game.pc.inventory,
      nearbyBonds,
      questStatus: game.questStatus,
    },
    history: game.history.slice(-30),
    storyStartKey: game.storyStartKey,
  };
}

/** Collect the most recent aside whispers for the next turn's GM context. */
function collectRecentAsides(
  asides: Record<string, AsideMessage[]>,
  pcName: string,
  max = 8
): { npc: string; text: string }[] {
  const all: { npc: string; text: string; ts: number }[] = [];
  for (const [npc, thread] of Object.entries(asides)) {
    for (const m of thread) {
      all.push({
        npc,
        ts: m.ts,
        text: `${m.role === "pc" ? pcName : npc}: ${m.text}`,
      });
    }
  }
  return all.sort((a, b) => a.ts - b.ts).slice(-max).map(({ npc, text }) => ({ npc, text }));
}

/** Flatten an aside reply into clean bubble text. */
function cleanAsideReply(raw: string): string {
  const stripped = raw.replace(/<state>[\s\S]*$/i, "").trim();
  if (!stripped) return "…";
  return parseNarration(stripped)
    .map((l) => l.text)
    .join("\n");
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: "title",
      game: null,
      turnLog: [],
      loading: false,
      error: null,
      lastBondChanges: [],
      hasSave: false,

      asides: {},
      asideOpen: null,
      asideLoading: false,
      pendingAsides: false,
      npcSheetOpen: null,

      cinematic: null,

      goTitle: () => set({ screen: "title" }),
      goCreate: () => set({ screen: "create" }),

      beginGame: (config) => {
        const game = makeInitialState(config);
        set({
          game,
          turnLog: [],
          lastBondChanges: [],
          error: null,
          screen: "playing",
          hasSave: true,
          asides: {},
          asideOpen: null,
          pendingAsides: false,
          cinematic: null,
        });
        void get().sendAction("__start__");
      },

      sendAction: async (action) => {
        const game = get().game;
        if (!game || get().loading) return;
        const isStart = action === "__start__";

        set({
          loading: true,
          error: null,
          cinematic: { phase: "loading" },
        });

        if (!isStart) {
          set((s) => ({
            turnLog: [
              ...s.turnLog,
              { id: uid(), kind: "action", text: action },
            ],
          }));
        }

        try {
          const req = buildGmRequest(game, action, isStart);
          if (get().pendingAsides) {
            req.recentAsides = collectRecentAsides(get().asides, game.pc.name);
          }
          const res = await callGm(req);

          const { game: applied, bonds, gains, won } = applyUpdateToGame(
            game,
            res.state ?? {}
          );

          // Scenery safety net: a dropped <state> block (model slip or a
          // rate-limited nudge) must not freeze the backdrop where the beat
          // started. If the GM reported no area this turn, follow the
          // player's own declared destination — "up to the private
          // chambers" moves the picture with the bodies.
          let updated = applied;
          if (!res.state?.area && !isStart) {
            const dest = areaMentionedIn(action, applied.location);
            if (dest && dest !== applied.area) updated = { ...applied, area: dest };
          }
          const history = [
            ...game.history,
            ...(isStart
              ? []
              : ([{ role: "user", content: action }] as const)),
            { role: "assistant" as const, content: res.narration },
          ];
          const entryId = uid();

          set((s) => ({
            game: { ...updated, history, turn: updated.turn + 1 },
            turnLog: [
              ...s.turnLog,
              {
                id: entryId,
                kind: "gm",
                lines: parseNarration(res.narration),
                bonds,
                gains,
              },
            ],
            lastBondChanges: bonds,
            loading: false,
            error: null,
            pendingAsides: false,
            cinematic: { phase: "playing", entryId },
            ...(won ? {} : {}),
          }));
        } catch (err) {
          set({
            loading: false,
            error:
              err instanceof Error ? err.message : "The World Engine stumbled.",
            cinematic: null,
          });
        }
      },

      // ---- private asides: no turn cost, shapes the next turn ------------
      sendAside: async (npcName, text) => {
        const game = get().game;
        if (!game || get().asideLoading) return;
        const clean = text.trim();
        if (!clean) return;

        const pcMsg: AsideMessage = { id: uid(), role: "pc", text: clean, ts: Date.now() };
        set((s) => ({
          asides: {
            ...s.asides,
            [npcName]: [...(s.asides[npcName] ?? []).slice(-29), pcMsg],
          },
          asideLoading: true,
          error: null,
        }));

        try {
          const req = buildGmRequest(game, clean, false);
          req.mode = "aside";
          req.asideNpc = npcName;
          req.asideThread = (get().asides[npcName] ?? [])
            .slice(-16)
            .map((m) => ({
              role: (m.role === "pc" ? "user" : "assistant") as "user" | "assistant",
              content: m.text,
            }));
          const res = await callGm(req);

          const reply: AsideMessage = {
            id: uid(),
            role: "npc",
            text: cleanAsideReply(res.narration),
            ts: Date.now(),
          };
          set((s) => ({
            asides: {
              ...s.asides,
              [npcName]: [...(s.asides[npcName] ?? []).slice(-29), reply],
            },
            asideLoading: false,
            pendingAsides: true,
          }));
        } catch (err) {
          const reply: AsideMessage = {
            id: uid(),
            role: "npc",
            text: "(the words do not carry — try again)",
            ts: Date.now(),
          };
          set((s) => ({
            asides: {
              ...s.asides,
              [npcName]: [...(s.asides[npcName] ?? []).slice(-29), reply],
            },
            asideLoading: false,
            error:
              err instanceof Error ? err.message : "The aside slipped away.",
          }));
        }
      },

      openAside: (npcName) => set({ asideOpen: npcName }),
      closeAside: () => set({ asideOpen: null }),
      openNpcSheet: (name) => set({ npcSheetOpen: name }),
      closeNpcSheet: () => set({ npcSheetOpen: null }),
      closeCinematic: () => set({ cinematic: null }),

      travelTo: async (locationName) => {
        await get().sendAction(`I set out for ${locationName}.`);
      },

      applyState: (update) => {
        const game = get().game;
        if (!game) return null;
        const { game: next } = applyUpdateToGame(game, update);
        set({ game: next });
        return next;
      },

      resetGame: () => {
        set({
          screen: "title",
          game: null,
          turnLog: [],
          lastBondChanges: [],
          error: null,
          hasSave: false,
          loading: false,
          asides: {},
          asideOpen: null,
          asideLoading: false,
          pendingAsides: false,
          cinematic: null,
        });
      },

      dismissWin: () => {
        const game = get().game;
        if (game) set({ game: { ...game, status: "playing" } });
      },
    }),
    {
      name: "qamarah-save-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (s) => ({
        screen: s.screen,
        game: s.game,
        turnLog: s.turnLog,
        lastBondChanges: s.lastBondChanges,
        hasSave: s.hasSave,
        asides: s.asides,
        pendingAsides: s.pendingAsides,
      }),
      migrate: (persisted, _version) => {
        const s = persisted as
          | (Partial<GameStore> & { game?: GameState })
          | undefined;
        if (s?.game) {
          const g = s.game;
          // Najib Hamid was a test relationship — wipe it and every trace of it.
          if (g.bonds?.["Najib Hamid"]) {
            g.bonds["Najib Hamid"] = { score: 0, met: false };
          }
          if (Array.isArray(g.metNpcs)) {
            g.metNpcs = g.metNpcs.filter((n) => !/najib/i.test(n));
          }
          if (Array.isArray(g.history)) {
            g.history = g.history.filter((m) => !/najib/i.test(m?.content ?? ""));
          }
          if (Array.isArray(s.turnLog)) {
            s.turnLog = (s.turnLog as TurnEntry[])
              .map((e) => {
                if (e.kind === "gm") {
                  return {
                    ...e,
                    lines: (e.lines ?? []).filter(
                      (l) =>
                        !(l.speaker && /najib/i.test(l.speaker)) &&
                        !/najib/i.test(l.text)
                    ),
                    bonds: (e.bonds ?? []).filter(
                      (b) => !/najib/i.test(b.name)
                    ),
                  };
                }
                if (e.text && /najib/i.test(e.text)) return { ...e, text: "" };
                return e;
              })
              .filter(
                (e) =>
                  (e.kind === "gm" ? (e.lines?.length ?? 0) > 0 : true) &&
                  !(e.text === "")
              );
          }
          if (Array.isArray(s.lastBondChanges)) {
            s.lastBondChanges = s.lastBondChanges.filter(
              (b) => !/najib/i.test(b.name)
            );
          }
        }
        return s as GameStore;
      },
      onRehydrateStorage: () => (state) => {
        if (state && !state.hasSave) {
          state.screen = "title";
        }
        if (state) {
          state.cinematic = null;
          state.asideOpen = null;
          state.asideLoading = false;
          state.npcSheetOpen = null;
        }
      },
    }
  )
);

export { bondStage, ATTR_KEYS };
