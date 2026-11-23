"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { formatMinutes, pickToday } from "@/lib/planner";
import { Button, Mark } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { TaskComposer } from "@/components/tasks/TaskComposer";
import { GardenArt, gardenCaption } from "@/components/garden/Garden";
import { TaskRow } from "@/components/tasks/TaskRow";

const LIMIT = 4;
const sameDay = (ts?: number) => !!ts && new Date(ts).toDateString() === new Date().toDateString();

export default function Home() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [all, setAll] = useState(false);
  const dark = state.settings.theme === "dark";

  const open = state.tasks.filter((t) => !t.done);
  const day = state.tasks.filter((t) => t.today && (!t.done || sameDay(t.doneAt)));
  const dayOpen = day.filter((t) => !t.done);
  const shown = all ? day : day.slice(0, LIMIT);
  const next = dayOpen[0] ?? pickToday(state.tasks, 1)[0];
  const minutes = dayOpen.reduce((a, t) => a + t.minutes, 0);
  const projects = new Set(open.map((t) => t.project)).size;

  const startFocus = () => { if (!next) return; dispatch({ type: "active", id: next.id }); router.push("/focus"); };

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Mark size={28} />
          <div>
            <p className="text-[15px] font-bold leading-tight">Home</p>
            <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => dispatch({ type: "settings", patch: { theme: dark ? "light" : "dark" } })} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="grid size-11 place-items-center rounded-full hover:bg-sunk"><Icon name={dark ? "sun" : "moon"} /></button>
          <Link href="/settings" aria-label="Profile and settings" className="grid size-11 place-items-center rounded-full hover:bg-sunk">
            <span className="grid size-8 place-items-center rounded-full bg-action text-sm font-bold text-action-ink" aria-hidden>{(state.settings.name || "Me").slice(0, 1).toUpperCase()}</span>
          </Link>
        </div>
      </header>

      <section aria-labelledby="hero-h">
        <h1 id="hero-h" className="display text-4xl sm:text-5xl">Your work, organized.<br />Your day, planned.</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">Manage your tasks, organize your priorities, and turn complex work into manageable steps with AI.</p>
      </section>

      <section aria-label="Create a task"><TaskComposer addToToday id="home-composer" /></section>

      <section aria-labelledby="day-h">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="day-h" className="text-2xl font-bold tracking-tight">My Day</h2>
            <p className="tnum text-sm text-muted">
              {day.length ? `${dayOpen.length} to do · ${formatMinutes(minutes)} planned` : "Nothing planned for today yet"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/planner" className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-line bg-surface px-4 text-[15px] font-semibold hover:bg-sunk">Plan my day</Link>
            {next && <Button variant="primary" onClick={startFocus}><Icon name="play" size={16} />Start focus</Button>}
          </div>
        </div>
        {day.length ? (
          <>
            <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
              {shown.map((t, i) => <TaskRow key={t.id} task={t} index={i} expandable />)}
            </ul>
            {day.length > LIMIT && (
              <button onClick={() => setAll((a) => !a)} aria-expanded={all} className="mt-1 inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-muted hover:text-ink">
                <Icon name="chevron" size={16} className={all ? "rotate-90 transition-transform" : "transition-transform"} />
                {all ? "Show fewer" : `Show ${day.length - LIMIT} more`}
              </button>
            )}
          </>
        ) : (
          <div className="rounded-[16px] border border-dashed border-line bg-surface px-6 py-8 text-center">
            <p className="font-bold">Your day is open.</p>
            <p className="mx-auto mt-1 max-w-sm text-muted">Add a task above, or choose which of your {open.length} open tasks belong in today.</p>
            <Link href="/planner" className="mt-4 inline-flex h-11 items-center rounded-[10px] bg-action px-4 text-[15px] font-semibold text-action-ink">Plan my day</Link>
          </div>
        )}
      </section>

      <section aria-label="Where to go next" className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/work", n: "1", t: "My Tasks", d: `${open.length} open across ${projects} project${projects === 1 ? "" : "s"}. Create, edit, filter and search everything.` },
          { href: "/planner", n: "2", t: "Planner", d: "Pick what belongs in today, estimate the workload, and ask AI for a suggestion." },
          { href: "/focus", n: "3", t: "Focus", d: "Start a timer or Pomodoro and work through AI-made steps one at a time." },
        ].map((c) => (
          <Link key={c.href} href={c.href} onClick={c.href === "/focus" && next ? () => dispatch({ type: "active", id: next.id }) : undefined}
            className="group rounded-[16px] border border-line bg-surface p-5 transition-colors hover:bg-sunk">
            <span className="flex items-center justify-between"><span className="eyebrow">Step {c.n}</span><Icon name="arrow" size={16} className="text-muted transition-transform group-hover:translate-x-0.5" /></span>
            <span className="mt-2 block text-lg font-bold">{c.t}</span>
            <span className="mt-1 block text-[15px] text-muted">{c.d}</span>
          </Link>
        ))}
      </section>
      {state.settings.garden !== false && (
        <Link href="/garden" aria-label="Open your garden" className="group block overflow-hidden rounded-[16px] border border-line bg-surface transition-shadow hover:shadow-[var(--shadow-2)]">
          <span className="block aspect-[16/9] w-full sm:aspect-[21/9]"><GardenArt garden={state.garden} /></span>
          <span className="flex items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="eyebrow">Your garden</span><span className="mt-0.5 block text-[15px]">{gardenCaption(state.garden)}</span></span><Icon name="arrow" size={16} className="text-muted" /></span>
        </Link>
      )}
      <p className="text-center text-sm text-muted">Create → Organize → Plan → Focus → Complete. The AI Coach is on the side whenever you want a hand.</p>
    </div>
  );
}
