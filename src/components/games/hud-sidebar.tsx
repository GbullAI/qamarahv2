"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useGame } from "@/lib/game/store";
import {
  WORLD,
  ATTR_KEYS,
  factionColor,
  locationByName,
} from "@/lib/game/world";
import {
  ATTR_SHORT,
  attrModifier,
  bondStage,
  type AttrKey,
} from "@/lib/game/types";
import { NpcAvatar } from "./npc-avatar";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CheckCircle2,
  Coins,
  Crosshair,
  Flame,
  HeartHandshake,
  HelpCircle,
  Map as MapIcon,
  MessageCircle,
  ScrollText,
  Sparkles,
  User,
} from "lucide-react";

export type HudTab = "character" | "bonds" | "quest" | "map" | "codex";

const TABS: { id: HudTab; label: string; icon: React.ReactNode }[] = [
  { id: "character", label: "Character", icon: <User className="h-4 w-4" /> },
  { id: "bonds", label: "Bonds", icon: <HeartHandshake className="h-4 w-4" /> },
  { id: "quest", label: "Quest", icon: <ScrollText className="h-4 w-4" /> },
  { id: "map", label: "Map", icon: <MapIcon className="h-4 w-4" /> },
  { id: "codex", label: "Codex", icon: <BookOpen className="h-4 w-4" /> },
];

export function HudPanel({ tab }: { tab: HudTab }) {
  const game = useGame((s) => s.game);
  if (!game) return null;
  switch (tab) {
    case "character":
      return <CharacterTab />;
    case "bonds":
      return <BondsTab />;
    case "quest":
      return <QuestTab />;
    case "map":
      return <MapTab />;
    case "codex":
      return <CodexTab />;
  }
}

export function HudTabs({
  active,
  onChange,
}: {
  active: HudTab;
  onChange: (t: HudTab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Game panels"
      className="grid grid-cols-5 gap-1 border-b border-stone-800/80 bg-[#0f0d0b] p-1.5"
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-md px-1 py-2 text-[10px] font-medium uppercase tracking-wider transition-colors",
            active === t.id
              ? "bg-amber-600/15 text-amber-300"
              : "text-stone-500 hover:text-stone-300"
          )}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Character
// ---------------------------------------------------------------------------

function CharacterTab() {
  const game = useGame((s) => s.game)!;
  const pc = game.pc;
  const hpPct = (pc.hp / pc.hpMax) * 100;

  return (
    <div className="space-y-4 p-4">
      <header>
        <h3 className="font-serif text-xl text-amber-100">{pc.name}</h3>
        <p className="text-xs text-stone-500">
          {pc.pronouns} · turn {game.turn}
        </p>
      </header>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="uppercase tracking-wider text-stone-500">Health</span>
          <span className="text-stone-300">
            {pc.hp} / {pc.hpMax}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-stone-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${hpPct}%`,
              background:
                hpPct > 50
                  ? "linear-gradient(90deg,#7f1d1d,#dc2626)"
                  : hpPct > 25
                    ? "linear-gradient(90deg,#7c2d12,#ea580c)"
                    : "linear-gradient(90deg,#450a0a,#991b1b)",
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-950 px-3 py-2.5">
        <span className="flex items-center gap-2 text-sm text-stone-300">
          <Coins className="h-4 w-4 text-amber-500" />
          Marks
        </span>
        <span className="font-serif text-lg text-amber-200">{pc.marks}</span>
      </div>

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Attributes
        </h4>
        <div className="grid grid-cols-3 gap-1.5">
          {ATTR_KEYS.map((k) => {
            const v = pc.attributes[k as AttrKey];
            const mod = attrModifier(v);
            return (
              <div
                key={k}
                className="rounded-lg border border-stone-800 bg-stone-950 p-2 text-center"
              >
                <div className="text-[10px] uppercase tracking-wider text-stone-500">
                  {ATTR_SHORT[k as AttrKey]}
                </div>
                <div className="font-serif text-lg text-stone-100">{v}</div>
                <div
                  className={cn(
                    "text-[10px]",
                    mod > 0
                      ? "text-emerald-400"
                      : mod < 0
                        ? "text-rose-400"
                        : "text-stone-600"
                  )}
                >
                  {mod >= 0 ? "+" : ""}
                  {mod} mod
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Trained skills
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {pc.skills.map((key) => (
            <span
              key={key}
              className="rounded-full border border-amber-900/60 bg-amber-950/30 px-2.5 py-1 text-xs text-amber-200"
            >
              {WORLD.skills[key]?.name ?? key}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Gift
        </h4>
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
            <Sparkles className="h-4 w-4" />
            {WORLD.abilities[pc.ability]?.name ?? pc.ability}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-400">
            {WORLD.abilities[pc.ability]?.description}
          </p>
        </div>
      </section>

      {(pc.grantedAbilities?.length ?? 0) > 0 && (
        <section>
          <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
            Earned powers
          </h4>
          <div className="space-y-2">
            {pc.grantedAbilities!.map((a) => (
              <div
                key={a.name}
                className="rounded-lg border border-amber-900/50 bg-amber-950/20 p-3"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <Sparkles className="h-4 w-4" />
                  {a.name}
                </div>
                {a.description && (
                  <p className="mt-1 text-xs leading-relaxed text-stone-400">
                    {a.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Carried
        </h4>
        {pc.inventory.length === 0 ? (
          <p className="text-xs italic text-stone-600">Pockets almost empty.</p>
        ) : (
          <ul className="space-y-1.5">
            {pc.inventory.map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md border border-stone-800 bg-stone-950 px-3 py-2 text-sm"
              >
                <span className="text-stone-200">{item.name}</span>
                {item.qty > 1 && (
                  <span className="text-xs text-stone-500">x{item.qty}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bonds
// ---------------------------------------------------------------------------

function BondsTab() {
  const game = useGame((s) => s.game)!;
  const openAside = useGame((s) => s.openAside);
  const [open, setOpen] = useState<string | null>(null);

  const met = useMemo(
    () =>
      Object.values(WORLD.npcs)
        .filter((n) => game.bonds[n.name]?.met)
        .sort(
          (a, b) => (game.bonds[b.name]?.score ?? 0) - (game.bonds[a.name]?.score ?? 0)
        ),
    [game.bonds]
  );

  if (met.length === 0) {
    return (
      <EmptyState text="No names earned yet. The coast will learn yours soon enough." />
    );
  }

  return (
    <div className="space-y-2 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
        Bond ledger — receptivity, −100 to +100
      </p>
      {met.map((npc) => {
        const bond = game.bonds[npc.name];
        const stage = bondStage(bond.score, WORLD.relationshipStages);
        const color = factionColor(npc.faction);
        const isOpen = open === npc.name;
        return (
          <div key={npc.name} className="overflow-hidden rounded-lg border border-stone-800 bg-stone-950">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : npc.name)}
              className="flex w-full items-center gap-3 p-3 text-left"
            >
              <NpcAvatar name={npc.name} size={40} interactive={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-stone-100">
                    {npc.name}
                  </span>
                  <span className="shrink-0 text-xs" style={{ color }}>
                    {stage}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800">
                    <div className="absolute left-1/2 top-0 h-full w-px bg-stone-600" />
                    <div
                      className="absolute top-0 h-full rounded-full transition-all duration-500"
                      style={
                        bond.score >= 0
                          ? {
                              left: "50%",
                              width: `${(bond.score / 100) * 50}%`,
                              background: color,
                            }
                          : {
                              right: "50%",
                              width: `${(-bond.score / 100) * 50}%`,
                              background: "#9f1239",
                            }
                      }
                    />
                  </div>
                  <span className="w-8 text-right font-serif text-sm text-stone-300">
                    {bond.score}
                  </span>
                </div>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-stone-800/80 px-4 py-3">
                <p className="text-xs text-stone-400">
                  <span className="text-stone-500">{npc.type}</span> ·{" "}
                  <span style={{ color }}>{npc.faction}</span>
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-400">
                  {npc.basicInfo}
                </p>
                <button
                  type="button"
                  onClick={() => openAside(npc.name)}
                  className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-900/50 bg-amber-950/25 px-3 py-1.5 text-xs text-amber-200 transition-colors hover:border-amber-600 hover:text-amber-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Whisper privately — no turn spent
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quest
// ---------------------------------------------------------------------------

function QuestTab() {
  const game = useGame((s) => s.game)!;
  const q = WORLD.quest;
  if (!q) return <EmptyState text="No campaign." />;

  return (
    <div className="space-y-4 p-4">
      <header>
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-amber-500" />
          <h3 className="font-serif text-lg text-amber-100">{q.name}</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-stone-400">
          {q.questStatement}
        </p>
      </header>

      <ul className="space-y-2">
        {Object.values(q.objectives).map((o) => {
          const status = game.questStatus[o.id] ?? o.status;
          return (
            <li
              key={o.id}
              className={cn(
                "flex items-start gap-2.5 rounded-lg border p-3",
                status === "complete"
                  ? "border-emerald-900/60 bg-emerald-950/20"
                  : status === "hidden"
                    ? "border-stone-800/60 bg-stone-950/60"
                    : "border-amber-900/50 bg-amber-950/15"
              )}
            >
              {status === "complete" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : status === "hidden" ? (
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-600" />
              ) : (
                <Crosshair className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-amber-500" />
              )}
              <span
                className={cn(
                  "text-sm leading-snug",
                  status === "complete"
                    ? "text-emerald-200/80 line-through"
                    : status === "hidden"
                      ? "italic text-stone-500"
                      : "text-stone-200"
                )}
              >
                {status === "hidden" ? "A power base not yet found." : o.text}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg border border-stone-800 bg-stone-950 p-3">
        <h4 className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Signpost
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-stone-300">
          {q.nextStep}
        </p>
        <p className="mt-2 text-[10px] italic text-stone-600">
          Signposts are not handcuffs — the tide is yours to choose.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function MapTab() {
  const game = useGame((s) => s.game)!;
  const travelTo = useGame((s) => s.travelTo);
  const loading = useGame((s) => s.loading);
  const [showChart, setShowChart] = useState(false);

  const locs = Object.values(WORLD.locations);
  const maxX = Math.max(...locs.map((l) => l.x));
  const maxY = Math.max(...locs.map((l) => l.y));

  return (
    <div className="space-y-3 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {WORLD.region.name} — tap a marker to travel
      </p>

      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-stone-800 bg-[#12100c]">
        {/* faint grid + lantern glow backdrop */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 70%, #b45309 0%, transparent 45%), radial-gradient(circle at 75% 25%, #78350f 0%, transparent 40%), linear-gradient(#292524 1px, transparent 1px), linear-gradient(90deg, #292524 1px, transparent 1px)",
            backgroundSize: "100% 100%, 100% 100%, 24px 24px, 24px 24px",
          }}
          aria-hidden
        />
        {/* coast water line */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M0,8 C20,14 35,6 55,12 C75,18 90,10 100,14"
            fill="none"
            stroke="#5eead4"
            strokeOpacity="0.25"
            strokeWidth="0.6"
          />
          <text x="2" y="6" fontSize="3" fill="#5eead4" fillOpacity="0.5">
            SELAT REACH
          </text>
        </svg>

        {locs.map((l) => {
          const visited = game.visitedLocations.includes(l.name);
          const isCurrent = game.location === l.name;
          const left = (l.x / (maxX + 4)) * 100;
          const top = (l.y / (maxY + 4)) * 100;
          return (
            <button
              key={l.name}
              type="button"
              disabled={isCurrent || loading}
              onClick={() => void travelTo(l.name)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none disabled:cursor-default"
              style={{ left: `${left}%`, top: `${top}%` }}
              aria-label={isCurrent ? `Current location: ${l.name}` : `Travel to ${l.name}`}
            >
              <span className="relative flex items-center justify-center">
                {isCurrent && (
                  <span className="absolute h-8 w-8 animate-ping rounded-full bg-amber-500/30" />
                )}
                <span
                  className={cn(
                    "relative flex h-5 w-5 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-transform group-hover:scale-125",
                    isCurrent
                      ? "border-amber-300 bg-amber-500 text-stone-950"
                      : visited
                        ? "border-stone-500 bg-stone-800 text-amber-300"
                        : "border-stone-700 bg-stone-950 text-stone-600"
                  )}
                >
                  {visited ? "◆" : "?"}
                </span>
              </span>
              <span
                className={cn(
                  "mt-1 block whitespace-nowrap rounded bg-stone-950/85 px-1.5 py-0.5 text-[9px] font-medium sm:text-[10px]",
                  isCurrent ? "text-amber-200" : visited ? "text-stone-300" : "text-stone-600"
                )}
              >
                {isCurrent ? l.name : visited ? l.name : "unknown"}
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setShowChart((v) => !v)}
        className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-400 hover:border-stone-600"
      >
        {showChart ? "Hide" : "View"} the sailors&apos; chart of the Selat Reach
      </button>
      {showChart && (
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-stone-800">
          <Image
            src="/scenes/region-chart.webp"
            alt="Sailors' chart of the Selat Reach"
            fill
            sizes="(max-width: 768px) 90vw, 340px"
            className="object-cover"
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Codex
// ---------------------------------------------------------------------------

function CodexTab() {
  const game = useGame((s) => s.game)!;

  const metNpcs = Object.values(WORLD.npcs).filter((n) =>
    game.bonds[n.name]?.met
  );
  const knownFactions = new Set<string>();
  for (const n of metNpcs) if (n.faction !== "None") knownFactions.add(n.faction);
  for (const locName of game.visitedLocations) {
    const loc = locationByName(locName);
    loc?.factions.forEach((f) => knownFactions.add(f));
  }

  return (
    <div className="space-y-5 p-4">
      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Faces learned
        </h4>
        {metNpcs.length === 0 ? (
          <p className="text-xs italic text-stone-600">No one yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {metNpcs.map((n) => (
              <div
                key={n.name}
                className="rounded-lg border border-stone-800 bg-stone-950 p-2.5"
              >
                <div className="flex items-center gap-2">
                  <NpcAvatar name={n.name} size={30} />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-stone-100">
                      {n.name}
                    </p>
                    <p className="truncate text-[10px] text-stone-500">{n.type}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Powers of the coast
        </h4>
        <div className="space-y-2">
          {Array.from(knownFactions).map((f) => {
            const fac = WORLD.factions[f];
            if (!fac) return null;
            return (
              <div
                key={f}
                className="rounded-lg border border-stone-800 bg-stone-950 p-3"
              >
                <div className="flex items-center gap-2">
                  <Flame
                    className="h-3.5 w-3.5"
                    style={{ color: factionColor(f) }}
                  />
                  <span className="text-xs font-semibold text-stone-100">
                    {fac.name}
                  </span>
                  <span className="ml-auto text-[10px] uppercase text-stone-600">
                    {fac.type}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                  {fac.basicInfo}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h4 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
          Ground walked
        </h4>
        <div className="space-y-2">
          {Object.values(WORLD.locations).map((l) => {
            const visited = game.visitedLocations.includes(l.name);
            return (
              <div
                key={l.name}
                className={cn(
                  "rounded-lg border p-3",
                  visited
                    ? "border-stone-800 bg-stone-950"
                    : "border-stone-800/50 bg-stone-950/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      visited ? "text-stone-100" : "italic text-stone-600"
                    )}
                  >
                    {visited ? l.name : "Not yet walked"}
                  </span>
                  {game.location === l.name && (
                    <span className="rounded bg-amber-600/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-300">
                      here
                    </span>
                  )}
                </div>
                {visited && (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-stone-400">
                    {l.basicInfo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <p className="max-w-[220px] text-center font-serif text-sm italic text-stone-600">
        {text}
      </p>
    </div>
  );
}
