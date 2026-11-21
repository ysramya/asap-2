"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { reply } from "@/lib/assistant";
import { newId } from "@/lib/planner";
import type { ChatAction, ChatMessage } from "@/types";

export function useAsk() {
  const { state, dispatch, toast, openDump } = useApp();
  const router = useRouter();
  const [thinking, setThinking] = useState(false);

  const send = (text: string) => {
    const v = text.trim();
    if (!v) return;
    const user: ChatMessage = { id: newId(), role: "user", text: v };
    dispatch({ type: "chat", messages: [user] });
    setThinking(true);
    window.setTimeout(() => { dispatch({ type: "chat", messages: [reply(v, state.tasks)] }); setThinking(false); }, 350);
  };

  const sendAndShow = (text: string) => { send(text); if (window.innerWidth < 1280 || !state.settings.askOpen) router.push("/ask"); };

  const run = (a: ChatAction) => {
    if (a.kind === "focus" && a.taskId) { dispatch({ type: "active", id: a.taskId }); router.push("/focus"); }
    else if (a.kind === "breakdown" && a.taskId) {
      const t = state.tasks.find((x) => x.id === a.taskId);
      if (t) send(`break down ${t.title}`);
    } else if (a.kind === "review" || a.kind === "plan") send("review my day");
    else if (a.kind === "dump") openDump();
  };

  const decide = (m: ChatMessage, ok: boolean) => {
    const p = m.proposal; if (!p) return;
    if (ok) {
      if (p.change.type === "setToday") dispatch({ type: "setToday", ids: p.change.taskIds });
      else dispatch({ type: "setSteps", id: p.change.taskId, steps: p.change.steps.map((s) => ({ ...s, id: newId(), done: false })) });
      toast("Applied. You can edit it any time.");
    }
    dispatch({ type: "patchMessage", id: m.id, patch: { proposal: { ...p, status: ok ? "approved" : "dismissed" } } });
  };
  return { send, sendAndShow, run, decide, thinking, messages: state.chat, guidance: state.settings.guidance };
}
