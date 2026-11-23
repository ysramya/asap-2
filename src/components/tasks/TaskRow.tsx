"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, Checkbox, Meta, PriorityMark, PrioritySelect, ProjectLabel, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { dueLabel, projectsOf, stepsFor, taskStatus } from "@/lib/planner";
import { AI_NOTE } from "@/lib/ai";
import type { Step, Task } from "@/types";

export function useCompleteTask() {
  const { dispatch, toast } = useApp();
  return (t: Task) => {
    dispatch({ type: "toggle", id: t.id });
    if (!t.done) toast(`Done: ${t.title}`, () => dispatch({ type: "toggle", id: t.id }));
  };
}

export function TaskRow({ task, index, expandable = false }: { task: Task; index?: number; expandable?: boolean }) {
  const { state, dispatch, toast } = useApp();
  const complete = useCompleteTask();
  const status = taskStatus(task, state.activeTaskId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Step[] | null>(null);
  const doneSteps = task.steps.filter((s) => s.done).length;

  return (
    <li className="rounded-[14px] transition-colors hover:bg-sunk/60">
      <div className="flex items-center gap-1 pr-2">
        <Checkbox checked={task.done} onChange={() => complete(task)} label={`Mark “${task.title}” ${task.done ? "not done" : "done"}`} />
        {index !== undefined && <span className="tnum w-5 text-sm text-muted" aria-hidden>{index + 1}</span>}
        <div className="min-w-0 flex-1 py-3">
          <p className={cx("truncate text-[17px] font-semibold", task.done && "text-muted line-through")}>{task.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ProjectLabel name={task.project} />
            <Meta icon="clock"><span className="tnum">{task.minutes} min</span></Meta>
            {task.due && <Meta><span className={dueLabel(task.due) === "Overdue" ? "font-semibold text-ink" : ""}>{dueLabel(task.due)}</span></Meta>}
            <Meta>{status}</Meta>
            {task.steps.length > 0 && <Meta>{doneSteps}/{task.steps.length} steps</Meta>}
            <PriorityMark level={task.priority} />
          </div>
        </div>
        {expandable && (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={`${open ? "Hide" : "Show"} details for ${task.title}`}
            className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunk">
            <Icon name="chevron" className={cx("transition-transform duration-[160ms]", open && "rotate-90")} />
          </button>
        )}
      </div>

      {expandable && open && (
        <div className="fade-enter ml-12 flex flex-col gap-4 pb-4 pr-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm text-muted">Title
              <input defaultValue={task.title} key={task.title} onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== task.title) dispatch({ type: "update", id: task.id, patch: { title: v } }); }}
                className="h-10 rounded-[8px] border border-line bg-surface px-2 text-[15px] text-ink" />
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted">Project
              <select value={task.project} onChange={(e) => dispatch({ type: "update", id: task.id, patch: { project: e.target.value } })} className="h-10 rounded-[8px] border border-line bg-surface px-2 text-[15px] text-ink">
                {projectsOf(state.tasks).map((p) => <option key={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-muted">Minutes
              <input type="number" min={1} max={480} defaultValue={task.minutes} key={task.minutes} onBlur={(e) => { const n = Math.max(1, Math.min(480, Number(e.target.value) || task.minutes)); if (n !== task.minutes) dispatch({ type: "update", id: task.id, patch: { minutes: n } }); }}
                className="tnum h-10 w-20 rounded-[8px] border border-line bg-surface px-2 text-[15px] text-ink" />
            </label>
          </div>
          {task.steps.length > 0 && (
            <ul className="flex flex-col">
              {task.steps.map((s) => (
                <li key={s.id} className="flex items-center">
                  <Checkbox checked={s.done} onChange={() => dispatch({ type: "toggleStep", id: task.id, stepId: s.id })} label={`Step: ${s.text}`} />
                  <span className={cx("flex-1 text-[15px]", s.done && "text-muted line-through")}>{s.text}</span>
                  <span className="tnum text-sm text-muted">{s.minutes}m</span>
                </li>
              ))}
            </ul>
          )}

          {draft && (
            <div className="rounded-[14px] border border-ai bg-ai-soft p-4">
              <p className="eyebrow">Suggested steps</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[15px]">{draft.map((s) => <li key={s.id}>{s.text} <span className="tnum text-muted">({s.minutes}m)</span></li>)}</ol>
              <p className="mt-2 text-xs text-muted">{AI_NOTE}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => { dispatch({ type: "setSteps", id: task.id, steps: draft }); setDraft(null); toast("Steps added"); }}>Add these steps</Button>
                <Button size="sm" onClick={() => setDraft(null)}>Discard</Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!draft && <Button size="sm" variant="ai" onClick={() => setDraft(stepsFor(task.title))}><Icon name="spark" size={16} />{task.steps.length ? "Re-suggest steps" : "Break it down"}</Button>}
            <Button size="sm" onClick={() => dispatch({ type: "update", id: task.id, patch: { today: !task.today } })} aria-pressed={task.today}>{task.today ? "In today's plan" : "Add to today"}</Button>
            <PrioritySelect compact value={task.priority} onChange={(p) => dispatch({ type: "update", id: task.id, patch: { priority: p } })} />
            <label className="flex items-center gap-2 text-sm text-muted">Due
              <input type="date" value={task.due ?? ""} onChange={(e) => dispatch({ type: "update", id: task.id, patch: { due: e.target.value || undefined } })}
                className="h-9 rounded-[8px] border border-line bg-surface px-2 text-ink" />
            </label>
            <Button size="sm" variant="ghost" onClick={() => {
              const copy = task; dispatch({ type: "remove", id: task.id });
              toast("Task deleted", () => dispatch({ type: "addTasks", tasks: [copy] }));
            }}><Icon name="trash" size={16} />Delete</Button>
          </div>
        </div>
      )}
    </li>
  );
}
