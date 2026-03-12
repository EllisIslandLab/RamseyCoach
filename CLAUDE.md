# RamseyCoach / Money-Willo — Claude Instructions

## Architecture
- **Pages Router** (not App Router). All pages go in `/pages`, API routes in `/pages/api`.
- **All Supabase calls go through `src/lib/dataService.ts`** — never call `supabase.from()` directly in a component.
- Wrap all Supabase calls in try/catch — never crash the UI on a sync failure.

## Key Conventions
- TypeScript throughout. No `any` types without a comment explaining why.
- Tailwind for all styling. No inline `style={}` except for dynamic values (e.g., calculated widths).
- Do not add `console.log` statements. Use existing error patterns (silent fail + return null/[]).
- Never commit `.env.local` or any file containing real secrets.

## Admin Role
- Admin access is gated by `user.app_metadata.role === 'admin'` (set via Supabase dashboard or service role).
- Admin API routes live in `/pages/api/admin/` and use the service role key.
- The admin UI lives at `/pages/admin/`. It checks auth client-side and redirects non-admins.

## Future Tech Debt (do not address unless asked)

### 1. getGlobalMerchants() — unbounded fetch
`src/lib/dataService.ts` — `getGlobalMerchants()` fetches the entire table with no limit.
Fine while the merchant list is small (~30 rows). If it grows past ~500 rows, switch to
server-side search or lazy-load by prefix match instead of fetching all on load.

### 2. user_transactions — no retention policy
`user_transactions` table has no TTL or row limit per user. Not an issue yet (transactions
aren't even persisted from the importer at time of writing). If that changes, add a cleanup
job or limit history to 12 months to avoid unbounded storage growth.

### 3. Supabase free tier API request headroom
Free tier = 50,000 requests/month. Current page load triggers 3–4 queries.
Safe up to ~130 daily active users. Monitor via `/api/admin/health` (see below).
Upgrade to Pro ($25/mo) if DAU consistently exceeds 100.

### 4. categorization_flags — no deduplication on new-merchant flags
Multiple users hitting the same unknown merchant each create a separate flag row.
Consider adding a UNIQUE constraint on `(flag_type, merchant_name)` with an
`occurrence_count` increment via upsert instead of insert, to collapse duplicates.
The `occurrence_count` column already exists — just needs the upsert logic.
