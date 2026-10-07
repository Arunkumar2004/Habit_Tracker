# Runway OS: build brief for area agents

Read `Runway_OS_App_Blueprint.md` (the spec) and this brief before writing code. The foundation is already built;
you build one area. Several agents work **in the same folder at the same time**, so file ownership is strict.

## Stack
Vite 6 + React 18 + TypeScript (strict) + Zustand. Plain CSS with design tokens. Custom SVG charts. Vitest for engines.
`npm run build` produces one self-contained `dist/index.html` (published later as a private claude.ai page).
No new npm dependencies. No network fetches at runtime (the page's CSP blocks them).

## Ownership (only create or edit files you own)

| Area | Owns |
|---|---|
| **A Today + Habits** | `src/features/today/**`, `src/engines/schedule.ts`, `src/engines/score.ts`, `src/engines/streak.ts`, their `*.test.ts` |
| **B Plan** | `src/features/plan/**`, `src/data/sessions.ts`, `src/data/routines.ts`, `src/data/food.ts`, `src/data/checklists.ts`, `src/engines/progression.ts`, `src/engines/nutrition.ts`, their tests |
| **C Money** | `src/features/money/**`, `src/engines/budget.ts`, its tests |
| **D Progress** | `src/features/progress/**` (Progress, Settings, Onboarding), `src/engines/insights.ts`, `src/lib/backup.ts`, `src/lib/image.ts`, their tests |
| **E Charts + tooling** | `src/ui/charts/**`, `src/ui/Confetti.tsx`, `scripts/**` |
| Orchestrator only | everything else: `src/types.ts`, `src/store/**`, `src/ui/kit.tsx`, `src/ui/Icon.tsx`, `src/styles/**`, `src/app/**`, `src/data/plan.ts`, `src/lib/date.ts`, `src/lib/format.ts`, `src/main.tsx`, config files |

Need a change in an orchestrator file (a new icon, a store action, a type field)? Do not edit it. Work around it
inside your area and list the request in your final report. Exception: you may read anything.

## Contracts (stub files exist; owners replace the body, keep every exported name and signature)
- `engines/schedule.ts` (A): `dayInfo(profile, date)`, `sessionFor(data, date)`, `isScheduled(habit, date, data)`
- `engines/score.ts` (A): `dayScore(data, date)`, `dayStreak(data, today)`
- `engines/budget.ts` (C): `todaySummary(data, date)`, `spendByCategory(data, month)`
- `engines/nutrition.ts` (B): `targets(profile)` → `{kcal, proteinMin, proteinMax, proteinTarget}`
- `ui/charts/index.tsx` (E): `Donut`, `Bars`, `Line`, `Radar`, `Heatmap`, `Sparkline` (props as declared)
- Feature entry points (each owner): `features/today/index.tsx` exports `todayScreens`, `habitsScreens`;
  `features/plan/index.tsx` exports `planScreens` (keys `default`, `workout`, `routine`, plus any you add);
  `features/money/index.tsx` exports `moneyScreens`; `features/progress/index.tsx` exports `progressScreens`,
  `settingsScreens` (key `settings`, shown under the Today tab) and `Onboarding`.
You may add more exports to files you own. Other areas may import your contract functions at any time, so keep the
stub signatures compiling while you work.

Cross-area facts:
- Built-in habit ids (`src/data/plan.ts`): `gym walk skin_am skin_pm posture protein steps water sleep no_junk`.
  The protein habit's real target is `targets(profile).proteinTarget` (nutrition engine), not `habit.target`.
- Finishing a workout ticks `gym` for that date; finishing a routine ticks its habit (posture → `posture`,
  walk → `walk`, skinAM → `skin_am`, skinPM → `skin_pm`). Use `useStore.getState().setHabit(date, id, true)`.
- Navigation: `navigate(tab, screen?, params?)`. Today's session card → `navigate('plan', 'workout', {session})`.
  Settings → `navigate('today', 'settings')`. Sunday check → `navigate('progress', 'sunday')` (D registers it).
- Dates are local `YYYY-MM-DD` (`lib/date.ts`). Money is rupees (`rupees()` in `lib/format.ts`).

## Store (`src/store/store.ts`)
`useStore(selector)`. Data lives in `s.data[collection][id]` (see `src/types.ts`; deleted records are removed).
Actions: `put(col, rec)`, `patch(col, id, partial)`, `remove(col, id)`, `patchDay(date, partial)`,
`setHabit(date, habitId, value)`, `bumpHabit(date, habitId, delta)`, `undo()`, `navigate()`, `back()`,
`showToast(msg, {undo:true})`, `openSheet(title, render)`, `closeSheet()`, `replaceAll(data)`.
`put` sets `updatedAt` for you. Every change saves on its own (IndexedDB + online). Ids: `uid('tx')` from `lib/format.ts`.
After a user change that can be undone, call `showToast('…', { undo: true })`.
Extension points (`src/store/registry.ts`): `registerSeeder(fn)` (idempotent, runs after load) and
`registerQuickAdd({id, label, icon, order, render(close)})` for the (+) button. Call them at module top level in
your area's `index.tsx` (or a file it imports).
Selectors: select the smallest slice you need; derive lists with `useMemo`. Never call `put` during render.

## UI
- Shared primitives in `src/ui/kit.tsx`: `Ring`, `Bar`, `Segmented`, `ScreenHeader`, `Empty`, `Field`, `haptic()`,
  `useLatest`. Icons: `<Icon name="…" />` from `src/ui/Icon.tsx` (see its names; unknown names show a dot).
- Shared classes in `src/styles/base.css` (`card`, `card-hi`, `list`, `list-item`, `btn btn-primary`, `chip`,
  `seg`, `input`, `field`, `label`, `section`, `section-head`, `pill pill-ok|warn|bad|mute`, `grid-2`, `grid-3`,
  `row`, `stack`, `muted`, `small`, `num`). Tokens in `src/styles/tokens.css`.
- Your own CSS: one file in your area (e.g. `src/features/money/money.css`), imported from your `index.tsx`.
  Prefix every class with your area: `td-` (A), `pl-` (B), `mn-` (C), `pg-` (D), `ch-` (E).
- Colours only through tokens (`var(--accent)` etc.); never a literal colour that works in one theme only.
  Both light and dark must read well.
- Mobile first: 360–430 px, no sideways page scroll, tap targets ≥ 44 px, every icon button has `aria-label`,
  `font-variant-numeric: tabular-nums` (`.num`) on numbers. Respect reduced motion (base.css already does).
- No `alert/confirm/prompt` (the page frame blocks them): build confirmations in the page (e.g. a second tap or a sheet).
- Copy: plain, short, active voice, as in the blueprint. No emoji. No lorem ipsum.
- A tool opens in a working state: empty states say what will appear and how to add the first one.

## Quality bar
- Engines are pure functions with Vitest tests in `*.test.ts` next to them (`npx vitest run src/engines/<file>`).
  Cover the blueprint's rules (section 6) with real numbers.
- `npx tsc --noEmit` must show **no errors in your files**. Other agents are mid-build, so errors in their files are
  expected: ignore them, never edit their files to fix them.
- Do not start a dev server or open a browser; the orchestrator runs the browser sweep.
- Write files as you go (a finished file at a time), so work is never lost.
- Final report (short): files created, what works, test results (command + pass count), any requests for orchestrator files.
