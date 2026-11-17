"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getByok, setByok } from "@/lib/game/store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * BYOK engine-key dialog — shared by the title screen and the in-game menu.
 * Must be openable BEFORE any engine call: when this chat's engine is
 * throttled, the player can still set their own key and every turn
 * (including the very first) runs on it.
 */
export function EngineKeyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* the form lives inside the content, so it mounts fresh — with fields
          re-read from storage — every time the dialog opens */}
      <DialogContent className="border-stone-800 bg-stone-950 text-stone-200">
        <EngineKeyForm onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

function EngineKeyForm({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const saved = getByok(); // fresh read on every mount (i.e., every open)
  const [keyField, setKeyField] = useState("");
  const [baseField, setBaseField] = useState(
    saved?.base ?? "https://api.z.ai/api/paas/v4"
  );
  const [modelField, setModelField] = useState(saved?.model ?? "glm-4.6");
  const [active, setActive] = useState(!!saved);

  function save() {
    const k = keyField.trim();
    if (!k) {
      setByok(null);
      setActive(false);
      toast.success("Engine key cleared — back to this chat's engine.");
    } else {
      setByok({
        key: k,
        base: baseField.trim() || "https://api.z.ai/api/paas/v4",
        model: modelField.trim() || "glm-4.6",
      });
      setKeyField(""); // never keep the secret in component state longer than needed
      setActive(true);
      toast.success("Your own engine now drives the tale — no chat throttle.");
    }
    onOpenChange(false);
  }

  function clearKey() {
    setByok(null);
    setActive(false);
    setKeyField("");
    toast.success("Engine key cleared — back to this chat's engine.");
  }

  return (
    <>
        <DialogHeader>
          <DialogTitle className="font-serif">Engine key</DialogTitle>
          <DialogDescription className="text-stone-400">
            Drive the tale with your own open-platform key (Z.ai) — turns then
            run on your engine, independent of this chat&apos;s rate window.
            {active
              ? " Your key is active."
              : " No key saved — this chat's engine is used."}{" "}
            The key is kept only in this browser and never written to any file.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <label htmlFor="byok-key" className="text-xs uppercase tracking-wider text-stone-500">
              API key {active && <span className="text-emerald-400">(active)</span>}
            </label>
            <input
              id="byok-key"
              type="password"
              autoComplete="off"
              value={keyField}
              onChange={(e) => setKeyField(e.target.value)}
              placeholder={active ? "leave blank to keep the saved key" : "paste your key"}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-600 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="byok-base" className="text-xs uppercase tracking-wider text-stone-500">
              Endpoint
            </label>
            <select
              id="byok-base"
              value={baseField}
              onChange={(e) => setBaseField(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-amber-600 focus:outline-none"
            >
              <option value="https://api.z.ai/api/paas/v4">api.z.ai (global)</option>
              <option value="https://open.bigmodel.cn/api/paas/v4">open.bigmodel.cn (CN)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="byok-model" className="text-xs uppercase tracking-wider text-stone-500">
              Model
            </label>
            <input
              id="byok-model"
              value={modelField}
              list="byok-model-options"
              onChange={(e) => setModelField(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 font-mono text-sm text-stone-100 focus:border-amber-600 focus:outline-none"
            />
            <datalist id="byok-model-options">
              <option value="glm-4.7-flash" label="fastest turns (recommended)" />
              <option value="glm-4.6" label="deepest prose (default)" />
            </datalist>
            <p className="text-[11px] leading-snug text-stone-500">
              glm-4.7-flash lands turns in a few seconds; glm-4.6 writes the
              deepest scenes. Any model ID your endpoint offers also works.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          {active && (
            <Button
              variant="outline"
              onClick={clearKey}
              className="border-stone-700 bg-stone-950 text-stone-300 hover:border-rose-700 hover:text-rose-200"
            >
              Clear key
            </Button>
          )}
          <Button
            onClick={save}
            className="bg-amber-600 text-stone-950 hover:bg-amber-500"
          >
            Save
          </Button>
        </DialogFooter>
    </>
  );
}
