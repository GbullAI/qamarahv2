"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useGame } from "@/lib/game/store";
import { WORLD, npcByName } from "@/lib/game/world";
import { NpcAvatar, npcSpeakerMeta } from "./npc-avatar";
import { cn } from "@/lib/utils";
import { Loader2, Maximize2, MessageCircle, Send, X } from "lucide-react";

/**
 * Small floating bubble for private asides with one NPC — whispered words
 * that cost no turn but carry into the next one. Talk and promises only:
 * deeds resolve when the player spends a full turn on them.
 */
export function AsideChat() {
  const game = useGame((s) => s.game);
  const asides = useGame((s) => s.asides);
  const asideOpen = useGame((s) => s.asideOpen);
  const asideLoading = useGame((s) => s.asideLoading);
  const closeAside = useGame((s) => s.closeAside);
  const sendAside = useGame((s) => s.sendAside);

  const [input, setInput] = useState("");
  const [zoom, setZoom] = useState(false); // full-quality portrait, from the chat
  const threadRef = useRef<HTMLDivElement>(null);
  const npc = asideOpen ? npcByName(asideOpen) : null;
  const thread = asideOpen ? asides[asideOpen] ?? [] : [];
  const meta = asideOpen ? npcSpeakerMeta(asideOpen) : null;

  // The full-quality art this NPC owns: the transparent cutout when present,
  // else the rectangular card.
  const fullArt = npc?.portrait ?? npc?.portraitCard ?? null;

  useEffect(() => {
    threadRef.current?.scrollTo({
      top: threadRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [thread.length, asideLoading, asideOpen]);

  // Escape closes the full-quality portrait view
  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setZoom(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom]);

  // Closing the aside or switching NPC closes the portrait view too
  // (render-phase reset — no effect needed)
  const [prevAsideOpen, setPrevAsideOpen] = useState<string | null>(asideOpen);
  if (prevAsideOpen !== asideOpen) {
    setPrevAsideOpen(asideOpen);
    setZoom(false);
  }

  if (!game || !asideOpen || !npc) return null;

  async function submit() {
    const text = input.trim();
    if (!text || asideLoading) return;
    setInput("");
    await sendAside(npc!.name, text);
  }

  return (
    <div className="fixed bottom-28 right-3 z-[65] w-[calc(100vw-1.5rem)] max-w-sm sm:bottom-28 sm:right-6">
      <div className="flex max-h-[62dvh] flex-col overflow-hidden rounded-2xl border border-stone-700/70 bg-stone-950/90 shadow-2xl shadow-black/70 backdrop-blur-xl">
        {/* header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-stone-800/80 bg-stone-900/60 px-3.5 py-3">
          {fullArt ? (
            <button
              type="button"
              onClick={() => setZoom(true)}
              title={`View ${npc.name} full size`}
              aria-label={`View ${npc.name} full size`}
              className="group relative shrink-0 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <NpcAvatar name={npc.name} size={44} shape="card" interactive={false} className="rounded-xl transition-transform duration-150 group-hover:scale-[1.05] group-hover:brightness-110" />
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-stone-600/70 bg-stone-950 text-stone-400 shadow transition-colors group-hover:border-amber-700 group-hover:text-amber-200">
                <Maximize2 className="h-2.5 w-2.5" aria-hidden />
              </span>
            </button>
          ) : (
            <NpcAvatar name={npc.name} size={44} shape="card" />
          )}
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-sm font-semibold"
              style={{ color: meta?.color ?? "#d6d3d1" }}
            >
              {npc.name}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-stone-500">
              <MessageCircle className="h-3 w-3" />
              private aside · talk only · no turn spent
            </p>
          </div>
          <button
            type="button"
            onClick={closeAside}
            aria-label="Close aside"
            className="rounded-md p-1.5 text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* thread */}
        <div
          ref={threadRef}
          className="min-h-[88px] flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3"
        >
          {thread.length === 0 && (
            <p className="py-3 text-center font-serif text-[13px] italic leading-relaxed text-stone-600">
              Lean close and whisper — she will answer here, between turns.
            </p>
          )}
          {thread.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "pc" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl border px-3.5 py-2 text-sm leading-relaxed",
                  m.role === "pc"
                    ? "rounded-br-md border-amber-900/50 bg-amber-950/40 text-amber-100"
                    : "rounded-bl-md border-stone-700/50 bg-stone-900/70 text-stone-200"
                )}
              >
                {m.text.split("\n").map((t, i) => (
                  <p key={i} className={i > 0 ? "mt-1.5" : undefined}>
                    {t}
                  </p>
                ))}
              </div>
            </div>
          ))}
          {asideLoading && (
            <div className="flex items-center gap-2 px-1 text-stone-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs italic">{npc.name.split(" ")[0]} listens…</span>
            </div>
          )}
        </div>

        {/* input */}
        <div className="flex shrink-0 items-center gap-2 border-t border-stone-800/80 bg-stone-900/40 p-2.5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={`Whisper to ${npc.name.split(" ")[0]}…`}
            disabled={asideLoading}
            className="min-w-0 flex-1 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-600 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={asideLoading || !input.trim()}
            aria-label="Send whisper"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-stone-950 transition-colors hover:bg-amber-500 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="shrink-0 border-t border-stone-800/60 bg-stone-950/60 px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.2em] text-stone-600">
          words only — deeds resolve in a full turn
        </p>
      </div>

      {/* ---- full-quality portrait: the ORIGINAL file, opened from the chat ---- */}
      {zoom && fullArt && (
        <div
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-4 bg-black/95 p-4 sm:p-8"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${npc.name}, portrait at full size`}
        >
          <div
            className="flex min-h-0 flex-1 items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={fullArt}
              alt={npc.name}
              width={752}
              height={1008}
              priority
              unoptimized
              className="h-auto max-h-full w-auto max-w-full object-contain"
            />
          </div>
          <div
            className="flex shrink-0 items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <span
              className="text-sm font-semibold uppercase tracking-[0.25em]"
              style={{ color: meta?.color ?? "#d6d3d1" }}
            >
              {npc.name}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(false);
              }}
              title="Close full view"
              aria-label="Close full view"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-600/60 bg-black/45 text-stone-300 backdrop-blur-md transition-colors hover:border-amber-700 hover:text-amber-200"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Is this NPC a valid aside partner? (must exist in the world) */
export function canAside(npcName: string): boolean {
  return !!WORLD.npcs && !!npcByName(npcName);
}
