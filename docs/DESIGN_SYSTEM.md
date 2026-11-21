# ASAP 2.0 Design System

Tokens live in `src/app/globals.css` (CSS variables) and are exposed to Tailwind via `@theme inline`.
Light is the default; `[data-theme="dark"]` swaps values only. Components use semantic tokens, never raw hex.

## Color
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | #FAF7F2 (Warm Ivory) | #15122A | Canvas |
| `--surface` | #FFFFFF | #201C3A | Elevated surfaces |
| `--surface-sunk` | #F3EFE8 | #1A1632 | Wells, segmented controls |
| `--ink` | #252044 (Deep Indigo) | #F1EEF8 | Text, headings |
| `--muted` | #6B6780 | #AAA6BF | Secondary text |
| `--action` | #3F6F4B | #6FA77C | Primary actions, focus, progress (Botanical Green) |
| `--action-soft` | #DCE8D9 (Soft Sage) | #22352A | Selected / supportive surface |
| `--ai` / `--ai-soft` | #C8B5ED / #EFE9FA | #C8B5ED / #2C2650 | Everything AI |
| `--warm` / `--warm-soft` | #F2C6AD / #FBECE3 | same / #3A2C34 | Occasional highlight (priority, break prompt) |

Deviations from the brief, made for WCAG 2.2 AA: muted text is `#6B6780` (brief `#77738A` was 4.4:1 on ivory) and the
button green is `#3F6F4B` (brand `#4F805B` was 4.4:1 with white text). The brand values remain in `--green` and `--muted` references in the brief.

Rules: green = action, focus, positive progress. Lavender = AI only. Peach = rare warmth. Status is never color-only
(priority has a text label, done has a check mark and strikethrough).

## Type
Manrope (UI), Instrument Serif (`.display`: greeting, page titles, next step), JetBrains Mono (`.tnum`: timer, durations).
`.eyebrow` is the small uppercase label. Secondary text is 14px minimum.

## Spacing, radius, elevation, motion
- 4-based scale, in practice 4/8/16/24/32/40/48/64/80.
- Radius: 8 controls, 10 inputs, 14–16 cards, 24 feature surfaces.
- Shadows `--shadow-1/2/3`.
- Motion: 160ms micro, 260ms drawer, 300ms page. `prefers-reduced-motion` disables all of it.

## Components (`src/components`)
| Area | Component | Notes |
|---|---|---|
| ui | `Button` (primary, brand, secondary, ghost, ai; loading, disabled) | 44px min touch target |
| ui | `Checkbox`, `Meta`, `ProjectLabel`, `PriorityMark`, `Card`, `Logo`, `Motif` | `Motif` is the signature landscape form |
| ui | `Overlay` (modal / drawer, focus trap, Esc), `ConfirmDialog`, `Toasts` (with Undo) | |
| ui | `EmptyState`, `ErrorState`, `Skeleton` | |
| navigation | `AppShell` | Sidebar (desktop), icon rail (tablet), bottom nav (mobile), Ask panel / drawer |
| tasks | `TaskRow`, `QuickCapture` | Expandable details, step breakdown preview |
| modals | `BrainDump` | Capture → review → save |
| assistant | `AskPanel`, `Thread` (messages, proposals, composer) | |
| app | Home, My Work, Focus (timer, Pomodoro, Start Assist, summary), Ask, Settings | |

## Behaviour contracts
- Nothing the assistant proposes changes data until the user approves it (proposal cards).
- Guidance level (Settings): Suggest = no apply button, Assist = approve each change, Execute = behaves like Assist until an integration exists.
- Due dates are only set when the user names a day.
