"use client";
import { useState } from "react";
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

const TABS = ["Tasks", "Completed"] as const;

export default function Work() {
  const { state, openDump } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [q, setQ] = useState("");

  const match = (t: { title: string }) => !q || t.title.toLowerCase().includes(q.toLowerCase());
  const open = state.tasks.filter((t) => !t.done && match(t));
  const done = state.tasks.filter((t) => t.done && match(t));

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-end justify-between gap-4">
        <div><p className="eyebrow">Everything on your list</p><h1 className="display mt-2 text-5xl">My Tasks</h1></div>
        <Button variant="brand" onClick={() => openDump()}><Icon name="plus" size={18} />Brain Dump</Button>
      </header>

      <QuickCapture compact />

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Views" className="flex rounded-[12px] bg-sunk p-1">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={cx("min-h-10 rounded-[9px] px-4 text-[15px] transition-colors", tab === t ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted hover:text-ink")}>
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

      <div role="tabpanel">
        {tab === "Tasks" && <TaskList openDump={openDump} list={open} empty="Capture a task above, or sort out a brain dump." />}
        {tab === "Completed" && <TaskList openDump={openDump} list={done} empty="Finished tasks will show up here." />}
      </div>
    </div>
  );
}
