"use client";
import { useEffect, useRef, useState } from "react";
import { Button, cx } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { useAsk } from "@/hooks/useAsk";
import { aiConfigured } from "@/lib/ai";

export function ChatMessageView({ m, ask }: { m: ReturnType<typeof useAsk>["messages"][number]; ask: ReturnType<typeof useAsk> }) {
  const mine = m.role === "user";
  return (
    <div className={cx("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
      <div className={cx("max-w-[92%] whitespace-pre-line rounded-[16px] px-4 py-3 text-[15px] leading-relaxed", mine ? "bg-brand text-brand-ink" : "bg-ai-soft text-ink")}>
        {m.text}
      </div>
      {m.proposal && (
        <div className="w-full max-w-[92%] rounded-[16px] border border-ai bg-surface p-4">
          <p className="eyebrow">Proposed change</p>
          <p className="mt-1 font-bold">{m.proposal.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-muted">{m.proposal.detail}</p>
          {m.proposal.status === "pending" ? (
            <div className="mt-3 flex gap-2">
              {ask.guidance === "suggest" ? (
                <p className="text-sm text-muted">Guidance is set to Suggest, so ASAP won&apos;t apply this. <button className="font-bold underline" onClick={() => ask.decide(m, false)}>Dismiss</button></p>
              ) : (
                <>
                  <Button size="sm" variant="primary" onClick={() => ask.decide(m, true)}>Approve</Button>
                  <Button size="sm" onClick={() => ask.decide(m, false)}>Not now</Button>
                </>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm font-semibold text-muted">{m.proposal.status === "approved" ? "✓ Applied" : "Dismissed"}</p>
          )}
        </div>
      )}
      {m.actions && (
        <div className="flex flex-wrap gap-2">
          {m.actions.map((a) => <Button key={a.label} size="sm" variant="ai" onClick={() => ask.run(a)}>{a.label}</Button>)}
        </div>
      )}
    </div>
  );
}

export function Composer({ ask, placeholder = "Ask ASAP anything…" }: { ask: ReturnType<typeof useAsk>; placeholder?: string }) {
  const [v, setV] = useState("");
  const submit = (e: React.FormEvent) => { e.preventDefault(); ask.send(v); setV(""); };
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <label className="sr-only" htmlFor="ask-input">Message ASAP</label>
      <textarea id="ask-input" value={v} rows={1} placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask.send(v); setV(""); } }}
        className="min-h-11 flex-1 resize-none rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[15px] placeholder:text-muted" />
      <Button type="submit" variant="brand" disabled={!v.trim()} aria-label="Send"><Icon name="arrow" size={18} /></Button>
    </form>
  );
}

export function ThreadBody({ ask }: { ask: ReturnType<typeof useAsk> }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [ask.messages.length, ask.thinking]);
  return (
    <div className="flex flex-col gap-4" role="log" aria-live="polite">
      {ask.messages.map((m) => <ChatMessageView key={m.id} m={m} ask={ask} />)}
      {ask.thinking && <div className="skeleton h-10 w-40 rounded-[16px]" aria-label="ASAP is replying" />}
      <div ref={end} />
    </div>
  );
}

export function ModelNote() {
  return <p className="text-xs text-muted">{aiConfigured() ? "Model connected." : "No AI model is connected yet. Replies use built-in rules and your real task list."}</p>;
}
