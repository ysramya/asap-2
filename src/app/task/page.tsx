"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { AI_NOTE, MODEL_NOTE, aiConfigured, callAI } from "@/lib/ai";
import { formatMinutes, newId, stepsFor } from "@/lib/planner";
import { useAsk } from "@/hooks/useAsk";
import { Button, EmptyState, ProjectLabel, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import type { Step } from "@/types";

type SR = { lang: string; interimResults: boolean; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void };

function Guide() {
  const id = useSearchParams().get("id");
  const { state, dispatch, toast } = useApp();
  const router = useRouter();
  const { sendAndShow } = useAsk();
  const task = state.tasks.find((t) => t.id === id);
  const [early, setEarly] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [why, setWhy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  useEffect(() => { setCanSpeak("SpeechRecognition" in window || "webkitSpeechRecognition" in window); }, []);

  if (!task) return <EmptyState title="Task not found" body="It may have been deleted." action={<Link href="/work" className="font-semibold underline">Back to My Tasks</Link>} />;

  const steps = task.steps;
  const current = steps.findIndex((s) => !s.done);
  const remaining = steps.filter((s) => !s.done).reduce((a, s) => a + s.minutes, 0);
  const setSteps = (next: Step[]) => dispatch({ type: "setSteps", id: task.id, steps: next });

  const generate = async () => {
    setBusy(true);
    try {
      if (!aiConfigured()) throw new Error("off");
      const r = await callAI<{ steps: Omit<Step, "id" | "done">[]; note?: string }>("steps", { title: task.title, notes: "" });
      setSteps(r.steps.map((s) => ({ ...s, id: newId(), done: false })));
      dispatch({ type: "update", id: task.id, patch: { basis: { by: "model", note: r.note ?? MODEL_NOTE } } });
    } catch {
      setSteps(stepsFor(task.title));
      dispatch({ type: "update", id: task.id, patch: { basis: { by: "rules", note: AI_NOTE } } });
    }
    setBusy(false);
  };

  const speak = () => {
    if (listening) { rec.current?.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const C = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!C) return;
    const r = new C(); r.lang = navigator.language; r.interimResults = false;
    r.onresult = (e) => setText(e.results[0][0].transcript);
    r.onend = () => setListening(false); r.onerror = () => setListening(false);
    rec.current = r; r.start(); setListening(true);
  };

  const spread = () => {
    const d = new Date(); let n = 0;
    setSteps(steps.map((s) => { if (s.done) return s; const x = new Date(d); x.setDate(d.getDate() + n++); return { ...s, day: x.toISOString().slice(0, 10) }; }));
    toast("Spread over the coming days. Change it any time.");
  };
  const dayName = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  const scheduled = steps.some((s) => s.day);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link href="/work" className="text-sm font-semibold text-muted hover:text-ink">← My Tasks</Link>
        <h1 className="display mt-2 text-3xl sm:text-4xl">{task.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"><ProjectLabel name={task.project} />
          {steps.length > 0 && <span className="tnum text-sm text-muted">{steps.filter((s) => s.done).length} of {steps.length} steps done · about {formatMinutes(remaining)} left</span>}</div>
        <p className="mt-3 text-muted">Your next work session. Take one step at a time; the rest unlock as you go.</p>
      </header>

      {!steps.length ? (
        <EmptyState title="No steps yet" body="Let ASAP suggest a small first step and a way through. You can change any of it." action={<Button variant="ai" loading={busy} onClick={() => void generate()}><Icon name="spark" size={16} />Break it down</Button>} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={spread} aria-pressed={scheduled}>Spread over the week</Button>
            {scheduled && <Button size="sm" variant="ghost" onClick={() => setSteps(steps.map((s) => ({ ...s, day: undefined })))}>Clear schedule</Button>}
            <Button size="sm" variant="ai" loading={busy} onClick={() => void generate()}><Icon name="spark" size={14} />Re-suggest steps</Button>
          </div>
          <ol className="flex flex-col gap-3">
            {steps.map((s, i) => {
              const open = i === current || (!s.done && early.includes(s.id));
              const locked = !s.done && !open;
              return (
                <li key={s.id} className={cx("rounded-[16px] border p-4", s.done ? "border-line bg-sunk/50" : i === current ? "border-action bg-surface shadow-[var(--shadow-2)]" : "border-line bg-surface", locked && "opacity-70")}>
                  <div className="flex items-start gap-3">
                    <span className={cx("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold", s.done ? "bg-action text-action-ink" : "bg-sunk")} aria-hidden>{s.done ? <Icon name="check" size={14} /> : locked ? "·" : i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow">{s.done ? "Done" : i === current ? "Start here" : i === current + 1 ? "Do next" : "Then this"} · step {i + 1} of {steps.length}{s.day && ` · ${dayName(s.day)}`}</p>
                      {editing === s.id ? (
                        <div className="mt-1 flex flex-wrap gap-2">
                          <label className="sr-only" htmlFor={`rw-${s.id}`}>Reword step</label>
                          <input id={`rw-${s.id}`} autoFocus value={text} onChange={(e) => setText(e.target.value)} className="h-10 min-w-[200px] flex-1 rounded-[8px] border border-line bg-bg px-2" />
                          {canSpeak && <Button size="sm" onClick={speak} aria-pressed={listening}>{listening ? "Listening…" : "Speak"}</Button>}
                          <Button size="sm" variant="primary" onClick={() => { const v = text.trim(); if (v) setSteps(steps.map((x) => (x.id === s.id ? { ...x, text: v } : x))); setEditing(null); }}>Save</Button>
                          <Button size="sm" onClick={() => setEditing(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <p className={cx("mt-1 text-[17px] font-semibold", s.done && "text-muted line-through")}>{s.text}</p>
                      )}
                      {locked ? (
                        <p className="mt-1 text-sm text-muted">Unlocks after step {current + 1}. <button className="font-semibold underline" onClick={() => setEarly((e) => [...e, s.id])}>Open it early</button></p>
                      ) : !s.done && (
                        <>
                          {s.why && <p className="mt-2 text-[15px] text-muted">{s.why}</p>}
                          {s.doneWhen && <p className="mt-1 text-[15px]"><span className="font-semibold">Done when:</span> {s.doneWhen}</p>}
                          <p className="tnum mt-2 text-sm text-muted">About {s.minutes} min · {s.confidence ?? "Medium"} confidence in this estimate</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {i === current && <Button size="sm" variant="primary" onClick={() => { dispatch({ type: "active", id: task.id }); router.push("/focus"); }}><Icon name="play" size={14} />Start this step</Button>}
                            <Button size="sm" onClick={() => dispatch({ type: "toggleStep", id: task.id, stepId: s.id })}>Mark done</Button>
                            <Button size="sm" onClick={() => { setEditing(s.id); setText(s.text); }}>Reword</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSteps(steps.filter((x) => x.id !== s.id)); toast("Step removed", () => setSteps(steps)); }}>Remove</Button>
                            <Button size="sm" variant="ai" onClick={() => sendAndShow(`I'm stuck on “${s.text}”`)}>I'm stuck</Button>
                          </div>
                        </>
                      )}
                      {s.done && <button className="mt-1 text-sm font-semibold text-muted underline" onClick={() => dispatch({ type: "toggleStep", id: task.id, stepId: s.id })}>Undo</button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="text-sm text-muted">My time estimates are based on averages and may not match your pace. You know your speed better than I do.</p>
          <div>
            <button className="text-sm font-semibold underline" aria-expanded={why} onClick={() => setWhy((v) => !v)}>How I made these suggestions</button>
            {why && <p className="fade-enter mt-2 rounded-[12px] bg-ai-soft p-3 text-sm">{task.basis?.note ?? AI_NOTE} Nothing here is final: reword, remove or reorder anything.</p>}
          </div>
        </>
      )}
    </div>
  );
}

export default function TaskGuide() { return <Suspense fallback={null}><Guide /></Suspense>; }
