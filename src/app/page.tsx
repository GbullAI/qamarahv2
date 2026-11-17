"use client";

import { useSyncExternalStore } from "react";
import { useGame } from "@/lib/game/store";
import { TitleScreen } from "@/components/game/title-screen";
import { CharacterCreation } from "@/components/game/character-creation";
import { GameScreen } from "@/components/game/game-screen";

/** True once the persisted save has rehydrated from localStorage. */
function useHydrated() {
  return useSyncExternalStore(
    (onStoreChange) => useGame.persist.onFinishHydration(onStoreChange),
    () => useGame.persist.hasHydrated(),
    () => false
  );
}

export default function Page() {
  const hydrated = useHydrated();
  const screen = useGame((s) => s.screen);

  // Avoid hydration mismatch while the persisted save rehydrates.
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0908]">
        <p className="animate-pulse font-serif text-sm italic text-stone-600">
          Lighting the lanterns…
        </p>
      </div>
    );
  }

  if (screen === "playing") return <GameScreen />;
  if (screen === "create") return <CharacterCreation />;
  return <TitleScreen />;
}
