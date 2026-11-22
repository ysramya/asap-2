"use client";
import { useApp } from "@/lib/store";
import { pickToday } from "@/lib/planner";
import { useAsk } from "@/hooks/useAsk";
import { Button } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { Composer, ModelNote, ThreadBody } from "@/components/assistant/Thread";

export default function AskPage() {
  const { state, openDump } = useApp();
  const ask = useAsk();
  const first = pickToday(state.tasks, 1)[0];
  const starters = ["I have too much to do today. I don't know where to start.", "Review my day", ...(first ? [`Break down ${first.title}`] : [])];
  return (
    <div className="flex min-h-[calc(100dvh-14rem)] flex-col gap-6">
      <header>
        <p className="eyebrow">Your companion</p>
        <h1 className="display mt-2 text-5xl">AI Coach</h1>
        <p className="mt-2 max-w-xl text-lg text-muted">It reads your real tasks. Anything that changes your plan is shown to you first.</p>
      </header>
      <div className="flex-1">
        {ask.messages.length === 0 ? (
          <div className="flex flex-col items-start gap-3">
            {starters.map((s) => <button key={s} onClick={() => ask.send(s)} className="rounded-[14px] border border-ai bg-surface px-4 py-3 text-left transition-colors hover:bg-ai-soft">{s}</button>)}
            <Button variant="ghost" onClick={() => openDump()}><Icon name="plus" size={16} />Brain Dump instead</Button>
          </div>
        ) : <ThreadBody ask={ask} />}
      </div>
      <div className="sticky bottom-20 space-y-2 rounded-[16px] bg-bg/95 py-2 backdrop-blur md:bottom-4">
        <Composer ask={ask} placeholder="I need to finish my portfolio, email the recruiter…" />
        <ModelNote />
      </div>
    </div>
  );
}
