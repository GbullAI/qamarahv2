// ---------------------------------------------------------------------------
// Qamarah, the Lantern Port — core game types
// ---------------------------------------------------------------------------

export type AttrKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export const ATTR_LABELS: Record<AttrKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
};

export const ATTR_SHORT: Record<AttrKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

export interface WorldNpc {
  name: string;
  properName: string;
  type: string;
  gender: string;
  tier: string;
  level: number;
  faction: string;
  location: string;
  area: string;
  initialRelationship: number;
  personality: string[];
  basicInfo: string;
  hiddenInfo: string;
  portrait: string | null; // full-body cutout — cinematic standing figure
  portraitCard: string | null; // rectangular portrait — small cards & chips
}

export interface WorldLocation {
  name: string;
  basicInfo: string;
  hiddenInfo: string;
  x: number;
  y: number;
  complexityType: string;
  factions: string[];
  areas: Record<string, string>;
  image: string | null; // null = render the in-game dark gradient fallback
  /** Optional per-area art: when the scene sits in one of these areas, its
   *  image replaces the location banner (falls back to `image`). */
  areaImages?: Record<string, string> | null;
}

export interface WorldFaction {
  name: string;
  type: string;
  basicInfo: string;
  hiddenInfo: string;
}

export interface WorldSkill {
  name: string;
  attribute: AttrKey;
  type: string;
  description: string;
}

export interface WorldItem {
  name: string;
  description: string;
  category: string;
  tier: string;
  estimatedValue: number;
}

export interface WorldAbility {
  name: string;
  description: string;
  bonus: number;
}

export interface StoryStart {
  name: string;
  description: string;
  storyStart: string;
  isDefault: boolean;
  locations: string[];
  locationAreas: string[];
  startingPartyNPCs: string[];
  startingItems: { item: string; quantity: number }[];
  startingQuests: string[];
  questGenerationGuidance: string;
}

export interface QuestObjective {
  id: string;
  text: string;
  status: "hidden" | "active" | "complete";
}

export interface WorldData {
  name: string;
  tagline: string;
  worldBackground: string;
  narratorStyle: string;
  region: { name: string; basicInfo: string; hiddenInfo: string };
  locations: Record<string, WorldLocation>;
  factions: Record<string, WorldFaction>;
  npcs: Record<string, WorldNpc>;
  skills: Record<string, WorldSkill>;
  items: Record<string, WorldItem>;
  abilities: Record<string, WorldAbility>;
  relationshipStages: { name: string; minScore: number; maxScore: number }[];
  attributes: {
    names: AttrKey[];
    startingValue: number;
    points: number;
    max: number;
    min: number;
  };
  health: { initial: number; max: number; color: string };
  storyStarts: Record<string, StoryStart>;
  quest: {
    id: string;
    name: string;
    questStatement: string;
    mainObjective: string;
    objectives: Record<string, QuestObjective>;
    nextStep: string;
  } | null;
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

export interface InventoryItem {
  name: string;
  qty: number;
}

export interface PlayerCharacter {
  name: string;
  pronouns: string;
  background: string;
  attributes: Record<AttrKey, number>;
  skills: string[]; // skill keys
  ability: string;
  grantedAbilities?: { name: string; description: string }[]; // earned in play
  hp: number;
  hpMax: number;
  marks: number;
  inventory: InventoryItem[];
}

export interface NpcBond {
  score: number;
  met: boolean;
}

export type ObjectiveStatus = "hidden" | "active" | "complete";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface BondChange {
  name: string;
  delta: number;
  note?: string;
}

export interface GameState {
  pc: PlayerCharacter;
  time: string;
  location: string;
  area: string;
  bonds: Record<string, NpcBond>; // key: NPC name
  questStatus: Record<string, ObjectiveStatus>; // key: objective id
  visitedLocations: string[];
  metNpcs: string[];
  turn: number;
  storyStartKey: string;
  history: ChatMsg[];
  suggestions: string[];
  status: "playing" | "won";
  startedAt: number;
}

// What the GM endpoint returns per turn
export interface GmStateUpdate {
  time?: string;
  location?: string;
  area?: string;
  hp?: number;
  marks?: number;
  inventory_add?: string[];
  inventory_remove?: string[];
  npc_updates?: { name: string; delta: number; note?: string }[];
  met_npcs?: string[];
  quest_updates?: Record<string, ObjectiveStatus>;
  visited_locations?: string[];
  suggestions?: string[];
  // Turn progression channels (deltas)
  attribute_updates?: Partial<Record<AttrKey, number>>; // e.g. { charisma: 1 }
  skills_add?: string[]; // trained skill keys earned this turn
  ability_grant?: { name: string; description: string }; // rare earned power
}

export interface GmTurnResponse {
  narration: string;
  state: GmStateUpdate | null;
  error?: string;
}

// Request body for /api/gm
export interface GmRequest {
  action: string;
  isStart: boolean;
  mode?: "turn" | "aside"; // aside = private NPC chat, no turn cost
  asideNpc?: string;
  asideThread?: ChatMsg[]; // prior private exchange with asideNpc
  recentAsides?: { npc: string; text: string }[]; // whispers to reflect in the next turn
  pc: PlayerCharacter;
  snapshot: {
    time: string;
    location: string;
    area: string;
    hp: number;
    marks: number;
    inventory: InventoryItem[];
    nearbyBonds: { name: string; score: number }[];
    questStatus: Record<string, ObjectiveStatus>;
  };
  history: ChatMsg[];
  storyStartKey: string;

  // BYOK: the player's own open-platform key (Z.ai). Held in the browser only,
  // forwarded per request; when present the engine calls the open API with it
  // instead of the sandbox SDK, so turns never touch the chat rate window.
  apiKey?: string;
  apiUrl?: string; // base, default https://api.z.ai/api/paas/v4
  apiModel?: string; // default glm-4.6
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function attrModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

export function bondStage(
  score: number,
  stages: { name: string; minScore: number; maxScore: number }[]
): string {
  for (const s of stages) {
    if (score >= s.minScore && score <= s.maxScore) return s.name;
  }
  return score > 0 ? "Devoted" : "Nemesis";
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** A single earned progression from a turn, for ledger display. */
export interface TurnGain {
  kind: "attribute" | "skill" | "ability" | "bond" | "marks" | "hp" | "item";
  label: string;
  detail?: string;
  delta?: number;
  name?: string; // npc/item name for avatars
}
