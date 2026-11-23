/**
 * AI boundary. The app works without a model: every surface falls back to the
 * built-in rules and says so. To connect a model, set ANTHROPIC_API_KEY on the
 * server and NEXT_PUBLIC_AI_ENABLED=true; requests go through /api/ai so the key
 * never reaches the browser.
 */
export const aiConfigured = () => process.env.NEXT_PUBLIC_AI_ENABLED === "true";
export const AI_NOTE = "Drafted with built-in rules. Connect a model to get tailored plans.";
export const MODEL_NOTE = "Written by an AI model from only the text you provided. Check it before relying on it.";

export type AiKind = "steps" | "draft-plan" | "draft-write" | "draft-check" | "draft-revise";
/** Calls the server route. Throws when the model is not configured or fails, so callers can fall back. */
export async function callAI<T = unknown>(kind: AiKind, input: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, ...input }) });
  if (!res.ok) throw new Error(res.status === 501 ? "not-configured" : `ai-${res.status}`);
  return (await res.json()) as T;
}
