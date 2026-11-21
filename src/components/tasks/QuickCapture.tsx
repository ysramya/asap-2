"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { estimateMinutes, explicitDue, guessProject, newId } from "@/lib/planner";

export function QuickCapture({ compact = false }: { compact?: boolean }) {
  const { dispatch, toast, openDump } = useApp();
  const [v, setV] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const title = v.trim();
    if (!title) return;
    if (/,|;| and (email|call|book|finish|prepare|send|submit)/i.test(title)) { openDump(title); setV(""); return; }
    dispatch({ type: "addTasks", tasks: [{ id: newId(), title: title[0].toUpperCase() + title.slice(1), project: guessProject(title), minutes: estimateMinutes(title), priority: "normal", due: explicitDue(title), today: false, done: false, steps: [] }] });
    toast("Added to My Work");
    setV("");
  };
  return (
    <form onSubmit={add} className="flex gap-2">
      <label htmlFor={compact ? "qc-c" : "qc"} className="sr-only">Capture a task</label>
      <input id={compact ? "qc-c" : "qc"} value={v} onChange={(e) => setV(e.target.value)} placeholder="Capture a task…"
        className="h-12 min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-4 text-[16px] placeholder:text-muted" />
      <Button type="submit" variant="secondary" size="md" disabled={!v.trim()} aria-label="Add task"><Icon name="plus" size={18} /></Button>
      <Button type="button" variant="ghost" onClick={() => openDump()} className="hidden sm:inline-flex">Brain Dump</Button>
    </form>
  );
}
