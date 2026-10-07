# Runway OS: App Blueprint

> One mobile web app for your **12-month runway model plan**, your **daily habits** and your **money**.
> Version 1.0 · October 2026 · Owner: Arun

---

## 0. Summary

| | |
|---|---|
| **What** | A personal tracker that turns your *Male Runway Model* plan into daily actions, and also tracks your habits and your money |
| **Type** | Mobile-first **web app (PWA)**. You open a link, tap *Add to Home Screen*, and it works like an app |
| **Tabs** | Today · Plan · Habits · Money · Progress |
| **Data** | Saves every time you tap. You can export a backup any time |
| **Look** | Clean and premium, in the same orange/black/cream style as your PDF, with light and dark mode |
| **Build** | 6 phases (see section 11) |

---

## 1. Why a web app (not a native app or Frappe)

| | **Web app (PWA)** ✅ | Native app (Play Store / App Store) | Frappe |
|---|---|---|---|
| Install | Link → *Add to Home Screen* | Store listing + review | Needs its own server |
| Android + iPhone | One app works on both | Two builds | Browser only |
| Speed to build | Fast | Slow | Heavy setup |
| Updates | Instant, no store update | Store update each time | Server deploy |
| Cost | Free hosting | Paid developer accounts | Server cost |
| Best for | **Personal trackers** ✅ | Big consumer products | Company ERP / business data |

**Decision:** Build a mobile-first PWA. Frappe is built for business systems like ERP and is too heavy for a personal tracker.

---

## 2. What the app has

### 2.1 Today (home screen)
Everything for today on one screen:

- **Header**: date, *Day 12 · Week 2 of 52 · Month 1*, and a greeting.
- **Today's score ring** (0–100%) with your **streak** and **this week's focus**, taken from your lowest Sunday score.
- **Today's session card**: the app picks it from your week plan (e.g., *Upper B · 7 exercises*). Tap it to start the workout.
- **Habit tiles**: tap to tick off. Counter habits have **+** buttons (water +250 ml, protein +10 g).
- **Progress bars** for water (3–4 L), protein (your target), steps (8–10k) and sleep (7–9 h).
- **Money strip**: what you spent today and how much is *safe to spend per day* for the rest of the month.
- **Smart cards** that show up only when needed: *"Re-measure day: 7 photos + tape"*, *"Sunday check: 15 min"* and *"Month 2 unlocked: test 3 haircuts"*.

### 2.2 Plan (your runway model plan from the PDF)

**a) 12-month roadmap**: 8 steps, each with a *Done when* check.

| # | When | Step | Done when |
|---|---|---|---|
| 1 | Day 1–3 | Baseline: measure body, 7 photos | You have start numbers + photos |
| 2 | Month 1 | Build habits: gym 4×/week, skincare AM+PM, posture, walk | Week plan done 4 weeks in a row |
| 3 | Month 2 | Grooming: test 3 haircuts + 3 beard styles, film your walk | You know your best hair + beard |
| 4 | Month 3 | First check: compare Month 0 vs Month 3 photos | Shoulders wider, waist same or smaller |
| 5 | Month 4 | Pose + style: 8 poses, 5 faces, 8 basic clothes, list agencies | You can pose without looking stiff |
| 6 | Month 5 | Digitals: shoot 6 digitals, pick 6–12 for portfolio | Digitals + small portfolio ready |
| 7 | Month 6 | Apply to real agencies + open castings | You applied to agencies |
| 8 | Month 7–12 | Experience: shows, test shoots, castings | You get real feedback and work |

Steps unlock month by month. Following the PDF's rule (*"Keep everything you started. Each month ADD one new thing."*), routines stack up and never disappear.

**b) This week**: the Mon–Sun plan:

| Mon | Tue | Wed | Thu | Fri | Sat | Sun |
|---|---|---|---|---|---|---|
| Upper A | Lower A + Core | Recovery (walk 30–40 + mobility 15) | Upper B | Lower B + Core | Cardio + Skills (cardio 30–45, posing 15, grooming check, walk 20) | Rest + Sunday check |

**c) Workout logger** (pre-loaded with every exercise from the PDF):

| Session | Exercises (sets × reps) |
|---|---|
| **Upper A** | Bench press 3×6–10 · Lat pulldown★ 3×8–12 · Shoulder press★ 3×8–10 · Seated cable row★ 3×8–12 · Lateral raise★ 3×12–15 · Biceps curl 2×10–12 · Triceps rope pushdown 2×10–12 |
| **Lower A + Core** | Squat 3×6–10 · Romanian deadlift 3×8–10 · Walking lunge 3×8–12/leg · Leg curl 3×10–15 · Calf raise 3×12–15 · Plank 3×30–60 s · Hanging knee raise 3×8–15 |
| **Upper B** | Incline DB press 3×8–12 · Pull-up★ 3×8–12 · Seated cable row★ 3×8–12 · Lateral raise★ **4**×12–15 · Rear-delt fly★ 3×12–15 · Biceps curl 2×10–12 · Triceps rope pushdown 2×10–12 |
| **Lower B + Core** | Squat or leg press 3×8–12 · Romanian deadlift 3×8–12 · Bulgarian split squat 3×8–12/leg · Leg curl 3×10–15 · Calf raise 3×12–15 · Core circuit 10 min (plank 40 s, side plank 30 s/side, dead bug 10, cable crunch 12, rest 30 s) |

- Each exercise shows **how to do it (3 steps)**, **what to avoid**, its **rest time** and a ★ if it's a priority (shoulders and back).
- You log **kg and reps** for each set. A **rest timer** starts on its own after you tick a set.
- Shows **last time's numbers** and **suggests the next weight** (rule in section 6).
- Tracks your **personal bests** for bench, squat and pulldown, which feed into Progress.
- The **10-min warm-up** comes first in every session.

**d) Guided routines**: step-by-step with a timer:

| Routine | Steps | Time |
|---|---|---|
| Posture drills | Wall hold 2×60 s → Chin tuck 2×10 → Wall angel 2×10 → Upper back roll 2×10 → Hip-front stretch 30 s/side → Plank 2×30–60 s | 10 min |
| Runway walk | Posture 3 → Walk the tape line 5 → Stop · hold 2 s · turn 5 → Film 4 → Watch video 3 | 20 min |
| Posing (Month 4+) | Face warm-up 2 → 8 poses × 2 photos 5 → 5 faces 3 → Free 3 → Pick best 3 2 | 15 min |
| Skincare AM | Face wash → Moisturiser → SPF 30–50 | 3 min |
| Skincare PM | Face wash → Treatment (only if needed) → Moisturiser | 3 min |
| Mobility | Knee-to-wall · 90/90 hip switch · Kneeling hip stretch · Towel leg raise · Open book · Doorway stretch | 10–15 min |

When you finish a routine, its habit gets ticked for you.

**e) Food**
- **Calorie target** = body weight × 32, then adjusted for your body type (skinny +250–300, average same, more fat −400–500).
- **Protein target** = 1.6–2.0 g per kg, worked out from your latest weight.
- **Veg / non-veg day plan** from the PDF (~2,300 kcal; 128 g / 141 g protein), with a meal-by-meal checklist.
- **Plate guide** (1 palm protein, 1 fist carbs, 2 fists veg, 1 thumb fat) and the weekly shopping list.

**f) Checklists**: Casting-ready check (Month 6, 4 groups) · Shoot-day checklist (8 items) · 8-piece wardrobe · 6 agency digitals · *"Is this agency real?"* 3-question check.

### 2.3 Habits

**Pre-loaded** from your weekly tick sheet:

| Habit | Type | Target | Schedule |
|---|---|---|---|
| Gym or cardio (as per plan) | ✓ | session done | Mon–Sat |
| Runway walk | ✓ | 15–20 min | 5× per week |
| Skincare morning | ✓ | 3 steps | Daily |
| Skincare night | ✓ | 3 steps | Daily |
| Posture drills | ✓ | 10 min | Daily |
| Protein target hit | counter | your g target | Daily |
| Steps | counter | 8–10k | Daily |
| Water | counter | 3–4 L | Daily |
| Sleep | number | 7–9 h | Daily |
| No junk / sweets | ✓ | – | Daily |

- **Add your own habits** (reading, meditation, no phone after 11 pm…) with an icon, a target and a schedule (daily, certain weekdays, or X times per week).
- Each habit has a **streak**, a **best streak** and a **12-week heatmap** (GitHub-style).
- There's also a **weekly grid** that looks like your printed tick sheet.
- Habits are grouped into **Model** and **Personal**.

### 2.4 Money

- **Quick add in 3 taps**: amount keypad → category → save. Payment method can be UPI, Cash, Card or Bank. Currency is **₹ INR**.
- **Income and expenses**, plus **transfers** between accounts.
- **Categories**: Food · Transport · Bills · Shopping · Entertainment · Health · **Gym & Supplements · Grooming & Skincare · Wardrobe · Portfolio & Castings** · Other. Income categories: Salary · Freelance · Modelling gigs.
- **Monthly budgets** per category, with progress bars and alerts at 80% and 100%.
- **Safe-to-spend per day** = (budget left) ÷ (days left this month).
- **Recurring entries** (gym membership, phone, subscriptions) get added automatically.
- **Savings goals** (e.g., *Portfolio shoot fund ₹15,000*), each with a progress ring.
- **"Career investment"** total: everything you spend on your model career, by month.
- **Charts**: spend by category (donut), daily spend (bars), income vs expense over 6 months (bars).
- **Search and filter** by date, category or account.

### 2.5 Progress

- **Sunday check (15 min)**: rate 10 areas from 1 to 10 (Physique, Posture, Skin, Hair + beard, Runway walk, Posing, Style, Sleep, Food, Confidence). The **lowest score becomes next week's focus**, and you write *one thing you will fix*.
- **Weekly log**: filled in automatically from your daily data (weight, waist, gym _/4, sleep average, protein _/7, cardio, walk practice, lowest score, notes).
- **Measurements every 4 weeks**: weight, waist, chest, shoulders, arm, thigh, best bench, best squat, best pulldown.
- **Progress photos**: the 7 standard photos (body front, side and back; face front, left and right; hair). There's a **side-by-side compare** with a slider for Month 0 vs Month 3 and so on.
- **Charts**: weight and waist trend, strength trend, habit consistency, Sunday scores radar.
- **Model card**: height 185 cm, chest · waist, shoe size, hair · eyes. You can share it as an image.
- **"Is it working?"** signals: Body ✓ Face ✓ Walk ✓ Pro ✓, matching the PDF's checks.

### 2.6 Onboarding and settings

- **First open (4 quick steps)**:
  1. Name + start date
  2. Height (185) + weight + body type
  3. Veg / non-veg
  4. Monthly budget
- **Settings**: profile, theme (light, dark or auto), units, currency, **export / import backup (JSON)**, reset.

---

## 3. Screens and navigation

```
Bottom tabs:  [ Today ]  [ Plan ]  [ Habits ]  [ Money ]  [ Progress ]
                            │          │           │            │
                            ├ Roadmap  ├ Today     ├ Overview   ├ Sunday check
                            ├ Week     ├ Heatmap   ├ Entries    ├ Weekly log
                            ├ Workout ▶├ Streaks   ├ Budgets    ├ Measurements
                            ├ Routines▶├ Add/edit  ├ Goals      ├ Photos + compare
                            ├ Food     │           ├ Recurring  ├ Charts
                            └ Lists    │           └ Accounts   └ Model card

(+) floating button on every tab → quick add: expense · income · water · protein · weight · note
⚙  top-right on Today → Settings
```

**Today screen (phone, 390 px):**

```
┌───────────────────────────────────┐
│ THU 8 OCT               Day 2 · W1│
│ Good evening, Arun              ⚙ │
│                                   │
│   ╭──────╮   Today's score  72%   │
│   │  72  │   Streak       5 days  │
│   ╰──────╯   Focus        Posture │
│                                   │
│ TODAY'S SESSION                   │
│ ┌───────────────────────────────┐ │
│ │ Upper B · 7 exercises · 70 m ▶│ │
│ └───────────────────────────────┘ │
│ HABITS                     7 / 10 │
│ [✓ Skin AM] [✓ Gym   ] [  Walk  ] │
│ [✓ Posture] [  Skin PM] [✓ Junk ] │
│ WATER    ███████░░░ 2.5/3.5 L  +  │
│ PROTEIN  ██████░░░░  96/130 g  +  │
│ STEPS    ███████░░░ 7.4k/10k   +  │
│ MONEY    ₹420 today · ₹310/day ok │
├───────────────────────────────────┤
│ Today  Plan  Habits  Money  Prog. │
└───────────────────────────────────┘
```

**Workout logger:**

```
┌───────────────────────────────────┐
│ ← Upper B              32:10   ⏸  │
│ 4 / 7   Lateral raise ★  4×12–15  │
│ Last time: 6 kg · 15 15 14 13     │
│ Next: stay 6 kg, beat 1 rep       │
│  SET    KG      REPS              │
│   1   [ 6 ]   [ 15 ]    ✓         │
│   2   [ 6 ]   [ 15 ]    ✓         │
│   3   [ 6 ]   [ 14 ]    ○         │
│   4   [ 6 ]   [ -- ]    ○         │
│ ┌ Rest 0:42 ─────────── skip ┐    │
│ How: stand tall, raise to shoulder│
│ Avoid: heavy weight, shrugging    │
│        [  Next exercise →  ]      │
└───────────────────────────────────┘
```

---

## 4. Architecture

### 4.1 Big picture

```
┌──────────────────────── YOUR PHONE (browser / home-screen app) ───────────────────────┐
│                                                                                        │
│  UI LAYER          Today · Plan · Habits · Money · Progress   (+ sheets, keypad, FAB)  │
│      │ user taps (tick, add, log)                         ▲ re-render changed parts    │
│      ▼                                                    │                            │
│  STATE STORE       one app state · actions · selectors · undo                          │
│      │                                                                                 │
│      ▼                                                                                 │
│  ENGINES (pure)    Schedule · Score · Streak · Progression · Nutrition · Budget ·      │
│                    Insights                                                            │
│      │                                                                                 │
│      ▼                                                                                 │
│  STORAGE ADAPTER   load() · save() · query() · export() · import()   ← one interface   │
│      ├── Online DB      (saved with the app's private page; same data on any device)   │
│      ├── IndexedDB      (on-phone cache for offline use + progress photos)             │
│      └── JSON backup    (export / import file)                                         │
│                                                                                        │
│  PLAN CONTENT      plan.json (read-only): roadmap, week split, exercises, routines,    │
│                    meals, checklists. All of it comes from your PDF                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Layers

| Layer | Job | Rule |
|---|---|---|
| **UI** | Draws screens, handles taps and swipes | No business logic here |
| **Store** | Holds app state and runs actions (`toggleHabit`, `addTransaction`, `logSet`…) | The only place where state changes |
| **Engines** | Do the maths: score, streaks, next weight, budget left… | Pure functions, easy to test |
| **Storage adapter** | Saves and loads records | Screens never talk to storage directly, so the backend can change later |
| **Plan content** | Your PDF, turned into structured data | Kept separate from your logs, so the plan can change without losing history |

### 4.3 Principles
1. **Instant**: every tap saves right away, with no spinners.
2. **Content ≠ data**: the plan is static JSON and your entries are data.
3. **One storage interface**: you can switch where data lives without rewriting screens.
4. **Mobile-first**: designed at 360–430 px; it still works on a laptop.
5. **Private by default**: only you can open it.

### 4.4 Example: what happens when you tap "Posture drills"
1. The UI calls `toggleHabit('posture', '2026-10-08')`.
2. The store sets `days['2026-10-08'].habits.posture = true`.
3. The engines recalculate: score 60% → 70%, posture streak 4 → 5.
4. The storage adapter saves that one day's record (batched every 300 ms).
5. The UI animates the ring and tile, gives a small vibration, and shows an *Undo* toast.

---

## 5. Data model

### 5.1 Your data (collections)

| Collection | One record = | Key fields |
|---|---|---|
| `profile` | You | name, heightCm (185), startDate, weightKg, bodyType, diet, currency, theme |
| `habits` | A habit definition | id, name, icon, group, type (check / counter / number), target, unit, schedule, order, archived |
| `days` | One calendar day | date, habit values, water_ml, protein_g, steps, sleep_h, mood, note, score |
| `workouts` | One gym session | date, session, exercises[ sets{kg, reps} ], minutes, notes |
| `measurements` | A 4-weekly check | date, weight, waist, chest, shoulders, arm, thigh, bestBench, bestSquat, bestPulldown |
| `photos` | One progress photo | date, pose (front / side / back / face / left / right / hair), image (compressed) |
| `reviews` | One Sunday check | weekStart, weekNo, 10 scores, lowest, fixOne, auto summary |
| `milestones` | Roadmap step 1–8 | status, doneAt, note |
| `checklists` | A ticked list | listId, items {key: true/false} |
| `transactions` | One money entry | type (expense / income / transfer), amount, category, account, date, note, career, recurringId |
| `categories` | A money category | name, icon, color, kind, monthlyBudget, career |
| `accounts` | Where money sits | name (Cash / Bank / UPI / Card), openingBalance |
| `recurring` | A repeating entry | template, frequency, nextDate |
| `goals` | A savings goal | name, target, saved, deadline |

### 5.2 Example records

```json
// days / 2026-10-08
{
  "date": "2026-10-08",
  "habits": { "gym": true, "walk": false, "skin_am": true, "skin_pm": false,
              "posture": true, "no_junk": true },
  "water_ml": 2500, "protein_g": 96, "steps": 7400, "sleep_h": 7.5,
  "mood": 4, "note": "Lateral raise felt strong", "score": 72
}
```

```json
// workouts
{ "id": "wk_0012", "date": "2026-10-08", "session": "upper_b", "minutes": 68,
  "exercises": [
    { "ex": "lateral_raise", "sets": [ {"kg": 6, "reps": 15}, {"kg": 6, "reps": 15},
                                       {"kg": 6, "reps": 14}, {"kg": 6, "reps": 13} ] }
  ] }
```

```json
// transactions
{ "id": "tx_8f2a", "type": "expense", "amount": 450, "category": "grooming",
  "account": "upi", "date": "2026-10-08", "note": "Sunscreen SPF 50", "career": true }
```

### 5.3 Plan content (`plan.json`, read-only)
`roadmap[8]` · `weekSplit[7]` · `sessions{upperA, lowerA, upperB, lowerB}` → exercises (sets, reps, rest, cues, avoid, priority★) · `routines{posture, walk, posing, skinAM, skinPM, mobility, coreCircuit, warmup}` · `nutrition{multiplier: 32, adjust, proteinPerKg: [1.6, 2.0]}` · `meals{veg, nonVeg}` · `checklists{castingReady, shootDay, wardrobe, digitals, agencyCheck}` · `rules{...}`

---

## 6. Core logic (the engines)

| Engine | Rule |
|---|---|
| **Schedule** | Day N = days since start date + 1. Week = ⌈N/7⌉ of 52. Month = from start date. It returns today's session, today's routines and the current roadmap step. **Missed a day?** You get the *next* session in order, and the app warns you if you try two gym sessions in one day (PDF rule). |
| **Score** | Daily score = habits done today ÷ habits scheduled today × 100. Counters give part credit (2.5 of 3.5 L = 0.71). 80%+ = *Great day*, 50–79% = *OK*, under 50% = *Missed*. |
| **Streak** | A habit streak counts scheduled days in a row that are done. Unscheduled days (like Sunday for gym) **don't break** it. The *Day streak* counts days in a row at 80% or more. |
| **Progression** | If **every set hit the top of the rep range**, it suggests **+2–2.5 kg** next time. If not, it suggests the same weight and beating your last session by 1 rep. If there's no progress for 3 weeks, it says *"Check sleep + protein, then eat a bit more."* Every 8–10 weeks it suggests an **easy week** (same exercises, half the sets). |
| **Nutrition** | Calories = weight × 32 + adjustment for body type. Protein = weight × 1.6–2.0 g. Every 2 weeks it compares your weekly average weight with your goal and suggests **±200 kcal** if you're off track. |
| **Budget** | Spent vs budget per category, with alerts at 80% and 100%. *Safe per day* = budget left ÷ days left. Recurring entries get added on their due dates. |
| **Insights** | Simple rules, no AI. Examples: *"Protein hit only 3/7 days"*, *"Food spend +25% vs last month"*, *"Best streak: Skincare AM (21 days)"*, *"Re-measure due in 2 days"*. |

---

## 7. Design system

### 7.1 Colours (based on your PDF)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FAF6F0` cream | `#0E0E10` | Page |
| `--surface` | `#FFFFFF` | `#1A1A1D` | Cards |
| `--surface-2` | `#FDE9DA` peach | `#26221F` | Highlight cards |
| `--ink` | `#18181B` | `#F4F1EC` | Main text |
| `--muted` | `#6B6B70` | `#A1A1AA` | Secondary text |
| `--accent` | `#E8650A` orange | `#FF7A1A` | Buttons, rings, active tab |
| `--success` | `#2F7D4F` | `#4CC38A` | Done / on track |
| `--danger` | `#C0392B` | `#FF6B5E` | Over budget / avoid |

### 7.2 Type and layout
- **Font:** Poppins (400 / 500 / 600 / 700 / 800), the same as your PDF. Numbers use tabular figures so they line up.
- **Scale:** Display 32 · H1 24 · H2 18 · Body 15 · Small 13 · Label 11 (uppercase, wide letter spacing).
- **Spacing:** 4-pt grid (4 · 8 · 12 · 16 · 24 · 32). Side gutter is 16 px.
- **Shapes:** Cards have a 16 px radius, buttons 12 px, and chips are fully rounded.
- **Bottom nav:** 64 px, plus space for the iPhone home bar.

### 7.3 Components
Score ring · Habit tile · Counter pill (+250 ml) · Stat tile · Progress bar · Heatmap · Set row (kg / reps / ✓) · Rest timer · Routine stepper with timer · Bottom sheet · Money keypad · Donut / bar / line charts (SVG) · Segmented control · Chips · Toast with Undo · Empty states.

### 7.4 Feel
- Animations run for 150–250 ms. The ring fills smoothly, a tick has a small bounce, and there's confetti when you hit 100% for the day.
- Phones that support it give a light vibration on each tick.
- Animations turn off if your phone is set to *reduce motion*.
- Tap targets are at least 44 px, and colour contrast meets AA. Every icon has a text label.

---

## 8. Tech stack

| Part | Choice | Why |
|---|---|---|
| UI | HTML + CSS + vanilla JavaScript (ES modules) | No framework overhead, so it opens fast on the phone |
| State | Small custom store (actions + subscribe) | Simple and predictable |
| Charts | Custom SVG (ring, donut, bars, line, heatmap, radar) | Light, on-brand, and works in light and dark |
| Font | Poppins via Google Fonts | Matches your PDF |
| Storage | Storage adapter → online DB + IndexedDB + JSON backup | Saved, works offline, can be switched later |
| Photos | Resized to ~1080 px, compressed JPEG (~200 KB) | Fast and light |
| Hosting | Private claude.ai page (start) → own static host (optional) | See section 10 |

---

## 9. Folder structure

```
runway-os/
├── index.html                 app shell + bottom nav
├── styles/
│   ├── tokens.css             colours, type, spacing (light + dark)
│   └── components.css         cards, tiles, sheets, charts
├── js/
│   ├── app.js                 boot + router (tabs, sub-screens)
│   ├── store.js               state, actions, undo
│   ├── storage/
│   │   ├── adapter.js         one interface
│   │   ├── online.js          online database
│   │   ├── idb.js             IndexedDB (cache + photos)
│   │   └── backup.js          export / import JSON
│   ├── engines/
│   │   ├── schedule.js   score.js   streak.js   progression.js
│   │   └── nutrition.js  budget.js  insights.js
│   ├── views/
│   │   ├── today.js  plan.js  workout.js  routine.js
│   │   ├── habits.js  money.js  progress.js  settings.js  onboarding.js
│   ├── components/
│   │   ├── ring.js  heatmap.js  charts.js  sheet.js
│   │   └── keypad.js  timer.js  toast.js  photo-compare.js
│   └── data/
│       └── plan.json          all PDF content as data
├── manifest.webmanifest       (option B) app name, icon, colours
└── sw.js                      (option B) offline cache
```

The code is written as modules and then **bundled into one file** for hosting.

---

## 10. Hosting, install, offline, backup

| | **Option A: Private claude.ai page** (start here) | **Option B: Own hosting** (later, optional) |
|---|---|---|
| Where | Private link on your claude.ai account | Netlify / Vercel / GitHub Pages (free tiers) |
| Data | Saved with the page + cached on your phone | On your phone (IndexedDB) + backup file; cloud sync can be added later |
| Offline | Best with internet | Full offline (service worker) |
| App icon | Home-screen shortcut | Own icon + splash screen, opens full-screen |
| Effort | Ready as soon as it's built | Extra setup step |

**Add to your phone**
- **Android (Chrome):** open the link → ⋮ menu → *Add to Home screen*.
- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.

**Backup:** Settings → *Export* downloads a `.json` file of all your data, and *Import* restores it. You'll get a reminder once a month.

---

## 11. Build plan

| Phase | What gets built | At the end you can… |
|---|---|---|
| **1. Foundation** | Design tokens, app shell, bottom nav, store, storage adapter, `plan.json` from the PDF, onboarding | Open the app, set up your profile |
| **2. Today + Habits** | Score ring, habit tiles, counters, streaks, heatmap, weekly grid, custom habits | Track your day |
| **3. Plan** | Roadmap, week view, workout logger (progression + rest timer), guided routines, food targets, checklists | Train from the app |
| **4. Money** | Quick add, categories, budgets, accounts, recurring, goals, charts | Track every rupee |
| **5. Progress** | Sunday check, weekly log, measurements, photos + compare, charts, model card | See your transformation |
| **6. Polish + launch** | Dark mode, animations, insights, backup, testing at 360–430 px, publish | Use it daily on your phone |

**How we work:** you approve this blueprint → I build it phase by phase → you test on your phone and send feedback → I fix and improve.

---

## 12. Quality checklist (definition of done)

- [ ] Works on Android Chrome and iPhone Safari, from 360 px to 430 px, with no sideways scrolling
- [ ] Every tap saves, and data survives closing and reopening the app
- [ ] Score, streak, progression, calorie and budget maths checked with test cases
- [ ] Export → reset → import gives back exactly the same data
- [ ] Light and dark mode both readable (AA contrast)
- [ ] All tap targets ≥ 44 px, and icons have labels
- [ ] The app opens and is usable in under 2 seconds on a mid-range phone
- [ ] All plan content matches the PDF (habits, week split, exercises, routines, rules)

---

## 13. Later (v2 ideas)

- Reminders (skincare 22:15, water, Sunday check)
- A weekly coach note written by Claude from your data
- Step import from Google Fit / Apple Health
- Expense import from bank SMS / UPI statements
- A shareable progress card (before / after image)
- Multi-device cloud sync for Option B

---

*Consistency beats intensity.*
