export type Confidence = "High" | "Medium" | "Low";
export type Step = {
  id: string; text: string; minutes: number; done: boolean;
  doneWhen?: string;   // what finished looks like
  why?: string;        // why this step comes here
  confidence?: Confidence; // how sure the estimate is
  day?: string;        // ISO date when the user spreads the plan across the week
};
export type Priority = "high" | "medium" | "low";
export type Task = {
  id: string;
  title: string;
  project: string;
  minutes: number;
  priority: Priority;
  due?: string; // ISO date, only set by the user
  today: boolean;
  done: boolean;
  doneAt?: number;
  steps: Step[];
  inbox?: boolean;
  basis?: { by: "rules" | "model"; note: string }; // how the steps were produced
  rank?: number; // the user's own order within today's plan (lower first)
};
export type ChatMessage = {
  id: string;
  role: "user" | "asap";
  text: string;
  actions?: ChatAction[];
  proposal?: Proposal;
};
export type ChatAction = { label: string; kind: "focus" | "breakdown" | "review" | "plan" | "dump"; taskId?: string };
export type Proposal = {
  id: string;
  title: string;
  detail: string;
  status: "pending" | "approved" | "dismissed";
  change: { type: "setToday"; taskIds: string[] } | { type: "addSteps"; taskId: string; steps: Omit<Step, "id" | "done">[] };
};
export type Guidance = "suggest" | "assist" | "execute";
export type Settings = {
  theme: "light" | "dark";
  name: string;
  guidance: Guidance;
  askOpen: boolean;
  garden?: boolean; // optional garden; undefined means on
};
/** Cumulative and permanent. Stages only ever move forward. 1 seed, 2 seedling, 3 bloom. */
export type YardKind = "flower" | "shrub" | "creeper" | "tree" | "bench" | "lantern" | "planter" | "table" | "firepit" | "bbq" | "pond" | "gazebo";
/** growth only applies to living kinds and only ever increases. */
export type YardItem = { id: string; kind: YardKind; x: number; y: number; growth: number };
export type Garden = { plants: Record<string, 1 | 2 | 3>; order: string[]; trees: string[]; ferns: number; lastSeen: number; yard: YardItem[] };
export type DumpItem = { id: string; title: string; project: string; keep: boolean; due?: string };
