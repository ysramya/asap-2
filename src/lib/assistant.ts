import type { ChatMessage, Task } from "@/types";
import { newId, pickToday, splitBrainDump, stepsFor } from "./planner";

const msg = (m: Omit<ChatMessage, "id" | "role">): ChatMessage => ({ id: newId(), role: "asap", ...m });

/** Rule-based replies that read the user's real task list. Short by design. */
export function reply(input: string, tasks: Task[]): ChatMessage {
  const t = input.toLowerCase();
  const open = tasks.filter((x) => !x.done && !x.inbox);
  const top = pickToday(tasks, 3);
  const first = top[0];

  if (!open.length)
    return msg({ text: "You have nothing open right now. Tell me what's on your mind and I'll sort it into tasks you can review.", actions: [{ label: "Open Brain Dump", kind: "dump" }] });

  if (/(too much|overwhelm|where to start|don.t know where|stuck|can.t start|procrastinat)/.test(t) && first)
    return msg({
      text: `You have a few competing priorities. Let's make this manageable. I suggest starting with “${first.title}”. It should take around ${first.minutes} minutes.`,
      actions: [
        { label: "Start this task", kind: "focus", taskId: first.id },
        { label: "Break it down", kind: "breakdown", taskId: first.id },
        { label: "Review my day", kind: "review" },
      ],
    });

  if (/(plan|review).*(day|today)|my day|prioriti/.test(t))
    return msg({
      text: top.length ? `Here is a lighter day: ${top.length} priorities. Nothing changes until you approve.` : "There's nothing to plan yet.",
      proposal: top.length ? { id: newId(), title: "Set today's priorities", detail: top.map((x, i) => `${i + 1}. ${x.title} (${x.minutes} min)`).join("\n"), status: "pending", change: { type: "setToday", taskIds: top.map((x) => x.id) } } : undefined,
    });

  const bd = t.match(/(?:break down|break up|split|steps for)\s+(.+)/);
  if (bd || /break (it|this) down/.test(t)) {
    const needle = bd?.[1]?.replace(/[“”"']/g, "").trim();
    const target = (needle && open.find((x) => x.title.toLowerCase().includes(needle) || needle.includes(x.title.toLowerCase()))) || first;
    if (target)
      return msg({
        text: `Here's a first pass for “${target.title}”. Edit it after you approve.`,
        proposal: { id: newId(), title: `Add steps to “${target.title}”`, detail: stepsFor(target.title).map((s, i) => `${i + 1}. ${s.text} (${s.minutes} min)`).join("\n"), status: "pending", change: { type: "addSteps", taskId: target.id, steps: stepsFor(target.title).map((s) => ({ text: s.text, minutes: s.minutes })) } },
      });
  }

  if (/(start|begin|first)/.test(t) && first)
    return msg({ text: `Start with “${first.title}”. If it feels heavy, I'll give you a tiny first action.`, actions: [{ label: "Start this task", kind: "focus", taskId: first.id }, { label: "Break it down", kind: "breakdown", taskId: first.id }] });

  if (/(how many|what.s left|progress|done)/.test(t)) {
    const done = tasks.filter((x) => x.done).length;
    return msg({ text: `${done} done, ${open.length} open. ${first ? `Next up: “${first.title}”.` : ""}` });
  }

  if (splitBrainDump(input).length > 1 || /\b(need to|have to|remember to|should)\b/.test(t))
    return msg({ text: `I found ${Math.max(splitBrainDump(input).length, 1)} possible task(s). Review them before anything is saved.`, actions: [{ label: "Review in Brain Dump", kind: "dump" }] });

  return msg({ text: "I can help you decide where to start, break a task down, or sort a brain dump. What would help most?", actions: [{ label: "Review my day", kind: "review" }, { label: "Open Brain Dump", kind: "dump" }] });
}
