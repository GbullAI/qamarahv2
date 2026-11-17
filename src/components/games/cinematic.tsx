"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useGame, type TurnEntry } from "@/lib/game/store";
import { locationByName, sceneImageFor } from "@/lib/game/world";
import { npcPortraitPath, npcSpeakerMeta } from "./npc-avatar";
import { cn } from "@/lib/utils";
import { Flame, X } from "lucide-react";

/** One readable "page" of the cinematic — a transcript line, or a slice of a long one. */
interface CinematicPage {
  speaker: string | null;
  text: string;
}

/**
 * Split transcript lines into pages that fit the dialogue card (max ~5 visible
 * lines) at sentence boundaries, so a long turn PAGES THROUGH instead of
 * stretching the card and crushing the portrait.
 */
function paginateLines(
  lines: { speaker: string | null; text: string }[],
  maxChars = 260
): CinematicPage[] {
  const pages: CinematicPage[] = [];
  for (const line of lines) {
    const text = line.text.trim();
    if (!text) continue;
    if (text.length <= maxChars) {
      pages.push({ speaker: line.speaker, text });
      continue;
    }
    const sentences = text.match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) ?? [text];
    let buf = "";
    const flush = () => {
      if (buf.trim()) pages.push({ speaker: line.speaker, text: buf.trim() });
      buf = "";
    };
    for (const s of sentences) {
      // a single monster sentence: hard-wrap it at word boundaries
      if (s.trim().length > maxChars) {
        for (const w of s.trim().split(/\s+/)) {
          if (buf && (buf + " " + w).length > maxChars) flush();
          buf = buf ? buf + " " + w : w;
        }
        continue;
      }
      if (buf && (buf + s).length > maxChars) flush();
      buf += s;
    }
    flush();
  }
  return pages;
}

/**
 * Voyage-style immersive turn presentation: when the player presses a turn,
 * the screen dissolves into the scene — the speaker's transparent cutout
 * stands anchored at dead centre above the floating dialogue card, fading
 * smoothly whenever the voice on stage changes.
 */
export function TurnCinematic() {
  const game = useGame((s) => s.game);
  const turnLog = useGame((s) => s.turnLog);
  const cinematic = useGame((s) => s.cinematic);
  const closeCinematic = useGame((s) => s.closeCinematic);

  const entry: TurnEntry | null = useMemo(() => {
    if (cinematic?.phase !== "playing") return null;
    return turnLog.find((e) => e.id === cinematic.entryId) ?? null;
  }, [cinematic, turnLog]);

  const entryId = cinematic?.phase === "playing" ? cinematic.entryId : null;

  const [index, setIndex] = useState(0);

  // Long turns page through in readable slices — the card never stretches.
  const pages = useMemo(() => paginateLines(entry?.lines ?? []), [entry]);

  // reset progress whenever a new cinematic entry starts (render-phase reset,
  // no effect needed)
  const [prevEntryId, setPrevEntryId] = useState(entryId);
  if (prevEntryId !== entryId) {
    setPrevEntryId(entryId);
    setIndex(0);
  }

  // Tap anywhere: next page — on the last page, the transition simply ends.
  const advance = useCallback(() => {
    if (!entry) return;
    if (index + 1 < pages.length) setIndex(index + 1);
    else closeCinematic();
  }, [entry, index, pages.length, closeCinematic]);

  // stale/unknown entry → close
  useEffect(() => {
    if (cinematic?.phase === "playing" && !entry) closeCinematic();
  }, [cinematic, entry, closeCinematic]);

  // keyboard advance
  useEffect(() => {
    if (!cinematic || cinematic.phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        advance();
      } else if (e.key === "Escape") {
        closeCinematic();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cinematic, advance, closeCinematic]);

  if (!game || !cinematic) return null;

  const loc = locationByName(game.location);
  // The backdrop is the world's own pinned art for the current location and
  // area — crisp, instant, and zero API calls: the picture follows the story.
  const banner = sceneImageFor(game.location, game.area) ?? null;

  // ---- loading phase: the dissolve before the world answers --------------
  if (cinematic.phase === "loading") {
    return (
      <div className="fixed inset-0 z-[70] select-none bg-[#0a0908]">
        <SceneBackdrop src={banner} dim />
        <div className="relative flex h-full flex-col items-center justify-center gap-4">
          <span className="relative flex h-5 w-5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500/60" />
            <span className="relative inline-flex h-5 w-5 rounded-full bg-amber-500" />
          </span>
          <p className="animate-pulse font-serif text-2xl italic text-amber-100/90">
            The tide turns…
          </p>
          <p className="text-xs uppercase tracking-[0.3em] text-stone-600">
            {loc?.name ?? game.location}
          </p>
        </div>
      </div>
    );
  }

  if (!entry) return null;

  const page: CinematicPage | undefined =
    pages.length > 0 ? pages[Math.min(index, pages.length - 1)] : undefined;
  const isPc =
    !!page?.speaker &&
    page.speaker.toLowerCase() === game.pc.name.toLowerCase();
  const meta = page?.speaker && !isPc ? npcSpeakerMeta(page.speaker) : null;
  const portrait = page?.speaker && !isPc ? npcPortraitPath(page.speaker) : null;
  const speakerColor = isPc ? "#fbbf24" : meta?.color ?? "#d6d3d1";

  return (
    <div
      className="fixed inset-0 z-[70] select-none overflow-hidden bg-[#0a0908]"
      onClick={advance}
      role="presentation"
    >
      {/* ---- scene backdrop (painted scene, creator art, or lantern dark) ---- */}
      <SceneBackdrop src={banner} />

      {/* ---- the ONLY control: a whisper-quiet close, top-right ---- */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          closeCinematic();
        }}
        aria-label="Skip the turn"
        title="Skip"
        className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/45 text-stone-500 opacity-60 backdrop-blur-md transition-colors hover:text-amber-200 hover:opacity-100 pt-[max(0,env(safe-area-inset-top))]"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>

      {/* ---- stage + words share the screen ---- */}
      <div className="relative z-10 flex h-full flex-col">
        {/* ---- THE PORTRAIT AT TRUE FULL SIZE: the figure layer spans the
             whole viewport, edge to edge, exactly like the old expand
             lightbox — original 752x1008 bytes, unoptimized, fit to the
             screen. The words overlay the bottom on a scrim; the portrait
             is never shrunk to make room. ---- */}
        <div className="absolute inset-x-0 bottom-0 top-6 z-0 flex items-center justify-center px-3 pb-2 md:px-4">
          {page?.speaker && !isPc && portrait && (
            <div
              key={page.speaker}
              className="relative h-full w-[min(94vw,78vh)] animate-[cutoutFade_400ms_ease-out]"
            >
              <Image
                src={portrait}
                alt={page.speaker}
                fill
                priority
                unoptimized
                sizes="(max-width: 768px) 94vw, 78vh"
                className="object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.9)] drop-shadow-[0_0_70px_rgba(0,0,0,0.6)] [filter:brightness(1.12)_saturate(1.06)]"
              />
            </div>
          )}
          {/* No art for this speaker → no figure at all. NEVER a placeholder
              box: the scene and the words carry the beat alone. */}
        </div>

        {/* ---- the words — full width, NO box: plain text over a scrim ---- */}
        <div className="relative z-10 mt-auto w-full px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-14 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
          />
          <div className="relative mx-auto max-w-3xl text-left">
            {page && (
              <>
                <p
                  key={index}
                  className={cn(
                    "max-h-32 animate-[lineIn_350ms_ease-out] overflow-y-auto pr-1 font-serif leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.98)] sm:max-h-44 sm:text-[22px]",
                    page.speaker
                      ? "text-[18px] text-stone-50"
                      : "italic text-[17px] text-stone-300"
                  )}
                >
                  {page.text}
                </p>
                {page.speaker ? (
                  <div className="mt-2.5 flex justify-center">
                    <span
                      className="flex min-w-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md"
                      style={{ color: speakerColor }}
                    >
                      {isPc ? (
                        <Flame className="h-3 w-3 shrink-0" aria-hidden />
                      ) : (
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: speakerColor }}
                        />
                      )}
                      <span className="truncate">
                        {isPc ? game.pc.name : page.speaker}
                      </span>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 flex justify-center">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                      Narrator
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Scene art with a slow drift, or the lantern-dark gradient when none. */
function SceneBackdrop({ src, dim }: { src: string | null; dim?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {src ? (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="animate-[kenburns_9s_ease-out_forwards] object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 22% 78%, rgba(180,83,9,0.20) 0%, transparent 45%), radial-gradient(circle at 78% 18%, rgba(120,53,15,0.22) 0%, transparent 42%), radial-gradient(circle at 50% 100%, rgba(217,119,6,0.10) 0%, transparent 55%), linear-gradient(#141009, #0a0908)",
          }}
        />
      )}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t",
          dim
            ? "from-black/90 via-black/55 to-black/65"
            : "from-black/85 via-black/25 to-black/45"
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-transparent to-black/35" />
    </div>
  );
}

