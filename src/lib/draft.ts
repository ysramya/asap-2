import { newId } from "./planner";

export type Check = { label: string; ok: boolean };
export type Run = { id: string; goal: string; notes: string; doc: string; plan: string[]; checks: Check[]; revised: boolean; by: "rules" | "model"; at: number };
const KEY = "asap2:runs";

export const loadRuns = (): Run[] => { try { return JSON.parse(localStorage.getItem(KEY) || "[]") as Run[]; } catch { return []; } };
export const saveRuns = (r: Run[]) => { try { localStorage.setItem(KEY, JSON.stringify(r.slice(0, 10))); } catch {} }; // up to 10 runs
export const newRun = (r: Omit<Run, "id" | "at">): Run => ({ ...r, id: newId(), at: Date.now() });

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lines = (notes: string) => notes.split(/\n+/).map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter((l) => l.length > 2).slice(0, 10).map((l) => (l.length > 160 ? l.slice(0, 157) + "…" : l));

/** Built-in fallback: a structured skeleton filled from the user's own notes. It is a template, not AI writing. */
export function localPlan(goal: string): string[] {
  return ["Purpose: what this document is for", "What we know: facts from your notes", "Proposed approach: the structure to follow", "Open questions: what is still missing", "Next steps: who does what, by when"].map((x, i) => (i === 0 ? `Purpose: ${goal}` : x));
}
export function localDraft(goal: string, notes: string, _plan?: string[]): string {
  const n = lines(notes);
  return [
    `# ${cap(goal.trim().replace(/[.]+$/, ""))}`,
    "",
    "> Working draft from a built-in template and your own notes. Review and edit before using.",
    "",
    "## Purpose",
    `${cap(goal.trim())}.`,
    "",
    "## What we know",
    ...(n.length ? n.map((l) => `- ${l}`) : ["- (No notes were provided.)"]),
    "",
    "## Proposed approach",
    "1. Confirm the audience and the deadline",
    "2. Turn each point above into one short section",
    "3. Agree owners for the next steps",
    "",
    "## Open questions",
    "- Who is the audience, and what do they need to decide or do?",
    "- What is the deadline?",
    "",
    "## Next steps",
    "- [ ] Review this draft",
    "- [ ] Fill in the open questions",
    "- [ ] Share for feedback",
    "",
  ].join("\n");
}
export function localCheck(goal: string, notes: string, doc: string): { checks: Check[]; issues: string[] } {
  const n = lines(notes);
  const checks: Check[] = [
    { label: "States the purpose", ok: /##\s*Purpose/i.test(doc) },
    { label: "Uses your notes", ok: n.length === 0 || n.slice(0, 3).every((l) => doc.includes(l.slice(0, 40))) },
    { label: "Lists open questions", ok: /##\s*Open questions/i.test(doc) },
    { label: "Has next steps", ok: /##\s*Next steps/i.test(doc) },
    { label: "No placeholder text left", ok: !/lorem|todo:|tbd/i.test(doc) },
  ];
  return { checks, issues: checks.filter((c) => !c.ok).map((c) => c.label) };
}
export function localRevise(doc: string, issues: string[]): string {
  let d = doc;
  if (issues.includes("Lists open questions")) d += "\n## Open questions\n- What is still missing?\n";
  if (issues.includes("Has next steps")) d += "\n## Next steps\n- [ ] Review this draft\n";
  if (issues.includes("States the purpose")) d = d.replace(/^(# .*\n)/, "$1\n## Purpose\nState the purpose here.\n");
  return d;
}
export const download = (name: string, text: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/markdown" }));
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) || "draft"}.md`;
  a.click(); URL.revokeObjectURL(a.href);
};
