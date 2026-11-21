"use client";
import { useApp } from "@/lib/store";
import { pickToday } from "@/lib/planner";
import { useAsk } from "@/hooks/useAsk";
import { Icon } from "@/components/ui/Icon";
import { Composer, ModelNote, ThreadBody } from "./Thread";

/** Compact companion: one sentence, up to three suggestions, a composer. */
export function AskPanel({ onClose }: { onClose: () => void }) {
  const { state } = useApp();
  const ask = useAsk();
  const first = pickToday(state.tasks, 1)[0];
  const sentence = first ? `Your lightest next move is “${first.title}”.` : "Add a task and I'll help you decide where to start.";
  const suggestions = first
    ? ["I don't know where to start", "Review my day", `Break down ${first.title}`]
    : ["I have a lot on my mind"];
  return (
    <section aria-label="Ask ASAP" className="flex h-full flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-full bg-ai text-[#252044]"><Icon name="spark" size={16} /></span>
          <div><h2 className="text-[15px] font-bold leading-tight">Ask ASAP</h2><p className="text-xs text-muted">Your companion</p></div>
        </div>
        <button onClick={onClose} aria-label="Close Ask ASAP" className="grid size-11 place-items-center rounded-full hover:bg-sunk"><Icon name="close" size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <p className="rounded-[16px] bg-ai-soft px-4 py-3 text-[15px]">{sentence}</p>
        {ask.messages.length === 0 ? (
          <div className="mt-4 flex flex-col items-start gap-2">
            {suggestions.slice(0, 3).map((s) => (
              <button key={s} onClick={() => ask.send(s)} className="rounded-full border border-ai bg-surface px-4 py-2 text-left text-sm font-semibold transition-colors hover:bg-ai-soft">{s}</button>
            ))}
          </div>
        ) : <div className="mt-4"><ThreadBody ask={ask} /></div>}
      </div>
      <div className="space-y-2 border-t border-line p-4">
        <Composer ask={ask} />
        <ModelNote />
      </div>
    </section>
  );
}
