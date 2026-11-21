"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Button, EmptyState, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import type { Task } from "@/types";
import { TaskRow } from "@/components/tasks/TaskRow";

function TaskList({ list, empty, openDump }: { list: Task[]; empty: string; openDump: () => void }) {
  return list.length ? <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">{list.map((t) => <TaskRow key={t.id} task={t} expandable />)}</ul>
    : <EmptyState title="Nothing here" body={empty} action={<Button onClick={() => openDump()}>Open Brain Dump</Button>} />;
}

const TABS = ["Tasks", "Projects", "Inbox", "Completed"] as const;

export default function Work() {
  const { state, openDump } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("All");

  const projects = useMemo(() => ["All", ...Array.from(new Set(state.tasks.map((t) => t.project))).sort()], [state.tasks]);
  const match = (t: { title: string; project: string }) => (!q || t.title.toLowerCase().includes(q.toLowerCase())) && (proj === "All" || t.project === proj);
  const open = state.tasks.filter((t) => !t.done && match(t));
  const done = state.tasks.filter((t) => t.done && match(t));
  const inbox = open.filter((t) => t.project === "Inbox");
  const groups = projects.filter((p) => p !== "All").map((p) => [p, open.filter((t) => t.project === p)] as const).filter(([, l]) => l.length);

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div><p className="eyebrow">Everything you&apos;re responsible for</p><h1 className="display mt-2 text-5xl">My Work</h1></div>
        <Button variant="brand" onClick={() => openDump()}><Icon name="plus" size={18} />Brain Dump</Button>
      </header>

      <QuickCapture compact />

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Views" className="flex rounded-[12px] bg-sunk p-1">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("min-h-10 rounded-[9px] px-4 text-[15px] font-semibold transition-colors", tab === t ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted hover:text-ink")}>
              {t}{t === "Inbox" && inbox.length > 0 ? ` (${inbox.length})` : ""}
            </button>
          ))}
        </div>
        <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <label htmlFor="search" className="sr-only">Search tasks</label>
          <input id="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
            className="h-11 w-full rounded-[10px] border border-line bg-surface pl-9 pr-3" />
        </div>
        <label className="text-sm text-muted">Project{" "}
          <select value={proj} onChange={(e) => setProj(e.target.value)} className="h-11 rounded-[10px] border border-line bg-surface px-2 text-ink">
            {projects.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div role="tabpanel">
        {tab === "Tasks" && <TaskList openDump={openDump} list={open} empty="Capture a task above, or sort out a brain dump." />}
        {tab === "Inbox" && <TaskList openDump={openDump} list={inbox} empty="Tasks without a project land here." />}
        {tab === "Completed" && <TaskList openDump={openDump} list={done} empty="Finished tasks will show up here." />}
        {tab === "Projects" && (groups.length ? (
          <div className="flex flex-col gap-8">
            {groups.map(([name, list]) => (
              <section key={name} aria-label={name}>
                <h2 className="mb-2 flex items-baseline gap-2 text-xl font-bold">{name}<span className="tnum text-sm font-medium text-muted">{list.length} open · {list.reduce((a, t) => a + t.minutes, 0)} min</span></h2>
                <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">{list.map((t) => <TaskRow key={t.id} task={t} expandable />)}</ul>
              </section>
            ))}
          </div>
        ) : <TaskList openDump={openDump} list={[]} empty="Projects appear as you add tasks." />)}
      </div>
    </div>
  );
}
