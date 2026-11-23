"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { ChatMessage, Garden, Settings, Step, Task, YardKind } from "@/types";
import { newId } from "./planner";
import { advanceYard, DEF, earned, spent } from "./yard";

type State = {
  hydrated: boolean;
  tasks: Task[];
  settings: Settings;
  chat: ChatMessage[];
  activeTaskId: string | null;
  sample: boolean;
  garden: Garden;
};

const emptyGarden = (): Garden => ({ plants: {}, order: [], trees: [], ferns: 0, lastSeen: Date.now(), yard: [] });
const DAY = 86400000;

/** Growth is additive. Nothing here ever removes or downgrades anything. */
function grow(g: Garden, id: string, stage: 1 | 2 | 3): Garden {
  const cur = g.plants[id] ?? 0;
  if (cur >= stage) return g; // duplicate events earn nothing
  return { ...g, plants: { ...g.plants, [id]: stage }, order: cur ? g.order : [...g.order, id], lastSeen: Date.now() };
}
function growTrees(g: Garden, tasks: Task[], project: string): Garden {
  const ts = tasks.filter((t) => t.project === project);
  if (ts.length < 3 || ts.some((t) => !t.done) || g.trees.includes(project)) return g;
  return { ...g, trees: [...g.trees, project] };
}

const today = () => new Date().toISOString().slice(0, 10);
const mk = (title: string, project: string, minutes: number, extra: Partial<Task> = {}): Task => ({
  id: newId(), title, project, minutes, priority: "medium", today: false, done: false, steps: [], ...extra,
});

export const sampleTasks = (): Task[] => [
  mk("Finish portfolio introduction", "Portfolio", 15, { today: true, priority: "high" }),
  mk("Prepare for interview", "Career", 45, { today: true, due: today(), priority: "high" }),
  mk("Submit job application", "Career", 20, { today: true }),
  mk("Email the recruiter", "Career", 10),
  mk("Book dentist appointment", "Personal", 10, { priority: "low" }),
];

const initial: State = {
  hydrated: false,
  tasks: [],
  settings: { theme: "light", name: "", guidance: "assist", askOpen: true },
  chat: [],
  activeTaskId: null,
  sample: false,
  garden: emptyGarden(),
};

type Action =
  | { type: "hydrate"; state: Partial<State> }
  | { type: "addTasks"; tasks: Task[] }
  | { type: "update"; id: string; patch: Partial<Task> }
  | { type: "remove"; id: string }
  | { type: "toggle"; id: string }
  | { type: "toggleStep"; id: string; stepId: string }
  | { type: "setSteps"; id: string; steps: Step[] }
  | { type: "setToday"; ids: string[] }
  | { type: "reorder"; ids: string[] }
  | { type: "yardPlace"; id: string; kind: YardKind; x: number; y: number }
  | { type: "yardMove"; id: string; x: number; y: number }
  | { type: "yardRemove"; id: string }
  | { type: "settings"; patch: Partial<Settings> }
  | { type: "chat"; messages: ChatMessage[] }
  | { type: "patchMessage"; id: string; patch: Partial<ChatMessage> }
  | { type: "active"; id: string | null }
  | { type: "clearSample" };

function reducer(s: State, a: Action): State {
  const n = base(s, a);
  let g = n.garden;
  if (a.type === "active" && a.id) { const t = n.tasks.find((x) => x.id === a.id); if (t && !t.done) g = grow(g, t.id, 1); }
  if (a.type === "toggleStep") { const t = n.tasks.find((x) => x.id === a.id); if (t?.steps.find((x) => x.id === a.stepId)?.done) g = grow(g, a.id, 2); }
  if (a.type === "toggle") {
    const was = s.tasks.find((x) => x.id === a.id), t = n.tasks.find((x) => x.id === a.id);
    if (t?.done && !was?.done) {
      const before = g.plants[t.id] ?? 0;
      g = growTrees(grow(g, t.id, 3), n.tasks, t.project);
      if (before < 3) g = { ...g, yard: advanceYard(g.yard) }; // each newly completed task grows the yard once
    }
  }
  return g === n.garden ? n : { ...n, garden: g };
}

function base(s: State, a: Action): State {
  switch (a.type) {
    case "hydrate": {
      const m = { ...s, ...a.state, hydrated: true };
      m.tasks = m.tasks.map((t) => ((t.priority as string) === "normal" ? { ...t, priority: "medium" } : t)); // older saves
      let g = a.state.garden;
      if (!g) { // first run with the garden: seed it from work already done
        g = emptyGarden();
        for (const t of m.tasks) { if (t.done) g = grow(g, t.id, 3); else if (t.steps.some((x) => x.done)) g = grow(g, t.id, 2); }
      }
      return { ...m, garden: { ...g, yard: g.yard ?? [], lastSeen: Date.now() } };
    }
    case "addTasks": return { ...s, tasks: [...a.tasks, ...s.tasks] };
    case "update": return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, ...a.patch } : t)) };
    case "remove": return { ...s, tasks: s.tasks.filter((t) => t.id !== a.id), activeTaskId: s.activeTaskId === a.id ? null : s.activeTaskId };
    case "toggle":
      return { ...s, tasks: s.tasks.map((t) => t.id !== a.id ? t : t.done
        ? { ...t, done: false, doneAt: undefined }
        : { ...t, done: true, doneAt: Date.now(), steps: t.steps.map((x) => ({ ...x, done: true })) }) };
    case "toggleStep":
      return { ...s, tasks: s.tasks.map((t) => t.id !== a.id ? t : { ...t, steps: t.steps.map((x) => x.id === a.stepId ? { ...x, done: !x.done } : x) }) };
    case "setSteps": return { ...s, tasks: s.tasks.map((t) => (t.id === a.id ? { ...t, steps: a.steps } : t)) };
    case "setToday": return { ...s, tasks: s.tasks.map((t) => ({ ...t, today: a.ids.includes(t.id) })) };
    case "reorder": return { ...s, tasks: s.tasks.map((t) => { const i = a.ids.indexOf(t.id); return i < 0 ? t : { ...t, rank: i }; }) };
    case "yardPlace": {
      const g = s.garden, def = DEF[a.kind];
      if (!def || earned(g) - spent(g) < def.cost || g.yard.some((y) => y.id === a.id)) return s;
      return { ...s, garden: { ...g, yard: [...g.yard, { id: a.id, kind: a.kind, x: a.x, y: a.y, growth: 0 }] } };
    }
    case "yardMove": return { ...s, garden: { ...s.garden, yard: s.garden.yard.map((y) => (y.id === a.id ? { ...y, x: a.x, y: a.y } : y)) } };
    case "yardRemove": return { ...s, garden: { ...s.garden, yard: s.garden.yard.filter((y) => y.id !== a.id) } }; // seeds return to the pocket
    case "settings": return { ...s, settings: { ...s.settings, ...a.patch } };
    case "chat": return { ...s, chat: [...s.chat, ...a.messages] };
    case "patchMessage": return { ...s, chat: s.chat.map((m) => (m.id === a.id ? { ...m, ...a.patch } : m)) };
    case "active": return { ...s, activeTaskId: a.id };
    case "clearSample": return { ...s, tasks: [], chat: [], sample: false, activeTaskId: null }; // the garden is never cleared
  }
}

export type Toast = { id: string; text: string; undo?: () => void };
type Ctx = {
  state: State;
  dispatch: React.Dispatch<Action>;
  toast: (text: string, undo?: () => void) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  dumpOpen: boolean;
  setDumpOpen: (v: boolean) => void;
  dumpSeed: string;
  openDump: (seed?: string) => void;
};
const C = createContext<Ctx | null>(null);
const KEY = "asap2:v1";

export function Providers({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [dumpSeed, setDumpSeed] = useState("");
  const openDump = useCallback((seed = "") => { setDumpSeed(seed); setDumpOpen(true); }, []);

  useEffect(() => {
    let loaded: Partial<State> | null = null;
    try { const raw = localStorage.getItem(KEY); if (raw) loaded = JSON.parse(raw); } catch {}
    if (loaded) dispatch({ type: "hydrate", state: loaded });
    else dispatch({ type: "hydrate", state: { tasks: sampleTasks(), sample: true, settings: initial.settings } });
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    document.documentElement.dataset.theme = state.settings.theme;
    try { localStorage.setItem(KEY, JSON.stringify({ tasks: state.tasks, settings: state.settings, chat: state.chat, sample: state.sample, garden: state.garden, activeTaskId: state.activeTaskId })); } catch {}
  }, [state]);

  const dismissToast = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const toast = useCallback((text: string, undo?: () => void) => {
    const id = newId();
    setToasts((t) => [...t.slice(-2), { id, text, undo }]);
    timers.current.push(window.setTimeout(() => dismissToast(id), 5000));
  }, [dismissToast]);

  const value = useMemo(() => ({ state, dispatch, toast, toasts, dismissToast, dumpOpen, setDumpOpen, dumpSeed, openDump }), [state, toast, toasts, dismissToast, dumpOpen, dumpSeed, openDump]);
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useApp() {
  const c = useContext(C);
  if (!c) throw new Error("useApp outside Providers");
  return c;
}
