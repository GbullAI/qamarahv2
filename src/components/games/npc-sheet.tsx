"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useGame } from "@/lib/game/store";
import { WORLD, npcByName, factionColor } from "@/lib/game/world";
import { bondStage } from "@/lib/game/types";
import { MessageCircle, MapPin, X } from "lucide-react";

/**
 * Character-sheet popout — click any NPC portrait or monogram anywhere in the
 * interface (dialogue log, turn ledger chips, codex faces, aside chat) to open
 * it. Shows the portrait, standing, bond meter, haunts, and public dossier.
 */
export function NpcSheet() {
  const open = useGame((s) => s.npcSheetOpen);
  const close = useGame((s) => s.closeNpcSheet);
  const game = useGame((s) => s.game);
  const openAside = useGame((s) => s.openAside);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!open || !game) return null;
  const npc = npcByName(open);
  if (!npc) return null;

  const color = factionColor(npc.faction);
  const bond = game.bonds[npc.name] ?? {
    score: npc.initialRelationship,
    met: false,
  };
  const stage = bondStage(bond.score, WORLD.relationshipStages);
  const art = npc.portraitCard ?? npc.portrait;

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${npc.name} — character sheet`}
      onClick={close}
    >
      {/* backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 animate-[fadeIn_180ms_ease] bg-black/70 backdrop-blur-[6px]"
      />

      {/* the sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88vh] w-full max-w-lg animate-[portraitIn_260ms_ease-out] overflow-y-auto rounded-2xl border bg-[#14100b] shadow-[0_0_90px_rgba(0,0,0,0.85)]"
        style={{ borderColor: `${color}66` }}
      >
        {/* ---- header: portrait + identity ---- */}
        <div className="relative flex gap-4 p-5">
          <div
            className="relative h-48 w-[132px] shrink-0 overflow-hidden rounded-xl"
            style={{
              boxShadow: `0 0 26px ${color}22`,
              border: `1px solid ${color}55`,
            }}
          >
            {art ? (
              <Image
                src={art}
                alt={npc.name}
                fill
                sizes="264px"
                className="object-cover object-top [filter:brightness(1.28)_saturate(1.08)_contrast(1.04)]"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center font-serif text-4xl"
                style={{
                  background: `linear-gradient(160deg, ${color}33, #1c1814)`,
                  color,
                }}
              >
                {npc.name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className="font-serif text-2xl font-semibold leading-tight text-amber-50"
              style={{ textShadow: `0 0 18px ${color}55` }}
            >
              {npc.name}
            </h3>
            <p className="mt-0.5 text-xs text-stone-500">
              {npc.type}
              {npc.tier ? ` · ${npc.tier}` : ""}
            </p>
            <p
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
              style={{ borderColor: `${color}55`, color }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: color }}
              />
              {npc.faction}
            </p>

            {/* bond meter */}
            <div className="mt-3">
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="uppercase tracking-[0.18em] text-stone-500">
                  Bond
                </span>
                <span className="font-medium" style={{ color }}>
                  {bond.met ? stage : "a face not yet met"}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-stone-800 ring-1 ring-stone-700/70">
                  <div className="absolute left-1/2 top-0 h-full w-[2px] bg-stone-500" />
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
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-lg bg-stone-950/70 p-2 text-stone-400 transition-colors hover:bg-stone-800 hover:text-amber-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ---- haunts ---- */}
        {npc.location && (
          <div className="mx-4 flex items-center gap-2 rounded-lg border border-stone-800/80 bg-stone-950/60 px-3 py-2 text-xs text-stone-400 sm:mx-5">
            <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color }} />
            <span>
              Keeps to <span className="text-stone-200">{npc.location}</span>
              {npc.area ? (
                <>
                  {" — "}
                  <span className="capitalize text-stone-300">{npc.area}</span>
                </>
              ) : null}
            </span>
          </div>
        )}

        {/* ---- temperament ---- */}
        {npc.personality?.length > 0 && (
          <div className="mt-3 px-4 sm:px-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
              Temperament
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {npc.personality.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-stone-800 bg-stone-950 px-2.5 py-1 text-[11px] text-stone-300"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ---- public dossier ---- */}
        <div className="mt-3 px-4 pb-4 sm:px-5 sm:pb-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-600">
            What the port knows
          </p>
          <p className="mt-1.5 max-h-44 overflow-y-auto pr-1 font-serif text-[15px] leading-relaxed text-stone-300">
            {npc.basicInfo}
          </p>
        </div>

        {/* ---- footer action ---- */}
        {bond.met && (
          <div className="border-t border-stone-800/80 p-3.5">
            <button
              type="button"
              onClick={() => {
                openAside(npc.name);
                close();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-900/50 bg-amber-950/25 px-4 py-2.5 text-sm text-amber-200 transition-colors hover:border-amber-600 hover:bg-amber-950/40 hover:text-amber-100"
            >
              <MessageCircle className="h-4 w-4" />
              Whisper privately — no turn spent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
