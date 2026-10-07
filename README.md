# Runway OS

A personal, mobile-first web app for a **12-month runway model plan**, **daily habits** and **money**.
It installs on a phone like an app, works offline, and keeps your data on your device.

Spec: [`MD/Runway_OS_App_Blueprint.md`](MD/Runway_OS_App_Blueprint.md). Build notes for contributors: [`MD/BUILD-BRIEF.md`](MD/BUILD-BRIEF.md).

## What it does

| Tab | What you get |
|---|---|
| **Today** | Day / week / month of the plan, today's score ring and streak, today's session, habit tiles, water / protein / steps / sleep counters, money left for today, cards that show up only when relevant (re-measure day, Sunday check, new month) |
| **Plan** | 8-step roadmap, Mon–Sun week, workout logger (sets, kg, reps, rest timer, next-weight suggestion, personal bests), guided routines with timers, calorie and protein targets, veg / non-veg day plans, checklists |
| **Habits** | Built-in and custom habits, streaks and best streaks, 12-week heatmap, weekly tick sheet |
| **Money** | 3-tap quick add (₹ INR), categories and budgets with 80% / 100% alerts, safe-to-spend per day, accounts and transfers, recurring entries, savings goals, career-investment total, charts |
| **Progress** | Sunday check (10 areas, lowest becomes next week's focus), weekly log, measurements every 4 weeks, progress photos with side-by-side compare, model card, simple rule-based insights |

Also: 4-step onboarding, light / dark / auto theme, export and import a JSON backup, undo on every change.

## Stack

- **Vite 6 + React 18 + TypeScript** (strict)
- **Zustand** for app state; pure "engines" for all the maths (score, streak, schedule, progression, nutrition, budget, insights)
- Plain CSS with design tokens (light and dark), Poppins from Google Fonts
- Custom SVG charts (donut, bars, line, radar, heatmap, sparkline)
- **Vitest** for the engines (144 tests)
- PWA: web app manifest + service worker for offline use
- Storage: IndexedDB on the device. Inside the private claude.ai page it also saves online through that page's database.

## Run it locally

Needs Node 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5199. The first screen is onboarding.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on port 5199 |
| `npm run build` | Type-check, then build the installable web app into `dist/` (what Vercel serves) |
| `npm run build:artifact` | Build one self-contained HTML file, `dist-artifact/runway-os.html`, for the private claude.ai page |
| `npm test` | Run all Vitest tests |
| `npm run typecheck` | `tsc --noEmit` |
| `python scripts/make-icons.py` | Redraw the app icons in `public/icons/` (needs Pillow) |

## Project layout

```
index.html                 app shell (meta, manifest, fonts)
public/                    manifest, service worker (sw.js), icons, favicon
src/
  main.tsx                 boot: load storage, seed defaults, register the service worker
  app/                     shell: tabs, routing, quick-add (+), sheets, toasts
  store/                   Zustand store (the only place state changes), storage adapter, extension registry
  engines/                 pure maths + tests: schedule, score, streak, progression, nutrition, budget, insights
  data/                    plan content: roadmap, week split, sessions, routines, food, checklists
  features/
    today/                 Today + Habits
    plan/                  Roadmap, week, workout logger, routines, food, lists
    money/                 Money overview and sub-screens, keypad, seed data
    progress/              Progress, Sunday check, measurements, photos, model card, settings, onboarding
  ui/                      shared components, icons, charts, confetti
  styles/                  design tokens and base styles
  lib/                     dates, formatting, backup, image compression
scripts/                   make-artifact.mjs, make-icons.py
```

## Deploy (GitHub + Vercel)

1. Push this repo to GitHub.
2. On [vercel.com](https://vercel.com): **Add New → Project → Import** this repository.
3. Vercel reads `vercel.json` (framework Vite, build `npm run build`, output `dist`). Click **Deploy**.
4. Every push to `main` deploys again on its own.

From the command line instead: `npx vercel` (preview) and `npx vercel --prod` (live).

## Install on your phone

- **Android (Chrome):** open the site → ⋮ menu → **Add to Home screen** (or **Install app**).
- **iPhone (Safari):** open the site → Share → **Add to Home Screen**.

It opens full screen with its own icon and works offline after the first visit.

## Your data

- Everything you enter is saved on your phone (IndexedDB). It does not leave the device.
- Data does **not** sync between devices or between the Vercel app and the claude.ai page.
- **Back up once a month:** Settings → Export backup saves a `.json` file. Settings → Import backup restores it
  (also how you move data to a new phone).
- Clearing the browser's site data for the app deletes your entries, so keep a recent backup.
