# Money-Willo Implementation Status

## Part 1: Smart Categorization & Transaction System

### ✅ Completed

#### Infrastructure
- **`supabase/migrations/001_categorization_system.sql`** — All tables created and seeded, RLS policies applied
  - Global tables: `global_categories` (12), `global_subcategories` (30+), `global_merchants` (30+ national brands)
  - User tables: `user_transactions`, `user_custom_categories`, `user_category_overrides`
  - Admin table: `categorization_flags` (service role only — no client access)
- **`SUPABASE_SERVICE_ROLE_KEY`** added to `.env.local` ✅
- Migration SQL run in Supabase dashboard ✅
- Admin role set on account via SQL ✅

#### Code
- **`src/lib/dataService.ts`** — Central data service layer; all Supabase calls go here (never directly in components)
- **`src/lib/categorization.ts`** — `resolveCategory`, `checkForDuplicate`, `buildFlagPayload`, module-level flag queue
- **`src/pages/api/flags.ts`** — Beacon endpoint; receives flag queue on page unload, deduplicates by `occurrence_count`
- **`src/pages/api/admin/flags.ts`** — Admin-only flags API; verifies `app_metadata.role === 'admin'`
- **`src/components/TransactionPanel.tsx`** — Transaction entry form + monthly history table with inline edit
- **`src/components/CategoryManager.tsx`** — Modal for managing custom categories with duplicate warnings
- **`src/pages/admin/flags.tsx`** — Admin portal; redirects non-admins to `/tools`
- **`src/pages/tools.tsx`** — Added "Transactions" tab wiring in `TransactionPanel`
- **`src/components/BudgetPlanner.tsx`** — Added `TxIndicator` per section showing logged spend vs budgeted (green/yellow/red)

#### Features Working (pending test confirmation)
- Merchant typeahead from `global_merchants` table
- Auto-categorization with "Auto-categorized ✓" badge
- Unknown merchant prompt when no match found
- User category override saved on diverge from auto-suggestion
- Flag queue collected silently, flushed via `navigator.sendBeacon` on page unload
- Duplicate category detection with gentle warning (never blocks)
- Inline edit of category/subcategory on any transaction row
- Budget planner shows transaction count + spend per section this month
- Admin portal: approve / reject / merge flags with `occurrence_count` deduplication

---

### ⚠️ Needs Testing

#### Critical Path (test in this order)
1. **Sign in** → open Budget Planner tab → verify no errors loading
2. **Transactions tab** → log a transaction with a known merchant (e.g. "Walmart")
   - Confirm typeahead dropdown appears
   - Confirm "Auto-categorized ✓" badge shows and category pre-fills
3. **Log a transaction with an unknown merchant**
   - Confirm "We don't recognize this merchant" prompt appears
   - Manually select a category and save
4. **Open Budget Planner** → expand Fixed Costs section
   - Confirm `TxIndicator` appears under a section with matching logged transactions
5. **Category Manager** → create a custom category with a name similar to an existing one
   - Confirm duplicate warning appears but doesn't block saving
6. **Page unload** → navigate away after logging transactions
   - Confirm `/api/flags` receives a POST (check Supabase `categorization_flags` table via dashboard)
7. **Admin portal** → visit `/admin/flags`
   - Confirm flags table loads
   - Test approve / reject / merge actions

#### Known Gap (not yet implemented)
- **Transaction history filtering** — The spec called for a "filterable list" (by category, date range). Currently shows an unfiltered table for the current month. Low priority but not done.

---

---

## BudgetPlanner Refactor

### ✅ Completed

#### Dynamic Subsection Headers
- New `SubsectionData` interface: `{ id: string; label: string; rows: AmtRow[] }`
- Replaced 7 hardcoded state variables (`mortRows`, `autoRows`, etc.) with `fixedSubs: SubsectionData[]` and `varSubs: SubsectionData[]`
- `EditableSubHeader` component: inline pencil-icon editing, rename in place
- "+ Add Subsection" button per section (Fixed Costs / Variable Spending)
- Remove subsection button (with confirmation via undo stack)
- `dfFixedSubs()` / `dfVarSubs()` factory functions with backward-compatible migration from old localStorage format
- Subsections added in Compare Months view sync back to Budget Planner via `onAddFixedSub`/`onAddVarSub` callbacks

#### Undo Stack
- `BudgetUndoSnapshot` type captures full `fixedSubs` + `varSubs` + `sinksLabel` state
- Up to 20 snapshots stored in `undoStack`
- `pushUndo` called before any destructive action
- Undo button in action bar (grayed out when stack empty)

#### Row Selection + Bulk Actions
- Checkbox column on left of each budget row
- `selectedKeys: Set<string>` state (keys are `${sectionType}-${subId}-${rowId}`)
- Floating bulk action bar fixed to bottom of screen when any rows selected
- **Move**: select rows → click Move → click "+ Add Row" target subsection
- **Delete**: bulk removes all selected rows after pushing undo snapshot

#### Drag and Drop
- HTML5 native drag-and-drop (no external library)
- Drag handle icon (⠿) on left of each row
- Reorder within same subsection
- Move row to different subsection by dropping on a row there

#### Compare Months Redesign
- Removed `StartMonthModal` entirely
- Year dropdown (defaults to current year) + 12-month tab grid always visible
- Finds existing `MonthData` by label or creates empty entry on demand
- Quick tools toolbar: Save / Download / Print / Undo / Reset — all functional via props
- Subsections added here sync to parent Budget Planner

#### Build Status
- `npx tsc --noEmit` — clean, zero errors
- `npm run build` — clean, `/tools` bundle 162 kB

---

### 🔜 Not Started

## Part 2: PWA Shell

Per spec notes — **check `next.config.js` carefully before this runs; existing config must not be overwritten.**

#### Steps
1. Install `next-pwa` as dev dependency
2. Wrap existing `next.config.js` with `withPWA` — `disable: process.env.NODE_ENV === 'development'`
3. Create `public/manifest.json` (name, short_name, start_url: `/tools`, display: `standalone`, brand colors)
4. Create placeholder icons at `public/icons/192x192.png` and `public/icons/512x512.png`
5. Add `<link rel="manifest">` and `<meta name="theme-color">` to `src/pages/_document.tsx`
6. Add "Install App" button to `/tools` page header
   - Listens for `beforeinstallprompt` event
   - Hidden if already installed or browser doesn't support
   - iOS fallback tooltip: "Tap the Share button and select 'Add to Home Screen'"
7. No offline/custom caching — default next-pwa precaching only

---

## Environment Variables

| Variable | Purpose | Status |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client key | ✅ Set |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; flags API + admin API | ✅ Set |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` | Bot protection on signup | ⏸ Commented out (disabled) |
| `RESEND_API_KEY` | Budget email delivery | ✅ Set |
| `RESEND_FROM_EMAIL` | Sender address | ✅ Set |
| `AIRTABLE_API_TOKEN` | Bookings / testimonials | ✅ Set |

---

## Supabase Tables

| Table | Type | Status |
|---|---|---|
| `user_tool_data` | User (existing) | ✅ Existing — untouched |
| `global_categories` | Global / admin-managed | ✅ Created + seeded |
| `global_subcategories` | Global / admin-managed | ✅ Created + seeded |
| `global_merchants` | Global / admin-managed | ✅ Created + seeded |
| `user_transactions` | User (RLS) | ✅ Created |
| `user_custom_categories` | User (RLS) | ✅ Created |
| `user_category_overrides` | User (RLS) | ✅ Created |
| `categorization_flags` | Admin only (service role) | ✅ Created |

---

## Architecture Notes

- **All new Supabase calls go through `src/lib/dataService.ts`** — never `supabase.from()` directly in a component
- The existing calculator save in `tools.tsx` and budget save in `BudgetPlanner.tsx` still use direct Supabase calls — these were intentionally left as-is (pre-existing code, not in scope)
- Flag flushing fails silently by design — users never see flag-related errors
- hCaptcha is installed but fully commented out in `AuthModal.tsx` — re-enable by uncommenting and setting env var + enabling in Supabase dashboard
