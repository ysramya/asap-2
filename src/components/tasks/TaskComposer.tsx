"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, PrioritySelect, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { AI_NOTE } from "@/lib/ai";
import { estimateMinutes, guessProject, newId, projectsOf, stepsFor, suggestPriority } from "@/lib/planner";
import type { Priority, Step } from "@/types";

const field = "h-11 rounded-[10px] border border-line bg-surface px-3 text-[15px]";

/** Ordinary task creation. Fast, no AI involved unless the user asks for a breakdown. */
export function TaskComposer({ addToToday = false, id = "composer" }: { addToToday?: boolean; id?: string }) {
  const { state, dispatch, toast, openDump } = useApp();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<Priority | null>(null); // null = follow the AI suggestion
  const [project, setProject] = useState<string | null>(null);
  const [today, setToday] = useState(addToToday);
  const [draft, setDraft] = useState<Step[] | null>(null);

  const clean = title.trim();
  const chosen = project ?? (clean ? guessProject(clean) : "Inbox");
  const sug = suggestPriority(clean, due || undefined);
  const level = prio ?? sug.level;

  const reset = () => { setTitle(""); setDue(""); setPrio(null); setProject(null); setToday(addToToday); setDraft(null); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean) return;
    dispatch({ type: "addTasks", tasks: [{
      id: newId(), title: clean[0].toUpperCase() + clean.slice(1), project: chosen, minutes: draft ? Math.max(5, draft.reduce((a, s) => a + s.minutes, 0)) : estimateMinutes(clean),
      priority: level, due: due || undefined, today, done: false, steps: draft ?? [],
    }] });
    toast(today ? "Added to My Day" : "Added to My Tasks");
    reset();
  };

  return (
    <form onSubmit={submit} aria-label="Create a task" className="rounded-[16px] border border-line bg-surface p-3 shadow-[var(--shadow-1)] sm:p-4">
      <div className="flex gap-2">
        <label htmlFor={`${id}-title`} className="sr-only">Task</label>
        <input id={`${id}-title`} value={title} onChange={(e) => { setTitle(e.target.value); setDraft(null); }} placeholder="What do you need to get done?"
          className="h-12 min-w-0 flex-1 rounded-[10px] bg-transparent px-2 text-[17px] font-semibold placeholder:font-medium placeholder:text-muted focus:outline-none" />
        <Button type="submit" variant="primary" disabled={!clean} className="shrink-0"><Icon name="plus" size={18} />Add task</Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label className="flex items-center gap-2 text-sm text-muted">Due
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={cx(field, "text-ink")} aria-label="Deadline" />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">Project
          <select value={chosen} onChange={(e) => setProject(e.target.value)} className={cx(field, "text-ink")}>
            {projectsOf(state.tasks).map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <PrioritySelect value={level} onChange={setPrio} suggested={clean && prio === null ? sug.level : undefined} />
          {clean && <p className="text-xs text-muted">{prio === null ? `AI suggests ${sug.level} because ${sug.reason}. Change it any time.` : "Set by you."}</p>}
        </div>
        <button type="button" aria-pressed={today} onClick={() => setToday((t) => !t)}
          className={cx("h-11 rounded-[10px] border px-3 text-sm font-semibold", today ? "border-action bg-action-soft text-ink" : "border-line text-muted hover:bg-sunk")}>
          {today ? "In My Day ✓" : "Add to My Day"}
        </button>
        <Button type="button" variant="ai" size="md" disabled={!clean} onClick={() => setDraft(stepsFor(clean))} className="ml-auto">
          <Icon name="spark" size={16} />Break down with AI
        </Button>
        <Button type="button" variant="ghost" onClick={() => openDump()} className="hidden sm:inline-flex">Brain Dump</Button>
      </div>
      {draft && (
        <div className="fade-enter mt-3 rounded-[14px] border border-ai bg-ai-soft p-4" role="region" aria-label="Suggested steps">
          <p className="eyebrow">Suggested steps (saved with the task)</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{draft.map((s) => <li key={s.id}>{s.text} <span className="tnum text-muted">({s.minutes}m)</span></li>)}</ol>
          <p className="mt-2 text-xs text-muted">{AI_NOTE}</p>
          <div className="mt-2"><Button type="button" size="sm" onClick={() => setDraft(null)}>Discard steps</Button></div>
        </div>
      )}
    </form>
  );
}
