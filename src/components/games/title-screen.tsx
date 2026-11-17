"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useGame, getByok } from "@/lib/game/store";
import { WORLD } from "@/lib/game/world";
import { EngineKeyDialog } from "./engine-key-dialog";
import { Flame, KeyRound, ScrollText, Swords, Users } from "lucide-react";

export function TitleScreen() {
  const hasSave = useGame((s) => s.hasSave);
  const game = useGame((s) => s.game);
  const goCreate = useGame((s) => s.goCreate);
  const sendAction = useGame((s) => s.sendAction);

  // engine key (BYOK) — settable BEFORE any engine call, so a throttled
  // chat engine can never lock the player out of their own key
  const [keyOpen, setKeyOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const byokActive = mounted && !!getByok();

  const canContinue = hasSave && game && game.turn > 0 && !useGame.getState().loading;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0908] text-stone-200">
      {/* hero backdrop — the creator's own night-terrace art */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: "url(/scenes/title-hero.webp?v=2)" }}
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#0a0908]/70 via-[#0a0908]/60 to-[#0a0908]"
        aria-hidden
      />

      <main className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-500/90">
            A Voyage-style world engine
          </p>
          <h1 className="font-serif text-6xl font-bold leading-none tracking-wide text-amber-100 drop-shadow-[0_2px_24px_rgba(0,0,0,0.9)] sm:text-7xl">
            Qamarah
          </h1>
          <h2 className="font-serif text-2xl italic text-stone-300 sm:text-3xl">
            The Lantern Port
          </h2>
        </div>

        <p className="max-w-xl font-serif text-lg leading-relaxed text-stone-300/95">
          {WORLD.tagline} Rain-slicked lanes, firefly lanterns, serpent-ink and
          ledgers. Three houses hold the coast&apos;s true power — win them, and
          the next island waits.
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button
            size="lg"
            onClick={goCreate}
            className="bg-amber-600 px-8 text-lg font-semibold text-stone-950 hover:bg-amber-500"
          >
            <Flame className="mr-2 h-5 w-5" />
            Begin a new tale
          </Button>
          {hasSave && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                useGame.setState({ screen: "playing" });
              }}
              disabled={!canContinue}
              className="border-amber-800/60 bg-stone-950/70 px-8 text-lg text-amber-100 hover:bg-stone-900"
            >
              <ScrollText className="mr-2 h-5 w-5" />
              Continue
            </Button>
          )}
        </div>
        {hasSave && game && (
          <p className="text-xs text-stone-400">
            {game.pc.name} · {game.location} · {game.time} · turn {game.turn}
          </p>
        )}

        <button
          type="button"
          onClick={() => setKeyOpen(true)}
          className="flex items-center gap-2 rounded-full border border-stone-700/80 bg-stone-950/70 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-stone-300 backdrop-blur-sm transition-colors hover:border-amber-600 hover:text-amber-200"
        >
          <KeyRound className="h-3.5 w-3.5" />
          Engine key
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              byokActive ? "bg-emerald-400" : "bg-stone-600"
            }`}
            title={byokActive ? "Your own key drives the engine" : "Chat engine"}
          />
        </button>
        <EngineKeyDialog open={keyOpen} onOpenChange={setKeyOpen} />

        <div className="mt-6 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Autonomous NPCs"
            text={`${Object.keys(WORLD.npcs).length} souls with their own wants, secrets and factions — they lie, bargain and remember.`}
          />
          <Feature
            icon={<Swords className="h-5 w-5" />}
            title="Real stakes"
            text="Dice-checked risks, a live bond ledger, and consequences that outlive the scene."
          />
          <Feature
            icon={<ScrollText className="h-5 w-5" />}
            title="Your campaign"
            text="The Three Houses of Pantun Laut — win each house by desire, gift or leverage."
          />
        </div>

        <p className="max-w-lg text-[11px] leading-relaxed text-stone-500">
          Dark fantasy for adult players: intrigue, seduction and violence live
          here — intimate scenes play out in full, plainly and without euphemism.
          Progress autosaves in your browser.
        </p>
      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-stone-800/80 bg-stone-950/70 p-4 text-left backdrop-blur-sm">
      <div className="mb-1.5 flex items-center gap-2 text-amber-500">
        {icon}
        <span className="text-sm font-semibold text-stone-200">{title}</span>
      </div>
      <p className="text-xs leading-relaxed text-stone-400">{text}</p>
    </div>
  );
}
