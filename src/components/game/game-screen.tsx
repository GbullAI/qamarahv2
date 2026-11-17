"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useGame, getByok } from "@/lib/game/store";
import { locationByName, sceneImageFor } from "@/lib/game/world";
import { StoryPane } from "./story-pane";
import { EngineKeyDialog } from "./engine-key-dialog";
import { TurnCinematic } from "./cinematic";
import { AsideChat } from "./aside-chat";
import { NpcSheet } from "./npc-sheet";
import { AmbienceIconButton } from "./ambience-toggle";
import { HudPanel, HudTabs, type HudTab } from "./hud-sidebar";
import { toast } from "sonner";
import {
  Crown,
  Download,
  KeyRound,
  MapPin,
  Menu,
  RotateCcw,
  Upload,
} from "lucide-react";

/**
 * Full-bleed scene + FULL-PAGE story log (AI Dungeon style): the backdrop
 * follows the story's location/area, every turn flows as plain text across
 * the whole page, one bare action line rides the bottom, and the panels
 * (character, bonds, quest, map, codex, saves, engine key) live in one
 * slide-over drawer behind the top-right menu button.
 */
export function GameScreen() {
  const game = useGame((s) => s.game);
  const loading = useGame((s) => s.loading);
  const error = useGame((s) => s.error);
  const resetGame = useGame((s) => s.resetGame);
  const dismissWin = useGame((s) => s.dismissWin);

  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<HudTab>("character");
  const fileRef = useRef<HTMLInputElement>(null);

  // ---- engine key (BYOK) --------------------------------------------------
  const [keyOpen, setKeyOpen] = useState(false);
  const byokActive = !!getByok();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  // The freshest backdrop for this exact moment: a painted scene for the
  // current turn if one exists, else the current area's pinned image, else
  // the location's own banner. Follows the story (area changes repaint).
  const loc = game ? locationByName(game.location) : null;
  const banner = game ? sceneImageFor(game.location, game.area) : null;

  if (!game) return null;

  function exportSave() {
    if (!game) return;
    const data = useGame.getState();
    const blob = new Blob(
      [
        JSON.stringify(
          {
            screen: data.screen,
            game: data.game,
            turnLog: data.turnLog,
            lastBondChanges: data.lastBondChanges,
            hasSave: data.hasSave,
          },
          null,
          1
        ),
      ],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qamarah-${game.pc.name.toLowerCase().replace(/\s+/g, "-")}-turn${game.turn}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Save written to your ledger.");
  }

  function importSave(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (!data.game || !data.game.pc) throw new Error("bad file");
        useGame.setState({
          screen: "playing",
          game: data.game,
          turnLog: data.turnLog ?? [],
          lastBondChanges: data.lastBondChanges ?? [],
          hasSave: true,
          error: null,
          loading: false,
        });
        toast.success("The tale resumes.");
      } catch {
        toast.error("That scroll is not a valid save.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="relative flex h-[100dvh] w-full select-none flex-col overflow-hidden bg-black text-zinc-100">
      {/* ---- 1. full-bleed scene backdrop ---- */}
      {banner ? (
        <div
          key={banner}
          aria-hidden
          className="absolute inset-0 animate-[fadeIn_700ms_ease] bg-cover bg-center"
          style={{ backgroundImage: `url(${banner})` }}
        />
      ) : (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 22% 78%, rgba(180,83,9,0.20) 0%, transparent 45%), radial-gradient(circle at 78% 18%, rgba(120,53,15,0.22) 0%, transparent 42%), linear-gradient(#141009, #0a0908)",
          }}
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/40"
      />

      {/* ---- 2. minimal top bar: location pill + ambience + menu ---- */}
      <header className="relative z-20 flex shrink-0 items-start justify-between gap-3 px-3 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="flex min-w-0 max-w-[78vw] items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs font-medium tracking-wide text-zinc-200 backdrop-blur-md sm:max-w-none">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden />
            <span className="shrink-0 truncate">{loc?.name ?? game.location}</span>
            {game.area && (
              <span className="truncate text-zinc-400">· {game.area}</span>
            )}
          </div>
          <div className="hidden items-center rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-zinc-300 backdrop-blur-md md:flex">
            {game.time} · turn {game.turn}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AmbienceIconButton />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open character & world panels"
            className="h-9 w-9 rounded-lg border-white/10 bg-black/50 text-zinc-300 backdrop-blur-md hover:border-white/30 hover:bg-black/70 hover:text-white"
          >
            <Menu className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </header>

      {/* ---- 3. the FULL-PAGE story log — AI Dungeon style, no box; the
             scene backdrop flows behind the text, the bare action line
             rides the bottom. The turn animation plays over this between
             turns and closes back onto the fresh page ---- */}
      <StoryPane />

      {/* ---- single slide-over drawer: HUD panels + game menu ---- */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="right"
          className="flex w-[92vw] flex-col gap-0 border-white/10 bg-zinc-950/95 p-0 text-zinc-100 backdrop-blur-xl sm:max-w-[380px]"
        >
          <SheetHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-4">
            <SheetTitle className="font-serif text-lg leading-tight text-amber-100">
              {game.pc.name}
            </SheetTitle>
            <p className="text-xs text-stone-500">
              {game.pc.pronouns} · {game.time} · turn {game.turn}
            </p>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(game.pc.hp / game.pc.hpMax) * 100}%`,
                    background: "linear-gradient(90deg,#7f1d1d,#dc2626)",
                  }}
                />
              </div>
              <span className="shrink-0 text-[11px] text-stone-400">
                {game.pc.hp}/{game.pc.hpMax} hp · {game.pc.marks} marks
              </span>
            </div>
          </SheetHeader>

          <HudTabs active={tab} onChange={setTab} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <HudPanel tab={tab} />
          </div>

          <div className="shrink-0 border-t border-white/10 bg-black/40 p-3">
            <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.2em] text-stone-600">
              Progress autosaves each turn
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportSave}
                className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" aria-hidden /> Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden /> Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMenuOpen(false);
                  setKeyOpen(true);
                }}
                className="gap-1.5 border-white/10 bg-white/5 text-zinc-300 hover:border-white/30 hover:bg-white/10 hover:text-white"
              >
                <KeyRound className="h-3.5 w-3.5" aria-hidden /> Engine key
                <span
                  className={`ml-auto inline-block h-1.5 w-1.5 rounded-full ${
                    byokActive ? "bg-emerald-400" : "bg-stone-600"
                  }`}
                  title={byokActive ? "Your own key drives the engine" : "Chat engine"}
                />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-rose-900/50 bg-rose-950/20 text-rose-300 hover:border-rose-700 hover:bg-rose-950/40 hover:text-rose-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Abandon
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-stone-800 bg-stone-950 text-stone-200">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-serif">
                      Abandon this tale?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-stone-400">
                      {game.pc.name}&apos;s story — {game.turn} turns of it —
                      will be burned from the ledger. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-stone-700 bg-stone-950 text-stone-200 hover:bg-stone-900 hover:text-stone-100">
                      Keep playing
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={resetGame}
                      className="bg-rose-800 text-stone-100 hover:bg-rose-700"
                    >
                      Burn it
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importSave(f);
          e.target.value = "";
        }}
      />

      {/* ---- private aside bubble (opens from bonds tab / log whispers) ---- */}
      <AsideChat />

      {/* ---- NPC character-sheet popout ---- */}
      <NpcSheet />

      {/* ---- engine key dialog (shared with the title screen) ---- */}
      <EngineKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />

      {/* ---- immersive turn cinematic ---- */}
      <TurnCinematic />

      {/* ---- victory overlay ---- */}
      {game.status === "won" && !loading && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-amber-700/60 bg-[#141009] p-8 text-center shadow-[0_0_80px_rgba(217,119,6,0.25)]">
            <Crown className="mx-auto mb-4 h-10 w-10 text-amber-400" aria-hidden />
            <h2 className="font-serif text-3xl font-bold text-amber-100">
              The Three Houses Fall
            </h2>
            <p className="mt-3 font-serif italic leading-relaxed text-stone-300">
              Pantun Laut is yours — every matriarch, every ledger, every
              lantern-lit door. Somewhere past the horizon, the next island is
              already lighting its lamps.
            </p>
            <Button
              onClick={dismissWin}
              className="mt-6 bg-amber-600 px-6 text-stone-950 hover:bg-amber-500"
            >
              Sail on — the tale continues
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
