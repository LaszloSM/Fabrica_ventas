# CRM Datos Reales — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el CRM a datos reales de CoimpactoB — importar ~1,300 contactos del Google Sheet, eliminar precios inventados, restringir auth a @coimpactob.org, y dejar el kanban/dashboard funcionales con datos reales.

**Architecture:** Fix en 4 chunks independientes. Chunk 1 son quick wins de config. Chunk 2 reescribe el import service. Chunk 3 limpia la UI del precio y mejora el kanban. Chunk 4 arregla el dashboard. Cada chunk termina con datos reales visibles en el browser.

**Tech Stack:** Next.js 16 + TypeScript (frontend), FastAPI + Python 3.13 (backend), MongoDB/Cosmos DB, httpx (descarga sheets), dnd-kit (kanban drag-drop).

**Spec:** `docs/superpowers/specs/2026-04-25-crm-datos-reales-design.md`

---

## File Map

### Backend — modificar
- `backend/.env.local` — no tocar (ya tiene Cosmos DB real)
- `backend/app/schemas/deal.py` — agregar campos `proyectos`, `sourceTab`
- `backend/app/services/import_service.py` — reescribir upsert, activity types válidos, múltiples deals
- `backend/app/api/v1/endpoints/import_data.py` — agregar endpoint `POST /import/from-sheets`

### Frontend — modificar
- `.env.local` — cambiar `ALLOWED_EMAIL_DOMAIN=coimpactob.org`
- `types/index.ts` — agregar `proyectos?`, `sourceTab?` a `Deal`
- `components/pipeline/KanbanBoard.tsx` — quitar `$M` del stats bar, reagrupar columnas en 5
- `components/pipeline/DealCard.tsx` — eliminar bloque de precio (líneas 114-119)
- `components/pipeline/DealDrawer.tsx` — quitar campo value de UI, agregar campo proyectos
- `components/prospects/ImportModal.tsx` — agregar botón "Sincronizar desde Sheets"
- `app/(app)/settings/page.tsx` — agregar tab "Datos" con import (solo ADMIN)
- `app/(app)/dashboard/page.tsx` — reemplazar KPIs de $ con KPIs de temperatura/responsable

---

## Chunk 1: Auth Fix + Schema Fields

### Task 1: Fix dominio de autenticación

**Files:**
- Modify: `.env.local` (raíz del proyecto, Next.js)

- [ ] **Step 1: Cambiar ALLOWED_EMAIL_DOMAIN**

  Editar `.env.local` — cambiar línea:
  ```
  ALLOWED_EMAIL_DOMAIN="gmail.com"
  ```
  Por:
  ```
  ALLOWED_EMAIL_DOMAIN="coimpactob.org"
  ```

- [ ] **Step 2: Verificar que auth.ts usa la variable**

  Leer `auth.ts` línea 4. Debe decir:
  ```typescript
  const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'coimpactob.org'
  ```
  Si ya está correcto, no tocar nada.

- [ ] **Step 3: Verificar en browser (si el frontend está corriendo)**

  Intentar login con una cuenta `@gmail.com` → debe redirigir a `/login` con error.
  Login con `@coimpactob.org` → debe entrar al dashboard.

- [ ] **Step 4: Commit**
  ```bash
  git add .env.local
  git commit -m "fix: restrict auth to @coimpactob.org domain only"
  ```

---

### Task 2: Agregar campos proyectos y sourceTab al schema

**Files:**
- Modify: `backend/app/schemas/deal.py`
- Modify: `types/index.ts`

- [ ] **Step 1: Agregar campos a DealCreate en Python**

  En `backend/app/schemas/deal.py`, en la clase `DealCreate` (línea 5), agregar después de `assignedTo`:
  ```python
  proyectos: Optional[str] = None
  sourceTab: Optional[str] = None
  ```

- [ ] **Step 2: Agregar campos a DealUpdate en Python**

  En la clase `DealUpdate` (línea 21), agregar:
  ```python
  proyectos: Optional[str] = None
  ```

- [ ] **Step 3: Agregar campos a la interfaz Deal en TypeScript**

  En `types/index.ts`, en la interfaz `Deal` (línea 143), agregar después de `lostReason?`:
  ```typescript
  proyectos?: string | null
  sourceTab?: string | null
  ```

- [ ] **Step 4: Verificar que el backend compila**
  ```bash
  cd backend && python -c "from app.schemas.deal import DealCreate, DealUpdate; print('OK')"
  ```
  Expected: `OK`

- [ ] **Step 5: Commit**
  ```bash
  git add backend/app/schemas/deal.py types/index.ts
  git commit -m "feat: add proyectos and sourceTab fields to Deal schema"
  ```

---

## Chunk 2: Import Service — Datos Reales

### Task 3: Reescribir import_service.py con upsert real y múltiples deals

**Files:**
- Modify: `backend/app/services/import_service.py`

El servicio actual tiene estos problemas:
1. Deduplicación solo evita duplicados en memoria (no busca en DB antes de importar)
2. `_create_deal` solo crea 1 deal aunque haya múltiples service types
3. Activity types usan valores inventados: `LINKEDIN_CONNECT`, `LINKEDIN_ACCEPT`, `EMAIL_FOLLOWUP`, `PROPOSAL_PREP`, `EMAIL_REPLY`, `WHATSAPP` — ninguno existe en el enum `ActivityType` del backend
4. `import_from_files` retorna error si ya hay datos (línea 311-315) — debe hacer upsert

- [ ] **Step 1: Cargar índices desde DB al inicio**

  Modificar el método `__init__` de `ImportService` para inicializar también:
  ```python
  self.contact_email_db_index: Dict[str, str] = {}  # email → contact_id (cargado desde DB)
  self.org_db_index: Dict[str, str] = {}  # org_lower → prospect_id (cargado desde DB)
  ```

  Agregar método `async def _load_existing_indexes(self)` que se llama al inicio de `import_from_files`:
  ```python
  async def _load_existing_indexes(self):
      """Carga índices de email y org desde DB para deduplicar con datos existentes."""
      async for contact in self.db["contacts"].find({}, {"_id": 1, "email": 1}):
          if contact.get("email"):
              self.email_index[contact["email"].lower()] = str(contact["_id"])
      async for prospect in self.db["prospects"].find({}, {"_id": 1, "name": 1}):
          self.org_index[prospect["name"].lower()] = str(prospect["_id"])
      async for tm in self.db["team_members"].find({}, {"_id": 1, "name": 1}):
          self.team_members[tm["name"]] = str(tm["_id"])
  ```

- [ ] **Step 2: Convertir _create_contact a upsert**

  Reemplazar el método `_create_contact` (líneas 198-225) con versión upsert:
  ```python
  async def _create_contact(self, prospect_id: str, nombre: str, cargo: str,
                            correo: str, celular: str, linkedin: str) -> Optional[str]:
      """Upsert contacto: si existe por email lo retorna, si no lo crea."""
      email_key = correo.lower() if correo else None
      if email_key and email_key in self.email_index:
          return self.email_index[email_key]

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
          "createdAt": self.now,
          "updatedAt": self.now,
      })
      if email_key:
          self.email_index[email_key] = contact_id
      self.stats["contacts"] += 1
      return contact_id
  ```

- [ ] **Step 3: Convertir _create_deal a crear múltiples deals**

  Reemplazar el método `_create_deal` (líneas 227-261) por `_create_deals` (plural):
  ```python
  async def _create_deals(self, prospect_id: str, contact_id: Optional[str],
                          assigned_to: Optional[str], service_types: List[str],
                          stage: str, notes: str, proyectos: str,
                          source_tab: str) -> List[str]:
      """Crea un Deal por cada service type. Retorna lista de deal IDs."""
      if not service_types:
          service_types = ["CONSULTORIA_PROYECTO"]
      
      deal_ids = []
      for svc in service_types:
          deal_id = _id("deal")
          await self.db["deals"].insert_one({
              "_id": deal_id,
              "prospectId": prospect_id,
              "contactId": contact_id,
              "assignedTo": assigned_to,
              "serviceType": svc,
              "line": _line(svc),
              "stage": stage,
              "value": None,
              "probability": _prob(stage),
              "ponderatedValue": None,
              "problem": None,
              "benefit": None,
              "nextAction": None,
              "nextActionDate": None,
              "quarter": None,
              "expectedCloseDate": None,
              "wonAt": None,
              "lostReason": None,
              "notes": notes or None,
              "proyectos": proyectos or None,
              "sourceTab": source_tab,
              "createdAt": self.now,
              "updatedAt": self.now,
              "archived": False,
              "source": "csv_import",
          })
          self.stats["deals"] += 1
          deal_ids.append(deal_id)
      return deal_ids
  ```

- [ ] **Step 4: Corregir activity types en _create_activities_from_row**

  Reemplazar el bloque `activity_cols` (líneas 266-285) con activity types válidos del enum `ActivityType`:
  ```python
  activity_cols = [
      # (nombre_columna, type_valido, descripcion)
      ("Envio de invitacion  Linkdln",   "LINKEDIN", "Invitación LinkedIn enviada"),
      ("Aceptacion Linkdln",             "LINKEDIN", "Conexión LinkedIn aceptada"),
      ("Mensaje Linkdln",                "LINKEDIN", "Mensaje LinkedIn enviado"),
      ("Correo 1",                       "EMAIL",    "Correo 1 enviado"),
      ("Correo 2",                       "EMAIL",    "Correo 2 enviado"),
      ("Correo 3",                       "EMAIL",    "Correo 3 enviado"),
      ("Whatsapp mensaje",               "NOTE",     "Mensaje WhatsApp enviado"),
      ("LLamada ",                       "CALL",     "Llamada realizada"),
      ("Primera reunión",                "MEETING",  "Primera reunión"),
      ("Mail de seguimiento",            "EMAIL",    "Mail de seguimiento"),
      ("Preparación de propuesta ",      "NOTE",     "Propuesta preparada"),
      ("Reunión de propuesta ",          "MEETING",  "Reunión de propuesta"),
      ("Comentarios ",                   "NOTE",     None),  # usa el valor como nota
      # Banca frio
      ("INVITACIÓN LKD ANDREA",          "LINKEDIN", "Invitación LinkedIn enviada (Andrea)"),
      ("INVITACIÓN LKD  DANIEL",         "LINKEDIN", "Invitación LinkedIn enviada (Daniel)"),
      ("RESPUESTA LINKED",               "LINKEDIN", "Respuesta LinkedIn"),
      ("CORREO",                         "EMAIL",    "Correo enviado"),
      ("RESPUESTA CORREO",               "EMAIL",    "Respuesta a correo"),
      ("REUNION",                        "MEETING",  "Reunión"),
      # Banca caliente
      ("ACCIONES",                       "NOTE",     None),
  ]
  ```

  También actualizar el insert de actividad para usar el valor como nota si `desc is None`:
  ```python
  nota = desc if desc else val  # si no hay descripción fija, usa el valor del campo
  await self.db["activities"].insert_one({
      "_id": _id("act"),
      "dealId": deal_id,
      "prospectId": prospect_id,
      "type": act_type,
      "outcome": None,
      "notes": nota,
      "doneAt": self.now,
      "createdById": responsable_id or "import",
      "createdAt": self.now,
  })
  ```

- [ ] **Step 5: Quitar la lógica de 409 en import_from_files y agregar carga de índices**

  En `import_from_files` (línea 304), al inicio del método (antes del bloque de limpieza `if force:`):
  
  1. Eliminar el bloque de verificación que retorna error (líneas 309-316):
  ```python
  # ELIMINAR ESTO:
  if not force:
      existing = await self.db["prospects"].count_documents({})
      if existing > 0:
          return {"error": True, "message": f"Ya existen {existing} prospects..."}
  ```
  
  2. Reemplazar por la llamada a `_load_existing_indexes` (nuevo método del Step 1):
  ```python
  # Cargar índices existentes para upsert real desde DB
  await self._load_existing_indexes()
  
  # Si force=True, limpiar datos antes (el código de limpieza existente se mantiene debajo)
  if force:
      ...  # no tocar este bloque
  ```

- [ ] **Step 6: Actualizar todas las llamadas a _create_deal → _create_deals**

  Buscar todas las llamadas a `_create_deal` en el archivo:
  ```bash
  grep -n "_create_deal" backend/app/services/import_service.py
  ```
  
  Reemplazar cada una con `_create_deals` pasando también `proyectos=""` y el `source_tab` apropiado según el archivo que se esté procesando.
  
  También pasar la lista de deal_ids resultante a `_create_activities_from_row` (que debe iterar sobre todos los deal_ids para crear actividades en cada deal).

- [ ] **Step 7: Actualizar stats para incluir updated vs created**

  Agregar al dict `stats`:
  ```python
  self.stats = {
      "prospects": 0,
      "contacts": 0, 
      "deals": 0,
      "activities": 0,
      "team_members": 0,
      "duplicates_skipped": 0,
      "rows_processed": 0,
  }
  ```
  (El dict existente ya tiene estos campos — solo verificar que esté completo.)

- [ ] **Step 8: Test manual del import**

  Con el backend corriendo:
  ```bash
  cd backend && python -c "
  import asyncio
  from app.database import connect_to_mongo, get_db
  async def test():
      await connect_to_mongo()
      db = await get_db()
      count = await db['prospects'].count_documents({})
      print(f'Prospects en DB: {count}')
  asyncio.run(test())
  "
  ```

- [ ] **Step 9: Commit**
  ```bash
  git add backend/app/services/import_service.py
  git commit -m "fix: import service — true upsert, multiple deals per contact, valid activity types"
  ```

---

### Task 4: Agregar endpoint de sincronización desde Google Sheets

**Files:**
- Modify: `backend/app/api/v1/endpoints/import_data.py`

El endpoint existente `POST /import` descarga solo el tab 2026 (gid=456943491). Se agrega `POST /import/from-sheets` que descarga los 6 tabs e invoca `ImportService`.

- [ ] **Step 1: Agregar constantes de GIDs**

  Al inicio de `import_data.py`, después de `SHEET_URL`, agregar:
  ```python
  SHEET_BASE = "https://docs.google.com/spreadsheets/d/178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA/export?format=csv&gid="

  # GIDs de cada tab (confirmar en Google Sheets > botón derecho en tab > "Copiar enlace")
  SHEET_TABS = {
      "2026":             "456943491",   # Tab activo 2026
      "Base 2025":        "0",           # Primer tab (gid=0 es el default)
      "Banca caliente":   None,          # Si None, se salta
      "Banca frio":       None,
      "CAF":              None,
      "Airtable":         None,
  }
  # Nota: Los GIDs de los tabs distintos al 2026 se deben confirmar abriendo el Sheet
  # y revisando la URL al hacer clic en cada tab.
  # Por ahora solo se descargan los que tienen GID definido.
  ```

- [ ] **Step 2: Agregar endpoint from-sheets**

  Verificar que `import httpx` ya existe en la línea 12 de `import_data.py` — si no está, agregarlo.
  
  Al final de `import_data.py`, agregar:
  ```python
  from app.services.import_service import ImportService

  @router.post("/from-sheets")
  async def import_from_google_sheets(
      force: bool = Query(False, description="Limpiar datos antes de importar"),
      db=Depends(get_db)
  ):
      """
      Descarga todos los tabs del Google Sheet de CoimpactoB e importa a MongoDB.
      Hace upsert — no borra datos manuales existentes a menos que force=True.
      """
      file_contents = {}
      
      async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
          for tab_name, gid in SHEET_TABS.items():
              if gid is None:
                  continue
              url = f"{SHEET_BASE}{gid}"
              try:
                  resp = await client.get(url)
                  resp.raise_for_status()
                  filename = f"{tab_name}.csv"
                  file_contents[filename] = resp.text
              except Exception as e:
                  logger.warning(f"No se pudo descargar tab '{tab_name}': {e}")
      
      if not file_contents:
          raise HTTPException(status_code=503, detail="No se pudo conectar a Google Sheets")
      
      service = ImportService(db)
      result = await service.import_from_files(file_contents, force=force)
      
      return {"data": result, "tabs_downloaded": list(file_contents.keys())}
  ```

  Agregar al inicio del archivo:
  ```python
  import logging
  logger = logging.getLogger(__name__)
  ```

- [ ] **Step 3: Agregar proxy route en Next.js**

  Crear `app/api/import/from-sheets/route.ts`:
  ```typescript
  import { NextRequest } from 'next/server'
  import { proxyToBackend } from '@/lib/backend-api'

  export async function POST(req: NextRequest) {
    return proxyToBackend(req, '/import/from-sheets')
  }
  ```

- [ ] **Step 4: Test del endpoint**

  Con backend y frontend corriendo:
  ```bash
  curl -X POST http://localhost:3000/api/import/from-sheets \
    -H "Cookie: <session-cookie>"
  ```
  Expected: JSON con `data.rows_processed > 0`

- [ ] **Step 5: Commit**
  ```bash
  git add backend/app/api/v1/endpoints/import_data.py app/api/import/from-sheets/route.ts
  git commit -m "feat: add POST /import/from-sheets endpoint to sync from Google Sheets"
  ```

---

## Chunk 3: UI — Eliminar Precio, Mejorar Kanban e Import

### Task 5: Eliminar precio de KanbanBoard y DealCard

**Files:**
- Modify: `components/pipeline/KanbanBoard.tsx`
- Modify: `components/pipeline/DealCard.tsx`

- [ ] **Step 1: Quitar cálculos de valor monetario de KanbanBoard**

  En `KanbanBoard.tsx` líneas 114-115, eliminar:
  ```typescript
  // ELIMINAR estas dos líneas:
  const stageValue = (stage: DealStage) => dealsByStage(stage).reduce((sum, d) => sum + (d.value || 0), 0)
  const totalValue = filteredDeals.reduce((sum, d) => sum + (d.value || 0), 0)
  ```

- [ ] **Step 2: Quitar el "$M total" del stats bar**

  En líneas 183-187, eliminar el bloque:
  ```typescript
  // ELIMINAR:
  {totalValue > 0 && (
    <span className="text-white/40">
      <span className="font-semibold text-emerald-400">${(totalValue / 1_000_000).toFixed(1)}M</span> total
    </span>
  )}
  ```

- [ ] **Step 3: Quitar el precio de DealCard**

  En `DealCard.tsx` líneas 114-119, eliminar el bloque del value:
  ```typescript
  // ELIMINAR:
  {/* Value */}
  {deal.value ? (
    <span className="text-[12px] font-bold text-emerald-400 flex-shrink-0 tabular-nums">
      ${(deal.value / 1_000_000).toFixed(1)}M
    </span>
  ) : null}
  ```

- [ ] **Step 4: Agregar proyectos en DealCard (si deal.proyectos existe)**

  Después del bloque de service + temp badges (línea 137), agregar:
  ```typescript
  {deal.proyectos && (
    <p className="text-[10px] text-white/30 mt-1.5 truncate leading-tight italic">
      {deal.proyectos}
    </p>
  )}
  ```

- [ ] **Step 5: Verificar en browser que no hay precios visibles**

  Cargar `/pipeline` → no debe haber ningún `$` ni `M` en las tarjetas ni en el header.

- [ ] **Step 6: Commit**
  ```bash
  git add components/pipeline/KanbanBoard.tsx components/pipeline/DealCard.tsx
  git commit -m "fix: remove all price/value display from pipeline — no monetary data in CoimpactoB"
  ```

---

### Task 6: Quitar precio de DealDrawer y agregar campo proyectos

**Files:**
- Modify: `components/pipeline/DealDrawer.tsx`

- [ ] **Step 1: Leer DealDrawer.tsx**

  Leer el archivo completo para identificar dónde aparece `value` en la UI.

- [ ] **Step 2: Eliminar campo de valor/precio**

  Buscar cualquier `<input` o `<span` que muestre `deal.value` o `value` monetario. Eliminar esos bloques.

- [ ] **Step 3: Agregar campo proyectos editable**

  Donde estaba el campo de valor, poner un campo de texto para proyectos:
  ```typescript
  <div className="space-y-1">
    <label className="text-[11px] text-white/40 uppercase tracking-wider font-semibold">Proyectos</label>
    <textarea
      value={editedDeal?.proyectos || ''}
      onChange={(e) => setEditedDeal(prev => prev ? {...prev, proyectos: e.target.value} : prev)}
      placeholder="Ej: Pescadores Pájaro, Tienda virtual 2.0..."
      rows={2}
      className="w-full text-sm text-white/80 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-white/20 placeholder:text-white/20"
    />
  </div>
  ```

- [ ] **Step 4: Verificar que el PATCH de deal incluye proyectos**

  Al guardar el drawer, el body del PATCH debe incluir `proyectos`. Verificar que el `editedDeal` se manda correctamente al endpoint `/api/deals/[id]`.

- [ ] **Step 5: Commit**
  ```bash
  git add components/pipeline/DealDrawer.tsx
  git commit -m "fix: remove value field from DealDrawer, add proyectos editable field"
  ```

---

### Task 7: Mejorar ImportModal con botón "Sincronizar desde Sheets"

**Files:**
- Modify: `components/prospects/ImportModal.tsx`

- [ ] **Step 1: Agregar estado para sincronización**

  En `ImportModal.tsx`, agregar estado:
  ```typescript
  const [syncing, setSyncing] = useState(false)
  ```

- [ ] **Step 2: Agregar función handleSyncFromSheets**

  ```typescript
  async function handleSyncFromSheets() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/import/from-sheets', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || json.error || 'Error al sincronizar')
      } else {
        setResult(json.data)
        onDone()
        checkStatus()
      }
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setSyncing(false)
    }
  }
  ```

- [ ] **Step 3: Agregar botón en la UI**

  En la sección de botones del modal (antes del botón "Importar archivos seleccionados"), agregar:
  ```typescript
  <button
    onClick={handleSyncFromSheets}
    disabled={loading || syncing}
    className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-sm font-medium transition-all disabled:opacity-50"
  >
    {syncing ? (
      <><Loader2 className="w-4 h-4 animate-spin" /> Sincronizando...</>
    ) : (
      <><Download className="w-4 h-4" /> Sincronizar desde Google Sheets</>
    )}
  </button>
  
  <div className="flex items-center gap-2 text-white/20">
    <div className="flex-1 h-px bg-white/10" />
    <span className="text-xs">o sube archivos CSV</span>
    <div className="flex-1 h-px bg-white/10" />
  </div>
  ```

- [ ] **Step 4: Verificar que el botón funciona**

  Abrir el modal desde `/prospects`, hacer clic en "Sincronizar desde Google Sheets".
  Expected: Modal muestra spinner → resultado con counts de registros importados.

- [ ] **Step 5: Commit**
  ```bash
  git add components/prospects/ImportModal.tsx
  git commit -m "feat: add Sync from Google Sheets button to ImportModal"
  ```

---

### Task 8: Agregar tab de Datos en Settings (solo ADMIN)

**Files:**
- Modify: `app/(app)/settings/page.tsx`

- [ ] **Step 1: Importar useSession para leer el rol**

  En `app/(app)/settings/page.tsx`, agregar al bloque de imports:
  ```typescript
  import { useSession } from 'next-auth/react'
  ```

  Dentro del componente:
  ```typescript
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  ```

- [ ] **Step 2: Agregar TabsTrigger para Datos (solo visible a ADMIN)**

  En el `TabsList`, después del trigger de "Usuarios del Sistema":
  ```typescript
  {isAdmin && (
    <TabsTrigger
      value="data"
      className="flex items-center gap-2 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-[#f26522] text-white/50 rounded-lg transition-all"
    >
      <Database className="w-4 h-4" />
      Datos
    </TabsTrigger>
  )}
  ```

  Agregar `Database` a los imports de lucide-react.

- [ ] **Step 3: Agregar TabsContent para Datos**

  ```typescript
  {isAdmin && (
    <TabsContent value="data">
      <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
        <h2 className="text-lg font-semibold text-white mb-1">Base de Datos</h2>
        <p className="text-sm text-white/50 mb-6">
          Sincroniza los contactos del Google Sheet de CoimpactoB. La sincronización hace upsert — no borra datos registrados manualmente.
        </p>
        <SyncDataPanel />
      </div>
    </TabsContent>
  )}
  ```

- [ ] **Step 4: Crear componente SyncDataPanel inline**

  Agregar en el mismo archivo (o en `components/settings/SyncDataPanel.tsx`):
  ```typescript
  function SyncDataPanel() {
    const [syncing, setSyncing] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleSync() {
      if (!confirm('¿Sincronizar datos desde Google Sheets? Se actualizarán los contactos existentes y se crearán los nuevos.')) return
      setSyncing(true)
      setError(null)
      setResult(null)
      try {
        const res = await fetch('/api/import/from-sheets', { method: 'POST' })
        const json = await res.json()
        if (!res.ok) setError(json.detail || 'Error al sincronizar')
        else setResult(json.data)
      } catch {
        setError('No se pudo conectar al servidor')
      } finally {
        setSyncing(false)
      }
    }

    return (
      <div className="space-y-4">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-sm font-medium transition-all disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {syncing ? 'Sincronizando...' : 'Sincronizar desde Google Sheets'}
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {result && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Prospectos', result.prospects],
              ['Contactos', result.contacts],
              ['Deals', result.deals],
              ['Actividades', result.activities],
              ['Filas procesadas', result.rows_processed],
              ['Duplicados omitidos', result.duplicates_skipped],
            ].map(([label, val]) => (
              <div key={label as string} className="bg-white/5 rounded-lg p-3">
                <p className="text-white/40 text-xs">{label}</p>
                <p className="text-white font-bold text-xl">{val ?? 0}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  ```

  Agregar imports necesarios: `useState`, `Loader2`, `RefreshCw` de lucide-react.

- [ ] **Step 5: Verificar que solo ADMIN ve la tab**

  Loguearse con usuario SALES → no debe ver la tab "Datos".
  Loguearse con ADMIN → debe ver la tab y poder hacer clic en Sincronizar.

- [ ] **Step 6: Commit**
  ```bash
  git add app/(app)/settings/page.tsx
  git commit -m "feat: add Data tab in Settings (ADMIN only) with Google Sheets sync button"
  ```

---

## Chunk 4: Dashboard Real — KPIs Sin Precio

### Task 9: Reemplazar KPIs de $ con KPIs reales de temperatura y responsable

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

El dashboard actual carga `/api/metrics` y tiene KPIs con `totalPipeline` (valor monetario). Se reemplaza con KPIs reales.

- [ ] **Step 1: Leer el dashboard completo**

  Leer `app/(app)/dashboard/page.tsx` completo para entender la estructura actual.

- [ ] **Step 2: Leer el endpoint de métricas**

  Leer `backend/app/api/v1/endpoints/metrics.py` para ver qué datos devuelve actualmente.

- [ ] **Step 3: Verificar qué devuelve /api/metrics**

  ```bash
  curl http://localhost:8000/api/v1/metrics \
    -H "x-user-id: test" -H "x-user-email: test@test.com" -H "x-user-role: ADMIN"
  ```
  Anotar la estructura real del response.

- [ ] **Step 4: Eliminar KPIs de valor monetario**

  En `dashboard/page.tsx`, buscar y eliminar cualquier referencia a:
  - `totalPipeline`
  - `ponderatedValue`
  - `$M`
  - revenue, valor, dinero

- [ ] **Step 5: Agregar KPIs de temperatura**

  Reemplazar los KPI cards con:
  ```typescript
  // KPIs de temperatura (cargar desde /api/metrics o calcular desde /api/deals)
  const [tempCounts, setTempCounts] = useState({ frio: 0, tibio: 0, caliente: 0, total: 0 })

  // En el useEffect, calcular desde los deals:
  const deals = metricsData?.deals || []
  const frio = deals.filter(d => ['PROSPECTO_IDENTIFICADO','PRIMER_CONTACTO'].includes(d.stage)).length
  const tibio = deals.filter(d => ['EN_SECUENCIA','SENAL_DETECTADA'].includes(d.stage)).length
  const caliente = deals.filter(d => ['REUNION_AGENDADA','PROPUESTA_ENVIADA','NEGOCIACION'].length
  ```

  Los KPI cards deben mostrar:
  1. **Total contactos** — `summary.totalDeals` o count total
  2. **Calientes** — deals en etapas calientes (con badge naranja)
  3. **Tibios** — deals en etapas tibias (badge amarillo)
  4. **Fríos** — deals en etapas frías (badge azul)

- [ ] **Step 6: Eliminar gráficos de revenue**

  Eliminar cualquier gráfico que muestre `$` o valores monetarios. Si hay un `FunnelChart`, mantenerlo pero basado en conteos de deals por etapa, no en valor monetario.

- [ ] **Step 7: Verificar que el dashboard carga sin errores**

  Abrir `/dashboard` → debe cargar sin errores de consola y mostrar conteos reales de contactos.

- [ ] **Step 8: Commit**
  ```bash
  git add app/(app)/dashboard/page.tsx
  git commit -m "fix: dashboard KPIs now show contact temperature counts instead of invented $ values"
  ```

---

## Chunk 5: Ejecución del Import y Verificación Final

### Task 10: Ejecutar el import real y verificar datos en el browser

- [ ] **Step 1: Iniciar backend**
  ```bash
  cd backend && uvicorn app.main:app --reload --port 8000
  ```

- [ ] **Step 2: Iniciar frontend**
  ```bash
  npm run dev
  ```

- [ ] **Step 3: Login con cuenta @coimpactob.org**

  Abrir `http://localhost:3000` → debe pedir login → entrar con cuenta @coimpactob.org.

- [ ] **Step 4: Ejecutar import desde Settings**

  Ir a Settings → tab Datos → clic "Sincronizar desde Google Sheets".
  Expected: Resultado con prospects > 0, contacts > 0, deals > 0.

  Si el tab 2026 descarga correctamente pero los otros tabs necesitan GIDs, subir los CSVs locales via el modal de Prospectos como alternativa:
  ```
  data/Base de datos_contactos - 2026.csv
  data/Base de datos_contactos - Base de datos 2025.csv
  data/Base de datos_contactos - Banca frio.csv
  data/Base de datos_contactos - CAF.csv
  data/Base de datos_contactos - Contactos airtable.csv
  ```

- [ ] **Step 5: Verificar en Pipeline**

  Abrir `/pipeline` → debe mostrar deals reales (no ejemplo "Juan García").
  Cards deben tener nombres reales de organizaciones colombianas.
  No debe haber ningún precio visible.

- [ ] **Step 6: Verificar en Prospectos**

  Abrir `/prospects` → debe mostrar lista de organizaciones reales.
  Buscar "Tigo" o "Hocol" → debe aparecer.

- [ ] **Step 7: Verificar contacto individual**

  Hacer clic en un prospecto → abrir `/contacts/[id]`.
  Debe mostrar datos reales del contacto.

- [ ] **Step 8: Commit final**
  ```bash
  git add -A
  git commit -m "chore: import real data — CRM now shows real CoimpactoB contacts"
  ```

---

## Notas de implementación

### GIDs de Google Sheets
Si el endpoint `from-sheets` no descarga todos los tabs (por GIDs faltantes), el fallback es subir los 6 CSVs manualmente desde la UI (`/prospects` → "Importar Google Sheets" → seleccionar todos los CSVs de la carpeta `data/`). El import service detecta el tab por los headers de cada CSV.

### Detección automática de tab por headers
Para que `import_service.py` detecte automáticamente el tab por nombre de archivo o por headers, agregar al inicio de `import_from_files`:
```python
def _detect_tab(filename: str, headers: List[str]) -> str:
    if "2026" in filename or "Estado" in headers:
        return "2026"
    if "2025" in filename or "Relación con el contacto" in headers:
        return "2025"
    if "caliente" in filename.lower():
        return "banca_caliente"
    if "frio" in filename.lower() or "INSTITUCION" in headers:
        return "banca_frio"
    if "CAF" in filename or "INSTITUCION" in headers:
        return "caf"
    if "airtable" in filename.lower():
        return "airtable"
    return "unknown"
```

### Variables de sesión Next.js
Para leer `session.user.role` en el cliente, el componente debe estar dentro de un `SessionProvider`. Si `useSession()` da error, verificar que `app/(app)/layout.tsx` tiene el provider.

### Orden de ejecución recomendado
1. Task 1 (auth fix) — 5 min
2. Task 2 (schema) — 10 min
3. Task 3 (import service) — 45 min — CRÍTICO, sin esto los datos no entran
4. Task 4 (from-sheets endpoint) — 20 min
5. Task 5 (quitar precio kanban) — 10 min
6. Task 6 (deal drawer) — 15 min
7. Task 7 (import modal) — 15 min
8. Task 8 (settings) — 20 min
9. Task 9 (dashboard) — 30 min
10. Task 10 (ejecutar import) — 15 min + verificación
