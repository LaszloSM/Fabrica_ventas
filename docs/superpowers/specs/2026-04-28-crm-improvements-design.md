# CRM Improvements Design Spec
**Date:** 2026-04-28  
**Author:** Laszlo Sierra / Claude  
**Status:** Draft

---

## Scope

Four independent but related improvement areas for the CoimpactoB CRM:

1. **Session persistence** — Sessions lost on server restart
2. **SuperAdmin flow & Users panel** — Button broken, users not showing
3. **Deal values cleanup** — Stale $150M/$35M mockup values in DB
4. **Full contact data model** — All CSV fields manageable in the CRM, sequence tracking with auto-activities

---

## Area 1 — Session Persistence

### Problem
`express-session` in `frontend/server.ts` uses the default **in-memory store**. Every time the Node.js process restarts (deploy, crash, maintenance), all sessions are destroyed. Users get kicked out with no explanation.

Additionally, the session stores `id: payload.sub` (Google OAuth subject ID) instead of the MongoDB `_id` (`usr_xxx`). This causes a mismatch when the backend tries to find users by `_id`.

### Fix

**1a. Persistent session store**
- Install `connect-mongo` in `frontend/`
- Configure `MongoStore` using the same `COSMOSDB_CONN_STR` environment variable already used by the backend
- Sessions survive server restarts; TTL matches the cookie `maxAge` (7 days)

**1b. Store DB user ID in session**
- After `GET /users/me` succeeds at login, store `dbId: userData.id` alongside `id: payload.sub`
- The proxy forwards `x-user-id: session.user.dbId` so the backend can match by `_id`

**1c. Role sync on session check**
- `GET /auth/session` re-calls `GET /users/me` to fetch the current role from MongoDB on each session check
- This ensures role promotions (e.g., SUPERADMIN) are reflected without requiring logout

**Files changed:**
- `frontend/package.json` — add `connect-mongo`
- `frontend/server.ts` — session store + dbId storage + role sync

---

## Area 2 — SuperAdmin Flow & Users Panel

### Problems

**A. Button "Activar SuperAdmin" shows "Sin cambios necesarios"**
Root cause: the call to `POST /users/ensure-admin` returns the correct response but either:
- The user doesn't exist in the `users` MongoDB collection (FastAPI was down at first login → user never created)
- After promotion, the session still has the old role

**B. "No hay usuarios registrados aún"**  
Root cause: if `GET /users/me` failed silently at login time, the `users` collection is empty. The session was created with a fallback `SALES` role but no DB record was persisted.

**C. After promotion, UI shows old role until logout/login**

### Fix

**2a. Resilient user creation on login**
- In `server.ts` `/auth/google`: if the first call to `/users/me` fails (backend down), **don't silently fall back** — retry once, then return a 503 error with a clear message ("El sistema de usuarios no está disponible, intenta en unos segundos")
- This prevents ghost sessions with no DB record

**2b. Auto-create user on session check**
- `GET /auth/session` in `server.ts`: if session exists but backend returns 404 for this user, call `GET /users/me` to create/recover them and update the session role
- This repairs sessions created during a backend outage

**2c. Frontend: refresh user after SuperAdmin promotion**
- In `ProfileTab.ensureAdmin()`: after successful promotion, call `GET /auth/session` and update `AuthContext` with the new role
- The "Activar SuperAdmin" section disappears immediately (no logout needed)

**2d. Only one SuperAdmin constraint**
- Backend already enforces this (`sa_count > 0` → no promotion)
- Frontend: hide the "Activar SuperAdmin" card entirely once user has SUPERADMIN role (which now works thanks to 2c)

**Files changed:**
- `frontend/server.ts` — resilient login + session repair
- `frontend/src/views/SettingsView.tsx` — refresh session after promotion

---

## Area 3 — Deal Values Cleanup

### Problem
The `deals` MongoDB collection has stale values (`150_000_000` and `35_000_000`) inserted by a legacy seed script. These display as `$150.000.000 COP` in the Opportunities view despite never being set by a real user.

The existing `backend/scripts/fix_deal_values.py` script was written for this exact purpose but never executed.

### Fix

**3a. Reset existing values via admin API**
- Add `POST /api/deals/admin/reset-values` endpoint (SUPERADMIN only)
- Runs the same logic as `fix_deal_values.py`: sets `value: null, ponderatedValue: null` on all deals
- Returns count of modified records
- One-time use; can be triggered from Settings → an "Herramientas de Admin" section

**3b. UI: display null values correctly**
- Anywhere `value` is rendered: show `—` when null instead of `$0 COP`
- Files: `OpportunitiesView.tsx`, `PipelineView` (kanban cards), `OpportunityDetail`, `DashboardView` (metrics)

**3c. Deal creation/edit: value is always optional**
- No default value injected by backend or frontend
- Form shows empty field; user explicitly types the value

**Files changed:**
- `backend/app/api/v1/endpoints/deals.py` — add reset-values admin endpoint
- `frontend/src/views/OpportunitiesView.tsx` — null value display
- `frontend/src/views/PipelineView.tsx` (kanban cards)
- `frontend/src/components/OpportunityDetail.tsx`
- `frontend/src/views/DashboardView.tsx`

---

## Area 4 — Full Contact Data Model & Sequence Tracking

### Problem
The CSV (the team's current source of truth) has ~25 columns. The current CRM Contact model only captures 7 of them. Key missing fields:

| CSV Column | Current Status | Target |
|---|---|---|
| País | Stored on Prospect.region only | Stored on Contact |
| Ciudad Principal | Stored on Prospect.region only | Stored on Contact |
| Áreas de impacto | Lost during import | Contact field |
| Estado (Caliente/Frío/Tibio) | Mapped to Deal.stage | Also on Contact as `temperature` |
| LinkedIn | Stored but not shown in UI | Shown as clickable link |
| Envío invitación LinkedIn | Lost | Sequence step |
| Aceptación LinkedIn | Lost | Sequence step |
| Mensaje LinkedIn | Lost | Sequence step |
| Correo 1 | Lost | Sequence step |
| Correo 2 | Lost | Sequence step |
| Correo 3 | Lost | Sequence step |
| Whatsapp mensaje | Lost | Sequence step |
| Llamada | Lost | Sequence step |
| Primera reunión | Lost | Sequence step |
| Mail de seguimiento | Lost | Sequence step |
| Preparación de propuesta | Lost | Sequence step |
| Reunión de propuesta | Lost | Sequence step |
| Comentarios | Partially in Deal.notes | Contact.notes |

### 4a. Extended Contact document schema (MongoDB)

New fields added to the `contacts` collection:

```
country: string | null
city: string | null
impactAreas: string | null          # "Áreas de impacto"
temperature: "CALIENTE" | "TIBIO" | "FRIO" | null
notes: string | null                # "Comentarios"
sequence: {
  linkedinInviteSent:   { done: bool, doneAt: datetime | null }
  linkedinAccepted:     { done: bool, doneAt: datetime | null }
  linkedinMessage:      { done: bool, doneAt: datetime | null }
  email1:               { done: bool, doneAt: datetime | null }
  email2:               { done: bool, doneAt: datetime | null }
  email3:               { done: bool, doneAt: datetime | null }
  whatsapp:             { done: bool, doneAt: datetime | null }
  call:                 { done: bool, doneAt: datetime | null }
  firstMeeting:         { done: bool, doneAt: datetime | null }
  followUpEmail:        { done: bool, doneAt: datetime | null }
  proposalPrep:         { done: bool, doneAt: datetime | null }
  proposalMeeting:      { done: bool, doneAt: datetime | null }
}
```

No migration needed — MongoDB is schema-less; existing documents just lack these fields (treated as null).

### 4b. Import service update

Map all previously-lost CSV columns to the new Contact fields:
- `Áreas de impacto` → `impactAreas`
- `Estado` → `temperature` (caliente→CALIENTE, tibio→TIBIO, frío/frio→FRIO)
- `País` → `contact.country` (in addition to prospect.region)
- `Ciudad Principal` → `contact.city`
- `Comentarios` → `contact.notes`
- Sequence columns → `sequence.*` with `done: _done(value), doneAt: now if done else null`

### 4c. Backend API changes

**Contacts endpoint updates:**
- `GET /contacts`: already returns full document — new fields auto-included
- `PATCH /contacts/:id`: already accepts arbitrary payload — new fields auto-accepted
- New endpoint: `POST /contacts/:id/sequence/:step` — marks a sequence step done/undone
  - When marking done: creates an Activity record (`type: step name, dealId: first active deal for this contact, doneAt: now`)
  - When undoing: does NOT delete the activity (history is preserved)
  - Returns updated contact

**Contacts list endpoint: add new filter params:**
- `?temperature=CALIENTE` — filter by temperature
- `?country=Colombia` — filter by country
- Search query extended to also match `city`, `country`, `impactAreas`

### 4d. Frontend: Extended ContactsView (table)

New columns added to the contacts table:
- **LinkedIn** — clickable icon link (opens in new tab)
- **País / Ciudad** — "Bogotá, Colombia" or just country
- **Temperatura** — colored badge: CALIENTE=red, TIBIO=amber, FRÍO=blue
- **Secuencia** — progress bar showing X/12 steps done

New filters in the toolbar:
- Temperature filter (All / Caliente / Tibio / Frío)
- Country filter (dropdown)

### 4e. Frontend: Contact Detail Slide-Over Panel

Clicking a contact row opens a right-side panel (slide-over) with:

**Header section:**
- Avatar, Name, Role, Company (linked to AccountsView)
- Temperature badge + LinkedIn button

**Info section (editable inline):**
- Email, Phone, País, Ciudad, Áreas de impacto, Notes/Comentarios

**Sequence checklist:**
- 12 checkboxes, one per step, in order
- Each shows: step name, done state, date when done (if applicable)
- Clicking a checkbox → calls `POST /contacts/:id/sequence/:step` → auto-creates Activity
- Visual: completed steps are green with checkmark + date; pending are grey

**Associated Deals section:**
- List of deals linked to this prospect (via `prospectId`)
- Stage badge + service type + value (or —)

**Recent Activities section:**
- Last 5 activities logged against any deal for this prospect

### 4f. Frontend: NewContactModal updates

Add fields to the creation form:
- País (text input, default "Colombia")
- Ciudad Principal (text input)
- Áreas de impacto (text input)
- Temperatura (select: Caliente / Tibio / Frío / Sin clasificar)
- LinkedIn URL (text input, already partially there)

---

## Implementation Order (Approach A)

### Phase 1 — Infrastructure (session)
1. `connect-mongo` install + `server.ts` session store
2. Store `dbId` in session + proxy uses `dbId`
3. Role sync on `/auth/session`

### Phase 2 — SuperAdmin & Users
4. Resilient login (retry + clear error)
5. Session repair on `/auth/session`
6. Frontend: refresh user after promotion

### Phase 3 — Deal Values
7. Admin reset endpoint in backend
8. UI null-value display fix (all views)
9. Admin action in Settings UI

### Phase 4 — Contact Model & Import
10. Import service: map all missing CSV fields
11. Backend: `POST /contacts/:id/sequence/:step` endpoint
12. Backend: contacts list search extended

### Phase 5 — Frontend: Contacts UI
13. Extended ContactsView table (LinkedIn, país, temperatura, sequence progress)
14. Contact Detail slide-over panel (full profile + sequence checklist + deals + activities)
15. NewContactModal: new fields

---

## Out of Scope
- AccountsView (Prospects) UI changes — left for a future iteration
- PipelineView sequence integration — contacts sequence visible from contact panel only
- Email sending integration (marked "Próximamente" in Integrations tab)
- Mobile responsive design changes

---

## Data / Privacy Notes
- LinkedIn URLs are stored as-is; no scraping or external API calls
- Sequence step history (doneAt timestamps) is append-only; cannot be deleted from UI
- All data stays within the existing CosmosDB instance
