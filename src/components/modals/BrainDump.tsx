"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, Overlay, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { estimateMinutes, newId, splitBrainDump, suggestPriority } from "@/lib/planner";
import { AI_NOTE } from "@/lib/ai";
import type { DumpItem, Task } from "@/types";

/** Capture → review → save. Nothing is saved before the review step. */
export function BrainDump() {
  const { dumpOpen, dumpSeed } = useApp();
  return dumpOpen ? <DumpInner key={dumpSeed} /> : null;
}

function DumpInner() {
  const { dumpOpen, setDumpOpen, dumpSeed, dispatch, toast } = useApp();
  const [text, setText] = useState(dumpSeed);
  const [items, setItems] = useState<DumpItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => setDumpOpen(false);

  const sort = () => {
    setBusy(true);
    window.setTimeout(() => { setItems(splitBrainDump(text)); setBusy(false); }, 300);
  };
  const patch = (id: string, p: Partial<DumpItem>) => setItems((l) => l && l.map((i) => (i.id === id ? { ...i, ...p } : i)));
  const kept = items?.filter((i) => i.keep && i.title.trim()) ?? [];

  const save = () => {
    const tasks: Task[] = kept.map((i) => ({
      id: newId(), title: i.title.trim(), project: i.project || "Inbox", minutes: estimateMinutes(i.title),
      priority: suggestPriority(i.title, i.due).level, due: i.due, today: false, done: false, steps: [],
    }));
    dispatch({ type: "addTasks", tasks });
    toast(`${tasks.length} task${tasks.length === 1 ? "" : "s"} added`);
    close();
  };

  return (
    <Overlay open={dumpOpen} onClose={close} title="Brain Dump">
      <div className="flex items-start justify-between p-6 pb-2">
        <div>
          <p className="eyebrow">Brain Dump</p>
          <h2 className="display mt-1 text-3xl">{items ? "Does this look right?" : "What's on your mind?"}</h2>
        </div>
        <button onClick={close} aria-label="Close" className="grid size-11 place-items-center rounded-full hover:bg-sunk"><Icon name="close" /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-6 pb-2">
        {!items ? (
          <>
            <label htmlFor="dump" className="sr-only">Brain dump</label>
            <textarea id="dump" value={text} onChange={(e) => setText(e.target.value)} rows={6} autoFocus
              placeholder="I need to finish my portfolio, prepare for an interview on Friday, email the recruiter, and book a dentist appointment."
              className="w-full resize-none rounded-[10px] border border-line bg-bg p-4 text-[16px] placeholder:text-muted" />
            <p className="mt-2 text-sm text-muted">Write it the way you think it. You&apos;ll review everything before it&apos;s saved.</p>
          </>
        ) : items.length === 0 ? (
          <p className="py-6 text-muted">I couldn&apos;t find a task in that. Try adding a verb, like “email Sam”.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((i) => (
              <li key={i.id} className={cx("rounded-[14px] border border-line p-3", !i.keep && "opacity-50")}>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={i.keep} onChange={() => patch(i.id, { keep: !i.keep })} aria-label={`Keep “${i.title}”`} className="size-5 accent-[var(--action)]" />
                  <input value={i.title} onChange={(e) => patch(i.id, { title: e.target.value })} aria-label="Task title" className="h-11 flex-1 rounded-[8px] bg-transparent px-2 font-semibold" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 pl-7">
                  <label className="text-sm text-muted">Project
                    <input value={i.project} onChange={(e) => patch(i.id, { project: e.target.value })} className="ml-2 h-9 w-32 rounded-[8px] border border-line bg-bg px-2 text-ink" />
                  </label>
                  {i.due ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-action-soft px-2.5 py-1 text-sm font-semibold">
                      Due {i.due}<button className="ml-1 underline" onClick={() => patch(i.id, { due: undefined })} aria-label="Remove due date">remove</button>
                    </span>
                  ) : <span className="text-sm text-muted">No due date</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
        {items && <p className="mt-3 text-xs text-muted">{AI_NOTE} Due dates are only added when you name a day.</p>}
      </div>
      <div className="flex justify-between gap-2 p-6 pt-3">
        {items ? <Button onClick={() => setItems(null)}>Back</Button> : <span />}
        {!items
          ? <Button variant="primary" loading={busy} disabled={!text.trim()} onClick={sort}>Sort it out</Button>
          : <Button variant="primary" disabled={!kept.length} onClick={save}>Save {kept.length || ""} task{kept.length === 1 ? "" : "s"}</Button>}
      </div>
    </Overlay>
  );
}
