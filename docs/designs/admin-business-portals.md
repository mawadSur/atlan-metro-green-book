# Design: Admin Portal + Business Portal

Generated 2026-06-04. Decisions user-approved (D1/D2/D3 below). Builds on Phase 0 (`halal_status` columns).

## Decisions
- **D1 user mgmt = Full + create users.** Admin can view/edit/disable/delete AND create auth accounts. Requires a server-only `service_role` surface.
- **D2 onboarding = self-claim WITH admin approval.** Business requests a listing → moderation queue → admin approves before edit.
- **D3 scope = full build now** (admin + business + user management), AFTER Phase 0's migration lands (shared RLS/types).

## Roles (tamper-proof)
- New `profiles` table: `id uuid PK references auth.users(id) on delete cascade`, `role text not null default 'user' check (role in ('user','business','admin'))`, `email text`, `created_at`.
- `is_admin()` = `SECURITY DEFINER` SQL function returning `exists(select 1 from profiles where id = auth.uid() and role = 'admin')`. Used in RLS.
- **Role column is NOT writable by anon/authenticated** — only service_role (server actions) can change a role. A user editing their own profile cannot escalate. RLS `with check` excludes role, or role lives behind column privileges.
- **First-admin bootstrap:** lane S emits a one-time SQL snippet (`update profiles set role='admin' where id='<UID>'`) the human runs once. Never self-service.

## Surfaces
1. `/portal` (business owner) — browser + anon key, RLS-gated. Self-claim → queue → on approval edit FULL profile: hours_*, phone, prayer_space, has_wudu, womens_area, alcohol_on_premises, image_url, discount_code, discount_offer_*. NEVER halal_status/verified_by/verified_at (admin only).
2. `/admin` (admin only) — browser + anon key, `is_admin()` RLS. Edit ANY location; flip `halal_status→'verified'` with `verified_by` (admin name) + `verified_at`; approve/reject claim_requests; view all businesses/profiles. Delegates auth.users ops to (3).
3. **Server actions** (`web/src/lib/admin/`, SERVER ONLY) — hold `SUPABASE_SERVICE_ROLE_KEY` (server-only env var, NEVER `NEXT_PUBLIC_`). create / edit-email / reset-password / disable / DELETE auth users. Each call re-verifies `is_admin()` SERVER-SIDE before acting. Delete = typed confirm + irreversible. Soft-disable preferred. Every mutation writes an `audit_log` row.

## New tables
- `profiles` (roles) — above.
- `claim_requests` — `id, requester_uid, location_id, status (pending|approved|rejected), note, created_at, decided_by, decided_at`. RLS: requester inserts/sees own; admin sees/updates all.
- `audit_log` — `id, actor_uid, action, target_type, target_id, detail jsonb, created_at`. Admin-read; written by server actions + admin mutations.

## RLS changes (lane S, migration 0002)
- `locations`: keep public read + owner-update; ADD admin-update-all via `is_admin()`. Owner-update widened to the full profile column set BUT excludes halal_status/verified_by/verified_at (admin-only, enforced by column privileges or a restrictive policy).
- `businesses`: keep owner-manage; ADD admin-all.
- `profiles`, `claim_requests`, `audit_log`: new policies per above.
- Idempotent migration; apply to prod via Management API after security review. Update build-sql.mjs to match.

## Agent lanes (file-disjoint)
| Lane | Owns | Builds |
|---|---|---|
| S | supabase/migrations/0002_admin_roles.sql, scripts/build-sql.mjs | tables, is_admin(), RLS, role lock, bootstrap SQL |
| V | web/src/lib/admin/** (server-only), .env.example | service_role user CRUD + server-side admin guard + audit writes |
| B | web/src/app/portal/**, web/src/lib/auth.ts | self-claim + full profile editor |
| A | web/src/app/admin/** | location/verify/claims/users dashboards (calls V) |
| I | web/src/i18n/admin.ts (new), shared types in web/src/lib/types.ts (append-only, coordinated) | strings + shared types |

## Mandatory gate
Security review agent (privilege escalation, service_role client leak, missing server-side admin re-check, IDOR on location/user ids, role self-escalation) + typecheck + tests. Migration applied to prod by the human/lead, not an agent.

## Sequencing
Builds AFTER Phase 0 workflow completes and its migration 0001 is applied (shared RLS + types.ts). Two concurrent RLS rewrites would corrupt the security model.
