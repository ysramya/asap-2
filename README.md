# ASAP 2.0

AI-assisted personal productivity: *Know what matters. Know where to start. Make progress.*

Next.js (App Router) · TypeScript · Tailwind v4. All data stays in the browser (`localStorage`).

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint && npx tsc --noEmit
```

## Status
Implemented: Home (My Day), My Work (tasks, projects, inbox, completed, search, filter), Brain Dump,
task breakdown with approval, Focus (timer, Pomodoro, Start Assist, completion summary), Ask ASAP with
approval flow, Settings (theme, guidance, data), light and dark themes, responsive shell.

**Not connected:** there is no AI model. `src/lib/planner.ts` and `src/lib/assistant.ts` are rule-based, and the UI
says so. To integrate a model, add `/api/ai` and replace those two modules (`src/lib/ai.ts` holds the switch).

**Deferred:** Goals, task dependencies, Calendar, Insights, Notifications, accounts and sync.

See [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
