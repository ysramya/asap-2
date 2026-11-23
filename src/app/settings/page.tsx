"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, Card, ConfirmDialog, cx } from "@/components/ui";

export default function Settings() {
  const { state, dispatch, toast } = useApp();
  const [confirm, setConfirm] = useState(false);
  const s = state.settings;
  return (
    <div className="flex flex-col gap-8">
      <header><p className="eyebrow">Make it yours</p><h1 className="display mt-2 text-5xl">Settings</h1></header>

      <Card className="p-6">
        <h2 className="text-lg font-bold">Name</h2>
        <p className="text-muted">Used in your greeting. Stored only on this device.</p>
        <label htmlFor="name" className="sr-only">Your name</label>
        <input id="name" value={s.name} onChange={(e) => dispatch({ type: "settings", patch: { name: e.target.value } })} placeholder="Optional"
          className="mt-3 h-12 w-full max-w-sm rounded-[10px] border border-line bg-bg px-4" />
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold">Theme</h2>
        <div role="radiogroup" aria-label="Theme" className="mt-3 flex gap-2">
          {(["light", "dark"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={s.theme === t} onClick={() => dispatch({ type: "settings", patch: { theme: t } })}
              className={cx("min-h-11 rounded-[10px] border px-5 font-semibold capitalize", s.theme === t ? "border-action bg-action-soft" : "border-line hover:bg-sunk")}>{t}</button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold">Backyard</h2>
        <p className="text-muted">An optional place to spend the seeds you earn. Hiding it keeps everything you have built.</p>
        <button role="switch" aria-checked={s.garden !== false} onClick={() => dispatch({ type: "settings", patch: { garden: s.garden === false } })}
          className={cx("mt-3 min-h-11 rounded-[10px] border px-5 font-semibold", s.garden !== false ? "border-action bg-action-soft" : "border-line hover:bg-sunk")}>
          {s.garden !== false ? "Backyard is shown" : "Backyard is hidden"}
        </button>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-bold">Data</h2>
        <p className="text-muted">Everything lives in this browser. {state.sample ? "You're seeing sample tasks." : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => setConfirm(true)}>{state.sample ? "Clear sample data" : "Delete all tasks"}</Button>
        </div>
      </Card>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} title="Delete all tasks?" body="This removes every task and your AI Coach history from this device. It can't be undone."
        confirmLabel="Delete everything" onConfirm={() => { dispatch({ type: "clearSample" }); toast("All cleared"); }} />
    </div>
  );
}
