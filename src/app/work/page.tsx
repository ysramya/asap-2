"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, EmptyState, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { projectsOf, taskStatus } from "@/lib/planner";
import type { Task } from "@/types";
import { TaskRow } from "@/components/tasks/TaskRow";

function TaskList({ list, empty, openDump }: { list: Task[]; empty: string; openDump: () => void }) {
  return list.length ? <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">{list.map((t) => <TaskRow key={t.id} task={t} expandable />)}</ul>
    : <EmptyState title="Nothing here" body={empty} action={<Button onClick={() => openDump()}>Open Brain Dump</Button>} />;
}

const TABS = ["Tasks", "Completed"] as const;

export default function Work() {
  const { state, openDump } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("All");
  const [status, setStatus] = useState("All");
  const [prio, setPrio] = useState("All");

  const match = (t: Task) =>
    (!q || t.title.toLowerCase().includes(q.toLowerCase())) &&
    (project === "All" || t.project === project) &&
    (prio === "All" || (prio === "Priority" ? t.priority === "high" : t.priority !== "high")) &&
    (status === "All" || taskStatus(t, state.activeTaskId) === status);
  const open = state.tasks.filter((t) => !t.done && match(t));
  const done = state.tasks.filter((t) => t.done && match(t));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div><p className="eyebrow">Everything on your list</p><h1 className="display mt-2 text-5xl">My Tasks</h1></div>
        <Button variant="brand" onClick={() => openDump()}><Icon name="plus" size={18} />Brain Dump</Button>
      </header>

      <TaskComposer id="work-composer" />

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Views" className="flex rounded-[12px] bg-sunk p-1">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("min-h-10 rounded-[9px] px-4 text-[15px] font-semibold transition-colors", tab === t ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted hover:text-ink")}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="search" className="sr-only">Search tasks</label>
          <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
            className="h-11 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        {([["Project", project, setProject, ["All", ...projectsOf(state.tasks)]], ["Status", status, setStatus, ["All", "To do", "In progress"]], ["Priority", prio, setPrio, ["All", "Priority", "Normal"]]] as const).map(([label, val, set, opts]) => (
          <label key={label} className="flex items-center gap-2 text-sm text-muted">{label}
            <select value={val} onChange={(e) => set(e.target.value)} className="h-10 rounded-[10px] border border-line bg-surface px-2 text-[15px] text-ink">
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>

      <div role="tabpanel">
        {tab === "Tasks" && <TaskList openDump={openDump} list={open} empty="Capture a task above, or sort out a brain dump." />}
        {tab === "Completed" && <TaskList openDump={openDump} list={done} empty="Finished tasks will show up here." />}
      </div>
    </div>
  );
}
