"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { AI_NOTE } from "@/lib/ai";
import { aiOrder, dueLabel, formatMinutes, planOrder } from "@/lib/planner";
import { Button, PrioritySelect, ProjectLabel } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (mins: number) => { const m = ((mins % 1440) + 1440) % 1440; const h = Math.floor(m / 60); return `${h % 12 || 12}:${pad(m % 60)} ${h < 12 ? "am" : "pm"}`; };
const nowRounded = () => { const d = new Date(); return Math.ceil((d.getHours() * 60 + d.getMinutes()) / 5) * 5; };

/** The Planner is about today only: what, in which order, and by when. Everything else lives in My Tasks. */
export default function Planner() {
  const { state, dispatch, toast } = useApp();
  const router = useRouter();
  const [startAt, setStartAt] = useState(nowRounded);
  const [suggest, setSuggest] = useState<string[] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const plan = useMemo(() => planOrder(state.tasks.filter((t) => !t.done)), [state.tasks]);
  const later = useMemo(() => aiOrder(state.tasks.filter((t) => !t.done && !t.today)), [state.tasks]);
  const total = plan.reduce((a, t) => a + t.minutes, 0);
  const upd = (id: string, patch: object) => dispatch({ type: "update", id, patch });
  const commit = (ids: string[]) => dispatch({ type: "reorder", ids });
  const move = (i: number, d: number) => { const ids = plan.map((t) => t.id), j = i + d; if (j < 0 || j >= ids.length) return; [ids[i], ids[j]] = [ids[j], ids[i]]; commit(ids); };

  const ai = aiOrder(plan);
  const differs = ai.some((t, i) => t.id !== plan[i]?.id);
  const start = () => { dispatch({ type: "active", id: plan[0].id }); router.push("/focus"); };
  const times = plan.reduce<{ from: number; to: number }[]>((acc, t) => { const from = acc.length ? acc[acc.length - 1].to : startAt; acc.push({ from, to: from + t.minutes }); return acc; }, []);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Planner</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">Plan my day</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">Put today in order and see when you will finish. My Tasks holds everything else.</p>
      </header>

      <section aria-label="Workload" className="flex flex-wrap items-center gap-3 rounded-[16px] bg-ai-soft px-5 py-4">
        <div className="flex-1">
          <p className="tnum text-lg font-bold">{plan.length} task{plan.length === 1 ? "" : "s"} · {formatMinutes(total)}{plan.length > 0 && <span className="font-medium text-muted"> · done by {clock(startAt + total)}</span>}</p>
          <p className="text-sm text-muted">{total > 300 ? "That is a full day. Consider moving something out." : plan.length ? "A workload you can hold." : "Nothing planned yet. Add from the list below."}</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">Start at
          <input type="time" value={`${pad(Math.floor(startAt / 60))}:${pad(startAt % 60)}`} onChange={(e) => { const [h, m] = e.target.value.split(":").map(Number); if (!Number.isNaN(h)) setStartAt(h * 60 + m); }}
            className="h-10 rounded-[8px] border border-line bg-surface px-2 text-ink" />
        </label>
        <Button variant="ai" onClick={() => setSuggest(plan.length ? aiOrder(plan).map((t) => t.id) : aiOrder(state.tasks.filter((t) => !t.done && !t.inbox)).slice(0, 3).map((t) => t.id))}><Icon name="spark" size={16} />{plan.length ? "Suggest an order" : "Suggest a plan"}</Button>
        <Button variant="primary" disabled={!plan.length} onClick={start}><Icon name="play" size={16} />Start focus</Button>
      </section>

      {suggest && (() => {
        const list = suggest.map((id) => state.tasks.find((t) => t.id === id)).filter(Boolean) as typeof plan;
        return (
          <section aria-label="AI suggestion" className="fade-enter rounded-[16px] border border-ai bg-surface p-5">
            <p className="eyebrow">{plan.length ? "Suggested order" : "Suggested plan for today"}</p>
            {list.length ? (
              <>
                <ol className="mt-2 list-decimal space-y-1 pl-5">{list.map((t) => <li key={t.id}>{t.title} <span className="tnum text-muted">({t.minutes} min · {t.priority} priority{t.due ? ` · ${dueLabel(t.due)?.toLowerCase()}` : ""})</span></li>)}</ol>
                <p className="mt-2 text-xs text-muted">{AI_NOTE} Ordered by priority, then deadline, then length. Nothing changes until you apply it.</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="primary" onClick={() => { if (!plan.length) dispatch({ type: "setToday", ids: list.map((t) => t.id) }); commit(list.map((t) => t.id)); setSuggest(null); toast("Plan applied"); }}>Apply this</Button>
                  <Button size="sm" onClick={() => setSuggest(null)}>Dismiss</Button>
                </div>
              </>
            ) : <p className="mt-2 text-muted">No open tasks to plan. Add one from Home or My Tasks.</p>}
          </section>
        );
      })()}

      <section aria-labelledby="plan-h">
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 id="plan-h" className="text-xl font-bold">Today, in order</h2>
          {plan.length > 1 && <p className="text-sm text-muted">{differs ? "Your order differs from the AI's suggestion. That is fine." : "Matches the AI's suggested order."}</p>}
        </div>
        {plan.length ? (
          <ol className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
            {plan.map((t, i) => (
              <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
                <div className="flex flex-col">
                  <button aria-label={`Move “${t.title}” up`} disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunk disabled:opacity-30"><Icon name="chevron" className="-rotate-90" size={16} /></button>
                  <button aria-label={`Move “${t.title}” down`} disabled={i === plan.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-md text-muted hover:bg-sunk disabled:opacity-30"><Icon name="chevron" className="rotate-90" size={16} /></button>
                </div>
                <div className="w-[92px] shrink-0">
                  <p className="tnum text-sm font-bold">{clock(times[i].from)}</p>
                  <p className="tnum text-xs text-muted">to {clock(times[i].to)}</p>
                </div>
                <div className="min-w-[160px] flex-1">
                  <p className="text-[17px] font-semibold">{t.title}</p>
                  <div className="flex flex-wrap gap-x-3"><ProjectLabel name={t.project} />{t.due && <span className="text-sm text-muted">{dueLabel(t.due)}</span>}</div>
                </div>
                <PrioritySelect compact value={t.priority} onChange={(p) => upd(t.id, { priority: p })} label={`Priority for ${t.title}`} />
                <label className="flex items-center gap-1 text-sm text-muted"><span className="sr-only">Estimated minutes for {t.title}</span>
                  <input type="number" min={5} max={480} step={5} value={t.minutes} onChange={(e) => upd(t.id, { minutes: Math.max(5, Math.min(480, Number(e.target.value) || 5)) })}
                    className="tnum h-9 w-[68px] rounded-[8px] border border-line bg-surface px-2 text-ink" />min
                </label>
                <button aria-label={`Remove “${t.title}” from today`} onClick={() => upd(t.id, { today: false, rank: undefined })} className="grid size-9 place-items-center rounded-full text-muted hover:bg-sunk"><Icon name="close" size={16} /></button>
              </li>
            ))}
          </ol>
        ) : <p className="rounded-[16px] border border-dashed border-line px-6 py-8 text-center text-muted">Nothing is planned for today. Add tasks from the list below.</p>}
      </section>

      <section aria-labelledby="later-h">
        <h2 id="later-h" className="mb-2 text-xl font-bold">Add from My Tasks</h2>
        {later.length ? (
          <>
            <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
              {(showAll ? later : later.slice(0, 5)).map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="text-sm text-muted">{t.project} · {t.minutes} min · {t.priority} priority{t.due ? ` · ${dueLabel(t.due)?.toLowerCase()}` : ""}</p>
                  </div>
                  <Button size="sm" onClick={() => { upd(t.id, { today: true, rank: plan.length }); }}><Icon name="plus" size={14} />Add to today</Button>
                </li>
              ))}
            </ul>
            {later.length > 5 && <Button variant="ghost" className="mt-2" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show ${later.length - 5} more`}</Button>}
          </>
        ) : <p className="text-muted">Every open task is already in today's plan.</p>}
      </section>
    </div>
  );
}
