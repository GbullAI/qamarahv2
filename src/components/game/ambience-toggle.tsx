"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Music, VolumeX } from "lucide-react";
import {
  ambienceSnapshot,
  initAmbience,
  setMusicOn,
  subscribeAmbience,
} from "@/lib/game/ambience";
import { useGame } from "@/lib/game/store";

/** SSR-safe "mounted" flag via an external store (no setState in effects). */
const noopSubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

/** Harbour-music pill — bottom-left on the title and creation screens
 *  (hidden while playing; the game header has its own compact button). */
export function AmbienceToggle() {
  const screen = useGame((s) => s.screen);
  const ready = useMounted();
  useEffect(() => {
    const off = initAmbience();
    return off;
  }, []);

  const snap = useSyncExternalStore(
    subscribeAmbience,
    ambienceSnapshot,
    () => "00"
  );
  const on = snap[0] === "1";
  const playing = snap[1] === "1";

  if (!ready || screen === "playing") return null;

  return (
    <button
      onClick={() => setMusicOn(!on)}
      title={on ? "Silence the harbour" : "Let the harbour sing"}
      className="fixed bottom-3 left-3 z-30 flex items-center gap-2 rounded-full border border-stone-800/80 bg-stone-950/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-stone-400 backdrop-blur transition-colors hover:border-amber-800/60 hover:text-amber-200"
    >
      {on ? (
        <Music
          className={`h-3.5 w-3.5 ${playing ? "text-amber-500" : "text-amber-700"}`}
        />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-stone-600" />
      )}
      <span>{on ? "Music on" : "Music off"}</span>
      {playing && (
        <span className="ml-0.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
      )}
    </button>
  );
}

/** Compact icon button for the in-game header. */
export function AmbienceIconButton() {
  const mounted = useMounted();

  const snap = useSyncExternalStore(
    subscribeAmbience,
    ambienceSnapshot,
    () => "00"
  );
  const on = snap[0] === "1";
  const playing = snap[1] === "1";

  if (!mounted) return null;

  return (
    <button
      onClick={() => setMusicOn(!on)}
      title={on ? "Silence the harbour" : "Let the harbour sing"}
      aria-label={on ? "Silence the harbour music" : "Play the harbour music"}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-stone-400 backdrop-blur-md transition-colors hover:border-white/30 hover:text-amber-200"
    >
      {on ? (
        <Music
          className={`h-4 w-4 ${playing ? "text-amber-500" : "text-amber-700"}`}
        />
      ) : (
        <VolumeX className="h-4 w-4" />
      )}
    </button>
  );
}
