# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Architecture

**Personal accountability tracker** — a Next.js 16 / React 19 / TypeScript app for logging weekly reviews and monthly finances. Two routes:

- `/` — Dashboard: reads from localStorage and displays current week's strategy pulse + savings fund progress + history tables
- `/review` — Two-tab form: "Weekly" tab (`CurrentWeek` component) and "Monthly" tab (`FinanceCard` component)

### Data Layer

All app state lives in `localStorage` under key `weekly_review_data_v1` as an `AppData` object (`src/lib/types.ts`):

```ts
AppData = { weeks: Record<string, WeekData>, months: Record<string, MonthlyData> }
```

Every write goes through `saveData()` in `src/lib/storage.ts`, which auto-syncs to Supabase (`src/lib/supabase.ts`) and fires a `storage-update` custom window event that dashboard listeners use to re-render without a page reload.

**Week keying**: weeks are keyed by the Sunday date (`YYYY-MM-DD`) that ends the week. `getWeek()` in `storage.ts` finds the first non-submitted week starting from today, advancing through already-submitted weeks.

**Month keying**: months are keyed as `YYYY-MM`. `getMonth()` applies inline migrations (e.g., old `utilities` field → `water`/`internet`/`electricity` split).

### Key Files

| File | Role |
|------|------|
| `src/lib/types.ts` | All TS interfaces — `WeekData`, `MonthlyData`, `AppData`, `DebtEntry`, etc. |
| `src/lib/constants.ts` | `as const` arrays for pill-group options (JOB_PROGRESS, DECISION, FRONTEND) |
| `src/lib/storage.ts` | CRUD + derived helpers (`getTotalEmergencyFund`, etc.) |
| `src/lib/hooks/useWeekStorage.ts` | React hook that wraps `getWeek` + `saveData` |
| `src/lib/statusCalculators.ts` | `getLeverageState`, `getHealthState`, `getWealthState` → STABLE/MONITORING/ACTION REQUIRED |
| `src/lib/utils.ts` | Pure math helpers (`monthsRemaining`, `calculateProgress`) |
| `src/components/CurrentWeek.tsx` | Weekly review form using `useWeekStorage`; submits by setting `week.submitted = true` |
| `src/components/FinanceCard.tsx` | Monthly finance form (income, expenses, debts, savings allocations) |

### Weekly Verdict Logic

Computed in both `CurrentWeek.tsx` and `page.tsx` (dashboard):

- **"Do better"** — Training (`strategy.energy`) < 2
- **"Partial progress"** — Energy ok but missing job progress or frontend output
- **"On track"** — All three standards met

### Financial Goals (hardcoded constants)

- Emergency Fund: **1,350,000 KES** (lifestyle locked below 400,000 KES)
- Car Fund: **1,500,000 KES**
- Travel Buffer: **1,500 USD**
- Monthly minimum targets: 50,000 KES emergency, 250 USD travel

Currency: KES for most values, USD for travel fund. Exchange rate constant: `KES_TO_USD = 130`.

### Styling

Glassmorphism design system defined in `src/app/globals.css`. Key CSS utilities:
- `.glass-panel` — frosted glass card (used heavily throughout)
- `.text-label` — uppercase small caps label style
- `.badge-selected` / `.badge-unselected` — pill toggle states

Styling is done via **inline `style` props** (not Tailwind or CSS modules, except `SelectInput.module.css`). The global font is Nunito, loaded via `next/font` in `layout.tsx`.

### WeekData Legacy Fields

`WeekData` has legacy top-level fields (`jobProgress`, `decisionOwnership`, `frontendOutput`) that have been superseded by the `strategy` object (`{ leverage, decision, frontend, energy }`). Both exist in storage; components always check `week.strategy` first and fall back to legacy arrays when displaying history.
