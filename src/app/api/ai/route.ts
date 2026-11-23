// Server-side bridge to the Anthropic Messages API. Inactive (501) until ANTHROPIC_API_KEY is set.
// Add authentication and a real rate limit before exposing this publicly: the in-memory limiter below is per instance only.
const MODEL = "claude-sonnet-5-5";
const MAX_IN = 14000;
const hits = new Map<string, number[]>();

const SYSTEM = `You help people who are overwhelmed turn work into small, concrete steps. Be calm, specific and brief. Never invent facts about the user; use only the text provided. Never claim to have sent messages or changed anything outside this conversation.`;

function prompt(b: Record<string, unknown>): { user: string; json: boolean; max: number } | null {
  const s = (k: string) => String(b[k] ?? "").slice(0, 12000);
  switch (b.kind) {
    case "steps":
      return { json: true, max: 1500, user: `Break this task into 3 to 6 steps, each doable in under 25 minutes.\nTask: ${s("title")}\nContext: ${s("notes")}\nReturn only JSON: {"steps":[{"text":"imperative, one action","minutes":number,"doneWhen":"observable finish line","why":"one sentence on why this step is here","confidence":"High|Medium|Low"}],"note":"one sentence on how you decided"}. Use Low confidence when the estimate depends on things you cannot know.` };
    case "draft-plan":
      return { json: true, max: 800, user: `Goal: ${s("goal")}\nNotes:\n${s("notes")}\nPlan a short working document that achieves the goal. Return only JSON: {"plan":["section title: what it will say", ...]} with 3 to 7 items.` };
    case "draft-write":
      return { json: false, max: 3000, user: `Write the document in Markdown following this plan, using only the notes provided and marking anything missing as "Open question".\nGoal: ${s("goal")}\nNotes:\n${s("notes")}\nPlan:\n${s("plan")}` };
    case "draft-check":
      return { json: true, max: 700, user: `Check this draft against the goal. Be strict about unsupported claims.\nGoal: ${s("goal")}\nNotes:\n${s("notes")}\nDraft:\n${s("doc")}\nReturn only JSON: {"ok":boolean,"issues":["short issue", ...]}.` };
    case "draft-revise":
      return { json: false, max: 3000, user: `Revise the draft once to fix these issues, changing nothing else. Return only the full revised Markdown.\nIssues:\n${s("issues")}\nDraft:\n${s("doc")}` };
  }
  return null;
}

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return Response.json({ error: "not-configured" }, { status: 501 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
  if (recent.length >= 40) return Response.json({ error: "rate-limited" }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "bad-request" }, { status: 400 });
  const p = prompt(body);
  if (!p || JSON.stringify(body).length > MAX_IN * 2) return Response.json({ error: "bad-request" }, { status: 400 });

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: p.max, system: SYSTEM, messages: [{ role: "user", content: p.user }] }),
  });
  if (!r.ok) return Response.json({ error: "upstream" }, { status: 502 });
  const data = (await r.json()) as { content?: { type: string; text?: string }[] };
  const text = data.content?.filter((c) => c.type === "text").map((c) => c.text).join("") ?? "";
  if (!p.json) return Response.json({ text });
  try {
    return Response.json(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
  } catch {
    return Response.json({ error: "unparseable" }, { status: 502 });
  }
}
