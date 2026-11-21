/**
 * AI boundary. ASAP 2.0 ships without a model integration configured.
 * `aiConfigured()` is the single switch every surface checks so that nothing
 * pretends an AI action ran. To connect a model, add an API route at
 * /api/ai and set NEXT_PUBLIC_AI_ENABLED=true.
 */
export const aiConfigured = () => process.env.NEXT_PUBLIC_AI_ENABLED === "true";
export const AI_NOTE = "Drafted with built-in rules. Connect a model to get tailored plans.";
