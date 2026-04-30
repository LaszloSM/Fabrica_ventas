# QA Bug Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los 7 bugs encontrados en el QA del 2026-04-30 del CoimpactoB CRM.

**Architecture:** React 19 + Vite SPA (state-based routing sin React Router), Express auth proxy, FastAPI backend con MongoDB. Los fixes tocan frontend (Sidebar, TopNav, ActivityModal, App.tsx) y backend (contacts.py, prospects.py endpoint).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, FastAPI (Python), Motor (async MongoDB)

---

## Chunk 1: Backend fixes (ISSUE-002 + ISSUE-005)

### Task 1: Fix contacts endpoint — batch prospect lookup (ISSUE-002)

**Root cause:** `GET /contacts?limit=500` hace N queries individuales a MongoDB para enriquecer cada contacto con el nombre del prospecto. Con volumen de datos esto provoca timeout/500.

**Files:**
- Modify: `backend/app/api/v1/endpoints/contacts.py:65-82`

- [ ] **Step 1: Reemplazar el loop N+1 con una sola query `$in`**

```python
# contacts.py — reemplazar líneas 65-82 con:
    docs = await db["contacts"].find(query).skip(skip).limit(limit).to_list(length=limit)
    total = await db["contacts"].count_documents(query)

    # Batch fetch prospects in a single query (replaces N+1 loop)
    prospect_ids = list({d["prospectId"] for d in docs if d.get("prospectId")})
    prospects: dict[str, str] = {}
    if prospect_ids:
        async for p in db["prospects"].find(
            {"_id": {"$in": prospect_ids}},
            {"name": 1}
        ):
            prospects[p["_id"]] = p.get("name", "")

    items = []
    for doc in docs:
        doc["id"] = doc.pop("_id", doc.get("id", ""))
        doc["prospectName"] = prospects.get(doc.get("prospectId", ""), None)
        items.append(doc)

    return {"data": items, "total": total}
```

- [ ] **Step 2: Verificar manualmente que el endpoint responde**

```bash
# Desde el directorio backend (con el server corriendo):
curl -s "http://localhost:8000/api/v1/contacts?limit=10" | python -m json.tool | head -20
```
Esperado: JSON con `{"data": [...], "total": N}` sin error 500.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/v1/endpoints/contacts.py
git commit -m "fix: batch prospect lookup in contacts endpoint to prevent 500 on limit=500"
```

---

### Task 2: Fix prospect create response — campo `id` faltante (ISSUE-005)

**Root cause:** `prospects.py` retorna `prospect.model_dump(by_alias=True)` que serializa el campo `id` como `_id` (porque el modelo tiene `id: Field(alias="_id")`). El frontend busca `prospect?.id` y no lo encuentra → muestra error "No se pudo crear la cuenta".

**Files:**
- Modify: `backend/app/api/v1/endpoints/prospects.py:13-19`

- [ ] **Step 1: Cambiar `by_alias=True` a `by_alias=False` en el endpoint create**

```python
# prospects.py línea 18 — cambiar:
# return {"data": prospect.model_dump(by_alias=True)}
# por:
    result = prospect.model_dump(by_alias=False)
    return {"data": result}
```

- [ ] **Step 2: Verificar que la respuesta contiene `id`**

```bash
curl -s -X POST "http://localhost:8000/api/v1/prospects" \
  -H "Content-Type: application/json" \
  -d '{"name": "Empresa Test", "industry": "General", "size": "PEQUEÑA", "region": "Colombia"}' \
  | python -m json.tool
```
Esperado: `{"data": {"id": "prospect_xxx", "name": "Empresa Test", ...}}`

- [ ] **Step 3: Verificar también que el error message en NewOpportunityModal es correcto**

En `frontend/src/components/modals/NewOpportunityModal.tsx:51` ya dice:
`setError('No se pudo crear la cuenta. Intenta de nuevo.')`

Cambiar a "oportunidad":

```tsx
// línea 51 — cambiar:
if (!prospect?.id) { setError('No se pudo crear la oportunidad. Intenta de nuevo.'); return }
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/prospects.py
git add frontend/src/components/modals/NewOpportunityModal.tsx
git commit -m "fix: return id field in prospect create response; fix error copy in NewOpportunityModal"
```

---

## Chunk 2: Frontend — validación y UX (ISSUE-004 + ISSUE-008 + ISSUE-007)

### Task 3: Validación en ActivityModal — evitar actividades vacías (ISSUE-004)

**Root cause:** `ActivityModal.tsx` llama `submit()` sin validar que `outcome` tenga contenido. Al enviarse vacío, el backend guarda `outcome: type` (ej: "NOTE") y el frontend muestra "NOTE — NOTE".

**Files:**
- Modify: `frontend/src/components/modals/ActivityModal.tsx:28-42`

- [ ] **Step 1: Agregar estado de error y validación antes de submit**

```tsx
// ActivityModal.tsx — agregar estado de error (después de línea 26):
  const [error, setError] = useState('')

// Reemplazar la función submit (líneas 28-42):
  const submit = async () => {
    if (!outcome.trim()) {
      setError('El resultado es requerido.')
      return
    }
    setError('')
    setLoading(true)
    await api.post('/activities', {
      dealId,
      prospectId,
      type,
      outcome: outcome.trim(),
      notes,
    })
    setOutcome('')
    setNotes('')
    setType('NOTE')
    setLoading(false)
    onSaved()
    onClose()
  }
```

- [ ] **Step 2: Mostrar el error en el JSX (agregar después del label "Resultado", antes del input)**

```tsx
// Agregar entre líneas 76-77 (después del label "Resultado"):
              {error && (
                <p className="text-xs text-red-600 ml-1">{error}</p>
              )}
```

- [ ] **Step 3: Reset del error al cerrar**

En el botón Cancelar (línea 97), cambiar `onClick={onClose}` por:
```tsx
onClick={() => { setError(''); setOutcome(''); setNotes(''); setType('NOTE'); onClose() }}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/modals/ActivityModal.tsx
git commit -m "fix: require outcome field in ActivityModal before saving activity"
```

---

### Task 4: Limpiar search bar al cambiar de sección (ISSUE-008)

**Root cause:** `TopNav.tsx` tiene estado `search` local que nunca se resetea. Al navegar entre secciones, el texto persiste.

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/layout/TopNav.tsx`

- [ ] **Step 1: Pasar `onViewChange` al TopNav para limpiar search al navegar**

En `App.tsx`, pasar `setView` al TopNav:

```tsx
// App.tsx línea 57 — cambiar:
// <TopNav />
// por:
        <TopNav onNavigate={(v) => setView(v as ViewType)} />
```

- [ ] **Step 2: Actualizar TopNav para recibir prop y limpiar search**

```tsx
// TopNav.tsx — actualizar interfaz y usar la prop:
interface Props {
  onNavigate?: (view: string) => void
}

export function TopNav({ onNavigate }: Props) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }

  // Agregar useEffect para limpiar cuando cambia la vista (via prop callback vacío):
  // En realidad la forma más simple: exponer clearSearch al parent, 
  // o usar un key prop. La opción más limpia sin refactor grande:
  // Cuando el search queda fuera de foco (onBlur) no limpiar, 
  // pero sí limpiar cuando el Sidebar hace onViewChange.
```

**Enfoque más simple — usar `key` en TopNav desde App.tsx:**

```tsx
// App.tsx línea 57:
        <TopNav key={view} />
```

Esto remonta el TopNav (y resetea su estado `search`) cada vez que cambia la vista. Es el fix más pequeño y sin riesgo.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "fix: reset search bar when navigating between sections"
```

---

### Task 5: Fallback display para deals "Sin nombre" (ISSUE-007)

**Root cause:** Algunos prospects en DB tienen `name: null` o `name: ""`. El modelo Pydantic tiene `default="Sin nombre"` pero eso solo aplica a documentos nuevos sin el campo.

**Files:**
- Modify: `frontend/src/components/pipeline/DealCard.tsx` (o el componente que renderiza el nombre del deal)

- [ ] **Step 1: Localizar cómo se muestra el nombre del deal**

```bash
grep -n "prospect\|Sin nombre\|name" frontend/src/components/pipeline/DealCard.tsx | head -20
```

- [ ] **Step 2: Agregar fallback en la visualización del nombre**

Donde se renderiza el nombre del prospecto/deal, agregar `|| 'Sin nombre'` o similar:

```tsx
// Ejemplo — donde aparece {deal.prospect?.name} o similar:
{deal.prospect?.name || deal.prospectName || 'Sin nombre'}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/pipeline/DealCard.tsx
git commit -m "fix: show fallback 'Sin nombre' for deals with missing prospect name"
```

---

## Chunk 3: Routing y Mobile (ISSUE-003 + ISSUE-001)

### Task 6: Sincronizar URL con la vista activa (ISSUE-003)

**Root cause:** `App.tsx` usa `useState<ViewType>` para controlar qué view se muestra, pero nunca actualiza `window.location`. El router de Next.js no existe — es Vite puro sin React Router.

**Strategy:** Usar `window.history.pushState` al cambiar de vista, y leer `window.location.pathname` en el mount inicial para restaurar la vista.

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Mapa de rutas a ViewType**

```tsx
// Agregar en App.tsx (antes de AppShell):
const ROUTE_TO_VIEW: Record<string, ViewType> = {
  '/dashboard': 'dashboard',
  '/pipeline': 'pipeline',
  '/oportunidades': 'opportunities',
  '/cuentas': 'accounts',
  '/contactos': 'contacts',
  '/actividades': 'activities',
  '/metas': 'goals',
  '/reportes': 'reports',
  '/configuracion': 'settings',
}
const VIEW_TO_ROUTE: Record<ViewType, string> = Object.fromEntries(
  Object.entries(ROUTE_TO_VIEW).map(([k, v]) => [v, k])
) as Record<ViewType, string>
```

- [ ] **Step 2: Inicializar `view` desde la URL actual**

```tsx
// En AppShell, cambiar:
// const [view, setView] = useState<ViewType>('dashboard')
// por:
  const initialView = (): ViewType => {
    const path = window.location.pathname
    return ROUTE_TO_VIEW[path] ?? 'dashboard'
  }
  const [view, setView] = useState<ViewType>(initialView)
```

- [ ] **Step 3: Actualizar URL al cambiar de vista**

```tsx
// Crear función wrapper:
  const navigateTo = (v: ViewType) => {
    setView(v)
    const route = VIEW_TO_ROUTE[v] ?? '/dashboard'
    window.history.pushState(null, '', route)
  }
```

- [ ] **Step 4: Reemplazar todos los `setView` en AppShell con `navigateTo`**

```tsx
// Sidebar:
<Sidebar currentView={view} onViewChange={navigateTo} onNewOpportunity={() => setModalOpen(true)} />

// goToDetail:
const goToDetail = (id: string) => { setSelectedDealId(id); navigateTo('opportunity-detail') }

// opportunity-detail onBack:
'opportunity-detail': <OpportunityDetailView id={selectedDealId!} onBack={() => navigateTo('opportunities')} />,
```

- [ ] **Step 5: Manejar el botón "Atrás" del browser (popstate)**

```tsx
// Agregar useEffect en AppShell:
  useEffect(() => {
    const onPop = () => {
      const v = ROUTE_TO_VIEW[window.location.pathname] ?? 'dashboard'
      setView(v)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "fix: sync URL with active view using pushState; support browser back/forward and deep links"
```

---

### Task 7: Sidebar responsive — colapsar en móvil (ISSUE-001)

**Root cause:** `Sidebar.tsx` tiene clase `w-[240px] fixed left-0` sin ningún breakpoint. En móvil ocupa el 60% de la pantalla sin opción de cerrarlo.

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Agregar prop `isOpen` y `onClose` al Sidebar**

```tsx
// Sidebar.tsx — actualizar interface Props:
interface Props {
  currentView: ViewType
  onViewChange: (v: ViewType) => void
  onNewOpportunity: () => void
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ currentView, onViewChange, onNewOpportunity, isOpen, onClose }: Props) {
```

- [ ] **Step 2: Agregar clases responsive al `<aside>`**

```tsx
// Cambiar la línea 32:
// className="w-[240px] h-screen border-r border-outline-variant bg-white flex flex-col fixed left-0 top-0 z-50"
// por:
    <aside className={`w-[240px] h-screen border-r border-outline-variant bg-white flex flex-col fixed left-0 top-0 z-50 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
```

- [ ] **Step 3: Agregar overlay para cerrar el sidebar en móvil**

```tsx
// Agregar ANTES del <aside> (dentro del return):
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={...}>
        {/* contenido existente */}
        {/* Agregar botón X para cerrar en móvil */}
        <div className="lg:hidden absolute top-4 right-4">
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:bg-surface-container rounded-full">
            <X size={18} />
          </button>
        </div>
      </aside>
    </>
```

- [ ] **Step 4: Importar X de lucide-react en Sidebar**

```tsx
// Línea 2 — agregar X al import:
import { LayoutDashboard, Kanban, Handshake, Building2, Users,
  CalendarDays, Target, LineChart, Settings, Plus, HelpCircle, LogOut, X
} from 'lucide-react'
```

- [ ] **Step 5: Actualizar App.tsx — agregar estado `sidebarOpen` y botón hamburger**

```tsx
// En AppShell — agregar estado:
  const [sidebarOpen, setSidebarOpen] = useState(false)

// Cambiar el Sidebar:
      <Sidebar
        currentView={view}
        onViewChange={(v) => { navigateTo(v); setSidebarOpen(false) }}
        onNewOpportunity={() => { setModalOpen(true); setSidebarOpen(false) }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

// En la clase del <main>, ajustar ml para móvil:
      <main className="flex-1 lg:ml-[240px] flex flex-col min-w-0">
```

- [ ] **Step 6: Agregar botón hamburger en TopNav**

```tsx
// TopNav.tsx — agregar prop onMenuClick y botón en el header:
interface Props {
  onMenuClick?: () => void
}

export function TopNav({ onMenuClick }: Props) {
// En el <header>, agregar antes del search input:
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-on-surface-variant hover:bg-surface-container rounded-full mr-2"
        >
          <Menu size={20} />
        </button>
// Importar Menu de lucide-react
```

- [ ] **Step 7: Pasar `onMenuClick` desde App.tsx a TopNav**

```tsx
// App.tsx — cambiar <TopNav key={view} /> por:
        <TopNav key={view} onMenuClick={() => setSidebarOpen(true)} />
```

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git add frontend/src/components/layout/TopNav.tsx
git add frontend/src/App.tsx
git commit -m "fix: responsive sidebar with hamburger menu for mobile (lg:hidden overlay + toggle)"
```

---

## Orden de ejecución recomendado

1. Task 1 (contacts 500) — impacto alto, puro backend
2. Task 2 (prospect id fix) — desbloquea crear oportunidades
3. Task 3 (activity validation) — previene basura en DB
4. Task 4 (clear search) — 1 línea en App.tsx
5. Task 5 (Sin nombre fallback) — 1 línea en DealCard
6. Task 6 (URL routing) — mejora UX significativamente
7. Task 7 (mobile) — el más extenso, dejarlo para el final
