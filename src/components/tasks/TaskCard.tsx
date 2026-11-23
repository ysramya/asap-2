"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { Checkbox, PriorityMark, ProjectLabel, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { dueLabel, taskStatus } from "@/lib/planner";
import { useCompleteTask } from "./TaskRow";
import type { Task } from "@/types";

const STRIPE = { high: "border-l-[#df947a]", medium: "border-l-action", low: "border-l-muted/50" } as const;

export type DragApi = {
  dragId: string | null; overId: string | null;
  start: (id: string) => void; over: (id: string) => void; drop: (id: string) => void; end: () => void;
};

/** One task as a card. Drag it anywhere, or use the arrows; suggestions never move it for you. */
export function TaskCard({ task, rank, suggested, drag, canDrag, onEdit, onShift, first, last }: {
  task: Task; rank?: number; suggested?: boolean; drag: DragApi; canDrag: boolean; onEdit: () => void;
  onShift: (dir: -1 | 1) => void; first: boolean; last: boolean;
}) {
  const { state } = useApp();
  const complete = useCompleteTask();
  const status = taskStatus(task, state.activeTaskId);
  const done = task.steps.filter((s) => s.done).length;
  const pct = task.steps.length ? Math.round((done / task.steps.length) * 100) : 0;
  const due = dueLabel(task.due);
  const dragging = drag.dragId === task.id;
  const target = canDrag && drag.overId === task.id && drag.dragId !== task.id;

  return (
    <li
      draggable={canDrag}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", task.id); drag.start(task.id); }}
      onDragOver={(e) => { if (!canDrag || !drag.dragId) return; e.preventDefault(); e.stopPropagation(); drag.over(task.id); }}
      onDrop={(e) => { if (!canDrag) return; e.preventDefault(); e.stopPropagation(); drag.drop(task.id); }}
      onDragEnd={drag.end}
      className={cx("group relative flex flex-col gap-3 rounded-[16px] border border-l-4 border-line bg-surface p-4 shadow-[var(--shadow-1)] transition-[opacity,box-shadow,transform] duration-[160ms]",
        STRIPE[task.priority], canDrag && "cursor-grab active:cursor-grabbing", dragging && "scale-[.98] opacity-40", target && "ring-2 ring-action ring-offset-2 ring-offset-bg")}>
      <div className="flex items-start gap-1">
        <Checkbox checked={task.done} onChange={() => complete(task)} label={`Mark “${task.title}” done`} />
        <div className="min-w-0 flex-1 pt-2">
          <button onClick={onEdit} className="text-left text-[17px] font-semibold leading-snug hover:underline">{task.title}</button>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1"><ProjectLabel name={task.project} /><span className="tnum text-sm text-muted">{task.minutes} min</span></div>
        </div>
        {canDrag && <span className="grid size-9 shrink-0 place-items-center text-muted" aria-hidden title="Drag to reorder"><Icon name="grip" size={18} /></span>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityMark level={task.priority} />
        {due && <span className={cx("rounded-md px-1.5 py-0.5 text-xs font-semibold", due === "Overdue" ? "bg-warm-soft text-ink" : "bg-sunk text-muted")}>{due}</span>}
        <span className="rounded-md bg-sunk px-1.5 py-0.5 text-xs font-semibold text-muted">{status}</span>
        {task.today && <span className="rounded-md bg-action-soft px-1.5 py-0.5 text-xs font-semibold">In today</span>}
        {suggested && rank !== undefined && <span className="inline-flex items-center gap-1 rounded-md bg-ai-soft px-1.5 py-0.5 text-xs font-bold text-ai-ink"><Icon name="spark" size={11} />AI suggests #{rank + 1}</span>}
      </div>
      {task.steps.length > 0 && (
        <div aria-label={`${done} of ${task.steps.length} steps done`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-sunk"><div className="h-full rounded-full bg-action transition-[width] duration-300" style={{ width: `${pct}%` }} /></div>
          <p className="tnum mt-1 text-xs text-muted">{done}/{task.steps.length} steps</p>
        </div>
      )}
      <div className="mt-auto flex items-center gap-1 border-t border-line pt-2">
        <Link href={`/task?id=${task.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-2.5 text-sm font-semibold text-ai-ink hover:bg-ai-soft"><Icon name="spark" size={14} />Plan</Link>
        <button onClick={onEdit} className="inline-flex h-9 items-center rounded-[8px] px-2.5 text-sm font-semibold text-muted hover:bg-sunk hover:text-ink">Edit</button>
        {canDrag && (
          <span className="ml-auto flex">
            <button aria-label={`Move “${task.title}” earlier`} disabled={first} onClick={() => onShift(-1)} className="grid size-9 place-items-center rounded-[8px] text-muted hover:bg-sunk disabled:opacity-30"><Icon name="chevron" size={16} className="rotate-180" /></button>
            <button aria-label={`Move “${task.title}” later`} disabled={last} onClick={() => onShift(1)} className="grid size-9 place-items-center rounded-[8px] text-muted hover:bg-sunk disabled:opacity-30"><Icon name="chevron" size={16} /></button>
          </span>
        )}
      </div>
    </li>
  );
}
