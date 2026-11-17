"use client";

/** Ambient harbour music — one looping track for the whole game.
 *  Browsers only allow audio after a user gesture, so the controller
 *  arms itself and starts on the first pointer/key/touch press — and
 *  retries on every later gesture and whenever the tab becomes visible
 *  again, until playback actually begins. The on/off choice persists in
 *  localStorage ("qamarah-music-v2"; v2 = fresh state after the
 *  too-quiet first master). */

const MUSIC_KEY = "qamarah-music-v2";
const TRACK = "/music/qamarah-ambience.ogg";
const VOLUME = 0.75;

let audio: HTMLAudioElement | null = null;
let wanted = true; // the player's persisted choice
let armed = false; // waiting for (or already got) a gesture
let started = false;

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  for (const fn of listeners) fn();
}

export function isMusicOn(): boolean {
  return wanted;
}

export function isMusicPlaying(): boolean {
  return started && !!audio && !audio.paused;
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio(TRACK);
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";
    audio.addEventListener("error", () => {
      wanted = false;
      started = false;
      notify();
    });
    audio.addEventListener("pause", () => notify());
    audio.addEventListener("play", () => notify());
  }
  return audio;
}

function tryStart() {
  const a = ensureAudio();
  if (!a || !wanted || !armed || started) return;
  a.play()
    .then(() => {
      started = true;
      notify();
    })
    .catch(() => {
      /* gesture not yet granted — stay armed, the next press retries */
    });
}

/** Mount once: loads the persisted choice, arms the gesture unlock. */
export function initAmbience(): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    wanted = localStorage.getItem(MUSIC_KEY) !== "0";
  } catch {
    wanted = true;
  }
  armed = true;
  tryStart();
  const onGesture = () => tryStart();
  const onVisible = () => {
    if (document.visibilityState === "visible") tryStart();
  };
  // every input path a player might use first, capture so nothing eats it
  window.addEventListener("pointerdown", onGesture, { capture: true });
  window.addEventListener("keydown", onGesture, { capture: true });
  window.addEventListener("touchstart", onGesture, { capture: true });
  window.addEventListener("click", onGesture, { capture: true });
  document.addEventListener("visibilitychange", onVisible);
  // support/diagnostics handle
  try {
    (window as unknown as Record<string, unknown>).__qamarahAudio = () => audio;
  } catch {
    /* ignore */
  }
  return () => {
    window.removeEventListener("pointerdown", onGesture, { capture: true });
    window.removeEventListener("keydown", onGesture, { capture: true });
    window.removeEventListener("touchstart", onGesture, { capture: true });
    window.removeEventListener("click", onGesture, { capture: true });
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Toggle from the UI — the click itself is the gesture that unlocks audio. */
export function setMusicOn(on: boolean) {
  wanted = on;
  try {
    localStorage.setItem(MUSIC_KEY, on ? "1" : "0");
  } catch {
    /* storage unavailable — in-session choice only */
  }
  const a = ensureAudio();
  if (!a) return;
  if (on) {
    armed = true;
    started = false;
    tryStart();
  } else {
    a.pause();
    started = false;
  }
  notify();
}

/** React-friendly subscription (for useSyncExternalStore). */
export function subscribeAmbience(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Cheap snapshot string: "on" flag + "playing" flag. */
export function ambienceSnapshot(): string {
  return `${wanted ? "1" : "0"}${isMusicPlaying() ? "1" : "0"}`;
}
