"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGame } from "@/lib/game/store";
import { WORLD, ATTR_KEYS, SKILL_KEYS } from "@/lib/game/world";
import { ATTR_LABELS, ATTR_SHORT, attrModifier, type AttrKey } from "@/lib/game/types";
import {
  ChevronDown,
  ChevronUp,
  ScrollText,
  Sparkles,
  Swords,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PRONOUNS = ["he/him", "she/her", "they/them"];
const SKILLS_TO_PICK = 3;

export function CharacterCreation() {
  const beginGame = useGame((s) => s.beginGame);
  const goTitle = useGame((s) => s.goTitle);
  const attrs = WORLD.attributes;

  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("he/him");
  const [background, setBackground] = useState("");
  const [storyStartKey, setStoryStartKey] = useState(
    Object.values(WORLD.storyStarts).find((s) => s.isDefault)?.name ??
      Object.keys(WORLD.storyStarts)[0]
  );
  const [attributes, setAttributes] = useState<Record<AttrKey, number>>(() => {
    const base = {} as Record<AttrKey, number>;
    for (const k of ATTR_KEYS) base[k] = attrs.startingValue;
    return base;
  });
  const [skills, setSkills] = useState<string[]>([]);

  const spent = useMemo(
    () =>
      ATTR_KEYS.reduce(
        (sum, k) => sum + Math.max(0, attributes[k] - attrs.startingValue),
        0
      ),
    [attributes, attrs.startingValue]
  );
  const refunded = useMemo(
    () =>
      ATTR_KEYS.reduce(
        (sum, k) => sum + Math.max(0, attrs.startingValue - attributes[k]),
        0
      ),
    [attributes, attrs.startingValue]
  );
  const pool = attrs.points + refunded - spent;

  const canBegin =
    name.trim().length > 0 &&
    pool === 0 &&
    skills.length === SKILLS_TO_PICK;

  function adjust(k: AttrKey, delta: number) {
    setAttributes((prev) => {
      const next = Math.min(attrs.max, Math.max(attrs.min, prev[k] + delta));
      if (next === prev[k]) return prev;
      if (delta > 0 && pool <= 0) return prev;
      return { ...prev, [k]: next };
    });
  }

  function toggleSkill(key: string) {
    setSkills((prev) =>
      prev.includes(key)
        ? prev.filter((s) => s !== key)
        : prev.length >= SKILLS_TO_PICK
          ? prev
          : [...prev, key]
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-stone-200">
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <header className="mb-8 text-center">
          <button
            onClick={goTitle}
            className="mb-4 text-xs uppercase tracking-[0.3em] text-stone-500 hover:text-amber-500"
          >
            ← The Lantern Port
          </button>
          <h1 className="font-serif text-4xl font-bold text-amber-100">
            Who steps off the boat?
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            The coast prices every face. Decide what yours is worth.
          </p>
        </header>

        <Section
          icon={<User className="h-4 w-4" />}
          title="Name & manner"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-stone-500">
                Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Almar, Zayn, Idris…"
                maxLength={40}
                className="border-stone-700 bg-stone-950 focus:border-amber-600"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wider text-stone-500">
                Pronouns
              </label>
              <div className="flex gap-2">
                {PRONOUNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPronouns(p)}
                    className={cn(
                      "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                      pronouns === p
                        ? "border-amber-600 bg-amber-600/15 text-amber-200"
                        : "border-stone-700 bg-stone-950 text-stone-400 hover:border-stone-500"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs uppercase tracking-wider text-stone-500">
              Background <span className="normal-case text-stone-600">(optional — one line the GM will weave in)</span>
            </label>
            <Textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="A coastal operator with kohl-eyed Arab-Malay features older eyes recognize before he does…"
              rows={2}
              maxLength={300}
              className="resize-none border-stone-700 bg-stone-950 focus:border-amber-600"
            />
          </div>
        </Section>

        <Section
          icon={<ScrollText className="h-4 w-4" />}
          title="Starting situation"
        >
          <div className="grid gap-3">
            {Object.values(WORLD.storyStarts).map((ss) => (
              <button
                key={ss.name}
                type="button"
                onClick={() => setStoryStartKey(ss.name)}
                className={cn(
                  "rounded-lg border p-4 text-left transition-colors",
                  storyStartKey === ss.name
                    ? "border-amber-600 bg-amber-600/10"
                    : "border-stone-800 bg-stone-950 hover:border-stone-600"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg text-amber-100">
                    {ss.name}
                  </span>
                  {ss.isDefault && (
                    <span className="rounded bg-stone-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-stone-400">
                      recommended
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-400">{ss.description}</p>
              </button>
            ))}
          </div>
        </Section>

        <Section
          icon={<Swords className="h-4 w-4" />}
          title="Attributes"
          right={
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                pool === 0
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "bg-amber-900/50 text-amber-300"
              )}
            >
              {pool} point{pool === 1 ? "" : "s"} to place
            </span>
          }
        >
          <p className="mb-3 text-xs text-stone-500">
            Begin at {attrs.startingValue}; raise to {attrs.max} or drop to{" "}
            {attrs.min} to fund another stat.{" "}
            {attrs.points} points total — spend them all.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ATTR_KEYS.map((k) => {
              const v = attributes[k];
              const mod = attrModifier(v);
              return (
                <div
                  key={k}
                  className="flex items-center gap-3 rounded-lg border border-stone-800 bg-stone-950 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-stone-200">
                      {ATTR_LABELS[k]}{" "}
                      <span className="text-stone-500">({ATTR_SHORT[k]})</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-stone-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400 transition-all"
                        style={{
                          width: `${((v - attrs.min) / (attrs.max - attrs.min)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-14 text-right">
                    <div className="font-serif text-xl text-amber-100">{v}</div>
                    <div
                      className={cn(
                        "text-xs",
                        mod > 0
                          ? "text-emerald-400"
                          : mod < 0
                            ? "text-rose-400"
                            : "text-stone-500"
                      )}
                    >
                      {mod >= 0 ? "+" : ""}
                      {mod}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      aria-label={`Increase ${ATTR_LABELS[k]}`}
                      onClick={() => adjust(k, 1)}
                      disabled={v >= attrs.max || pool <= 0}
                      className="rounded border border-stone-700 p-1 text-stone-300 hover:border-amber-600 hover:text-amber-300 disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Decrease ${ATTR_LABELS[k]}`}
                      onClick={() => adjust(k, -1)}
                      disabled={v <= attrs.min}
                      className="rounded border border-stone-700 p-1 text-stone-300 hover:border-amber-600 hover:text-amber-300 disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          icon={<Sparkles className="h-4 w-4" />}
          title={`Trained skills — pick ${SKILLS_TO_PICK}`}
          right={
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                skills.length === SKILLS_TO_PICK
                  ? "bg-emerald-900/50 text-emerald-300"
                  : "bg-amber-900/50 text-amber-300"
              )}
            >
              {skills.length}/{SKILLS_TO_PICK}
            </span>
          }
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {SKILL_KEYS.map((key) => {
              const sk = WORLD.skills[key];
              const on = skills.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSkill(key)}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    on
                      ? "border-amber-600 bg-amber-600/10"
                      : "border-stone-800 bg-stone-950 hover:border-stone-600"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-stone-100">
                      {sk.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-stone-500">
                      {sk.attribute}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-stone-400">
                    {sk.description}
                  </p>
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-amber-900/50 bg-amber-950/20 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Sparkles className="h-4 w-4" />
              Granted gift: Crest of Rasa
            </div>
            <p className="mt-1 text-xs leading-relaxed text-stone-400">
              {WORLD.abilities["Crest of Rasa"]?.description}
            </p>
          </div>
        </Section>

        <div className="mt-10 flex flex-col items-center gap-3 pb-16">
          <Button
            size="lg"
            disabled={!canBegin}
            onClick={() =>
              beginGame({
                name,
                pronouns,
                background,
                attributes,
                skills,
                storyStartKey,
              })
            }
            className="bg-amber-600 px-10 text-lg font-semibold text-stone-950 hover:bg-amber-500 disabled:opacity-40"
          >
            Step into the lantern light
          </Button>
          <p className="text-xs text-stone-600">
            {pool !== 0 && `Place your remaining ${pool} attribute points. `}
            {skills.length !== SKILLS_TO_PICK &&
              `Choose ${SKILLS_TO_PICK - skills.length} more skill${SKILLS_TO_PICK - skills.length === 1 ? "" : "s"}.`}
            {canBegin && "The tide is in. Every door is priced."}
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({
  icon,
  title,
  right,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-500">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
