"use client";

import Image from "next/image";
import { factionColor, npcByName } from "@/lib/game/world";
import { useGame } from "@/lib/game/store";

interface NpcAvatarProps {
  name: string;
  size?: number;
  className?: string;
  /** circle = round icon (chips, HUD) · card = tall portrait card (dialogue log) */
  shape?: "circle" | "card";
  /** clickable avatars open the NPC sheet popout (default). Set false when
   *  nested inside another interactive element (rows that already expand). */
  interactive?: boolean;
}

/** Portrait for uploaded art, monogram fallback tinted by faction.
 *  Small chips and cards use the rectangular portraitCard; the big cinematic
 *  standing figure uses the full-body cutout via npcPortraitPath.
 *  Clicking opens the character-sheet popout (who they are, bond, haunts). */
export function NpcAvatar({
  name,
  size = 36,
  className,
  shape = "circle",
  interactive = true,
}: NpcAvatarProps) {
  const openNpcSheet = useGame((s) => s.openNpcSheet);
  const npc = npcByName(name);
  const color = npc ? factionColor(npc.faction) : "#a8a29e";
  const isCard = shape === "card";
  const art = npc?.portraitCard ?? npc?.portrait;

  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const inner = art ? (
    <span
      className={`relative inline-block shrink-0 overflow-hidden ${
        isCard ? "rounded-xl" : "rounded-full"
      } ring-1 ring-stone-600/60`}
      style={
        isCard
          ? { width: size, height: Math.round(size * 1.4) }
          : { width: size, height: size }
      }
    >
      <Image
        src={art}
        alt={npc?.name ?? name}
        fill
        sizes={`${size}px`}
        className="object-cover object-top"
      />
    </span>
  ) : (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${
        isCard ? "rounded-xl" : "rounded-full"
      } font-semibold ring-1 ring-stone-600/60`}
      style={{
        width: size,
        height: isCard ? Math.round(size * 1.4) : size,
        fontSize: Math.max(10, size * (isCard ? 0.3 : 0.34)),
        background: `linear-gradient(160deg, ${color}33, #1c1814)`,
        color,
        borderBottomColor: color,
      }}
    >
      {initials}
    </span>
  );

  if (!interactive || !npc) {
    return className ? <span className={className}>{inner}</span> : inner;
  }

  return (
    <button
      type="button"
      onClick={() => openNpcSheet(name)}
      title={`Who is ${name}?`}
      aria-label={`Open ${name}'s character sheet`}
      className={`cursor-pointer rounded-xl transition-transform duration-150 hover:scale-[1.06] hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
        className ?? ""
      }`}
    >
      {inner}
    </button>
  );
}

/**
 * Resolve the portrait path for a speaker — the SAME full-quality art the
 * expand/full-size view shows: the transparent cutout when present, else the
 * original rectangular portrait. Never returns a downscaled variant.
 */
export function npcPortraitPath(name: string): string | null {
  const npc = npcByName(name);
  return npc?.portrait ?? npc?.portraitCard ?? null;
}

export function npcSpeakerMeta(name: string) {
  const npc = npcByName(name);
  if (!npc) return { color: "#d6d3d1", isPc: false };
  return { color: factionColor(npc.faction), isPc: false };
}
