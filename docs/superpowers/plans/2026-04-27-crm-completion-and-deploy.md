# CoimpactoB CRM — Completion & Azure Deploy Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all data-flow bugs between frontend and backend, complete every UI section to be 100% functional, and deploy the full stack (FastAPI + Express/Vite) to Azure with Cosmos DB.

**Architecture:** FastAPI (Python) backend speaks MongoDB protocol to Azure Cosmos DB. An Express server (TypeScript) verifies Google OAuth, manages sessions, proxies `/api/*` to FastAPI with auth headers, and serves the Vite-built React frontend in production. In dev, Vite proxies to Express.

**Tech Stack:** FastAPI · Motor (async MongoDB driver) · Azure Cosmos DB (Mongo API) · Vite 6 · React 19 · Express 4 · express-session · google-auth-library · Tailwind CSS 4 · @dnd-kit · motion/react · Docker · Azure Container Apps (or App Service)

---

## Chunk 1: Critical Bug Fixes (Backend + Frontend Data Flow)

These bugs prevent the app from working at all. Fix them first.

---

### Task 1: Fix `/users/me` — Auth Endpoint Missing

**Problem:** `server.ts` calls `GET /api/v1/users/me` but it doesn't exist. Login works on Google side but user role always defaults to `SALES` and backend user is never created.

**Files:**
- Modify: `backend/app/api/v1/endpoints/users.py`

- [ ] **Step 1: Add `/me` endpoint** at the top of the users router (before the other routes):

```python
from fastapi import APIRouter, Depends, Query, Request
from app.database import get_db
from datetime import datetime
import uuid

# ... existing code ...

@router.get("/me")
async def get_or_create_me(req: Request, db=Depends(get_db)):
    """
    Called by Express server on every Google login.
    Gets or creates user by email from x-user-email header.
    Returns { role } for the session.
    """
    email = req.headers.get("x-user-email", "")
    name = req.headers.get("x-user-name", "")
    if not email:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="x-user-email header required")

    users_col = db["users"]
    user = await users_col.find_one({"email": email})
    if user:
        return {"role": user.get("role", "SALES"), "id": str(user.get("_id", email))}

    # First user becomes ADMIN
    count = await users_col.count_documents({})
    role = "ADMIN" if count == 0 else "SALES"
    name_clean = name or email.split("@")[0].replace(".", " ").replace("_", " ").title()

    await users_col.insert_one({
        "_id": email,
        "email": email,
        "name": name_clean,
        "role": role,
        "createdAt": datetime.utcnow(),
    })

    # Auto-create team_member
    existing_team = await db["team_members"].find_one({"email": email})
    if not existing_team:
        await db["team_members"].insert_one({
            "_id": f"tm_{uuid.uuid4().hex[:12]}",
            "name": name_clean,
            "email": email,
            "role": "SALES_REP",
            "isActive": True,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        })

    return {"role": role, "id": email}
```

- [ ] **Step 2: Fix server.ts to pass name header and parse response correctly**

In `frontend/server.ts`, replace the `/users/me` fetch block (lines ~38-50):

```typescript
    let userRole = 'SALES'
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
        const userData = await userRes.json()
        userRole = userData.role ?? 'SALES'
      }
    } catch {
      // backend not reachable, default to SALES
    }
```

- [ ] **Step 3: Test login flow**

Start both servers, login with Google, check browser console for `/auth/google` 200 response with `{ ok: true, user: { role: 'ADMIN' } }`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/users.py frontend/server.ts
git commit -m "fix: add /users/me endpoint for auth role lookup on login"
```

---

### Task 2: Fix API Response Unwrapping in All Frontend Views

**Problem:** Every backend endpoint returns `{ data: ... }`. The frontend `api.ts` returns the full JSON (no unwrapping). But all views access wrong keys:
- `OpportunitiesView`: `d.deals` → should be `d.data`
- `AccountsView`, `ContactsView`, `ActivitiesView`: same pattern
- `DashboardView`: `d.totalPipelineValue` etc — doesn't exist, metrics lives at `d.data.summary`
- `GoalsView`: `d.goals` → should be `d.data.goals`
- `OpportunityDetailView`: `d` (deal) → should be `d.data`; activities → `d.data`

**Files:**
- Modify: `frontend/src/views/OpportunitiesView.tsx`
- Modify: `frontend/src/views/AccountsView.tsx`
- Modify: `frontend/src/views/ContactsView.tsx`
- Modify: `frontend/src/views/ActivitiesView.tsx`
- Modify: `frontend/src/views/GoalsView.tsx`
- Modify: `frontend/src/views/DashboardView.tsx`
- Modify: `frontend/src/views/OpportunityDetailView.tsx`
- Modify: `frontend/src/views/SettingsView.tsx`

- [ ] **Step 1: Fix OpportunitiesView** — change line `d.deals ?? []` to `d.data ?? []`:

```typescript
api.get('/deals').then(d => {
  if (d) setDeals(Array.isArray(d) ? d : d.data ?? [])
  setLoading(false)
})
```

- [ ] **Step 2: Fix AccountsView** — change `d.prospects ?? []` to `d.data ?? []`:

```typescript
api.get('/prospects').then(d => {
  if (d) setProspects(Array.isArray(d) ? d : d.data ?? [])
  setLoading(false)
})
```

- [ ] **Step 3: Fix ContactsView** — change `d.contacts ?? []` to `d.data ?? []`:

```typescript
api.get('/contacts').then(d => {
  if (d) setContacts(Array.isArray(d) ? d : d.data ?? [])
  setLoading(false)
})
```

- [ ] **Step 4: Fix ActivitiesView** — change `d.activities ?? []` to `d.data ?? []`:

```typescript
api.get('/activities').then(d => {
  if (d) setActivities(Array.isArray(d) ? d : d.data ?? [])
  setLoading(false)
})
```

- [ ] **Step 5: Fix GoalsView** — change `d.goals ?? []` to `d.data?.goals ?? []`:

```typescript
api.get('/metrics').then(d => {
  if (d) setGoals(d.data?.goals ?? [])
  setLoading(false)
})
```

- [ ] **Step 6: Fix DashboardView** — remap metrics to actual backend shape.

Replace the whole `useEffect` and derived values section with:

```typescript
useEffect(() => {
  api.get('/metrics').then(d => {
    if (d) setMetrics(d.data ?? d)
    setLoading(false)
  })
}, [])

const m = metrics ?? {}
const summary = m.summary ?? {}
const goals: any[] = m.goals ?? []
const totalTarget = goals.reduce((s: number, g: any) => s + (g.targetValue ?? 0), 0)
const totalCurrent = goals.reduce((s: number, g: any) => s + (g.currentValue ?? 0), 0)
const completionPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0
const gap = totalTarget - totalCurrent

const stats = [
  { label: 'Pipeline Total', value: loading ? '...' : fmt(summary.totalPipeline ?? 0), icon: TrendingUp, color: 'text-blue-600' },
  { label: 'Deals Activos', value: loading ? '...' : String(summary.totalDeals ?? 0), icon: Activity, color: 'text-brand-secondary-container' },
  { label: 'Metas Ganadas', value: loading ? '...' : `${completionPct}%`, icon: Trophy, color: 'text-brand-tertiary-container' },
  { label: 'Ganados', value: loading ? '...' : String(summary.won ?? 0), icon: AlertTriangle, color: 'text-green-600' },
]
```

Remove the `alertCount` variable. Remove the alerts section from JSX (replace with leaderboard — see Task 6).

- [ ] **Step 7: Fix OpportunityDetailView** — deal and activities unwrapping:

```typescript
// Deal
api.get(`/deals/${id}`).then(d => d && setDeal(d.data ?? d))

// Activities in loadActivities()
api.get(`/activities?dealId=${id}`).then(d => {
  if (d) setActivities(Array.isArray(d) ? d : d.data ?? [])
})
```

- [ ] **Step 8: Fix SettingsView UsersTab** — `d.users` → `d.data`:

```typescript
api.get('/users').then(d => {
  if (d) setUsers(Array.isArray(d) ? d : d.data ?? [])
  setLoading(false)
})
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/views/
git commit -m "fix: unwrap backend { data } envelope in all views"
```

---

### Task 3: Fix Deal Creation — Remove Mandatory Fields

**Problem:** `DealService.create_deal` requires `problem`, `benefit`, `nextAction`, `nextActionDate`. The modal only sends basic info. This throws a 400 on every deal creation.

**Files:**
- Modify: `backend/app/services/deal_service.py`
- Modify: `backend/app/schemas/deal.py`

- [ ] **Step 1: Check current DealCreate schema**

```bash
cat backend/app/schemas/deal.py
```

- [ ] **Step 2: Make problem/benefit/nextAction optional in DealCreate schema**

In `backend/app/schemas/deal.py`, change required fields to Optional with defaults:

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class DealCreate(BaseModel):
    prospectId: str
    serviceType: str
    value: float = 0.0
    stage: str = "PROSPECTO_IDENTIFICADO"
    line: Optional[str] = None
    contactId: Optional[str] = None
    assignedTo: Optional[str] = None
    quarter: Optional[str] = None
    region: Optional[str] = None
    problem: Optional[str] = ""
    benefit: Optional[str] = ""
    nextAction: Optional[str] = ""
    nextActionDate: Optional[datetime] = None
    notes: Optional[str] = None

class DealUpdate(BaseModel):
    stage: Optional[str] = None
    value: Optional[float] = None
    serviceType: Optional[str] = None
    line: Optional[str] = None
    problem: Optional[str] = None
    benefit: Optional[str] = None
    nextAction: Optional[str] = None
    nextActionDate: Optional[datetime] = None
    assignedTo: Optional[str] = None
    contactId: Optional[str] = None
    quarter: Optional[str] = None
    region: Optional[str] = None
    notes: Optional[str] = None
    deleted: Optional[bool] = None
```

- [ ] **Step 3: Remove mandatory validations from DealService.create_deal**

In `backend/app/services/deal_service.py`, replace the validation block (lines 15-23) with:

```python
async def create_deal(self, deal_data: dict, user_id: str) -> Deal:
    deal_data["_id"] = f"deal_{uuid.uuid4().hex[:12]}"
    deal_data["createdAt"] = datetime.utcnow()
    deal_data["updatedAt"] = datetime.utcnow()
    deal_data["assignedTo"] = deal_data.get("assignedTo") or user_id
    deal_data.setdefault("stage", "PROSPECTO_IDENTIFICADO")
    deal_data.setdefault("probability", 0.0)
    deal_data.setdefault("ponderatedValue", 0.0)
    deal_data.setdefault("problem", "")
    deal_data.setdefault("benefit", "")
    deal_data.setdefault("nextAction", "")

    await self.collection.insert_one(deal_data)
    deal_data["id"] = deal_data["_id"]
    return Deal(**deal_data)
```

- [ ] **Step 4: Test via browser** — Create an opportunity from the modal, verify it appears in the pipeline.

- [ ] **Step 5: Commit**

```bash
git add backend/app/schemas/deal.py backend/app/services/deal_service.py
git commit -m "fix: make deal creation fields optional — modal only sends minimal data"
```

---

### Task 4: Fix move-stage — Query Param vs Body

**Problem:** Backend `move-stage` endpoint reads `new_stage` as a Query param. Frontend sends `{ stage }` in POST body. The stage never changes.

**Files:**
- Modify: `backend/app/api/v1/endpoints/deals.py`

- [ ] **Step 1: Fix move-stage to accept body**

Replace the `move_deal_stage` endpoint:

```python
from pydantic import BaseModel as PydanticBase

class MoveStageBody(PydanticBase):
    stage: str

@router.post("/{deal_id}/move-stage")
async def move_deal_stage(
    deal_id: str,
    body: MoveStageBody,
    req: Request,
    service: DealService = Depends(get_deal_service)
):
    user_id = req.headers.get("x-user-id", "user_default")
    deal = await service.move_to_stage(deal_id, body.stage, user_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal no encontrado")
    return {"data": deal.model_dump(by_alias=True)}
```

- [ ] **Step 2: Verify move_to_stage exists in DealService**

```bash
grep -n "move_to_stage" backend/app/services/deal_service.py
```

If it doesn't exist, add it to `DealService`:

```python
STAGE_PROBABILITIES = {
    "PROSPECTO_IDENTIFICADO": 0.05,
    "SENAL_DETECTADA": 0.10,
    "PRIMER_CONTACTO": 0.15,
    "EN_SECUENCIA": 0.25,
    "REUNION_AGENDADA": 0.40,
    "PROPUESTA_ENVIADA": 0.60,
    "NEGOCIACION": 0.75,
    "GANADO": 1.0,
    "PERDIDO": 0.0,
}

async def move_to_stage(self, deal_id: str, new_stage: str, user_id: str) -> Optional[Deal]:
    deal = await self.get_deal(deal_id)
    if not deal:
        return None
    prob = STAGE_PROBABILITIES.get(new_stage, 0.1)
    ponderated = (deal.value or 0) * prob
    await self.collection.update_one(
        {"_id": deal_id},
        {"$set": {"stage": new_stage, "probability": prob,
                  "ponderatedValue": ponderated, "updatedAt": datetime.utcnow()}}
    )
    return await self.get_deal(deal_id)
```

- [ ] **Step 3: Test Kanban drag** — drag a card between columns, verify stage updates.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/deals.py backend/app/services/deal_service.py
git commit -m "fix: move-stage accepts body {stage} instead of query param"
```

---

## Chunk 2: Complete Missing Functionality

### Task 5: Deal Edit Modal + Stage Control in Detail View

**Problem:** `OpportunityDetailView` has a "Nueva Actividad" button that does nothing. Stage shown but can't be changed. No way to edit deal value/notes.

**Files:**
- Modify: `frontend/src/views/OpportunityDetailView.tsx`
- Create: `frontend/src/components/modals/ActivityModal.tsx`

- [ ] **Step 1: Create ActivityModal**

Create `frontend/src/components/modals/ActivityModal.tsx`:

```tsx
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'

const ACTIVITY_TYPES = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'CALL', label: 'Llamada' },
  { value: 'MEETING', label: 'Reunión' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'NOTE', label: 'Nota Interna' },
]

interface Props {
  isOpen: boolean
  dealId: string
  prospectId?: string
  onClose: () => void
  onSaved: () => void
}

export function ActivityModal({ isOpen, dealId, prospectId, onClose, onSaved }: Props) {
  const [type, setType] = useState('NOTE')
  const [outcome, setOutcome] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    await api.post('/activities', {
      dealId,
      prospectId,
      type,
      outcome: outcome || type,
      notes,
    })
    setOutcome('')
    setNotes('')
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-lg font-bold">Registrar Actividad</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Tipo</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                >
                  {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Resultado</label>
                <input
                  type="text"
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  placeholder="ej. Reunión agendada para el lunes"
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Notas</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-xl p-3 text-sm h-24 resize-none focus:outline-none focus:border-brand-primary-container"
                  placeholder="Detalles de la actividad..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={onClose} className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold">
                  Cancelar
                </button>
                <button
                  onClick={submit}
                  disabled={loading}
                  className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold shadow disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Wire ActivityModal into OpportunityDetailView**

Add import and state:
```tsx
import { ActivityModal } from '../components/modals/ActivityModal'

// Inside component:
const [activityModal, setActivityModal] = useState(false)
```

Replace the "Nueva Actividad" button `onClick`:
```tsx
<button
  onClick={() => setActivityModal(true)}
  className="flex items-center gap-1 text-brand-primary-container text-sm font-bold"
>
  <Plus size={16} /> Nueva Actividad
</button>
```

Add modal before closing `</div>`:
```tsx
<ActivityModal
  isOpen={activityModal}
  dealId={id}
  prospectId={deal?.prospect?.id}
  onClose={() => setActivityModal(false)}
  onSaved={loadActivities}
/>
```

- [ ] **Step 3: Add stage selector to detail view header**

Below the stage badge in the header, add a stage dropdown:
```tsx
const STAGES = [
  'PROSPECTO_IDENTIFICADO','SENAL_DETECTADA','PRIMER_CONTACTO',
  'EN_SECUENCIA','REUNION_AGENDADA','PROPUESTA_ENVIADA','NEGOCIACION','GANADO','PERDIDO'
]

const [moving, setMoving] = useState(false)

const moveStage = async (newStage: string) => {
  setMoving(true)
  const res = await api.post(`/deals/${id}/move-stage`, { stage: newStage })
  if (res) setDeal((prev: any) => ({ ...prev, stage: newStage }))
  setMoving(false)
}
```

Add after the stage badge:
```tsx
<select
  value={deal.stage}
  onChange={e => moveStage(e.target.value)}
  disabled={moving}
  className="text-xs border border-outline-variant rounded-lg px-2 py-1 bg-surface focus:outline-none ml-2"
>
  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s] ?? s}</option>)}
</select>
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/modals/ActivityModal.tsx frontend/src/views/OpportunityDetailView.tsx
git commit -m "feat: activity modal + stage selector in deal detail view"
```

---

### Task 6: Dashboard — Leaderboard + Real Data Display

**Problem:** Dashboard currently shows empty alerts section (backend doesn't return alerts). Replace with actual leaderboard data from metrics endpoint.

**Files:**
- Modify: `frontend/src/views/DashboardView.tsx`

- [ ] **Step 1: Replace alerts card with leaderboard card**

Replace the entire alerts `<div className="glass-card p-6 flex flex-col">` section with:

```tsx
<div className="glass-card p-6 flex flex-col">
  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
    <Trophy className="text-brand-secondary-container" size={20} />
    Leaderboard
  </h3>
  <div className="space-y-3 flex-1">
    {loading && <div className="text-xs text-on-surface-variant">Cargando...</div>}
    {!loading && (m.leaderboard ?? []).length === 0 && (
      <div className="text-sm text-on-surface-variant">Sin datos aún.</div>
    )}
    {(m.leaderboard ?? []).slice(0, 5).map((entry: any, i: number) => (
      <div key={entry.name} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low/50">
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            i === 0 ? 'bg-yellow-100 text-yellow-700' :
            i === 1 ? 'bg-slate-100 text-slate-600' :
            i === 2 ? 'bg-orange-100 text-orange-700' :
            'bg-surface-container text-on-surface-variant'
          }`}>{i + 1}</span>
          <div>
            <div className="text-sm font-bold text-on-surface">{entry.name}</div>
            <div className="text-[10px] text-on-surface-variant">{entry.deals} oportunidades</div>
          </div>
        </div>
        <div className="text-sm font-bold text-green-600">{fmt(entry.won)}</div>
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Add funnel mini-chart below KPI cards**

After the KPI cards grid, add a funnel summary row:

```tsx
{/* Funnel Summary */}
{!loading && (m.funnel ?? []).length > 0 && (
  <div className="glass-card p-6">
    <h3 className="font-bold text-lg mb-4">Embudo de Pipeline</h3>
    <div className="flex gap-2 items-end overflow-x-auto pb-2">
      {(m.funnel ?? []).filter((f: any) => f.stage !== 'PERDIDO').map((f: any) => {
        const maxCount = Math.max(...(m.funnel ?? []).map((x: any) => x.count), 1)
        const pct = Math.round((f.count / maxCount) * 100)
        return (
          <div key={f.stage} className="flex flex-col items-center gap-1 min-w-[60px]">
            <span className="text-xs font-bold text-on-surface">{f.count}</span>
            <div className="w-full bg-surface-container rounded-t-md" style={{ height: 80 }}>
              <div
                className="w-full bg-brand-primary-container rounded-t-md transition-all"
                style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
              />
            </div>
            <span className="text-[9px] text-on-surface-variant text-center leading-tight">{f.label}</span>
          </div>
        )
      })}
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/DashboardView.tsx
git commit -m "feat: dashboard leaderboard + funnel chart with real data"
```

---

### Task 7: Contacts Endpoint — Backend Check & Fix

**Problem:** `ContactsView` calls `GET /api/contacts` but there's no contacts endpoint in the router.

**Files:**
- Check: `backend/app/api/v1/endpoints/` for contacts
- Create if missing: `backend/app/api/v1/endpoints/contacts.py`
- Modify if needed: `backend/app/api/v1/router.py`

- [ ] **Step 1: Check if contacts endpoint exists**

```bash
ls backend/app/api/v1/endpoints/
```

- [ ] **Step 2: If contacts.py doesn't exist, create it**

Create `backend/app/api/v1/endpoints/contacts.py`:

```python
from fastapi import APIRouter, Depends, Query, Request
from app.database import get_db
from datetime import datetime
import uuid

router = APIRouter(prefix="/contacts", tags=["contacts"])

@router.get("")
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100),
    search: str = Query(""),
    db=Depends(get_db)
):
    query: dict = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]
    docs = await db["contacts"].find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db["contacts"].count_documents(query)
    items = []
    for doc in docs:
        doc["id"] = doc["_id"]
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
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    doc["id"] = doc["_id"]
    return {"data": doc}
```

- [ ] **Step 3: Register contacts router** in `backend/app/api/v1/router.py` if not already there:

```python
from app.api.v1.endpoints import contacts
api_router.include_router(contacts.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/contacts.py backend/app/api/v1/router.py
git commit -m "feat: contacts CRUD endpoint"
```

---

### Task 8: Metrics — Add recentDeals to Response

**Problem:** Dashboard "Tareas Prioritarias" list requires `m.recentDeals` but metrics endpoint doesn't return it.

**Files:**
- Modify: `backend/app/api/v1/endpoints/metrics.py`

- [ ] **Step 1: Add recentDeals to metrics response**

At the bottom of `get_metrics`, before the `return`, add:

```python
# Recent deals (last 10 active, sorted by update)
recent_docs = await db["deals"].find(
    {"stage": {"$nin": ["GANADO", "PERDIDO"]}, "deleted": {"$ne": True}}
).sort("updatedAt", -1).limit(10).to_list(length=10)

recent_deals = []
for doc in recent_docs:
    # Get prospect name
    prospect_name = ""
    if doc.get("prospectId"):
        p = await db["prospects"].find_one({"_id": doc["prospectId"]})
        if p:
            prospect_name = p.get("name", "")
    recent_deals.append({
        "id": doc.get("_id", ""),
        "stage": doc.get("stage", ""),
        "serviceType": doc.get("serviceType", ""),
        "value": doc.get("value", 0),
        "nextAction": doc.get("nextAction", ""),
        "prospectName": prospect_name,
    })
```

Then in the return dict, inside `"data"`, add:
```python
"recentDeals": recent_deals,
```

- [ ] **Step 2: Update DashboardView to use recentDeals**

In `DashboardView.tsx`, the "Tareas Prioritarias" section already reads `m.recentDeals` — since we now map `metrics = d.data`, this will work automatically.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/metrics.py
git commit -m "feat: add recentDeals to metrics endpoint"
```

---

## Chunk 3: Azure Deploy Configuration

### Task 9: Backend .env and Cosmos DB Production Config

**Problem:** Backend `.env.local` has the Cosmos DB connection string but CORS doesn't include production URL. Need to finalize for cloud.

**Files:**
- Modify: `backend/.env.local`
- Modify: `backend/app/config.py`

- [ ] **Step 1: Add production URL to CORS** in `backend/.env.local`:

```
CORS_ORIGINS=["http://localhost:3000","http://localhost:8080","https://YOUR_AZURE_APP_URL"]
```

(Replace `YOUR_AZURE_APP_URL` with the actual Azure URL once known — typically `https://coimpactob-crm.azurewebsites.net`)

- [ ] **Step 2: Update config.py to accept JSON CORS list from env**

In `backend/app/config.py`, ensure the CORS_ORIGINS field properly parses JSON from env:

```python
from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    APP_NAME: str = "CoimpactoB CRM API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    COSMOS_CONNECTION_STRING: str = "mongodb://localhost:27017"
    COSMOS_DATABASE: str = "fabrica_ventas"
    USE_MOCK_DB: bool = False

    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "mixtral-8x7b-32768"

    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@coimpactob.com"

    SECRET_KEY: str = "dev_secret_key_for_local_testing_only"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8080"]

    class Config:
        env_file = (".env.local", ".env")
        case_sensitive = True

settings = Settings()
```

- [ ] **Step 3: Commit**

```bash
git add backend/.env.local backend/app/config.py
git commit -m "chore: update CORS origins for production deploy"
```

---

### Task 10: Dockerfile — Backend

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create backend Dockerfile**

Create `backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system deps for reportlab, openpyxl
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libffi-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 2: Create .dockerignore**

Create `backend/.dockerignore`:

```
__pycache__
*.pyc
*.pyo
.env
.env.local
.git
.gitignore
*.md
```

- [ ] **Step 3: Verify requirements.txt has all deps**

```bash
cat backend/requirements.txt
```

Ensure it includes: `fastapi`, `uvicorn`, `motor`, `pydantic-settings`, `openpyxl`, `reportlab`, `mongomock-motor`, `apscheduler`, `python-multipart`

- [ ] **Step 4: Test build locally**

```bash
cd backend && docker build -t coimpactob-backend .
```

Expected: successful build.

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore
git commit -m "chore: add backend Dockerfile for Azure deployment"
```

---

### Task 11: Dockerfile — Frontend (Express + Vite)

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/.dockerignore`

- [ ] **Step 1: Create frontend Dockerfile**

Create `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY tsconfig*.json ./

# Install tsx for running TypeScript directly
RUN npm install -g tsx

EXPOSE 8080

ENV NODE_ENV=production

CMD ["tsx", "server.ts"]
```

- [ ] **Step 2: Create .dockerignore**

Create `frontend/.dockerignore`:

```
node_modules
dist
.env
.env.local
*.md
```

- [ ] **Step 3: Update server.ts for production cookies**

In `frontend/server.ts`, make cookie secure flag dynamic:

```typescript
app.use(session({
  secret: process.env.SESSION_SECRET || 'coimpactob-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  }
}))
```

Also add trust proxy for Azure (before session middleware):

```typescript
app.set('trust proxy', 1)
```

- [ ] **Step 4: Test build**

```bash
cd frontend && docker build -t coimpactob-frontend .
```

Expected: successful build.

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/.dockerignore frontend/server.ts
git commit -m "chore: add frontend Dockerfile + production session config"
```

---

### Task 12: docker-compose for Local Full-Stack Dev

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create docker-compose.yml** at project root:

```yaml
version: '3.9'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env.local
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "8080:8080"
    environment:
      - FASTAPI_BACKEND_URL=http://backend:8000
      - NODE_ENV=production
    env_file:
      - ./frontend/.env
    depends_on:
      - backend
    restart: unless-stopped
```

- [ ] **Step 2: Test full stack via compose**

```bash
docker-compose up --build
```

Open `http://localhost:8080` — should show login page. Login with Google, verify the app loads.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: docker-compose for full-stack local testing"
```

---

### Task 13: Azure Container Registry + App Deployment

**Context:** This uses Azure CLI. You need:
- Azure subscription with a Resource Group
- Azure Container Registry (ACR) already created, or create one
- Azure Container Apps or App Service

- [ ] **Step 1: Login to Azure**

```bash
az login
az account set --subscription YOUR_SUBSCRIPTION_ID
```

- [ ] **Step 2: Create Container Registry (if not exists)**

```bash
az acr create \
  --resource-group coimpactob-rg \
  --name coimpactobacr \
  --sku Basic \
  --admin-enabled true
```

- [ ] **Step 3: Build and push backend image**

```bash
az acr build \
  --registry coimpactobacr \
  --image coimpactob-backend:latest \
  ./backend
```

- [ ] **Step 4: Build and push frontend image**

```bash
az acr build \
  --registry coimpactobacr \
  --image coimpactob-frontend:latest \
  ./frontend
```

- [ ] **Step 5: Deploy backend to Azure Container Apps**

```bash
az containerapp create \
  --name coimpactob-backend \
  --resource-group coimpactob-rg \
  --image coimpactobacr.azurecr.io/coimpactob-backend:latest \
  --registry-server coimpactobacr.azurecr.io \
  --ingress external \
  --target-port 8000 \
  --env-vars \
    COSMOS_CONNECTION_STRING="secretref:cosmos-conn" \
    COSMOS_DATABASE="fabrica_ventas" \
    USE_MOCK_DB="false" \
    CORS_ORIGINS='["https://coimpactob-frontend.REGION.azurecontainerapps.io"]'
```

Note the backend URL from the output (e.g. `https://coimpactob-backend.REGION.azurecontainerapps.io`).

- [ ] **Step 6: Deploy frontend to Azure Container Apps**

```bash
az containerapp create \
  --name coimpactob-frontend \
  --resource-group coimpactob-rg \
  --image coimpactobacr.azurecr.io/coimpactob-frontend:latest \
  --registry-server coimpactobacr.azurecr.io \
  --ingress external \
  --target-port 8080 \
  --env-vars \
    FASTAPI_BACKEND_URL="https://coimpactob-backend.REGION.azurecontainerapps.io" \
    GOOGLE_CLIENT_ID="233063874546-ggvvl47qinu6rcf26j5j6u4q8fdhe1jn.apps.googleusercontent.com" \
    NODE_ENV="production" \
    SESSION_SECRET="secretref:session-secret"
```

- [ ] **Step 7: Add production URL to Google Cloud Console**

Add the frontend URL (e.g. `https://coimpactob-frontend.REGION.azurecontainerapps.io`) to:
- Authorized JavaScript origins
- Authorized redirect URIs

- [ ] **Step 8: Add production URL to backend CORS** in `backend/.env.local` and redeploy:

```bash
az acr build --registry coimpactobacr --image coimpactob-backend:latest ./backend
az containerapp update --name coimpactob-backend --resource-group coimpactob-rg --image coimpactobacr.azurecr.io/coimpactob-backend:latest
```

- [ ] **Step 9: Verify production**

Open the frontend URL → login with Google → verify dashboard loads with Cosmos DB data.

- [ ] **Step 10: Commit final state**

```bash
git add .
git commit -m "chore: azure container apps deployment — production ready"
```

---

### Task 14: GitHub Actions CI/CD (Optional but Recommended)

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create CI/CD workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push backend
        run: |
          az acr build \
            --registry coimpactobacr \
            --image coimpactob-backend:${{ github.sha }} \
            ./backend
      - name: Deploy backend
        run: |
          az containerapp update \
            --name coimpactob-backend \
            --resource-group coimpactob-rg \
            --image coimpactobacr.azurecr.io/coimpactob-backend:${{ github.sha }}

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v4
      - uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}
      - name: Build and push frontend
        run: |
          az acr build \
            --registry coimpactobacr \
            --image coimpactob-frontend:${{ github.sha }} \
            ./frontend
      - name: Deploy frontend
        run: |
          az containerapp update \
            --name coimpactob-frontend \
            --resource-group coimpactob-rg \
            --image coimpactobacr.azurecr.io/coimpactob-frontend:${{ github.sha }}
```

- [ ] **Step 2: Add GitHub secret**

In GitHub repo → Settings → Secrets → add `AZURE_CREDENTIALS` (JSON from `az ad sp create-for-rbac`).

- [ ] **Step 3: Push to main and verify Actions run**

```bash
git push origin main
```

Check GitHub Actions tab — both jobs should pass.

---

## Summary of All Files Changed

| File | Action |
|------|--------|
| `backend/app/api/v1/endpoints/users.py` | Add `/me` endpoint |
| `backend/app/api/v1/endpoints/deals.py` | Fix move-stage body |
| `backend/app/api/v1/endpoints/contacts.py` | Create contacts CRUD |
| `backend/app/api/v1/endpoints/metrics.py` | Add recentDeals |
| `backend/app/api/v1/router.py` | Register contacts |
| `backend/app/schemas/deal.py` | Make fields optional |
| `backend/app/services/deal_service.py` | Remove mandatory validations, add move_to_stage |
| `backend/app/config.py` | Clean CORS config |
| `backend/Dockerfile` | Create |
| `backend/.dockerignore` | Create |
| `frontend/server.ts` | Fix auth call, production session |
| `frontend/src/views/DashboardView.tsx` | Fix metrics mapping, leaderboard, funnel |
| `frontend/src/views/OpportunitiesView.tsx` | Fix `d.data` unwrap |
| `frontend/src/views/AccountsView.tsx` | Fix `d.data` unwrap |
| `frontend/src/views/ContactsView.tsx` | Fix `d.data` unwrap |
| `frontend/src/views/ActivitiesView.tsx` | Fix `d.data` unwrap |
| `frontend/src/views/GoalsView.tsx` | Fix `d.data.goals` |
| `frontend/src/views/OpportunityDetailView.tsx` | Fix unwrap, add stage selector |
| `frontend/src/views/SettingsView.tsx` | Fix `d.data` unwrap |
| `frontend/src/components/modals/ActivityModal.tsx` | Create |
| `frontend/Dockerfile` | Create |
| `frontend/.dockerignore` | Create |
| `docker-compose.yml` | Create |
| `.github/workflows/deploy.yml` | Create |
