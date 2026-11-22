"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { newId, pickToday, startAssistSteps, stepsFor } from "@/lib/planner";
import { AI_NOTE } from "@/lib/ai";
import { Button, Motif, Overlay, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { AskPanel } from "@/components/assistant/AskPanel";
import type { Step } from "@/types";

const POMO = 25 * 60, BREAK = 5 * 60;
const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function Focus() {
  const { state, dispatch, toast } = useApp();
  const task = useMemo(() => state.tasks.find((t) => t.id === state.activeTaskId && !t.done) ?? pickToday(state.tasks, 1)[0], [state.tasks, state.activeTaskId]);

  const [mode, setMode] = useState<"standard" | "pomodoro">("standard");
  const [running, setRunning] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [breakPrompt, setBreakPrompt] = useState(false);
  const [clock, setClock] = useState(0); // standard: elapsed. pomodoro: remaining
  const [focused, setFocused] = useState(0);
  const [assist, setAssist] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [summary, setSummary] = useState<{ title: string; steps: number; seconds: number } | null>(null);

  const resetClock = useCallback((m: "standard" | "pomodoro") => setClock(m === "pomodoro" ? POMO : 0), []);
  const changeMode = (m: "standard" | "pomodoro") => { setMode(m); resetClock(m); setRunning(false); setOnBreak(false); setBreakPrompt(false); };

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (!onBreak) setFocused((f) => f + 1);
      setClock((c) => {
        if (onBreak) { if (c <= 1) { setOnBreak(false); setRunning(false); resetClock("pomodoro"); toast("Break over. Ready when you are."); return POMO; } return c - 1; }
        if (mode === "pomodoro") { if (c <= 1) { setRunning(false); setBreakPrompt(true); return 0; } return c - 1; }
        return c + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, onBreak, mode, resetClock, toast]);

  if (summary) {
    const next = pickToday(state.tasks, 1)[0];
    return (
      <Stage>
        <div className="page-enter mx-auto flex max-w-xl flex-1 flex-col items-center justify-center text-center">
          <span className="grid size-14 place-items-center rounded-full bg-[#6fa77c] text-[#0f1a12]"><Icon name="check" size={28} /></span>
          <h1 className="display mt-6 text-5xl">That&apos;s done.</h1>
          <p className="mt-3 text-xl text-[#e6e2d8]">{summary.title}</p>
          <p className="tnum mt-2 text-[#dce8d9]">{Math.max(1, Math.round(summary.seconds / 60))} min focused · {summary.steps} step{summary.steps === 1 ? "" : "s"}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {next && <Button size="lg" onClick={() => { dispatch({ type: "active", id: next.id }); setSummary(null); setFocused(0); resetClock(mode); }} className="!bg-[#6fa77c] !text-[#0f1a12]">Next: {next.title.length > 28 ? next.title.slice(0, 27) + "…" : next.title}</Button>}
            <Link href="/" className="inline-flex h-14 items-center rounded-[10px] px-6 text-[#f4f0e8] hover:bg-white/10">Back to Home</Link>
          </div>
        </div>
      </Stage>
    );
  }

  if (!task)
    return (
      <Stage>
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center text-center">
          <h1 className="display text-5xl">Nothing to focus on</h1>
          <p className="mt-3 text-[#e6e2d8]">Add a task, then come back and start when you&apos;re ready.</p>
          <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-[10px] bg-[#dce8d9] px-6 text-[#252044]">Go to Home</Link>
        </div>
      </Stage>
    );

  const stepIdx = task.steps.findIndex((s) => !s.done);
  const cur = stepIdx >= 0 ? task.steps[stepIdx] : null;
  const doneCount = task.steps.filter((s) => s.done).length;
  const pct = task.steps.length ? Math.round((doneCount / task.steps.length) * 100) : 0;
  const allDone = task.steps.length > 0 && !cur;

  const finishTask = () => {
    setSummary({ title: task.title, steps: task.steps.length, seconds: focused });
    dispatch({ type: "toggle", id: task.id }); setRunning(false); setFocused(0);
  };
  const finishStep = () => {
    if (!cur) return;
    dispatch({ type: "toggleStep", id: task.id, stepId: cur.id });
  };
  const useAssist = () => {
    const micro: Step[] = startAssistSteps(task.title).map((s) => ({ id: newId(), text: s.text, minutes: s.minutes, done: false }));
    dispatch({ type: "setSteps", id: task.id, steps: [...micro, ...task.steps.filter((s) => !s.done)] });
    setAssist(false); toast("Start Assist added three small steps");
  };
  const breakDown = () => { dispatch({ type: "setSteps", id: task.id, steps: stepsFor(task.title) }); toast("Steps added"); };

  return (
    <Stage>
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[#e6e2d8] hover:bg-white/10"><Icon name="close" size={18} />Exit focus</Link>
        <div role="group" aria-label="Timer mode" className="flex rounded-full bg-white/10 p-1">
          {(["standard", "pomodoro"] as const).map((m) => (
            <button key={m} aria-pressed={mode === m} onClick={() => changeMode(m)} className={cx("min-h-10 rounded-full px-4 text-sm capitalize", mode === m ? "bg-[#dce8d9] text-[#252044]" : "text-[#e6e2d8]")}>{m}</button>
          ))}
        </div>
        <Button variant="ghost" className="!text-[#cfe3d3] hover:!bg-white/10" onClick={() => setAskOpen(true)}><Icon name="spark" size={16} />AI Coach</Button>
      </header>

      <div className="page-enter mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 py-8">
        <div>
          <p className="eyebrow !text-[#dce8d9]">{onBreak ? "On a break" : "Focusing on"}</p>
          <h1 className="display mt-3 text-4xl sm:text-6xl">{task.title}</h1>
          <p className="mt-2 text-[#e6e2d8]">{task.project} · about <span className="tnum">{task.minutes}</span> min</p>
        </div>

        <div className="rounded-[24px] bg-white/[0.07] p-6 ring-1 ring-white/10 sm:p-8">
          {cur ? (
            <>
              <p className="eyebrow !text-[#dce8d9]">Current step · {stepIdx + 1} of {task.steps.length}</p>
              <p className="mt-2 text-2xl sm:text-3xl">{cur.text}</p>
            </>
          ) : allDone ? (
            <p className="text-2xl ">Every step is done. Finish when you&apos;re ready.</p>
          ) : (
            <>
              <p className="text-2xl ">Not sure where to begin?</p>
              <p className="mt-1 text-[#e6e2d8]">Start with something small, or let ASAP break the task into steps.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setAssist(true)} className="!bg-[#dce8d9] !text-[#252044]"><Icon name="spark" size={16} />Start Assist</Button>
                <Button variant="ghost" className="!text-[#f4f0e8] hover:!bg-white/10" onClick={breakDown}>Break it down</Button>
              </div>
            </>
          )}

          <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div role="timer" aria-live="off" aria-label={onBreak ? "Break time remaining" : mode === "pomodoro" ? "Time remaining" : "Time elapsed"}>
              <span className="tnum text-6xl tracking-tight sm:text-7xl">{fmt(clock)}</span>
              <p className="mt-1 text-sm text-[#e6e2d8]">{running ? (onBreak ? "Rest. You've earned it." : "In progress") : clock > 0 && clock !== POMO ? "Paused" : "Starts when you press Start"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {running
                ? <Button size="lg" onClick={() => setRunning(false)} className="!bg-white/15 !text-[#f4f0e8]"><Icon name="pause" size={18} />Pause</Button>
                : <Button size="lg" onClick={() => setRunning(true)} className="!bg-[#6fa77c] !text-[#0f1a12]"><Icon name="play" size={18} />{clock > 0 && clock !== POMO ? "Resume" : "Start"}</Button>}
              {cur && <Button size="lg" onClick={finishStep} className="!bg-[#f4f0e8] !text-[#252044]"><Icon name="check" size={18} />Step done</Button>}
              {(allDone || !task.steps.length) && <Button size="lg" onClick={finishTask} className="!bg-[#f4f0e8] !text-[#252044]"><Icon name="check" size={18} />Finish task</Button>}
            </div>
          </div>
          {task.steps.length > 0 && (
            <div className="mt-6" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Task progress">
              <div className="h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#6fa77c] transition-[width] duration-500" style={{ width: `${pct}%` }} /></div>
              <p className="tnum mt-1 text-sm text-[#e6e2d8]">{doneCount} of {task.steps.length} steps · {pct}%</p>
            </div>
          )}
        </div>

        {breakPrompt && (
          <div role="alertdialog" aria-label="Break" className="fade-enter flex flex-wrap items-center gap-3 rounded-[16px] bg-[#f2c6ad] p-4 text-[#252044]">
            <Icon name="coffee" /><p className="flex-1 ">Nice stretch of focus. Take a 5-minute break?</p>
            <Button size="sm" className="!bg-[#252044] !text-white" onClick={() => { setBreakPrompt(false); setOnBreak(true); setClock(BREAK); setRunning(true); }}>Take a break</Button>
            <Button size="sm" className="!bg-white/70 !text-[#252044]" onClick={() => { setBreakPrompt(false); resetClock("pomodoro"); }}>Keep going</Button>
          </div>
        )}

        {task.steps.length > 0 && (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ol className="flex flex-1 flex-col gap-1 text-[#e6e2d8]">
              {task.steps.map((s, i) => (
                <li key={s.id} className={cx("flex items-center gap-3 py-1", s.done && "opacity-60", i === stepIdx && "text-white")}>
                  <span className={cx("grid size-6 place-items-center rounded-full border text-xs", s.done ? "border-[#6fa77c] bg-[#6fa77c] text-[#0f1a12]" : "border-white/40")}>{s.done ? <Icon name="check" size={13} /> : i + 1}</span>
                  <span className={s.done ? "line-through" : ""}>{s.text}</span><span className="tnum ml-auto text-sm">{s.minutes}m</span>
                </li>
              ))}
            </ol>
            {!allDone && <Button variant="ghost" className="!text-[#cfe3d3] hover:!bg-white/10" onClick={() => setAssist(true)}><Icon name="spark" size={16} />Struggling to start?</Button>}
          </div>
        )}
      </div>

      <Overlay open={assist} onClose={() => setAssist(false)} title="Start Assist">
        <div className="p-6">
          <p className="eyebrow">Start Assist</p>
          <h2 className="display mt-1 text-3xl">Just begin with this.</h2>
          <ol className="mt-4 flex flex-col gap-2">
            {startAssistSteps(task.title).map((s, i) => (
              <li key={i} className="flex items-center gap-3 rounded-[12px] border border-line p-3"><span className="tnum grid size-7 place-items-center rounded-full bg-action-soft ">{i + 1}</span><span className="flex-1 ">{s.text}</span><span className="tnum text-sm text-muted">{s.minutes}m</span></li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">{AI_NOTE}</p>
          <div className="mt-5 flex justify-end gap-2"><Button onClick={() => setAssist(false)}>Not now</Button><Button variant="primary" onClick={useAssist}>Use these steps</Button></div>
        </div>
      </Overlay>
      <Overlay open={askOpen} onClose={() => setAskOpen(false)} title="AI Coach" variant="drawer"><AskPanel onClose={() => setAskOpen(false)} /></Overlay>
    </Stage>
  );
}

function Stage({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#252044] px-4 py-5 text-[#f4f0e8] sm:px-8">
      <Motif tone="deep" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-60" />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </div>
  );
}
