export type Step = { id: string; text: string; minutes: number; done: boolean };
export type Priority = "high" | "normal";
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
};
export type DumpItem = { id: string; title: string; project: string; keep: boolean; due?: string };
