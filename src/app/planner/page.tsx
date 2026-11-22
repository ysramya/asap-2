"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { AI_NOTE } from "@/lib/ai";
import { formatMinutes, pickToday } from "@/lib/planner";
import { Button, Checkbox, ProjectLabel, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { dueLabel } from "@/lib/planner";

export default function Planner() {
  const { state, dispatch, toast } = useApp();
  const router = useRouter();
  const [suggest, setSuggest] = useState<string[] | null>(null);

  const open = state.tasks.filter((t) => !t.done);
  const sorted = [...open].sort((a, b) => Number(b.today) - Number(a.today) || Number(b.priority === "high") - Number(a.priority === "high"));
  const chosen = open.filter((t) => t.today);
  const total = chosen.reduce((a, t) => a + t.minutes, 0);
  const upd = (id: string, patch: object) => dispatch({ type: "update", id, patch });
  const suggested = suggest ? open.filter((t) => suggest.includes(t.id)) : [];

  const start = () => { dispatch({ type: "active", id: chosen[0].id }); router.push("/focus"); };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Planner</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Plan my day</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">Choose what belongs in today, adjust the estimates, then start. Nothing changes without your say-so.</p>
      </header>

      <section aria-label="Workload" className="flex flex-wrap items-center gap-3 rounded-[16px] bg-ai-soft px-5 py-4">
        <div className="flex-1">
          <p className="tnum text-lg font-bold">{chosen.length} task{chosen.length === 1 ? "" : "s"} · {formatMinutes(total)}</p>
          <p className="text-sm text-muted">{total > 300 ? "That is a full day. Consider moving something out." : chosen.length ? "A workload you can hold." : "Tick tasks below to add them to today."}</p>
        </div>
        <Button variant="ai" onClick={() => setSuggest(pickToday(state.tasks, 3).map((t) => t.id))}><Icon name="spark" size={16} />Ask AI for a plan</Button>
        <Button variant="primary" disabled={!chosen.length} onClick={start}><Icon name="play" size={16} />Start focus</Button>
      </section>

      {suggest && (
        <section aria-label="AI suggestion" className="fade-enter rounded-[16px] border border-ai bg-surface p-5">
          <p className="eyebrow">Suggested plan for today</p>
          {suggested.length ? (
            <>
              <ol className="mt-2 list-decimal space-y-1 pl-5">{suggested.map((t) => <li key={t.id}>{t.title} <span className="tnum text-muted">({t.minutes} min)</span></li>)}</ol>
              <p className="mt-2 text-xs text-muted">{AI_NOTE} Applying replaces your current selection.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={() => { dispatch({ type: "setToday", ids: suggested.map((t) => t.id) }); setSuggest(null); toast("Plan applied"); }}>Apply this plan</Button>
                <Button size="sm" onClick={() => setSuggest(null)}>Dismiss</Button>
              </div>
            </>
          ) : <p className="mt-2 text-muted">No open tasks to plan. Add one below.</p>}
        </section>
      )}

      <section aria-labelledby="pending-h">
        <h2 id="pending-h" className="mb-2 text-xl font-bold">Pending tasks</h2>
        {sorted.length ? (
          <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
            {sorted.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-1 pr-3">
                <Checkbox checked={t.today} onChange={() => upd(t.id, { today: !t.today })} label={`${t.today ? "Remove" : "Add"} “${t.title}” ${t.today ? "from" : "to"} today`} />
                <div className="min-w-0 flex-1 py-3">
                  <p className="truncate text-[17px] font-semibold">{t.title}</p>
                  <div className="flex flex-wrap gap-x-3"><ProjectLabel name={t.project} />{t.due && <span className="text-sm text-muted">{dueLabel(t.due)}</span>}</div>
                </div>
                <label className="flex items-center gap-1 text-sm text-muted"><span className="sr-only">Estimated minutes for {t.title}</span>
                  <input type="number" min={5} max={480} step={5} value={t.minutes} onChange={(e) => upd(t.id, { minutes: Math.max(5, Math.min(480, Number(e.target.value) || 5)) })}
                    className="tnum h-10 w-[72px] rounded-[8px] border border-line bg-surface px-2 text-ink" />min
                </label>
                <button aria-pressed={t.priority === "high"} onClick={() => upd(t.id, { priority: t.priority === "high" ? "normal" : "high" })}
                  className={cx("ml-1 h-10 rounded-[8px] border px-3 text-sm font-semibold", t.priority === "high" ? "border-action bg-action-soft" : "border-line text-muted hover:bg-sunk")}>Priority</button>
              </li>
            ))}
          </ul>
        ) : <p className="rounded-[16px] border border-dashed border-line px-6 py-8 text-center text-muted">No pending tasks. Add one below.</p>}
      </section>

      <section aria-label="Add a task"><TaskComposer id="planner-composer" addToToday /></section>
    </div>
  );
}
