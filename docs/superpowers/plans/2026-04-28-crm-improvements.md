# CRM Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix session persistence, SuperAdmin flow, deal mock values, and extend the Contact model with all CSV fields + sequence tracking with auto-activities.

**Architecture:** Five sequential phases: (1) persistent session store in the Express proxy, (2) SuperAdmin resilience fixes, (3) deal value cleanup via scoped admin API, (4) extended Contact schema + new backend endpoints, (5) new Contacts UI (extended table + detail slide-over panel).

**Tech Stack:** Express.js + connect-mongo (session), FastAPI + Motor (async MongoDB), React + TypeScript + Tailwind, Azure CosmosDB (MongoDB-compatible wire protocol).

**Spec:** `docs/superpowers/specs/2026-04-28-crm-improvements-design.md`

---

## Chunk 1: Session Persistence

### File Map
- Modify: `frontend/package.json` — add `connect-mongo`
- Modify: `frontend/server.ts` — MongoStore + dbId in session + role sync
- Modify: `frontend/src/context/AuthContext.tsx` — add `dbId?: string` to User interface

---

### Task 1: Install connect-mongo

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install the package**

Run in `frontend/` directory:
```bash
cd frontend && npm install connect-mongo
```
Expected: `connect-mongo` appears in `frontend/package.json` dependencies.

- [ ] **Step 2: Verify types are included**
`connect-mongo` ships its own TypeScript types — no `@types/connect-mongo` needed. Confirm with:
```bash
ls frontend/node_modules/connect-mongo/types
```
Expected: `index.d.ts` present.

- [ ] **Step 3: Commit**
```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add connect-mongo for persistent session store"
```

---

### Task 2: Swap in-memory session store for MongoDB store

**Files:**
- Modify: `frontend/server.ts`

The current `server.ts` uses `express-session` with default in-memory store. Replace with `MongoStore`.

- [ ] **Step 1: Add the import at the top of server.ts**

In `frontend/server.ts`, after the existing imports, add:
```typescript
import MongoStore from 'connect-mongo'
```

- [ ] **Step 2: Replace the session middleware configuration**

Find this block in `server.ts` (lines ~24-34):
```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'coimpactob-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: isProd ? 'none' : 'lax',
  }
}))
```

Replace with:
```typescript
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days
const COSMOS_CONN = process.env.COSMOSDB_CONN_STR

app.use(session({
  secret: process.env.SESSION_SECRET || 'coimpactob-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: COSMOS_CONN
    ? MongoStore.create({
        mongoUrl: COSMOS_CONN,
        dbName: 'fabrica_ventas',
        collectionName: 'express_sessions',
        ttl: SESSION_TTL_SECONDS,
        // CosmosDB may not honor TTL index auto-creation; cookie maxAge is the
        // client-side safety net if server-side TTL cleanup does not fire.
        autoRemove: 'disabled',
      })
    : undefined, // falls back to in-memory when env var is absent (local dev without DB)
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS * 1000,
    sameSite: isProd ? 'none' : 'lax',
  }
}))
```

- [ ] **Step 3: Store the DB user ID in session at login**

Find the `/auth/google` handler in `server.ts`. The current code:
```typescript
;(req.session as any).user = {
  id: payload.sub,
  email: payload.email,
  name: payload.name,
  image: payload.picture,
  role: userRole,
}
```

Replace with:
```typescript
const dbUserId = userData?.id ?? null   // MongoDB _id like "usr_abc123"

;(req.session as any).user = {
  id: payload.sub,       // Google OAuth sub — kept for reference
  dbId: dbUserId,        // MongoDB _id — used as x-user-id in API proxy
  email: payload.email,
  name: payload.name,
  image: payload.picture,
  role: userRole,
}
```

Also update the fetch block above it to capture `userData`:
```typescript
let userRole = 'SALES'
let userData: { role?: string; id?: string } | null = null
try {
  const userRes = await fetch(`${FASTAPI_URL}${API_PREFIX}/users/me`, {
    headers: {
      'x-user-email': payload.email!,
      'x-user-name': payload.name ?? '',
      'x-user-id': payload.sub,
      'x-user-role': 'SALES',
    }
  })
  if (userRes.ok) {
    userData = await userRes.json()
    userRole = userData?.role ?? 'SALES'
  }
} catch {
  // backend not reachable, default to SALES
}
```

- [ ] **Step 4: Update the API proxy to forward dbId**

Find the proxy handler (`app.all('/api/*', ...)`). The current forwarding headers:
```typescript
'x-user-id': user.id,
```

Replace with:
```typescript
'x-user-id': user.dbId ?? user.id,
```

- [ ] **Step 5: Add role sync on /auth/session**

Find the `/auth/session` handler:
```typescript
app.get('/auth/session', (req, res) => {
  const user = (req.session as any).user
  if (!user) return res.status(401).json({ user: null })
  res.json({ user })
})
```

Replace with:
```typescript
app.get('/auth/session', async (req, res) => {
  const user = (req.session as any).user
  if (!user) return res.status(401).json({ user: null })

  // Sync role from DB (repairs sessions created during a backend outage)
  const lastSync: number = (req.session as any)._roleSyncedAt ?? 0
  const ONE_MINUTE = 60_000
  if (Date.now() - lastSync > ONE_MINUTE) {
    try {
      const userRes = await fetch(`${FASTAPI_URL}${API_PREFIX}/users/me`, {
        headers: {
          'x-user-email': user.email,
          'x-user-name': user.name ?? '',
          'x-user-id': user.id,
          'x-user-role': user.role,
        }
      })
      if (userRes.ok) {
        const data = await userRes.json()
        if (data.role) user.role = data.role
        if (data.id)   user.dbId = data.id
        ;(req.session as any).user = user
        ;(req.session as any)._roleSyncedAt = Date.now()
      }
    } catch {
      // backend unreachable — use cached role, retry next request
    }
  }

  res.json({ user })
})
```

- [ ] **Step 6: Restart server and verify session persists across restart**

```bash
# Terminal 1 — start the server
cd frontend && npm run server

# Terminal 2 — login via browser, then restart server
# After restart, refresh page — you should still be logged in (not redirected to login)
```
Expected: after server restart, the session survives and the user stays logged in.

- [ ] **Step 6b: Add dbId to User interface in AuthContext**

In `frontend/src/context/AuthContext.tsx`, update the `User` interface:
```typescript
interface User {
  id: string
  dbId?: string          // MongoDB _id (usr_xxx) — added alongside Google sub
  email: string
  name: string
  image?: string
  role: 'SUPERADMIN' | 'ADMIN' | 'SALES' | 'VIEWER'
}
```

- [ ] **Step 7: Commit**
```bash
git add frontend/server.ts frontend/src/context/AuthContext.tsx
git commit -m "feat: persistent MongoDB session store + dbId + role sync on session check"
```

---

## Chunk 2: SuperAdmin Flow & Users Panel

### File Map
- Modify: `frontend/server.ts` — resilient login error handling
- Modify: `frontend/src/views/SettingsView.tsx` — refresh user after promotion

---

### Task 3: Resilient login — don't create ghost sessions

**Files:**
- Modify: `frontend/server.ts`

- [ ] **Step 1: Add retry + 503 if backend is down at login**

In the `/auth/google` handler, replace the silent fallback with a retry + clear error. Find the `try/catch` block that calls `/users/me` and replace with:

```typescript
let userRole = 'SALES'
let userData: { role?: string; id?: string } | null = null
let backendReachable = false

for (let attempt = 0; attempt < 2; attempt++) {
  try {
    const userRes = await fetch(`${FASTAPI_URL}${API_PREFIX}/users/me`, {
      headers: {
        'x-user-email': payload.email!,
        'x-user-name': payload.name ?? '',
        'x-user-id': payload.sub,
        'x-user-role': 'SALES',
      }
    })
    if (userRes.ok) {
      userData = await userRes.json()
      userRole = userData?.role ?? 'SALES'
      backendReachable = true
      break
    }
  } catch {
    // retry
    await new Promise(r => setTimeout(r, 500))
  }
}

if (!backendReachable) {
  console.error('[auth] Backend unreachable during login for:', payload.email)
  return res.status(503).json({
    ok: false,
    error: 'El sistema de usuarios no está disponible. Intenta nuevamente en unos segundos.'
  })
}
```

- [ ] **Step 2: Verify the frontend login page handles 503 correctly**

Open `frontend/src/pages/LoginPage.tsx`. Find where `loginWithGoogle` is called (in `AuthContext.tsx`):

```typescript
// In frontend/src/context/AuthContext.tsx
export async function loginWithGoogle(credential: string): Promise<User | null> {
  const res = await fetch('/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ credential })
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.user ?? null
}
```

The `if (!res.ok) return null` already handles the 503 — the login UI will show a failure. No change needed here.

- [ ] **Step 3: Commit**
```bash
git add frontend/server.ts
git commit -m "fix: abort login with 503 if backend unreachable — prevents ghost sessions"
```

---

### Task 4: Refresh session role in frontend after SuperAdmin promotion

**Files:**
- Modify: `frontend/src/views/SettingsView.tsx`

- [ ] **Step 1: Update `ensureAdmin` in ProfileTab to refresh user after promotion**

In `frontend/src/views/SettingsView.tsx`, find the `ensureAdmin` function in `ProfileTab`:

```typescript
const ensureAdmin = async () => {
  setPromoting(true)
  const res = await api.post('/users/ensure-admin', {})
  if (res?.data?.action === 'promoted') {
    setPromoteMsg(`✅ ${res.data.message} — Cierra sesión y vuelve a entrar para ver el cambio.`)
  } else {
    setPromoteMsg(res?.data?.message ?? 'Sin cambios necesarios.')
  }
  setPromoting(false)
}
```

Replace with:
```typescript
const ensureAdmin = async () => {
  setPromoting(true)
  const res = await api.post('/users/ensure-admin', {})
  if (res?.data?.action === 'promoted') {
    // Refresh session to get updated role immediately — no logout needed
    try {
      const sessionRes = await fetch('/auth/session', { credentials: 'include' })
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        if (sessionData.user) setUser(sessionData.user)
      }
    } catch { /* ignore */ }
    setPromoteMsg('✅ Rol SuperAdmin activado correctamente.')
  } else {
    setPromoteMsg(res?.data?.message ?? 'Sin cambios necesarios.')
  }
  setPromoting(false)
}
```

- [ ] **Step 2: Verify the card hides after promotion**

The card already conditionally renders based on `user?.role !== 'SUPERADMIN'`. Since we now call `setUser()` with the updated role, the card should disappear without a page reload. No additional change needed.

- [ ] **Step 3: Commit**
```bash
git add frontend/src/views/SettingsView.tsx
git commit -m "fix: refresh AuthContext after SuperAdmin promotion — no logout required"
```

---

## Chunk 3: Deal Values Cleanup

### File Map
- Modify: `backend/app/api/v1/endpoints/deals.py` — admin reset endpoint + valueSetAt on update
- Modify: `backend/app/schemas/deal.py` — add valueSetAt to DealUpdate + DealCreate default value fix
- Modify: `frontend/src/views/OpportunitiesView.tsx` — null value display
- Modify: `frontend/src/components/pipeline/DealCard.tsx` — null value display
- Modify: `frontend/src/components/OpportunityDetail.tsx` — null value display
- Modify: `frontend/src/views/DashboardView.tsx` — null value display (recent deals list)
- Modify: `frontend/src/views/AccountsView.tsx` — null value display
- Modify: `frontend/src/views/SettingsView.tsx` — add admin tools section

---

### Task 5: Fix DealCreate default value and add valueSetAt to schema

**Files:**
- Modify: `backend/app/schemas/deal.py`

- [ ] **Step 1: Fix DealCreate default value and add valueSetAt**

In `backend/app/schemas/deal.py`, replace the file content with:

```python
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class DealCreate(BaseModel):
    prospectId: str
    contactId: Optional[str] = None
    serviceType: str
    line: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    value: Optional[float] = None          # was 0.0 — null means "not yet set"
    quarter: Optional[int] = None
    stage: Optional[str] = "PROSPECTO_IDENTIFICADO"
    notes: Optional[str] = None
    problem: Optional[str] = Field(default=None, max_length=500)
    benefit: Optional[str] = Field(default=None, max_length=500)
    nextAction: Optional[str] = Field(default=None, max_length=500)
    nextActionDate: Optional[datetime] = None
    assignedTo: Optional[str] = None
    proyectos: Optional[str] = None
    sourceTab: Optional[str] = None

class DealUpdate(BaseModel):
    stage: Optional[str] = None
    value: Optional[float] = None
    valueSetAt: Optional[datetime] = None  # set by backend when value is explicitly saved
    problem: Optional[str] = None
    benefit: Optional[str] = None
    nextAction: Optional[str] = None
    nextActionDate: Optional[datetime] = None
    notes: Optional[str] = None
    assignedTo: Optional[str] = None
    proyectos: Optional[str] = None

class DealResponse(BaseModel):
    id: str
    prospectId: str
    contactId: Optional[str]
    serviceType: str
    line: str
    stage: str
    value: Optional[float]
    ponderatedValue: float
    probability: float
    problem: str           # keep as str — existing deals always have these (even if empty string)
    benefit: str
    nextAction: str
    nextActionDate: Optional[datetime]
    assignedTo: Optional[str]
    valueSetAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime

    class Config:
        from_attributes = True
```

- [ ] **Step 2: Set valueSetAt automatically when value is explicitly updated**

In `backend/app/api/v1/endpoints/deals.py`, find the `update_deal` handler and add logic to stamp `valueSetAt`:

```python
@router.put("/{deal_id}")
@router.patch("/{deal_id}")
async def update_deal(
    deal_id: str,
    req: Request,
    deal_update: DealUpdate,
    service: DealService = Depends(get_deal_service),
    db=Depends(get_db)
):
    update_data = deal_update.model_dump(exclude_unset=True)
    # Stamp valueSetAt whenever a user explicitly sets a value
    if 'value' in update_data and update_data['value'] is not None:
        update_data['valueSetAt'] = datetime.utcnow()
    deal = await service.update_deal(deal_id, update_data)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    prospect_svc = ProspectService(db)
    prospect = await prospect_svc.get_prospect(deal.prospectId)
    return {"data": _enrich(deal.model_dump(by_alias=True), prospect)}
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/schemas/deal.py backend/app/api/v1/endpoints/deals.py
git commit -m "feat: add valueSetAt to deals — stamps when a user explicitly sets a value"
```

---

### Task 6: Add admin reset-values endpoint

**Files:**
- Modify: `backend/app/api/v1/endpoints/deals.py`

- [ ] **Step 1: Add the reset endpoint at the bottom of deals.py**

Append to `backend/app/api/v1/endpoints/deals.py`:

```python
SEED_VALUES = {150_000_000.0, 35_000_000.0}

@router.post("/admin/reset-values")
async def reset_seed_values(
    req: Request,
    dry_run: bool = Query(False, description="Si true, reporta sin modificar"),
    db=Depends(get_db)
):
    """
    SUPERADMIN only. Resetea valores de deals que provienen de seed/import y
    nunca fueron editados por un usuario real. Usa dry_run=true para previsualizar.
    """
    requester_role = req.headers.get("x-user-role", "")
    if requester_role != "SUPERADMIN":
        raise HTTPException(status_code=403, detail="Solo SUPERADMIN puede ejecutar esta acción")

    # Scope: deals with known seed values OR csv_import source, and valueSetAt is null
    query = {
        "valueSetAt": None,
        "$or": [
            {"value": {"$in": list(SEED_VALUES)}},
            {"source": "csv_import"},
        ]
    }

    count = await db["deals"].count_documents(query)

    if dry_run:
        return {"data": {"dry_run": True, "would_reset": count, "modified": 0}}

    result = await db["deals"].update_many(
        query,
        {"$set": {"value": None, "ponderatedValue": None, "updatedAt": datetime.utcnow()}}
    )

    return {"data": {"dry_run": False, "modified": result.modified_count, "skipped": count - result.modified_count}}
```

- [ ] **Step 2: Test the dry run manually**

```bash
# With the backend running, call the endpoint as SUPERADMIN
# (Session must have SUPERADMIN role — use /auth/session to verify first)
curl -X POST "http://localhost:8080/api/deals/admin/reset-values?dry_run=true" \
  -H "Cookie: <your-session-cookie>"
```
Expected response: `{"data": {"dry_run": true, "would_reset": N, "modified": 0}}`

- [ ] **Step 3: Commit**
```bash
git add backend/app/api/v1/endpoints/deals.py
git commit -m "feat: admin reset-values endpoint for deals — scoped to seed values, dry-run mode"
```

---

### Task 7: Fix null value display across all frontend files

**Files:**
- Modify: `frontend/src/views/OpportunitiesView.tsx`
- Modify: `frontend/src/components/pipeline/DealCard.tsx`
- Modify: `frontend/src/components/OpportunityDetail.tsx`
- Modify: `frontend/src/views/DashboardView.tsx`
- Modify: `frontend/src/views/AccountsView.tsx`

- [ ] **Step 1: Fix OpportunitiesView.tsx**

Find the value column render:
```typescript
render: val => <span className="text-sm font-bold">${(val ?? 0).toLocaleString('es-CO')} COP</span>,
```
Replace with:
```typescript
render: val => val != null
  ? <span className="text-sm font-bold">${(val as number).toLocaleString('es-CO')} COP</span>
  : <span className="text-sm text-on-surface-variant">—</span>,
```

- [ ] **Step 2: Fix DealCard.tsx**

In `frontend/src/components/pipeline/DealCard.tsx`, find:
```typescript
<span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
```
Replace with:
```typescript
<span className="text-sm font-bold">
  {deal.value != null ? fmt(deal.value) : '—'}
</span>
```

- [ ] **Step 3: Fix OpportunityDetail.tsx**

Find:
```typescript
<div className="text-2xl font-bold text-on-surface">${opportunity.value.toLocaleString()} COP</div>
```
Replace with:
```typescript
<div className="text-2xl font-bold text-on-surface">
  {opportunity.value != null
    ? `$${opportunity.value.toLocaleString('es-CO')} COP`
    : '—'}
</div>
```

- [ ] **Step 4: Fix DashboardView.tsx recent deals list**

Find (line ~186):
```typescript
<span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
```
Replace with:
```typescript
<span className="text-sm font-bold">
  {deal.value != null ? fmt(deal.value) : '—'}
</span>
```

- [ ] **Step 5: Fix AccountsView.tsx**

Find (line ~126):
```typescript
<span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
```
Replace with:
```typescript
<span className="text-sm font-bold">
  {deal.value != null ? fmt(deal.value) : '—'}
</span>
```

- [ ] **Step 6: Commit**
```bash
git add frontend/src/views/OpportunitiesView.tsx \
        frontend/src/components/pipeline/DealCard.tsx \
        frontend/src/components/OpportunityDetail.tsx \
        frontend/src/views/DashboardView.tsx \
        frontend/src/views/AccountsView.tsx
git commit -m "fix: show — instead of $0 when deal value is null"
```

---

### Task 8: Add admin tools section in Settings UI

**Files:**
- Modify: `frontend/src/views/SettingsView.tsx`

- [ ] **Step 1: Add AdminToolsTab component before the SettingsView export**

In `frontend/src/views/SettingsView.tsx`, add this component before the `SettingsView` export:

```typescript
function AdminToolsTab() {
  const { user } = useAuth()
  const [result, setResult] = useState<string>('')
  const [running, setRunning] = useState(false)

  if (user?.role !== 'SUPERADMIN') return null

  const resetValues = async (dryRun: boolean) => {
    setRunning(true)
    setResult('')
    const res = await api.post(`/deals/admin/reset-values?dry_run=${dryRun}`, {})
    if (res?.data) {
      const d = res.data
      setResult(dryRun
        ? `Vista previa: ${d.would_reset} deals serían reseteados.`
        : `✅ ${d.modified} deals reseteados. ${d.skipped} no modificados (ya tenían valor real).`
      )
    } else {
      setResult('❌ Error al ejecutar la operación.')
    }
    setRunning(false)
  }

  return (
    <div>
      <h4 className="font-bold text-lg mb-2">Herramientas de Admin</h4>
      <p className="text-sm text-on-surface-variant mb-6">Solo visible para SuperAdmin.</p>

      <div className="p-4 rounded-xl border border-red-200 bg-red-50">
        <p className="text-sm font-bold text-red-800 mb-1">Resetear valores de seed</p>
        <p className="text-xs text-red-700 mb-3">
          Elimina los valores de $150M/$35M insertados por scripts de prueba.
          Solo afecta deals de importación sin valor real asignado.
        </p>
        {result && (
          <p className="text-xs font-bold text-red-900 mb-3">{result}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => resetValues(true)}
            disabled={running}
            className="px-3 py-1.5 text-xs font-bold border border-red-300 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            Vista Previa
          </button>
          <button
            onClick={() => resetValues(false)}
            disabled={running}
            className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {running ? 'Ejecutando...' : 'Ejecutar Reset'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Register the tab**

In `SettingsView.tsx`, add `'admin-tools'` to the `Tab` type and `TABS` array:

```typescript
type Tab = 'profile' | 'business-units' | 'users' | 'goals' | 'notifications' | 'integrations' | 'admin-tools'
```

Add to `TABS` array (only visible for SUPERADMIN — we'll handle visibility in the tab list):
```typescript
{ id: 'admin-tools', label: 'Herramientas Admin', icon: Cpu },
```

In the `SettingsView` component, filter the tab list by role:
```typescript
const { user: currentUser } = useAuth()  // add this at the top of SettingsView
// ...
// In the tab list render, replace:
{TABS.map(t => ( ... ))}
// with:
{TABS.filter(t => t.id !== 'admin-tools' || currentUser?.role === 'SUPERADMIN').map(t => ( ... ))}
```

Add to `tabContent`:
```typescript
'admin-tools': <AdminToolsTab />,
```

- [ ] **Step 3: Add useAuth import to SettingsView if not present**

At the top, verify `useAuth` is imported. It already is used in `ProfileTab`. The `SettingsView` export needs it now — add `const { user: currentUser } = useAuth()` inside `SettingsView()`.

- [ ] **Step 4: Commit**
```bash
git add frontend/src/views/SettingsView.tsx
git commit -m "feat: admin tools tab in Settings — reset seed deal values with dry-run"
```

---

## Chunk 4: Contact Model & Backend Endpoints

### File Map
- Modify: `backend/app/services/import_service.py` — map all CSV fields to new contact schema
- Modify: `backend/app/api/v1/endpoints/contacts.py` — sequence endpoint + countries endpoint
- Modify: `backend/app/models/activity.py` — add contactId field
- Note: `import_data.py` does NOT call `_create_contact` directly (uses ImportService) — no change needed there

---

### Task 9: Extend import service to map all CSV fields

**Files:**
- Modify: `backend/app/services/import_service.py`

- [ ] **Step 1: Update `_create_contact` signature and document body**

In `backend/app/services/import_service.py`, replace the `_create_contact` method:

```python
async def _create_contact(
    self,
    prospect_id: str,
    nombre: str,
    cargo: str,
    correo: str,
    celular: str,
    linkedin: str,
    country: str = "Colombia",
    city: str = "",
    impact_areas: str = "",
    temperature: str = "",
    notes: str = "",
    sequence_row: dict = None,
) -> Optional[str]:
    """Upsert contacto. Retorna contact_id existente o crea uno nuevo."""
    email_key = correo.lower() if correo else None
    if email_key and email_key in self.email_index:
        return self.email_index[email_key]

    # Normalize temperature
    temp_map = {"caliente": "CALIENTE", "tibio": "TIBIO", "frio": "FRIO", "frío": "FRIO"}
    temp_value = temp_map.get(temperature.strip().lower()) if temperature else None

    # Build sequence object from row data
    seq = {}
    if sequence_row:
        step_cols = {
            "linkedinInviteSent": "Envio de invitacion  Linkdln",
            "linkedinAccepted":   "Aceptacion Linkdln",
            "linkedinMessage":    "Mensaje Linkdln",
            "email1":             "Correo 1",
            "email2":             "Correo 2",
            "email3":             "Correo 3",
            "whatsapp":           "Whatsapp mensaje",
            "call":               "LLamada ",
            "firstMeeting":       "Primera reunión",
            "followUpEmail":      "Mail de seguimiento",
            "proposalPrep":       "Preparación de propuesta ",
            "proposalMeeting":    "Reunión de propuesta ",
        }
        for key, col in step_cols.items():
            raw = _c(sequence_row.get(col, ""))
            done = _done(raw) if raw else False
            seq[key] = {"done": done, "doneAt": self.now if done else None}

    contact_id = _id("cnt")
    await self.db["contacts"].insert_one({
        "_id": contact_id,
        "prospectId": prospect_id,
        "name": nombre or "Sin nombre",
        "role": cargo or None,
        "email": correo or None,
        "phone": re.sub(r"[^\d+]", "", celular)[:20] if celular else None,
        "linkedinUrl": linkedin if _is_linkedin(linkedin) else None,
        "isPrimary": True,
        "country": country or "Colombia",
        "city": city or None,
        "impactAreas": impact_areas or None,
        "temperature": temp_value,
        "notes": notes or None,
        "sequence": seq if seq else None,
        "createdAt": self.now,
        "updatedAt": self.now,
    })
    if email_key:
        self.email_index[email_key] = contact_id
    self.stats["contacts"] += 1
    return contact_id
```

- [ ] **Step 2: Update all callers of `_create_contact` in `import_service.py`**

Search for all calls to `await self._create_contact(` in `import_service.py`. Each call site that reads from the main CSV rows (the 2026/Base 2025 tabs) needs to pass the new fields.

The main call site is around line 482. Update it to:

```python
contact_id = await self._create_contact(
    prospect_id=prospect_id,
    nombre=nombre,
    cargo=cargo,
    correo=correo,
    celular=celular,
    linkedin=linkedin,
    country=pais,
    city=ciudad,
    impact_areas=_c(row.get("Áreas de impacto", "")),
    temperature=estado,
    notes=_c(row.get("Comentarios", "")),
    sequence_row=row,  # pass the full row for sequence column extraction
)
```

For other call sites (Banca frio, Banca caliente, etc.) that don't have these columns, pass the fields they do have and leave others as default:
```python
contact_id = await self._create_contact(
    prospect_id=prospect_id,
    nombre=nombre,
    cargo=cargo,
    correo=correo,
    celular=celular,
    linkedin=linkedin,
    country=pais,
    temperature=estado,
)
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/services/import_service.py
git commit -m "feat: import service maps all CSV fields to contact (country, city, impactAreas, temperature, sequence)"
```

---

### Task 10: Add contactId to Activity model

**Files:**
- Modify: `backend/app/models/activity.py`

- [ ] **Step 1: Add contactId field**

In `backend/app/models/activity.py`, add `contactId` field:

```python
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class Activity(BaseModel):
    """Modelo de Actividad"""
    id: Optional[str] = Field(None, alias="_id")
    dealId: Optional[str] = None
    prospectId: Optional[str] = None
    contactId: Optional[str] = None      # NEW: links activity to a specific contact
    type: str = Field(...)
    templateUsed: Optional[str] = None
    outcome: Optional[str] = None
    notes: Optional[str] = None
    doneAt: datetime = Field(default_factory=datetime.utcnow)
    createdById: Optional[str] = None
    createdAt: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
```

- [ ] **Step 2: Commit**
```bash
git add backend/app/models/activity.py
git commit -m "feat: add contactId to Activity model for sequence tracking"
```

---

### Task 11: Add sequence step endpoint and countries endpoint to contacts API

**Files:**
- Modify: `backend/app/api/v1/endpoints/contacts.py`

- [ ] **Step 1: Add sequence step definitions and the `/countries` endpoint**

In `backend/app/api/v1/endpoints/contacts.py`, replace the entire file with:

```python
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])

VALID_SEQUENCE_STEPS = {
    "linkedinInviteSent", "linkedinAccepted", "linkedinMessage",
    "email1", "email2", "email3", "whatsapp", "call",
    "firstMeeting", "followUpEmail", "proposalPrep", "proposalMeeting",
}

STEP_ACTIVITY_TYPE = {
    "linkedinInviteSent": "LINKEDIN_INVITE",
    "linkedinAccepted":   "LINKEDIN_ACCEPTED",
    "linkedinMessage":    "LINKEDIN_MESSAGE",
    "email1":             "EMAIL",
    "email2":             "EMAIL",
    "email3":             "EMAIL",
    "whatsapp":           "WHATSAPP",
    "call":               "CALL",
    "firstMeeting":       "MEETING",
    "followUpEmail":      "EMAIL",
    "proposalPrep":       "INTERNAL",
    "proposalMeeting":    "MEETING",
}


@router.get("/countries")
async def list_countries(db=Depends(get_db)):
    """Retorna lista ordenada de países únicos en la colección de contactos."""
    pipeline = [
        {"$match": {"country": {"$ne": None, "$exists": True}}},
        {"$group": {"_id": "$country"}},
        {"$sort": {"_id": 1}},
    ]
    results = await db["contacts"].aggregate(pipeline).to_list(length=200)
    return {"data": [r["_id"] for r in results if r["_id"]]}


@router.get("")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100),
    search: str = Query(""),
    temperature: str = Query(""),
    country: str = Query(""),
    db=Depends(get_db)
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name":        {"$regex": search, "$options": "i"}},
            {"email":       {"$regex": search, "$options": "i"}},
            {"city":        {"$regex": search, "$options": "i"}},
            {"country":     {"$regex": search, "$options": "i"}},
            {"impactAreas": {"$regex": search, "$options": "i"}},
        ]
    if temperature:
        query["temperature"] = temperature.upper()
    if country:
        query["country"] = {"$regex": country, "$options": "i"}

    docs = await db["contacts"].find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db["contacts"].count_documents(query)

    # Enrich with prospect name
    prospect_ids = list({d["prospectId"] for d in docs if d.get("prospectId")})
    prospects = {}
    for pid in prospect_ids:
        p = await db["prospects"].find_one({"_id": pid}, {"name": 1})
        if p:
            prospects[pid] = p["name"]

    items = []
    for doc in docs:
        doc["id"] = doc.pop("_id", doc.get("id", ""))
        doc["prospectName"] = prospects.get(doc.get("prospectId", ""), None)
        items.append(doc)

    return {"data": items, "total": total}


@router.post("", status_code=201)
async def create_contact(req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["_id"] = f"contact_{uuid.uuid4().hex[:12]}"
    payload["createdAt"] = datetime.utcnow()
    payload["updatedAt"] = datetime.utcnow()
    await db["contacts"].insert_one(payload)
    payload["id"] = payload["_id"]
    return {"data": payload}


@router.get("/{contact_id}")
async def get_contact(contact_id: str, db=Depends(get_db)):
    doc = await db["contacts"].find_one({"_id": contact_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.patch("/{contact_id}")
async def update_contact(contact_id: str, req: Request, db=Depends(get_db)):
    payload = await req.json()
    payload["updatedAt"] = datetime.utcnow()
    result = await db["contacts"].update_one({"_id": contact_id}, {"$set": payload})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    doc = await db["contacts"].find_one({"_id": contact_id})
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.post("/{contact_id}/sequence/{step}")
async def toggle_sequence_step(
    contact_id: str,
    step: str,
    req: Request,
    db=Depends(get_db)
):
    """
    Marca o desmarca un paso de secuencia en un contacto.
    Al marcar como done=true, crea o actualiza una Actividad (deduplicada por contactId+type).
    """
    if step not in VALID_SEQUENCE_STEPS:
        raise HTTPException(status_code=400, detail=f"Paso inválido. Opciones: {sorted(VALID_SEQUENCE_STEPS)}")

    contact = await db["contacts"].find_one({"_id": contact_id})
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

    body = await req.json()
    done: bool = bool(body.get("done", True))
    now = datetime.utcnow()
    user_id = req.headers.get("x-user-id", "unknown")

    seq = contact.get("sequence") or {}
    seq[step] = {"done": done, "doneAt": now.isoformat() if done else None}

    await db["contacts"].update_one(
        {"_id": contact_id},
        {"$set": {"sequence": seq, "updatedAt": now}}
    )

    if done:
        activity_type = STEP_ACTIVITY_TYPE.get(step, "OTHER")

        # Resolve dealId: most recently updated active deal for this contact's prospect
        deal_id = None
        if contact.get("prospectId"):
            deal = await db["deals"].find_one(
                {
                    "prospectId": contact["prospectId"],
                    "stage": {"$nin": ["GANADO", "PERDIDO"]},
                    "deleted": {"$ne": True},
                },
                sort=[("updatedAt", -1)]
            )
            if deal:
                deal_id = deal["_id"]

        # Upsert: find existing activity for this (contactId, type) pair
        existing = await db["activities"].find_one({
            "contactId": contact_id,
            "type": f"SEQ_{step.upper()}",
        })
        if existing:
            await db["activities"].update_one(
                {"_id": existing["_id"]},
                {"$set": {"doneAt": now, "dealId": deal_id, "updatedAt": now}}
            )
        else:
            activity_id = f"act_{uuid.uuid4().hex[:12]}"
            await db["activities"].insert_one({
                "_id": activity_id,
                "contactId": contact_id,
                "dealId": deal_id,
                "prospectId": contact.get("prospectId"),
                "type": f"SEQ_{step.upper()}",
                "notes": f"Secuencia: {step}",
                "doneAt": now,
                "createdById": user_id,
                "createdAt": now,
            })

    doc = await db["contacts"].find_one({"_id": contact_id})
    doc["id"] = doc["_id"]
    return {"data": doc}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str, db=Depends(get_db)):
    result = await db["contacts"].delete_one({"_id": contact_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
```

- [ ] **Step 2: Verify the router still loads correctly**

```bash
cd backend && python -c "from app.api.v1.endpoints.contacts import router; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**
```bash
git add backend/app/api/v1/endpoints/contacts.py backend/app/models/activity.py
git commit -m "feat: sequence step endpoint + countries endpoint + extended contact filters"
```

---

## Chunk 5: Frontend — Extended Contacts UI

### File Map
- Modify: `frontend/src/views/ContactsView.tsx` — extended table + filters
- Create: `frontend/src/components/ContactDetailPanel.tsx` — slide-over panel
- Modify: `frontend/src/views/ContactsView.tsx` — wire up panel + new contact modal fields

---

### Task 12: Create ContactDetailPanel component

**Files:**
- Create: `frontend/src/components/ContactDetailPanel.tsx`

This is the right-side slide-over panel shown when a contact row is clicked.

- [ ] **Step 1: Create the file**

Create `frontend/src/components/ContactDetailPanel.tsx`:

```tsx
import React, { useEffect, useState } from 'react'
import { X, Linkedin, Mail, Phone, MapPin, Target, ExternalLink, Building2 } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { api } from '../lib/api'

const SEQUENCE_STEPS: { key: string; label: string }[] = [
  { key: 'linkedinInviteSent', label: 'Invitación LinkedIn enviada' },
  { key: 'linkedinAccepted',   label: 'LinkedIn aceptado' },
  { key: 'linkedinMessage',    label: 'Mensaje LinkedIn' },
  { key: 'email1',             label: 'Correo 1' },
  { key: 'email2',             label: 'Correo 2' },
  { key: 'email3',             label: 'Correo 3' },
  { key: 'whatsapp',           label: 'WhatsApp' },
  { key: 'call',               label: 'Llamada' },
  { key: 'firstMeeting',       label: 'Primera reunión' },
  { key: 'followUpEmail',      label: 'Mail de seguimiento' },
  { key: 'proposalPrep',       label: 'Preparación de propuesta' },
  { key: 'proposalMeeting',    label: 'Reunión de propuesta' },
]

const TEMP_META: Record<string, { label: string; color: string }> = {
  CALIENTE: { label: 'Caliente', color: 'bg-red-50 text-red-700 border-red-200' },
  TIBIO:    { label: 'Tibio',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
  FRIO:     { label: 'Frío',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto', SENAL_DETECTADA: 'Señal',
  PRIMER_CONTACTO: 'Primer Contacto', EN_SECUENCIA: 'En Secuencia',
  REUNION_AGENDADA: 'Reunión Agendada', PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación', GANADO: 'Ganado', PERDIDO: 'Perdido',
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

interface Props {
  contactId: string | null
  onClose: () => void
}

export function ContactDetailPanel({ contactId, onClose }: Props) {
  const [contact, setContact] = useState<any>(null)
  const [deals, setDeals] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [toggling, setToggling] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (!contactId) return
    setContact(null)
    setDeals([])
    setActivities([])

    api.get(`/contacts/${contactId}`).then(r => {
      if (r?.data) {
        setContact(r.data)
        setForm({
          name: r.data.name ?? '',
          role: r.data.role ?? '',
          email: r.data.email ?? '',
          phone: r.data.phone ?? '',
          country: r.data.country ?? '',
          city: r.data.city ?? '',
          impactAreas: r.data.impactAreas ?? '',
          temperature: r.data.temperature ?? '',
          notes: r.data.notes ?? '',
          linkedinUrl: r.data.linkedinUrl ?? '',   // must be in form state for controlled input
        })

        // Load deals for this prospect
        if (r.data.prospectId) {
          api.get(`/deals?limit=20`).then(dr => {
            const all = dr?.data ?? []
            setDeals(all.filter((d: any) => d.prospectId === r.data.prospectId && d.stage !== 'PERDIDO'))
          })
          // Load recent activities for prospect
          api.get(`/activities?prospectId=${r.data.prospectId}&limit=5`).then(ar => {
            setActivities(ar?.data ?? [])
          })
        }
      }
    })
  }, [contactId])

  const toggleStep = async (step: string, currentDone: boolean) => {
    if (!contact) return
    setToggling(step)
    const res = await api.post(`/contacts/${contact.id}/sequence/${step}`, { done: !currentDone })
    if (res?.data) setContact(res.data)
    setToggling(null)
  }

  const saveEdit = async () => {
    if (!contact) return
    const res = await api.patch(`/contacts/${contact.id}`, form)
    if (res?.data) { setContact(res.data); setEditing(false) }
  }

  const seq = contact?.sequence ?? {}
  const doneCount = SEQUENCE_STEPS.filter(s => seq[s.key]?.done).length

  return (
    <AnimatePresence>
      {contactId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant shrink-0">
              <span className="text-sm font-bold text-on-surface-variant uppercase tracking-wider">Perfil de Contacto</span>
              <button onClick={onClose} className="p-1.5 hover:bg-surface-container rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>

            {!contact ? (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">Cargando...</div>
            ) : (
              <div className="flex-1 overflow-y-auto">

                {/* Identity */}
                <div className="px-6 py-5 border-b border-outline-variant">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-lg text-brand-primary-container shrink-0">
                      {(contact.name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-lg text-on-surface">{contact.name}</div>
                      {contact.role && <div className="text-sm text-on-surface-variant">{contact.role}</div>}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {contact.temperature && TEMP_META[contact.temperature] && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${TEMP_META[contact.temperature].color}`}>
                            {TEMP_META[contact.temperature].label}
                          </span>
                        )}
                        {contact.prospectName && (
                          <span className="flex items-center gap-1 text-xs text-brand-primary-container font-medium">
                            <Building2 size={11} /> {contact.prospectName}
                          </span>
                        )}
                        {contact.linkedinUrl && (
                          <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Linkedin size={11} /> LinkedIn <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditing(e => !e)}
                      className="shrink-0 text-xs text-on-surface-variant border border-outline-variant px-2 py-1 rounded-lg hover:bg-surface-container"
                    >
                      {editing ? 'Cancelar' : 'Editar'}
                    </button>
                  </div>
                </div>

                {/* Editable Info */}
                {editing ? (
                  <div className="px-6 py-4 border-b border-outline-variant space-y-3">
                    {[
                      { label: 'Nombre', key: 'name' },
                      { label: 'Cargo', key: 'role' },
                      { label: 'Email', key: 'email' },
                      { label: 'Teléfono', key: 'phone' },
                      { label: 'País', key: 'country' },
                      { label: 'Ciudad', key: 'city' },
                      { label: 'Áreas de impacto', key: 'impactAreas' },
                      { label: 'LinkedIn', key: 'linkedinUrl' },
                    ].map(f => (
                      <div key={f.key} className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-on-surface-variant uppercase">{f.label}</label>
                        <input
                          value={form[f.key] ?? ''}
                          onChange={e => setForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                          className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary-container"
                        />
                      </div>
                    ))}
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Temperatura</label>
                      <select
                        value={form.temperature ?? ''}
                        onChange={e => setForm((prev: any) => ({ ...prev, temperature: e.target.value }))}
                        className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                      >
                        <option value="">Sin clasificar</option>
                        <option value="CALIENTE">Caliente</option>
                        <option value="TIBIO">Tibio</option>
                        <option value="FRIO">Frío</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-on-surface-variant uppercase">Comentarios</label>
                      <textarea
                        value={form.notes ?? ''}
                        onChange={e => setForm((prev: any) => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm focus:outline-none resize-none"
                      />
                    </div>
                    <button
                      onClick={saveEdit}
                      className="w-full py-2 bg-brand-primary-container text-white rounded-lg text-sm font-bold"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                ) : (
                  <div className="px-6 py-4 border-b border-outline-variant space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <Mail size={13} /> {contact.email}
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <Phone size={13} /> {contact.phone}
                      </div>
                    )}
                    {(contact.city || contact.country) && (
                      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                        <MapPin size={13} />
                        {[contact.city, contact.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    {contact.impactAreas && (
                      <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                        <Target size={13} className="shrink-0 mt-0.5" />
                        <span>{contact.impactAreas}</span>
                      </div>
                    )}
                    {contact.notes && (
                      <div className="mt-2 p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant">
                        {contact.notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Sequence Checklist */}
                <div className="px-6 py-4 border-b border-outline-variant">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      Secuencia de Contacto
                    </span>
                    <span className="text-xs font-bold text-brand-primary-container">
                      {doneCount}/{SEQUENCE_STEPS.length}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-surface-container rounded-full mb-3 overflow-hidden">
                    <div
                      className="h-full bg-brand-primary-container rounded-full transition-all"
                      style={{ width: `${(doneCount / SEQUENCE_STEPS.length) * 100}%` }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    {SEQUENCE_STEPS.map(({ key, label }) => {
                      const step = seq[key] ?? { done: false, doneAt: null }
                      const isLoading = toggling === key
                      return (
                        <button
                          key={key}
                          onClick={() => toggleStep(key, step.done)}
                          disabled={isLoading}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                            step.done
                              ? 'bg-green-50 hover:bg-green-100'
                              : 'hover:bg-surface-container-low'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            step.done
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-outline-variant'
                          }`}>
                            {step.done && !isLoading && <span className="text-[10px] font-bold">✓</span>}
                            {isLoading && <span className="text-[10px]">…</span>}
                          </div>
                          <span className={`text-xs flex-1 ${step.done ? 'text-green-700 font-medium' : 'text-on-surface-variant'}`}>
                            {label}
                          </span>
                          {step.done && step.doneAt && (
                            <span className="text-[10px] text-green-600 shrink-0">{fmtDate(step.doneAt)}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Associated Deals */}
                {deals.length > 0 && (
                  <div className="px-6 py-4 border-b border-outline-variant">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block">
                      Oportunidades ({deals.length})
                    </span>
                    <div className="space-y-2">
                      {deals.map((d: any) => (
                        <div key={d.id} className="flex items-center justify-between text-xs">
                          <span className="text-on-surface">{d.serviceType?.replace(/_/g, ' ')}</span>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold uppercase">
                              {STAGE_LABELS[d.stage] ?? d.stage}
                            </span>
                            <span className="font-bold text-on-surface">
                              {d.value != null ? `$${(d.value as number).toLocaleString('es-CO')}` : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                {activities.length > 0 && (
                  <div className="px-6 py-4">
                    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3 block">
                      Actividades Recientes
                    </span>
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((a: any) => (
                        <div key={a.id ?? a._id} className="flex items-start gap-3 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary-container mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-on-surface">{a.type?.replace('SEQ_', '')}</span>
                            {a.notes && <span className="text-on-surface-variant ml-1">— {a.notes}</span>}
                            <div className="text-on-surface-variant mt-0.5">{fmtDate(a.doneAt)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/src/components/ContactDetailPanel.tsx
git commit -m "feat: ContactDetailPanel — slide-over with full profile, sequence checklist, deals, activities"
```

---

### Task 13: Extend ContactsView — new columns, filters, panel integration

**Files:**
- Modify: `frontend/src/views/ContactsView.tsx`

- [ ] **Step 1: Add new imports**

At the top of `frontend/src/views/ContactsView.tsx`, add/update imports:
```tsx
import { Search, Plus, X, User, Mail, Phone, Building2, Briefcase, Linkedin, MapPin, Filter } from 'lucide-react'
import { ContactDetailPanel } from '../components/ContactDetailPanel'
```

- [ ] **Step 2: Add countries fetch and filter state**

Inside the `ContactsView` function, add state before the existing `load` function:
```tsx
const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
const [temperature, setTemperature] = useState('')
const [country, setCountry] = useState('')
const [countries, setCountries] = useState<string[]>([])
```

Add a `loadCountries` effect, and **replace** the existing `useEffect(() => { load() }, [])` with the filter-aware version (do NOT keep the old one — having both causes a double load on mount):
```tsx
// REPLACE the existing useEffect(() => { load() }, []) with this:
useEffect(() => { load() }, [temperature, country])

// ADD this separately for countries (run once on mount only):
useEffect(() => {
  api.get('/contacts/countries').then(r => {
    if (r?.data) setCountries(r.data)
  })
}, [])
```

- [ ] **Step 3: Update `load` to pass filters and replace the useEffect**

Replace the `load` function AND its existing `useEffect`:
```tsx
const load = () => {
  setLoading(true)
  const params = new URLSearchParams({ limit: '500' })
  if (temperature) params.set('temperature', temperature)
  if (country)     params.set('country', country)
  api.get(`/contacts?${params.toString()}`).then(d => {
    if (d) setContacts(Array.isArray(d) ? d : d.data ?? [])
    setLoading(false)
  })
}
```

**Important:** Find the existing `useEffect(() => { load() }, [])` and replace it entirely with:
```tsx
useEffect(() => { load() }, [temperature, country])
```
Do not keep both — only one `load` useEffect should exist.

- [ ] **Step 4: Update the toolbar to add filters**

Replace the existing toolbar div (the one with `<Search ...>` and the contact count):
```tsx
<div className="p-4 border-b border-outline-variant bg-surface-container-low/20 flex gap-3 items-center flex-wrap">
  <div className="relative w-64">
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
    <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
      placeholder="Buscar contacto, empresa, ciudad..."
      className="pl-9 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brand-primary-container" />
  </div>

  {/* Temperature filter */}
  <select
    value={temperature}
    onChange={e => { setTemperature(e.target.value); setPage(1) }}
    className="border border-outline-variant rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
  >
    <option value="">Todas las temperaturas</option>
    <option value="CALIENTE">🔴 Caliente</option>
    <option value="TIBIO">🟡 Tibio</option>
    <option value="FRIO">🔵 Frío</option>
  </select>

  {/* Country filter */}
  {countries.length > 0 && (
    <select
      value={country}
      onChange={e => { setCountry(e.target.value); setPage(1) }}
      className="border border-outline-variant rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none"
    >
      <option value="">Todos los países</option>
      {countries.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )}

  <span className="text-xs text-on-surface-variant ml-auto">{contacts.length} contactos</span>
</div>
```

- [ ] **Step 5: Update the table header and rows**

Replace the `<thead>` row:
```tsx
<tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
  <th className="px-6 py-4">Contacto</th>
  <th className="px-6 py-4">Cargo</th>
  <th className="px-6 py-4">Empresa</th>
  <th className="px-4 py-4">Ubicación</th>
  <th className="px-4 py-4">Temperatura</th>
  <th className="px-4 py-4">Secuencia</th>
  <th className="px-4 py-4">LinkedIn</th>
</tr>
```

Replace each `<tr>` in the rows section:
```tsx
{slice.map((c, i) => {
  const seq = c.sequence ?? {}
  const doneCount = ['linkedinInviteSent','linkedinAccepted','linkedinMessage','email1','email2','email3','whatsapp','call','firstMeeting','followUpEmail','proposalPrep','proposalMeeting']
    .filter(k => seq[k]?.done).length
  const tempMeta: Record<string, { label: string; color: string }> = {
    CALIENTE: { label: 'Caliente', color: 'bg-red-50 text-red-700 border-red-200' },
    TIBIO:    { label: 'Tibio',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
    FRIO:     { label: 'Frío',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  }
  const temp = c.temperature ? tempMeta[c.temperature] : null

  return (
    <tr
      key={c.id ?? i}
      onClick={() => setSelectedPanel(c.id)}
      className="hover:bg-surface-container-low/20 transition-colors cursor-pointer"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-xs text-brand-primary-container shrink-0">
            {(c.name ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-bold text-on-surface">{c.name}</div>
            {c.email && (
              <div className="text-[10px] text-on-surface-variant flex items-center gap-1">
                <Mail size={9} /> {c.email}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
          {c.role && <Briefcase size={12} />}
          {c.role ?? '—'}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-sm">
          {(c.prospect?.name ?? c.prospectName) && <Building2 size={12} className="text-on-surface-variant shrink-0" />}
          <span className="text-brand-primary-container font-medium">
            {c.prospect?.name ?? c.prospectName ?? '—'}
          </span>
        </div>
      </td>
      <td className="px-4 py-4">
        {(c.city || c.country)
          ? <div className="flex items-center gap-1 text-xs text-on-surface-variant">
              <MapPin size={11} />
              {[c.city, c.country].filter(Boolean).join(', ')}
            </div>
          : <span className="text-sm text-on-surface-variant">—</span>
        }
      </td>
      <td className="px-4 py-4">
        {temp
          ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${temp.color}`}>{temp.label}</span>
          : <span className="text-sm text-on-surface-variant">—</span>
        }
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-primary-container rounded-full"
              style={{ width: `${(doneCount / 12) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-on-surface-variant">{doneCount}/12</span>
        </div>
      </td>
      <td className="px-4 py-4">
        {c.linkedinUrl
          ? <a href={c.linkedinUrl} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Linkedin size={13} />
            </a>
          : <span className="text-sm text-on-surface-variant">—</span>
        }
      </td>
    </tr>
  )
})}
```

- [ ] **Step 6: Add the ContactDetailPanel at the bottom of the return**

At the very end of the `ContactsView` return, before the closing `</div>`, add:
```tsx
<ContactDetailPanel
  contactId={selectedPanel}
  onClose={() => setSelectedPanel(null)}
/>
```

- [ ] **Step 7: Commit**
```bash
git add frontend/src/views/ContactsView.tsx
git commit -m "feat: extended ContactsView — LinkedIn, location, temperature, sequence progress, slide-over panel"
```

---

### Task 14: Update NewContactModal with new fields

**Files:**
- Modify: `frontend/src/views/ContactsView.tsx`

- [ ] **Step 1: Update form state in NewContactModal**

In the `NewContactModal` component inside `ContactsView.tsx`, update the initial form state:
```tsx
const [form, setForm] = useState({
  name: '', email: '', phone: '', role: '',
  prospectSearch: '', prospectId: '',
  country: 'Colombia', city: '', impactAreas: '',
  temperature: '', linkedinUrl: '',
})
```

- [ ] **Step 2: Add new fields to the form JSX**

After the existing "Cargo / Rol" field, add:
```tsx
<div className="grid grid-cols-2 gap-3">
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">País</label>
    <input value={form.country} onChange={e => set('country', e.target.value)}
      placeholder="Colombia"
      className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
  </div>
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Ciudad</label>
    <input value={form.city} onChange={e => set('city', e.target.value)}
      placeholder="Bogotá"
      className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
  </div>
</div>

<div className="flex flex-col gap-1.5">
  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Temperatura</label>
  <select value={form.temperature} onChange={e => set('temperature', e.target.value)}
    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container">
    <option value="">Sin clasificar</option>
    <option value="CALIENTE">Caliente</option>
    <option value="TIBIO">Tibio</option>
    <option value="FRIO">Frío</option>
  </select>
</div>

<div className="flex flex-col gap-1.5">
  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">LinkedIn URL</label>
  <input value={form.linkedinUrl} onChange={e => set('linkedinUrl', e.target.value)}
    placeholder="https://linkedin.com/in/..."
    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
</div>

<div className="flex flex-col gap-1.5">
  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Áreas de impacto</label>
  <input value={form.impactAreas} onChange={e => set('impactAreas', e.target.value)}
    placeholder="Ej: Educación, Finanzas, Medio ambiente..."
    className="border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
</div>
```

- [ ] **Step 3: Update the submit body to include new fields**

In the `submit` function, update the `body` object:
```tsx
const body: any = {
  name: form.name.trim(),
  email: form.email.trim() || undefined,
  phone: form.phone.trim() || undefined,
  role: form.role.trim() || undefined,
  prospectId: form.prospectId || undefined,
  country: form.country.trim() || 'Colombia',
  city: form.city.trim() || undefined,
  temperature: form.temperature || undefined,
  linkedinUrl: form.linkedinUrl.trim() || undefined,
  impactAreas: form.impactAreas.trim() || undefined,
}
```

Also reset the new fields on success:
```tsx
setForm({
  name: '', email: '', phone: '', role: '',
  prospectSearch: '', prospectId: '',
  country: 'Colombia', city: '', impactAreas: '',
  temperature: '', linkedinUrl: '',
})
```

- [ ] **Step 4: Commit**
```bash
git add frontend/src/views/ContactsView.tsx
git commit -m "feat: NewContactModal — add country, city, temperature, LinkedIn, impact areas fields"
```

---

## Final Verification

- [ ] **Start both backend and frontend**

```bash
# Terminal 1
cd backend && python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Terminal 2
cd frontend && npm run server
```

- [ ] **Verify session persistence**
  - Log in → restart the frontend server → refresh browser → still logged in ✅

- [ ] **Verify SuperAdmin flow**
  - In Settings → Perfil y Cuenta → click "Activar SuperAdmin" → badge updates immediately ✅
  - Settings → Usuarios y Roles → users appear ✅

- [ ] **Verify deal values**
  - Settings → Herramientas Admin → click "Vista Previa" → see count
  - Click "Ejecutar Reset" → deals show `—` in Opportunities view ✅

- [ ] **Verify contacts**
  - Contacts view shows LinkedIn icon, País/Ciudad, Temperatura badge, Sequence progress ✅
  - Click a contact row → slide-over panel opens ✅
  - Check a sequence step → checkbox turns green, activity created in DB ✅
  - New Contact modal shows all new fields ✅

- [ ] **Final commit**
```bash
git add docs/superpowers/plans/
git commit -m "docs: add CRM improvements implementation plan"
```
