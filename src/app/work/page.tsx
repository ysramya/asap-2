"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Button, EmptyState, Overlay, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { aiOrder, projectsOf, taskStatus } from "@/lib/planner";
import type { Task } from "@/types";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskCard } from "@/components/tasks/TaskCard";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/planner";
import type { Priority } from "@/types";

function TaskList({ list, empty, openDump }: { list: Task[]; empty: string; openDump: () => void }) {
  return list.length ? <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">{list.map((t) => <TaskRow key={t.id} task={t} expandable />)}</ul>
    : <EmptyState title="Nothing here" body={empty} action={<Button onClick={() => openDump()}>Open Brain Dump</Button>} />;
}

const TABS = ["Tasks", "Completed"] as const;
type Layout = "cards" | "board";

export default function Work() {
  const { state, dispatch, toast, openDump } = useApp();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Tasks");
  const [q, setQ] = useState("");
  const [project, setProject] = useState("All");
  const [status, setStatus] = useState("All");
  const [prio, setPrio] = useState("All");
  const [layout, setLayout] = useState<Layout>("cards");
  const [order, setOrder] = useState<"mine" | "suggested">("mine");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Priority | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const match = (t: Task) =>
    (!q || t.title.toLowerCase().includes(q.toLowerCase())) &&
    (project === "All" || t.project === project) &&
    (prio === "All" || t.priority === prio.toLowerCase()) &&
    (status === "All" || taskStatus(t, state.activeTaskId) === status);
  const mine = state.tasks.filter((t) => !t.done && match(t)); // your own order
  const suggestedAll = aiOrder(state.tasks.filter((t) => !t.done));
  const rankOf = (id: string) => suggestedAll.findIndex((t) => t.id === id);
  const open = order === "suggested" ? aiOrder(mine) : mine;
  const canDrag = order === "mine" && tab === "Tasks";
  const differs = suggestedAll.some((t, i) => t.id !== state.tasks.filter((x) => !x.done)[i]?.id);
  const editing = state.tasks.find((t) => t.id === editId);
  const clear = () => { setDragId(null); setOverId(null); setOverCol(null); };
  const drag = {
    dragId, overId, start: (id: string) => setDragId(id), over: (id: string) => { setOverId(id); setOverCol(null); },
    drop: (id: string) => { if (dragId && dragId !== id) { const t = state.tasks.find((x) => x.id === id); dispatch({ type: "moveTask", id: dragId, beforeId: id, priority: layout === "board" ? t?.priority : undefined }); } clear(); },
    end: clear,
  };
  const dropInColumn = (p: Priority) => { if (dragId) dispatch({ type: "moveTask", id: dragId, beforeId: null, priority: p }); clear(); };
  const shift = (list: Task[], i: number, dir: -1 | 1) => {
    const t = list[i], j = i + dir; if (!t || j < 0 || j >= list.length) return;
    dispatch({ type: "moveTask", id: t.id, beforeId: dir === -1 ? list[j].id : list[j + 1]?.id ?? null });
  };
  const applySuggested = () => {
    const before = state.tasks.map((t) => t.id);
    dispatch({ type: "orderTasks", ids: suggestedAll.map((t) => t.id) });
    setOrder("mine");
    toast("Suggested order applied", () => dispatch({ type: "orderTasks", ids: before }));
  };
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
        {([["Project", project, setProject, ["All", ...projectsOf(state.tasks)]], ["Status", status, setStatus, ["All", "To do", "In progress"]], ["Priority", prio, setPrio, ["All", "High", "Medium", "Low"]]] as const).map(([label, val, set, opts]) => (
          <label key={label} className="flex items-center gap-2 text-sm text-muted">{label}
            <select value={val} onChange={(e) => set(e.target.value)} className="h-10 rounded-[10px] border border-line bg-surface px-2 text-[15px] text-ink">
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        ))}
      </div>

      {tab === "Tasks" && (
        <div className="flex flex-wrap items-center gap-3">
          <div role="group" aria-label="Layout" className="flex rounded-[12px] bg-sunk p-1">
            {([["cards", "Cards"], ["board", "By priority"]] as const).map(([k, l]) => (
              <button key={k} aria-pressed={layout === k} onClick={() => setLayout(k)} className={cx("min-h-9 rounded-[9px] px-3 text-sm font-semibold", layout === k ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted hover:text-ink")}>{l}</button>
            ))}
          </div>
          <div role="group" aria-label="Order" className="flex rounded-[12px] bg-sunk p-1">
            {([["mine", "My order"], ["suggested", "AI suggestion"]] as const).map(([k, l]) => (
              <button key={k} aria-pressed={order === k} onClick={() => setOrder(k)} className={cx("min-h-9 rounded-[9px] px-3 text-sm font-semibold", order === k ? "bg-surface shadow-[var(--shadow-1)]" : "text-muted hover:text-ink")}>{l}</button>
            ))}
          </div>
          <p className="text-sm text-muted">{order === "suggested" ? "A preview only. Your order is untouched." : canDrag ? "Drag cards to arrange them your way." : ""}</p>
        </div>
      )}
      {tab === "Tasks" && order === "suggested" && (
        <div className="fade-enter flex flex-wrap items-center gap-3 rounded-[14px] border border-ai bg-ai-soft px-4 py-3">
          <p className="flex-1 text-[15px]"><span className="font-semibold">Suggested order:</span> priority first, then nearest deadline, then shorter tasks. {differs ? "It differs from yours." : "It matches yours."}</p>
          <Button size="sm" variant="primary" disabled={!differs} onClick={applySuggested}>Use this order</Button>
          <Button size="sm" onClick={() => setOrder("mine")}>Keep mine</Button>
        </div>
      )}

      <div role="tabpanel">
        {tab === "Tasks" && (open.length ? (
          layout === "cards" ? (
            <ul className="grid gap-3 sm:grid-cols-2" onDragOver={(e) => { if (canDrag && dragId) e.preventDefault(); }} onDrop={() => { if (canDrag && dragId) { dispatch({ type: "moveTask", id: dragId, beforeId: null }); clear(); } }}>
              {open.map((t, i) => <TaskCard key={t.id} task={t} rank={rankOf(t.id)} suggested={rankOf(t.id) < 3} drag={drag} canDrag={canDrag} onEdit={() => setEditId(t.id)} onShift={(d) => shift(open, i, d)} first={i === 0} last={i === open.length - 1} />)}
            </ul>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {PRIORITIES.map((p) => {
                const col = open.filter((t) => t.priority === p);
                return (
                  <section key={p} aria-label={`${PRIORITY_LABEL[p]} priority`} onDragOver={(e) => { if (canDrag && dragId) { e.preventDefault(); setOverCol(p); } }} onDrop={() => canDrag && dropInColumn(p)}
                    className={cx("flex min-h-[160px] flex-col gap-3 rounded-[16px] bg-sunk/70 p-3 transition-shadow", overCol === p && "ring-2 ring-action")}>
                    <h2 className="px-1 text-sm font-bold">{PRIORITY_LABEL[p]} <span className="font-medium text-muted">· {col.length}</span></h2>
                    <ul className="flex flex-col gap-3">
                      {col.map((t, i) => <TaskCard key={t.id} task={t} rank={rankOf(t.id)} suggested={rankOf(t.id) < 3} drag={drag} canDrag={canDrag} onEdit={() => setEditId(t.id)} onShift={(d) => shift(col, i, d)} first={i === 0} last={i === col.length - 1} />)}
                    </ul>
                    {!col.length && <p className="grid flex-1 place-items-center px-2 text-center text-sm text-muted">{canDrag ? "Drop a task here" : "Nothing here"}</p>}
                  </section>
                );
              })}
            </div>
          )
        ) : <EmptyState title="Nothing here" body="Capture a task above, or sort out a brain dump." action={<Button onClick={() => openDump()}>Open Brain Dump</Button>} />)}
        {tab === "Completed" && <TaskList openDump={openDump} list={done} empty="Finished tasks will show up here." />}
      </div>
      <Overlay open={!!editing} onClose={() => setEditId(null)} title="Edit task">
        {editing && <div className="overflow-y-auto p-3"><div className="flex items-center justify-between px-3 pt-2"><h2 className="text-lg font-bold">Edit task</h2><Button size="sm" variant="ghost" onClick={() => setEditId(null)}>Close</Button></div><ul><TaskRow key={editing.id} task={editing} expandable defaultOpen /></ul></div>}
      </Overlay>
    </div>
  );
}
