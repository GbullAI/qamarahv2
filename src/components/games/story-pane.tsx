"use client";

import { useEffect, useRef, useState } from "react";
import { useGame, type TurnEntry } from "@/lib/game/store";
import { NpcAvatar, npcSpeakerMeta } from "./npc-avatar";
import type { TurnGain } from "@/lib/game/types";
import { cn } from "@/lib/utils";
import { MessageCircle, Send } from "lucide-react";

// ---------------------------------------------------------------------------
// StoryPane — the FULL-PAGE story log, AI Dungeon style. No box, no card:
// every turn flows as plain readable text across the full page width, over
// the scene backdrop, and one bare action line rides the bottom. The turn
// animation (cinematic) still plays full-screen after each action; when it
// closes, the reader lands back here, scrolled to the latest beat.
// ---------------------------------------------------------------------------

export function StoryPane() {
  const game = useGame((s) => s.game);
  const turnLog = useGame((s) => s.turnLog);
  const loading = useGame((s) => s.loading);
  const sendAction = useGame((s) => s.sendAction);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // keep the latest beat in view as the tale grows
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight });
  }, [turnLog.length, loading]);

  async function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    await sendAction(text);
  }

  if (!game) return null;

  return (
    <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      {/* ---- the flowing story — the whole page, no box ---- */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 sm:px-8"
      >
        <div className="mx-auto max-w-3xl space-y-4 pb-8">
          <p className="text-center font-serif text-[13px] italic text-stone-600">
            — the tale of {game.pc.name}, as the lanterns record it —
          </p>
          {turnLog.map((entry) => (
            <TurnBlock key={entry.id} entry={entry} pcName={game.pc.name} />
          ))}
          {loading && (
            <p className="flex items-center gap-2.5 py-1 font-serif text-[15px] italic text-stone-400">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              The tide turns…
            </p>
          )}
          {turnLog.length === 0 && !loading && (
            <div className="flex flex-col items-center gap-3 pt-12 text-center">
              <p className="font-serif text-[15px] italic leading-relaxed text-stone-400">
                The lanterns are lit, but the opening scene never landed — the
                harbour was crowded. Nothing is lost; the tale is still
                waiting for its first breath.
              </p>
              <button
                type="button"
                onClick={() => void sendAction("__start__")}
                className="rounded-full bg-amber-600 px-6 py-2.5 text-sm font-semibold text-stone-950 transition-colors hover:bg-amber-500"
              >
                Begin the tale
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---- one bare action line, full width — no box around it ---- */}
      <form
        className="relative z-20 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-8"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-12 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
        />
        <div className="relative mx-auto flex max-w-3xl items-center gap-2 pt-1">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              loading ? "The world is listening…" : "Say or do something…"
            }
            disabled={loading}
            className="h-11 w-full min-w-0 rounded-full border border-white/10 bg-black/45 px-4.5 text-[15px] text-white backdrop-blur-md placeholder:text-zinc-500 focus:border-white/30 focus:outline-none disabled:opacity-50"
            aria-label="Your action"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Act"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200 disabled:opacity-40"
          >
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transcript rendering — plain flowing text, AI Dungeon style
// ---------------------------------------------------------------------------

function TurnBlock({ entry, pcName }: { entry: TurnEntry; pcName: string }) {
  const openAside = useGame((s) => s.openAside);

  if (entry.kind === "action") {
    return (
      <p className="font-serif text-[15px] leading-relaxed text-amber-300/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:text-base">
        <span className="mr-1.5 text-amber-500/80" aria-hidden>
          &gt;
        </span>
        {entry.text}
      </p>
    );
  }

  if (entry.kind === "system") {
    return (
      <p className="text-center font-serif text-[13px] italic text-stone-500">
        {entry.text}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {(entry.lines ?? []).map((line, i) => {
        const isPc = line.speaker?.toLowerCase() === pcName.toLowerCase();
        const meta =
          line.speaker && !isPc ? npcSpeakerMeta(line.speaker) : null;

        if (!line.speaker) {
          return (
            <p
              key={i}
              className="font-serif text-[15px] leading-relaxed text-stone-300/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:text-base"
            >
              {line.text}
            </p>
          );
        }

        if (isPc) {
          return (
            <p
              key={i}
              className="font-serif text-[15px] leading-relaxed text-amber-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:text-base"
            >
              <span className="font-semibold text-amber-400">{pcName}:</span>{" "}
              {line.text}
            </p>
          );
        }

        return (
          <p
            key={i}
            className="font-serif text-[15px] leading-relaxed text-stone-100 drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)] sm:text-base"
          >
            <span
              className="font-semibold"
              style={{ color: meta?.color ?? "#d6d3d1" }}
            >
              {line.speaker}:
            </span>{" "}
            {line.text}
            <button
              type="button"
              onClick={() => openAside(line.speaker!)}
              title="Private aside — whispers carry into the next turn, costs no turn"
              aria-label={`Whisper to ${line.speaker}`}
              className="ml-1.5 inline-flex translate-y-0.5 rounded p-0.5 text-stone-600 transition-colors hover:bg-white/5 hover:text-amber-300"
            >
              <MessageCircle className="h-3 w-3" aria-hidden />
            </button>
          </p>
        );
      })}

      <TurnLedger entry={entry} />
    </div>
  );
}

/** The earned progression strip under a GM turn — small, unboxed, skimmable. */
function TurnLedger({ entry }: { entry: TurnEntry }) {
  const gains: TurnGain[] =
    entry.gains ??
    (entry.bonds ?? []).map((b) => ({
      kind: "bond" as const,
      label: b.name,
      detail: b.note,
      delta: b.delta,
      name: b.name,
    }));

  if (gains.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
      {gains.map((g, i) => (
        <span
          key={i}
          title={g.detail}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] backdrop-blur-sm",
            g.kind === "bond" || g.kind === "hp" || g.kind === "marks" || g.kind === "item"
              ? g.delta !== undefined && g.delta < 0
                ? "border-rose-900/60 bg-rose-950/30 text-rose-300"
                : "border-emerald-900/60 bg-emerald-950/30 text-emerald-300"
              : "border-amber-900/60 bg-amber-950/30 text-amber-200"
          )}
        >
          {g.kind === "bond" ? (
            <NpcAvatar name={g.name ?? g.label} size={14} interactive={false} />
          ) : null}
          <span className="max-w-[160px] truncate">{g.label}</span>
          {g.delta !== undefined && (
            <span>{g.delta >= 0 ? `+${g.delta}` : g.delta}</span>
          )}
        </span>
      ))}
    </div>
  );
}
