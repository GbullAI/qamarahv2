import worldJson from "../../../public/world.json";
import type { WorldData, AttrKey } from "./types";

// The processed Voyage world export, typed for the game.
export const WORLD = worldJson as unknown as WorldData;

export const ATTR_KEYS: AttrKey[] = WORLD.attributes.names;

export const SKILL_KEYS = Object.keys(WORLD.skills);

export function npcByName(name: string) {
  if (!name) return null;
  const q = name.trim().toLowerCase();
  const all = Object.values(WORLD.npcs);
  // 1) exact, case-insensitive ("Fazlina Zain")
  const exact = all.find((n) => n.name.toLowerCase() === q);
  if (exact) return exact;
  if (!q) return null;
  // 2) single spoken token ("Fazlina" -> "Fazlina Zain", "Damara" ->
  //    "Tengku Damara") — unambiguous hits only
  const token = all.filter((n) =>
    n.name.toLowerCase().split(/\s+/).includes(q)
  );
  if (token.length === 1) return token[0];
  // 3) unique containment either way (handles stray suffixes/honorifics)
  const contains = all.filter(
    (n) =>
      n.name.toLowerCase().includes(q) || q.includes(n.name.toLowerCase())
  );
  if (contains.length === 1) return contains[0];
  return null;
}

export function locationByName(name: string) {
  return (
    WORLD.locations[name] ??
    Object.values(WORLD.locations).find(
      (l) => l.name.toLowerCase() === name.toLowerCase()
    ) ??
    null
  );
}

/** Normalize an area/location label for matching: lowercase, drop a leading
 *  "the", drop trailing punctuation. "The Rooftop" ≈ "rooftop". */
function normLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[.,!?;:]+$/, "")
    .trim();
}

/** Best backdrop for the current scene: the area's pinned image when the
 *  location has per-area art for it (case-insensitive, tolerant of a leading
 *  "the" and stray casing — the GM's state block is not always verbatim),
 *  else the location's own banner. */
export function sceneImageFor(
  locationName: string,
  area: string
): string | null {
  const loc = locationByName(locationName);
  if (!loc) return null;
  const areaImages = loc.areaImages;
  if (areaImages && area) {
    const direct = areaImages[area];
    if (direct) return direct;
    const a = area.trim().toLowerCase();
    const key = Object.keys(areaImages).find((k) => k.toLowerCase() === a);
    if (key) return areaImages[key];
    // fuzzy: "The Rooftop" / "rooftop garden" / "Rooftop, Serai Lanokh"…
    const n = normLabel(area);
    if (n.length >= 4) {
      const fuzzy = Object.keys(areaImages).find((k) => {
        const nk = normLabel(k);
        return nk === n || nk.includes(n) || n.includes(nk);
      });
      if (fuzzy) return areaImages[fuzzy];
    }
  }
  return loc.image;
}

/**
 * Scenery safety net: the player's own action usually names where they are
 * going ("out of the salon, up to the private chambers"). When the GM's
 * state block goes missing (a dropped <state> or a rate-limited nudge), the
 * backdrop still follows the bodies: return the location's area whose name
 * appears in the text — the LAST mention wins, because destinations come
 * last ("out of the salon, up to the private chambers" → private chambers).
 */
export function areaMentionedIn(
  text: string,
  locationName: string
): string | null {
  const loc = locationByName(locationName);
  if (!loc || !loc.areas) return null;
  const hay = text.toLowerCase();
  let best: { name: string; at: number } | null = null;
  for (const area of Object.keys(loc.areas)) {
    const at = hay.indexOf(area.toLowerCase());
    if (at >= 0 && (!best || at > best.at)) best = { name: area, at };
  }
  return best?.name ?? null;
}

/** Faction accent colors (warm lantern palette — no blue/indigo). */
export const FACTION_COLORS: Record<string, string> = {
  "House of Unveiled Silk": "#e0a458", // amber silk
  "The Gilded Net": "#c9b458", // old gold
  "The Ashen Throne": "#a8a29e", // ash grey
  "The Salt Circle": "#5eead4", // sea-teal
  "The Bond Ledger": "#d6a3a3", // rose brass... warm ledger red
  "The Caravanserai Line": "#c8843c", // caravan ochre
  "Concord Merchants Guild": "#cdb891", // aged parchment — foreign notaries
  "Veil Sisters": "#b56576", // wine-rose — the Serai's quiet network
  None: "#a8a29e",
};

export function factionColor(faction: string): string {
  return FACTION_COLORS[faction] ?? "#e0a458";
}
