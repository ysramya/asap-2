"use client";
import { useEffect, useState } from "react";
import { AI_NOTE, MODEL_NOTE, aiConfigured, callAI } from "@/lib/ai";
import { Button, Card, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { download, loadRuns, localCheck, localDraft, localPlan, localRevise, newRun, saveRuns, type Run } from "@/lib/draft";

const LIMIT = 12000;
const STAGES = ["Plan", "Draft", "Check", "Revise"] as const;

/** Goal and notes in, a reviewed working document out. One revision at most. Nothing is sent anywhere. */
export default function Handle() {
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<number | null>(null); // index of the stage in progress
  const [run, setRun] = useState<Run | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => { const r = loadRuns(); setRuns(r); }, []);

  const importFile = async (f?: File) => {
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name)) return setErr("Use a .txt, .md or .csv file.");
    const t = await f.text();
    setNotes((n) => (n ? n + "\n\n" : "") + t.slice(0, LIMIT));
    setErr(t.length > LIMIT ? `Only the first ${LIMIT.toLocaleString()} characters were used.` : "");
  };

  const go = async () => {
    const g = goal.trim(), n = notes.slice(0, LIMIT);
    if (!g) return;
    setErr(""); setRun(null);
    let by: Run["by"] = "rules", plan: string[] = [], doc = "", issues: string[] = [], checks: Run["checks"] = [], revised = false;
    try {
      if (!aiConfigured()) throw new Error("not-configured");
      setStage(0); plan = (await callAI<{ plan: string[] }>("draft-plan", { goal: g, notes: n })).plan;
      setStage(1); doc = (await callAI<{ text: string }>("draft-write", { goal: g, notes: n, plan: plan.join("\n") })).text;
      setStage(2); const c = await callAI<{ ok: boolean; issues: string[] }>("draft-check", { goal: g, notes: n, doc });
      issues = c.ok ? [] : c.issues; checks = [{ label: "Matches your goal and notes", ok: c.ok }, ...c.issues.map((label) => ({ label, ok: false }))];
      if (issues.length) { setStage(3); doc = (await callAI<{ text: string }>("draft-revise", { doc, issues: issues.join("\n") })).text; revised = true; }
      by = "model";
    } catch {
      by = "rules"; plan = localPlan(g);
      setStage(1); doc = localDraft(g, n, plan);
      setStage(2); const c = localCheck(g, n, doc); checks = c.checks; issues = c.issues;
      if (issues.length) { setStage(3); doc = localRevise(doc, issues); revised = true; }
    }
    const r = newRun({ goal: g, notes: n, doc, plan, checks, revised, by });
    const next = [r, ...runs].slice(0, 10);
    setRuns(next); saveRuns(next); setRun(r); setStage(null);
  };

  const remove = (id: string) => { const next = runs.filter((r) => r.id !== id); setRuns(next); saveRuns(next); if (run?.id === id) setRun(null); };
  const busy = stage !== null;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="eyebrow">Handle it</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">From goal to working draft</h1>
        <p className="mt-3 max-w-xl text-lg text-muted">Give ASAP a goal and your notes. It plans, writes a document, checks it, and makes one revision if needed. You review the result before using it.</p>
        <p className="mt-2 max-w-xl text-sm text-muted">Drafts stay in this browser (the last 10). ASAP uses only the text you provide and never sends messages or changes anything outside this page.</p>
      </header>

      <Card className="flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5 font-semibold">What should ASAP prepare?
          <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={2} maxLength={300} placeholder="Draft a short status update for my team meeting"
            className="rounded-[10px] border border-line bg-bg px-3 py-2 text-[16px] font-normal" />
        </label>
        <label className="flex flex-col gap-1.5 font-semibold">Notes and source material <span className="text-sm font-normal text-muted">(optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, LIMIT))} rows={6} placeholder="Paste the facts, requirements, existing work and constraints."
            className="rounded-[10px] border border-line bg-bg px-3 py-2 text-[16px] font-normal" />
          <span className="tnum text-xs font-normal text-muted">{notes.length.toLocaleString()} / {LIMIT.toLocaleString()} characters</span>
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-line px-4 text-[15px] font-semibold hover:bg-sunk">
            <Icon name="plus" size={16} />Import text (.txt, .md, .csv)
            <input type="file" accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" className="sr-only" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <Button variant="primary" size="lg" disabled={!goal.trim() || busy} loading={busy} onClick={() => void go()} className="ml-auto"><Icon name="spark" size={18} />Handle it: create my draft</Button>
        </div>
        {err && <p role="alert" className="text-sm font-semibold">{err}</p>}
        <p className="text-xs text-muted">Scope: one downloadable Markdown document, up to four AI calls. {aiConfigured() ? "A model is connected." : "No model is connected yet, so a built-in template is used and labelled as such."}</p>
      </Card>

      {busy && (
        <ol aria-label="Progress" className="fade-enter flex flex-wrap gap-2" aria-live="polite">
          {STAGES.map((s, i) => <li key={s} className={cx("rounded-full border px-3 py-1 text-sm font-semibold", i === stage ? "border-action bg-action-soft" : i < (stage ?? 0) ? "border-line text-muted line-through" : "border-line text-muted")}>{i + 1}. {s}{i === stage && "…"}</li>)}
        </ol>
      )}

      {run && (
        <section aria-label="Draft" className="fade-enter flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-auto text-xl font-bold">Your draft</h2>
            <Button size="sm" onClick={() => void navigator.clipboard?.writeText(run.doc)}>Copy</Button>
            <Button size="sm" variant="primary" onClick={() => download(run.goal, run.doc)}>Download .md</Button>
          </div>
          <p className="text-sm text-muted">{run.by === "model" ? MODEL_NOTE : `${AI_NOTE} This is a template filled from your notes.`}{run.revised && " One revision was made after the check."}</p>
          <ul className="flex flex-wrap gap-2" aria-label="Checks">{run.checks.map((c) => <li key={c.label} className={cx("rounded-md px-2 py-1 text-xs font-bold", c.ok ? "bg-action-soft" : "bg-warm-soft")}>{c.ok ? "✓" : "!"} {c.label}</li>)}</ul>
          <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap rounded-[14px] border border-line bg-surface p-4 text-[15px] leading-relaxed">{run.doc}</pre>
        </section>
      )}

      {runs.length > 0 && (
        <section aria-labelledby="past-h">
          <h2 id="past-h" className="mb-2 text-xl font-bold">Earlier drafts</h2>
          <ul className="flex flex-col divide-y divide-line rounded-[16px] border border-line bg-surface p-1">
            {runs.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                <button className="min-w-0 flex-1 text-left" onClick={() => setRun(r)}>
                  <p className="truncate font-semibold">{r.goal}</p>
                  <p className="text-sm text-muted">{new Date(r.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {r.by === "model" ? "AI model" : "template"}</p>
                </button>
                <Button size="sm" variant="ghost" aria-label={`Delete draft: ${r.goal}`} onClick={() => remove(r.id)}><Icon name="trash" size={16} /></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
