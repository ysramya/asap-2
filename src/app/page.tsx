"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { pickToday } from "@/lib/planner";
import { Button, EmptyState, Motif } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { TaskRow, useCompleteTask } from "@/components/tasks/TaskRow";
import { useAsk } from "@/hooks/useAsk";

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${g}, ${name}.` : `${g}.`;
}

export default function Home() {
  const { state, dispatch, openDump } = useApp();
  const router = useRouter();
  const ask = useAsk();
  const complete = useCompleteTask();
  const [showAll, setShowAll] = useState(false);

  const open = state.tasks.filter((t) => !t.done);
  const planned = open.filter((t) => t.today).slice(0, 3);
  const priorities = planned.length ? planned : pickToday(state.tasks, 3);
  const rest = open.filter((t) => !priorities.includes(t));
  const next = priorities[0];
  const minutes = priorities.reduce((a, t) => a + t.minutes, 0);
  const doneToday = state.tasks.filter((t) => t.done && t.doneAt && new Date(t.doneAt).toDateString() === new Date().toDateString()).length;

  const startFocus = () => { if (!next) return; dispatch({ type: "active", id: next.id }); router.push("/focus"); };

  return (
    <div className="flex flex-col gap-10">
      <header>
        <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <h1 className="display mt-2 text-5xl sm:text-6xl">{greeting(state.settings.name)}</h1>
        <p className="mt-3 text-lg text-muted">
          {next ? "Let's take today one step at a time." : doneToday ? "Everything planned is done. Nice and steady." : "A clear day. Add what's on your mind when you're ready."}
        </p>
      </header>

      {next ? (
        <section aria-labelledby="next-h" className="relative overflow-hidden rounded-[24px] bg-[#252044] p-6 pb-24 text-[#f4f0e8] shadow-[var(--shadow-2)] sm:p-9 sm:pb-9">
          <Motif tone="deep" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full opacity-80" />
          <p id="next-h" className="eyebrow !text-[#dce8d9]">Your next step</p>
          <h2 className="display mt-3 max-w-xl text-4xl sm:text-5xl">{next.title}</h2>
          <p className="mt-3 text-[#e6e2d8]">Approximately <span className="tnum">{next.minutes}</span> minutes · {next.project}</p>
          <div className="relative mt-7 flex flex-wrap gap-3">
            <Button variant="primary" size="lg" onClick={startFocus} className="!bg-[#6fa77c] !text-[#0f1a12]"><Icon name="play" size={18} />Start Focus</Button>
            <Button size="lg" variant="ghost" className="!text-[#f4f0e8] hover:!bg-white/10" onClick={() => complete(next)}><Icon name="check" size={18} />Mark done</Button>
          </div>
        </section>
      ) : (
        <EmptyState title={doneToday ? "All clear" : "Nothing planned yet"} body="Pour out whatever's on your mind. ASAP will sort it and you'll review before anything is saved."
          action={<div className="flex flex-wrap justify-center gap-2"><Button variant="primary" onClick={() => openDump()}>Open Brain Dump</Button><Button onClick={() => ask.sendAndShow("review my day")}>Plan my day</Button></div>} />
      )}

      {priorities.length > 0 && (
        <section aria-labelledby="pri-h">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 id="pri-h" className="eyebrow">Today&apos;s priorities</h2>
            <span className="tnum text-sm text-muted">{minutes} min total</span>
          </div>
          <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
            {priorities.map((t, i) => <TaskRow key={t.id} task={t} index={i} />)}
          </ul>
          {minutes > 90 && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-[14px] bg-ai-soft px-4 py-3 text-[15px]">
              <Icon name="spark" size={18} className="text-ai-ink" />
              <span className="flex-1">That adds up to about {Math.round(minutes / 6) / 10} hours. Want a lighter day?</span>
              <Button size="sm" variant="ai" onClick={() => ask.sendAndShow("review my day")}>Review my day</Button>
            </div>
          )}
        </section>
      )}

      <section aria-label="Capture" className="flex flex-col gap-3">
        <QuickCapture />
        {rest.length > 0 && (
          <div>
            <button onClick={() => setShowAll((s) => !s)} aria-expanded={showAll} className="inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
              <Icon name="chevron" size={16} className={showAll ? "rotate-90 transition-transform" : "transition-transform"} />
              {showAll ? "Hide" : `Show ${rest.length} more`} {showAll ? "other tasks" : rest.length === 1 ? "task" : "tasks"}
            </button>
            {showAll && <ul className="fade-enter mt-1 flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">{rest.map((t) => <TaskRow key={t.id} task={t} />)}</ul>}
          </div>
        )}
      </section>
    </div>
  );
}
