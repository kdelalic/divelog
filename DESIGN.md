# Subsurface Web — Completion Design Document

Status: Draft for review
Scope: The work required to take the project from its current state to a deployable, multi-user dive log application.

---

## 1. Overview

Subsurface Web is a dive log application with a React/TypeScript frontend and a Go/Gin backend on PostgreSQL 17. The core architecture is in place and healthy: CRUD for dives and dive sites, UDDF/CSV import, dive profile charts, equipment management, unit-aware settings, and a tested repository layer on the backend.

What remains falls into four phases:

| Phase | Theme | Outcome |
|-------|-------|---------|
| 1 | Close the model/UI gap | Users can enter and view all data the backend already supports |
| 2 | Authentication & multi-user | Real accounts replace the hardcoded dev user |
| 3 | Deployment readiness | Dockerfiles, CI, environment-based configuration |
| 4 | Polish | Frontend tests, chart interactivity, export/backup |

Phases are ordered by dependency: Phase 1 is self-contained; Phase 2 is a prerequisite for any public deployment; Phase 3 depends on Phase 2's configuration decisions; Phase 4 is incremental and can be interleaved.

---

## 2. Current State

### 2.1 What works

- **Backend** (`apps/backend/`): Gin server with layered architecture (handlers → repositories → PostgreSQL). Endpoints under `/api/v1/` for dives (including batch create for imports), dive sites (with search), and settings. Middleware for request IDs, security headers, rate limiting (100 req/min), request size limits, structured logging, and CORS. Handler and repository test suites exist.
- **Database** (`apps/backend/init.sql`): `users`, `user_settings`, `dive_sites`, `dives`. The `dives` table already has `samples`, `equipment`, `conditions`, `safety_stops` (JSONB with GIN indexes), `dive_type` (CHECK constraint), and `rating` (1–5 CHECK constraint).
- **Frontend** (`apps/frontend/`): Pages for dive log, add/edit dive, map (Leaflet), dive sites, settings. Dive detail modal with profile chart (depth/temperature/pressure from UDDF samples), equipment tab, and SAC calculations. Equipment form with multi-tank, gas mix, and full unit conversion. Zustand stores with an in-memory offline queue.

### 2.2 Known defects (fix during Phase 1)

These were found while auditing the code and should be fixed because Phase 1 touches the same files:

1. **Conditions shape mismatch (data loss bug).** The frontend `DiveConditions` type (`src/lib/dives.ts`) is nested camelCase:
   ```ts
   { waterTemp: { surface, bottom }, current: { strength, direction }, seaState, ... }
   ```
   while the backend (`models/dive.go`) and the JSONB column expect flat snake_case:
   ```go
   { water_temp_surface, water_temp_bottom, current_strength, current_direction, sea_state, ... }
   ```
   Any conditions data sent today is silently dropped on serialization. The frontend type must be rewritten to match the wire format (see §3.2).

2. **Fabricated notes in the detail modal.** `DiveDetailModal.tsx` renders a hardcoded placeholder paragraph ("Water conditions were perfect…") in the Notes tab instead of `dive.notes`. Real notes exist in the model end-to-end but are never shown or editable.

3. **Hardcoded API URL.** `src/lib/api.ts` pins `API_BASE_URL` to `http://localhost:8080`. Must move to `import.meta.env.VITE_API_URL` (Phase 3 depends on it, but it's a one-line fix worth doing in Phase 1).

4. **Duplicated temperature/visibility fields.** The `Dive` model has legacy top-level `water_temperature` and `visibility` columns *and* the same data inside the `conditions` JSONB. Decision: treat `conditions` as the source of truth for new UI; keep the legacy columns read-only for already-imported data and migrate later (out of scope for Phase 1).

5. **Offline queue is in-memory only.** `diveStore.ts` queues failed operations but loses them on refresh. The README promises localForage/IndexedDB persistence. Deferred to Phase 4.

---

## 3. Phase 1 — Close the Model/UI Gap

**Goal:** every field the backend persists is enterable in Add/Edit Dive and visible in the detail modal. No backend changes are required (the API and schema already support everything).

### 3.1 New form sections

`AddDive.tsx` and `EditDive.tsx` currently share an identical layout with one collapsible Equipment section. Refactor the shared form into a single `DiveForm` component (props: `defaultValues`, `onSubmit`, `submitLabel`) to stop the copy-paste drift, then add three collapsible sections alongside Equipment:

1. **Conditions** — new `ConditionsForm.tsx` component, mirroring `EquipmentForm`'s controlled pattern (`conditions`, `onChange` props, unit conversion at the boundary):
   - Water temp surface/bottom, air temp — numeric, displayed in user's temperature unit, stored celsius
   - Visibility — numeric, user's depth unit, stored meters
   - Current strength (`none/light/moderate/strong`) + free-text direction
   - Weather (`sunny/cloudy/overcast/rainy/windy`), sea state (0–9 select), surge (`none/light/moderate/heavy`)
2. **Dive details** — inline in `DiveForm` (small enough not to need a component):
   - Dive type select (`recreational/training/technical/work/research`)
   - Rating — 1–5 star input (reuse the star rendering already in `DiveDetailModal`)
   - Notes — textarea
3. **Safety stops** — repeatable rows (depth + duration) with add/remove, same list pattern as tanks in `EquipmentForm`. Default suggestion when adding: 5 m / 3 min (converted to user units).

### 3.2 Frontend type fix

Rewrite `DiveConditions` in `src/lib/dives.ts` to match the backend wire format exactly:

```ts
export interface DiveConditions {
  water_temp_surface?: number; // celsius
  water_temp_bottom?: number;  // celsius
  air_temp?: number;           // celsius
  visibility?: number;         // meters
  current_strength?: 'none' | 'light' | 'moderate' | 'strong';
  current_direction?: string;
  weather?: 'sunny' | 'cloudy' | 'overcast' | 'rainy' | 'windy';
  sea_state?: number; // 0-9
  surge?: 'none' | 'light' | 'moderate' | 'heavy';
}
```

Also align `diveType` → `dive_type` and `safetyStops` → `safety_stops` on the `Dive` interface (the backend emits snake_case JSON tags; the current camelCase fields read `undefined` from API responses). Audit all usages — `DiveDetailModal`, `EditDive` passthrough, UDDF/CSV parsers — and update in the same commit so the type checker catches every site.

### 3.3 Display

- **Detail modal Conditions tab**: render real `dive.conditions` values with unit conversion (it currently has the tab shell; wire it to the corrected field names).
- **Detail modal Notes tab**: replace the fabricated paragraph with `dive.notes` (empty state: "No notes recorded").
- **Dive log table**: add a compact rating (stars) column and dive type badge; both already have display precedents in the modal.

### 3.4 Acceptance criteria

- Create a dive with conditions, type, rating, notes, and two safety stops → all values survive a round trip (POST → GET → edit form repopulated → detail modal correct).
- `bun run build` and `bun run lint` pass; backend tests (`go test ./...`) still pass untouched.
- Imperial-unit users see/enter conditions in °F and feet; database stores celsius/meters (verify via API response).

---

## 4. Phase 2 — Authentication & Multi-User

**Goal:** replace `user_id=1` query parameters with real authenticated sessions.

### 4.1 Approach decision

**Recommendation: backend-issued JWTs with email/password.** Self-contained (no third-party dependency or pricing), fits the existing Go middleware pattern, and the `users` table already exists. Alternative considered: Supabase Auth (mentioned in README) — attractive if the database also moves to Supabase in Phase 3, but it couples auth to a hosting decision; revisit at Phase 3 if Supabase is chosen for Postgres hosting.

### 4.2 Backend design

- **New endpoints** (`/api/v1/auth/`): `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`.
- **Storage**: add `password_hash` (bcrypt, cost 12) to `users`; new `refresh_tokens` table (token hash, user_id, expiry, revoked flag).
- **Tokens**: short-lived access JWT (15 min, HS256, secret from env) in the `Authorization: Bearer` header; refresh token (30 days) in an httpOnly, Secure, SameSite=Strict cookie.
- **Middleware**: replace `UserIDMiddleware` (currently trusts a `user_id` query param) with `AuthMiddleware` that validates the JWT and sets `user_id` in the Gin context. Handlers keep reading `user_id` from context — minimal handler churn.
- **Scoping**: dives and settings are already user-scoped in queries. Dive sites are currently global; keep them global (shared catalog, like Subsurface) but record `created_by` for future moderation.
- **Rate limiting**: stricter limit on `/auth/login` (e.g. 10/min/IP) to slow credential stuffing.

### 4.3 Frontend design

- `authStore.ts` (Zustand): user profile, access token (memory only — not localStorage), login/logout/refresh actions; transparent refresh on 401 with a single retry.
- `api.ts`: central `fetchWithAuth` wrapper replacing the per-function `fetch` calls (this also deduplicates ~300 lines of boilerplate).
- Login/Register pages; route guard in `App.tsx` redirecting unauthenticated users to `/login`.
- Migration affordance: a seed script keeps dev user 1 working locally so existing dev data is reachable after logging in as the dev user.

---

## 5. Phase 3 — Deployment Readiness

**Goal:** anyone can deploy the app from the repo; CI prevents regressions.

- **Dockerfiles**: multi-stage Go build (distroless or alpine runtime) for the backend; `bun run build` + nginx (or Caddy) static serve for the frontend. Root `docker-compose.yml` wiring frontend + backend + postgres for one-command local spin-up.
- **Configuration**: backend already uses godotenv — document required vars (`DATABASE_URL`, `JWT_SECRET`, `PORT`, `GIN_MODE`, `CORS_ORIGINS`); frontend uses `VITE_API_URL` (introduced in Phase 1). CORS middleware must read allowed origins from env instead of any hardcoded value.
- **CI** (`.github/workflows/ci.yml`): on PR/push — backend job (`go vet`, `go test ./...`, build) and frontend job (`bun install`, `bun run lint`, `tsc -b`, `bun run build`). Postgres service container for repository tests if they need a live DB.
- **Migrations**: replace single `init.sql` with ordered migrations (golang-migrate) so the Phase 2 schema changes (password_hash, refresh_tokens) can roll out to existing databases.
- **Hosting target**: decide at phase start (README suggests Vercel + Fly.io + Supabase). The Docker/CI work above is host-agnostic, so this decision doesn't block the rest.

---

## 6. Phase 4 — Polish

In priority order:

1. **Frontend test suite**: Vitest + React Testing Library. First targets: unit conversions, UDDF/CSV parsers (pure functions, high value), `DiveForm` validation, store offline-queue logic.
2. **Offline queue persistence**: persist `offlineQueue` (and a dive cache) via Zustand `persist` middleware backed by localForage, fulfilling the README's offline promise.
3. **Dive profile chart upgrades**: zoom/pan (`chartjs-plugin-zoom`), event markers from UDDF events, optional multi-dive overlay comparison.
4. **Export/backup**: CSV export (mirror of existing import), JSON full backup/restore, PDF logbook export (jsPDF or server-side render — decide then).
5. **UX**: dark mode (Tailwind `dark:` variants + settings toggle), advanced dive log filtering/search, accessibility pass on forms.

---

## 7. Risks & Open Questions

- **Conditions field rename is breaking for any stored camelCase JSONB.** Risk is low (the mismatch means little/no real conditions data exists), but Phase 1 should include a one-off check query before assuming the column is effectively empty.
- **Auth provider choice** (§4.1) should be confirmed before Phase 2 starts; switching after refresh-token infrastructure is built is expensive.
- **Legacy `water_temperature`/`visibility` columns**: eventual migration into `conditions` JSONB needed; deliberately deferred.
- **Dive sites global vs per-user**: designed as global here; confirm this matches intent.

## 8. Milestones

1. **M1 (Phase 1)**: full data entry/display parity — *no schema or API changes, lowest risk, ship first.*
2. **M2 (Phase 2)**: registration/login live, dev-user param removed.
3. **M3 (Phase 3)**: green CI badge, `docker compose up` runs the full stack, deployed to chosen hosts.
4. **M4 (Phase 4)**: incremental; cut releases as each item lands.
