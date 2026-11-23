import type { DumpItem, Priority, Step, Task } from "@/types";

/**
 * Local, rule-based planner. This is NOT an LLM. It exists so the product
 * works end to end without a backend; every surface that uses it labels the
 * result as a draft. Replace `splitBrainDump` / `suggestSteps` with a call
 * to a real model endpoint when one is configured (see lib/ai.ts).
 */
const uid = () => Math.random().toString(36).slice(2, 10);
export const newId = uid;

const PROJECT_HINTS: [RegExp, string][] = [
  [/portfolio|case study|resume|cv|job|interview|recruiter|apply|application/i, "Career"],
  [/dentist|doctor|appointment|gym|groceries|laundry|rent|bills?/i, "Personal"],
  [/essay|paper|exam|study|homework|assignment|class|lecture/i, "School"],
  [/client|invoice|proposal|contract|meeting|report|presentation|deck/i, "Work"],
];
export function guessProject(text: string): string {
  for (const [re, p] of PROJECT_HINTS) if (re.test(text)) return p;
  return "Inbox";
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
/** Only returns a date when the text names a weekday/today/tomorrow explicitly. */
export function explicitDue(text: string, now = new Date()): string | undefined {
  const t = text.toLowerCase();
  const d = new Date(now);
  if (/\btoday\b/.test(t)) return d.toISOString().slice(0, 10);
  if (/\btomorrow\b/.test(t)) { d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); }
  const i = WEEKDAYS.findIndex((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (i >= 0) {
    const diff = (i - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  }
  return undefined;
}

export function splitBrainDump(raw: string): DumpItem[] {
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/^(i\s+(need|have|want)\s+to|need to|i should|i must)\s+/i, "")
    .trim();
  if (!cleaned) return [];
  const parts = cleaned
    .split(/\s*(?:,\s*(?:and\s+)?|;|\.\s+|\band\s+(?=(?:email|call|book|finish|prepare|send|submit|buy|write|schedule|pay|clean|review|plan|read|order|reply|update|fix|make)\b))\s*/i)
    .map((p) => p.replace(/^(and|to)\s+/i, "").replace(/[.]+$/, "").trim())
    .filter((p) => p.length > 2);
  return parts.map((p) => ({
    id: uid(),
    title: p.charAt(0).toUpperCase() + p.slice(1),
    project: guessProject(p),
    keep: true,
    due: explicitDue(p),
  }));
}

export function estimateMinutes(title: string): number {
  const t = title.toLowerCase();
  if (/email|reply|book|call|pay|submit|send|schedule/.test(t)) return 10;
  if (/prepare|interview|study|write|draft|presentation|portfolio|finish/.test(t)) return 30;
  return 20;
}

/** The smallest useful first action, used by Start Assist. */
export function startAssistSteps(title: string): Pick<Step, "text" | "minutes">[] {
  const t = title.toLowerCase();
  if (/present|deck|slides/.test(t))
    return [
      { text: "Open the presentation file", minutes: 1 },
      { text: "Write the presentation title", minutes: 2 },
      { text: "Add three section headings", minutes: 3 },
    ];
  if (/email|reply|message/.test(t))
    return [
      { text: "Open a new draft", minutes: 1 },
      { text: "Write only the subject line", minutes: 2 },
      { text: "Write one sentence saying what you need", minutes: 3 },
    ];
  if (/interview|prepare/.test(t))
    return [
      { text: "Open the job description", minutes: 1 },
      { text: "Highlight three requirements", minutes: 3 },
      { text: "Write one example for the first requirement", minutes: 5 },
    ];
  if (/book|schedule|appointment|call/.test(t))
    return [
      { text: "Find the phone number or booking page", minutes: 2 },
      { text: "Note two times that work for you", minutes: 2 },
      { text: "Make the booking", minutes: 5 },
    ];
  return [
    { text: `Open whatever you need for “${title}”`, minutes: 1 },
    { text: "Write down what “done” looks like in one sentence", minutes: 2 },
    { text: "Do the first small piece for five minutes", minutes: 5 },
  ];
}

export function suggestSteps(title: string): Pick<Step, "text" | "minutes">[] {
  const t = title.toLowerCase();
  if (/portfolio/.test(t))
    return [
      { text: "Open the portfolio file", minutes: 2 },
      { text: "Write a two-sentence introduction", minutes: 8 },
      { text: "Pick the strongest project to lead with", minutes: 10 },
      { text: "Read it aloud once and fix what trips you up", minutes: 5 },
    ];
  if (/interview/.test(t))
    return [
      { text: "Re-read the role description and note the top three needs", minutes: 10 },
      { text: "Write one story for each need", minutes: 20 },
      { text: "Draft answers to “tell me about yourself”", minutes: 10 },
      { text: "Write two questions to ask them", minutes: 5 },
    ];
  if (/application|apply|submit/.test(t))
    return [
      { text: "Gather the documents you need", minutes: 5 },
      { text: "Fill in the form without perfecting anything", minutes: 10 },
      { text: "Check each field once, then submit", minutes: 5 },
    ];
  const base = estimateMinutes(title);
  return [
    { text: "Define what finished looks like", minutes: 3 },
    { text: "Gather what you need in one place", minutes: 5 },
    { text: "Do the main piece without editing", minutes: Math.max(base - 8, 5) },
    { text: "Review once and wrap up", minutes: 5 },
  ];
}

export function stepsFor(title: string, kind: "breakdown" | "assist" = "breakdown"): Step[] {
  const src = kind === "assist" ? startAssistSteps(title) : suggestSteps(title);
  return src.map((s) => ({ id: uid(), text: s.text, minutes: s.minutes, done: false }));
}

export const PRIORITIES: Priority[] = ["high", "medium", "low"];
export const PRIORITY_LABEL: Record<Priority, string> = { high: "High", medium: "Medium", low: "Low" };
const PR: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

const iso = (d: Date) => d.toISOString().slice(0, 10);
/** A suggestion only. The user always has the last word on a task's priority. */
export function suggestPriority(title: string, due?: string, now = new Date()): { level: Priority; reason: string } {
  const t = title.toLowerCase();
  if (due) {
    const days = Math.round((new Date(due + "T12:00:00").getTime() - new Date(iso(now) + "T12:00:00").getTime()) / 86400000);
    if (days <= 1) return { level: "high", reason: days < 0 ? "it is overdue" : "it is due very soon" };
    if (days <= 6 && !/someday|maybe/.test(t)) return { level: "medium", reason: "it is due this week" };
  }
  if (/urgent|asap|deadline|interview|submit|invoice|tax|exam|today|pay\b/.test(t)) return { level: "high", reason: "it sounds time-sensitive" };
  if (/someday|maybe|organi[sz]e|tidy|browse|explore|idea|clean|read\b/.test(t)) return { level: "low", reason: "it sounds flexible" };
  return { level: "medium", reason: "there is no deadline" };
}

/** AI order: priority first, then nearest deadline, then shorter tasks. */
export function aiOrder(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => PR[a.priority] - PR[b.priority] || (a.due ?? "9999").localeCompare(b.due ?? "9999") || a.minutes - b.minutes);
}
/** Today's plan in the order the user set; anything unranked falls back to AI order. */
export function planOrder(tasks: Task[]): Task[] {
  return aiOrder(tasks.filter((t) => t.today)).sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9));
}
/** Suggests which open tasks belong in today, up to `limit`, already in order. */
export function pickToday(tasks: Task[], limit = 3): Task[] {
  return aiOrder(tasks.filter((t) => !t.done && !t.inbox)).slice(0, limit);
}

export const DEFAULT_PROJECTS = ["Inbox", "Career", "Personal", "School", "Work"];
export function projectsOf(tasks: Task[]): string[] {
  return Array.from(new Set([...DEFAULT_PROJECTS, ...tasks.map((t) => t.project)]));
}

export type Status = "To do" | "In progress" | "Done";
export function taskStatus(t: Task, activeId?: string | null): Status {
  if (t.done) return "Done";
  if (t.id === activeId || t.steps.some((s) => s.done)) return "In progress";
  return "To do";
}

export function dueLabel(due?: string, now = new Date()): string | undefined {
  if (!due) return undefined;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const tm = new Date(now); tm.setDate(tm.getDate() + 1);
  if (due === iso(now)) return "Due today";
  if (due === iso(tm)) return "Due tomorrow";
  if (due < iso(now)) return "Overdue";
  return "Due " + new Date(due + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
