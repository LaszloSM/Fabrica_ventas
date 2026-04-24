# CoimpactoB CRM — MVP Completo: Plan de Implementación

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar el frontend de Next.js con el backend FastAPI, importar 90 contactos desde Google Sheets, completar Google OAuth con roles, y agregar exportación Excel/PDF.

**Architecture:** Next.js 16 actúa como BFF (Backend For Frontend) — sus API routes hacen proxy a FastAPI en `http://127.0.0.1:8000/api/v1/*`. El frontend ya tiene todos los componentes UI construidos; solo faltan la conexión URL, rutas proxy faltantes, y nuevos endpoints de reportes en FastAPI.

**Tech Stack:** Next.js 16 (App Router), FastAPI, MongoDB (motor), NextAuth v5, openpyxl, reportlab, shadcn/ui

---

## Chunk 1: Fix URL + Rutas Proxy Faltantes

### Archivos modificados/creados
- Modify: `lib/backend-api.ts` — añadir prefijo `/api/v1` y header `x-user-role`
- Create: `app/api/deals/[id]/route.ts` — añadir GET, PUT, DELETE
- Create: `app/api/deals/[id]/move-stage/route.ts` — POST
- Create: `app/api/deals/[id]/mark-won/route.ts` — POST
- Create: `app/api/deals/[id]/mark-lost/route.ts` — POST
- Create: `app/api/ai/[...path]/route.ts` — catch-all GET+POST

---

### Task 1: Fix prefijo `/api/v1` en backend-api.ts

**Files:**
- Modify: `lib/backend-api.ts`

- [ ] **Step 1: Abrir `lib/backend-api.ts` y encontrar la línea del fetch**

  Línea actual (aprox. línea 16):
  ```typescript
  const response = await fetch(`${BACKEND_URL}${path}${query}`, {
  ```

- [ ] **Step 2: Añadir constante y actualizar la URL**

  Añadir después de `const BACKEND_URL = ...`:
  ```typescript
  const API_PREFIX = '/api/v1'
  ```

  Cambiar el fetch y añadir el header `x-user-role` en el bloque de headers:
  ```typescript
  const response = await fetch(`${BACKEND_URL}${API_PREFIX}${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': session.user?.id || '',
      'x-user-email': session.user?.email || '',
      'x-user-role': (session.user as any)?.role || '',
    },
    body,
    cache: 'no-store',
  })
  ```

  El tipo `as any` es necesario porque NextAuth no incluye `role` por defecto — se añade via `types/next-auth.d.ts` en Task 8.

- [ ] **Step 3: Verificar que el backend está corriendo y probar**

  ```bash
  curl http://127.0.0.1:8000/api/v1/deals
  ```
  Debe responder `{"data": [], "total": 0}` (o datos si ya hay).

  Luego abrir http://localhost:3000/pipeline — debe cargar sin error 404.

- [ ] **Step 4: Commit**

  ```bash
  git add coimpactob-crm/lib/backend-api.ts
  git commit -m "fix: añadir prefijo /api/v1 en proxy hacia FastAPI"
  ```

---

### Task 2: Completar rutas proxy para deals/[id]

**Files:**
- Modify: `app/api/deals/[id]/route.ts`

- [ ] **Step 1: Reemplazar el contenido actual del archivo**

  El archivo actual solo tiene PATCH. Reemplazarlo con:

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  type Ctx = { params: Promise<{ id: string }> }

  export async function GET(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}`)
  }

  export async function PUT(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}`)
  }

  export async function PATCH(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}`)
  }

  export async function DELETE(req: NextRequest, ctx: Ctx) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}`)
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add coimpactob-crm/app/api/deals/
  git commit -m "feat: añadir GET, PUT, DELETE en proxy deals/[id]"
  ```

---

### Task 3: Rutas proxy para acciones de deals

**Files:**
- Create: `app/api/deals/[id]/move-stage/route.ts`
- Create: `app/api/deals/[id]/mark-won/route.ts`
- Create: `app/api/deals/[id]/mark-lost/route.ts`

- [ ] **Step 1: Crear `app/api/deals/[id]/move-stage/route.ts`**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}/move-stage`)
  }
  ```

- [ ] **Step 2: Crear `app/api/deals/[id]/mark-won/route.ts`**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}/mark-won`)
  }
  ```

- [ ] **Step 3: Crear `app/api/deals/[id]/mark-lost/route.ts`**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
    const { id } = await ctx.params
    return proxyToBackend(req, `/deals/${id}/mark-lost`)
  }
  ```

- [ ] **Step 4: Crear `app/api/ai/[...path]/route.ts`**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  type Ctx = { params: Promise<{ path: string[] }> }

  export async function GET(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxyToBackend(req, `/ai/${path.join('/')}`)
  }

  export async function POST(req: NextRequest, ctx: Ctx) {
    const { path } = await ctx.params
    return proxyToBackend(req, `/ai/${path.join('/')}`)
  }
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add coimpactob-crm/app/api/
  git commit -m "feat: rutas proxy para move-stage, mark-won, mark-lost, ai"
  ```

---

### Task 4: Verificar Fase 1 funcionando

- [ ] **Step 1: Correr ambos servidores**

  Terminal 1 (backend):
  ```bash
  cd coimpactob-crm/backend
  uvicorn app.main:app --reload --port 8000
  ```

  Terminal 2 (frontend):
  ```bash
  cd coimpactob-crm
  npm run dev
  ```

- [ ] **Step 2: Abrir http://localhost:3000/dashboard**
  - Dashboard debe cargar con métricas (puede estar vacío si no hay datos aún)

- [ ] **Step 3: Abrir http://localhost:3000/pipeline**
  - KanbanBoard debe cargar (vacío si no hay deals)

- [ ] **Step 4: Abrir http://localhost:3000/prospects**
  - ProspectList debe cargar (vacío si no hay prospectos)

---

## Chunk 2: Importación Google Sheets

### Archivos modificados/creados
- Modify: `backend/app/api/v1/endpoints/import_data.py` — actualizar GID
- Create: `app/api/import/route.ts` — proxy POST + DELETE
- Modify: `app/(app)/prospects/page.tsx` — añadir botón de importación
- Create: `components/prospects/ImportModal.tsx` — modal de importación

---

### Task 5: Actualizar GID del Google Sheet

**Files:**
- Modify: `backend/app/api/v1/endpoints/import_data.py`

- [ ] **Step 1: Abrir `import_data.py` y cambiar la constante SHEET_URL**

  Líneas 18-22 actuales:
  ```python
  SHEET_URL = (
      "https://docs.google.com/spreadsheets/d/"
      "178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA"
      "/export?format=csv&gid=2107831142"
  )
  ```

  Cambiar a:
  ```python
  SHEET_URL = (
      "https://docs.google.com/spreadsheets/d/"
      "178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA"
      "/export?format=csv&gid=456943491"
  )
  ```

- [ ] **Step 2: Verificar que el CSV es accesible**

  ```bash
  curl -L "https://docs.google.com/spreadsheets/d/178okj8F_HoRh868plz1NJgePKOiRIZlPAFu_okw_fVA/export?format=csv&gid=456943491" | head -5
  ```
  Debe mostrar los encabezados del CSV.

  **Si el CSV descargado tiene columnas inesperadas (en inglés, sin los campos correctos), el GID podría ser el incorrecto — en ese caso volver a `gid=2107831142`.**

- [ ] **Step 3: Commit**

  ```bash
  git add coimpactob-crm/backend/app/api/v1/endpoints/import_data.py
  git commit -m "fix: actualizar GID del Google Sheet a 456943491"
  ```

---

### Task 6: Proxy route para importación

**Files:**
- Create: `app/api/import/route.ts`

- [ ] **Step 1: Crear el archivo**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  export async function POST(req: NextRequest) {
    return proxyToBackend(req, '/import')
  }

  export async function DELETE(req: NextRequest) {
    return proxyToBackend(req, '/import')
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add coimpactob-crm/app/api/import/
  git commit -m "feat: proxy route para importación de Google Sheets"
  ```

---

### Task 7: Modal de importación en UI

**Files:**
- Create: `components/prospects/ImportModal.tsx`
- Modify: `app/(app)/prospects/page.tsx`

- [ ] **Step 1: Crear `components/prospects/ImportModal.tsx`**

  ```typescript
  'use client'
  import { useState } from 'react'
  import { Button } from '@/components/ui/button'
  import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  } from '@/components/ui/dialog'

  interface ImportResult {
    prospects: number
    contacts: number
    deals: number
    activities: number
    totalRows: number
  }

  interface ImportModalProps {
    open: boolean
    onClose: () => void
    onDone: () => void
  }

  export function ImportModal({ open, onClose, onDone }: ImportModalProps) {
    const [loading, setLoading] = useState(false)
    const [result, setResult] = useState<ImportResult | null>(null)
    const [error, setError] = useState<string | null>(null)

    async function handleImport() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/import', { method: 'POST' })
        const json = await res.json()
        if (!res.ok) {
          setError(json.detail || 'Error al importar')
        } else {
          setResult(json.data)
          onDone()
        }
      } catch {
        setError('No se pudo conectar al servidor')
      } finally {
        setLoading(false)
      }
    }

    async function handleClear() {
      if (!confirm('¿Eliminar todos los datos importados? Esta acción no se puede deshacer.')) return
      setLoading(true)
      await fetch('/api/import', { method: 'DELETE' })
      setResult(null)
      setLoading(false)
    }

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Importar desde Google Sheets</DialogTitle>
            <DialogDescription>
              Importa los contactos del sheet de CoimpactoB. Solo funciona si la BD está vacía.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className="space-y-2 text-sm">
              <p className="text-green-600 font-medium">Importación completada</p>
              <ul className="space-y-1 text-gray-600">
                <li>Filas procesadas: <strong>{result.totalRows}</strong></li>
                <li>Prospectos creados: <strong>{result.prospects}</strong></li>
                <li>Contactos creados: <strong>{result.contacts}</strong></li>
                <li>Deals creados: <strong>{result.deals}</strong></li>
                <li>Actividades creadas: <strong>{result.activities}</strong></li>
              </ul>
              <Button onClick={onClose} className="w-full mt-4">Cerrar</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <p className="text-red-600 text-sm bg-red-50 p-3 rounded">{error}</p>
              )}
              <Button
                onClick={handleImport}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? 'Importando...' : 'Importar ahora'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                disabled={loading}
                className="w-full text-red-600 border-red-200"
              >
                Limpiar datos importados
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    )
  }
  ```

- [ ] **Step 2: Modificar `app/(app)/prospects/page.tsx` para añadir el botón**

  Reemplazar el contenido con:

  ```typescript
  'use client'
  import { useState } from 'react'
  import { ProspectList } from '@/components/prospects/ProspectList'
  import { ProspectForm } from '@/components/prospects/ProspectForm'
  import { ImportModal } from '@/components/prospects/ImportModal'
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
  import { Button } from '@/components/ui/button'
  import { Download } from 'lucide-react'

  export default function ProspectsPage() {
    const [createOpen, setCreateOpen] = useState(false)
    const [importOpen, setImportOpen] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prospectos</h1>
            <p className="text-gray-500 mt-1">Gestión de empresas y contactos objetivo</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 text-green-700 border-green-300"
          >
            <Download className="w-4 h-4" />
            Importar Google Sheets
          </Button>
        </div>
        <ProspectList key={refreshKey} onCreateNew={() => setCreateOpen(true)} />
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo Prospecto</DialogTitle></DialogHeader>
            <ProspectForm onSuccess={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
        <ImportModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => { setImportOpen(false); setRefreshKey(k => k + 1) }}
        />
      </div>
    )
  }
  ```

- [ ] **Step 3: Verificar**
  - Abrir http://localhost:3000/prospects
  - Debe aparecer botón "Importar Google Sheets" en la esquina superior derecha
  - Click → modal aparece con botón "Importar ahora"
  - Click en "Importar ahora" → esperar resultado con conteo de registros

- [ ] **Step 4: Commit**

  ```bash
  git add coimpactob-crm/components/prospects/ImportModal.tsx
  git add coimpactob-crm/app/\(app\)/prospects/page.tsx
  git commit -m "feat: importación desde Google Sheets con modal UI"
  ```

---

## Chunk 3: Google OAuth con Roles

### Archivos modificados/creados
- Modify: `auth.ts` — añadir `signIn` callback con restricción de dominio + lógica de roles
- Create: `types/next-auth.d.ts` — extender tipos de sesión para incluir `role`

---

### Task 8: Extender tipos de NextAuth

**Files:**
- Create: `types/next-auth.d.ts`

- [ ] **Step 1: Crear el archivo de tipos**

  ```typescript
  import 'next-auth'

  declare module 'next-auth' {
    interface Session {
      user: {
        id: string
        name?: string | null
        email?: string | null
        image?: string | null
        role: 'ADMIN' | 'SALES' | 'VIEWER'
      }
    }
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add coimpactob-crm/types/next-auth.d.ts
  git commit -m "feat: extender tipos NextAuth con campo role"
  ```

---

### Task 9: Completar auth.ts con roles y restricción de dominio

**Files:**
- Modify: `auth.ts`

- [ ] **Step 1: Reemplazar `auth.ts` con la versión completa**

  ```typescript
  import NextAuth from 'next-auth'
  import Google from 'next-auth/providers/google'

  const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN || 'coimpactob.com'

  export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
      Google({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      }),
    ],
    pages: {
      signIn: '/login',
    },
    callbacks: {
      async signIn({ user }) {
        const email = user.email || ''
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          return false
        }
        return true
      },
      async jwt({ token, user }) {
        // user solo existe en el primer login — el rol queda en el token hasta que expire la sesión
        // Para cambiar el rol de un usuario hay que pedirle que haga logout y login de nuevo (MVP)
        if (user?.email) {
          const role = await getOrCreateUserRole(user.email)
          token.role = role
        }
        return token
      },
      async session({ session, token }) {
        if (session.user) {
          session.user.id = token.sub || session.user.email || 'anonymous'
          session.user.role = (token.role as 'ADMIN' | 'SALES' | 'VIEWER') || 'SALES'
        }
        return session
      },
    },
  })

  async function getOrCreateUserRole(email: string): Promise<'ADMIN' | 'SALES' | 'VIEWER'> {
    try {
      const backendUrl = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'
      const res = await fetch(`${backendUrl}/api/v1/users/role?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        cache: 'no-store',
      })
      if (res.ok) {
        const json = await res.json()
        return json.data?.role || 'SALES'
      }
    } catch {
      // Si el backend no responde, default a SALES
    }
    return 'SALES'
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add coimpactob-crm/auth.ts
  git commit -m "feat: Google OAuth con restricción de dominio y roles ADMIN/SALES"
  ```

---

### Task 10: Endpoint FastAPI para roles de usuario

**Files:**
- Create: `backend/app/api/v1/endpoints/users.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Crear `backend/app/api/v1/endpoints/users.py`**

  ```python
  from fastapi import APIRouter, Depends, Query
  from app.database import get_db
  from datetime import datetime

  router = APIRouter(prefix="/users", tags=["users"])

  @router.post("/role")
  async def get_or_create_role(email: str = Query(...), db=Depends(get_db)):
      """
      Devuelve el rol del usuario. Si no existe, lo crea.
      El primer usuario creado es ADMIN; los demás son SALES.
      """
      users_col = db["users"]
      user = await users_col.find_one({"email": email})
      if user:
          return {"data": {"role": user.get("role", "SALES")}}

      # Primer usuario → ADMIN
      count = await users_col.count_documents({})
      role = "ADMIN" if count == 0 else "SALES"

      # Usamos email como _id string para Cosmos DB — colección users usa string _id
      await users_col.insert_one({
          "_id": email,
          "email": email,
          "role": role,
          "createdAt": datetime.utcnow(),
      })
      return {"data": {"role": role}}
  ```

- [ ] **Step 2: Registrar el router en `backend/app/api/v1/router.py`**

  Añadir después de los imports existentes:
  ```python
  from app.api.v1.endpoints import users
  ```

  Añadir después de los `include_router` existentes:
  ```python
  api_router.include_router(users.router)
  ```

- [ ] **Step 3: Crear proxy route en Next.js `app/api/users/route.ts`**

  ```typescript
  import { proxyToBackend } from '@/lib/backend-api'
  import type { NextRequest } from 'next/server'

  export async function POST(req: NextRequest) {
    return proxyToBackend(req, '/users/role')
  }
  ```

  Nota: este endpoint lo llama `auth.ts` directamente al backend (no vía proxy), así que el proxy es solo para uso futuro desde el cliente.

- [ ] **Step 4: Configurar `.env.local` con variables de OAuth**

  Asegurarse que `.env.local` tenga:
  ```
  GOOGLE_CLIENT_ID=tu_client_id_aqui
  GOOGLE_CLIENT_SECRET=tu_client_secret_aqui
  NEXTAUTH_SECRET=genera_uno_con: openssl rand -base64 32
  NEXTAUTH_URL=http://localhost:3000
  ALLOWED_EMAIL_DOMAIN=coimpactob.com
  FASTAPI_BACKEND_URL=http://127.0.0.1:8000
  ```

  Para obtener `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`:
  1. Ir a https://console.cloud.google.com/apis/credentials
  2. Crear credenciales OAuth 2.0
  3. Tipo: Web application
  4. Redirect URI: `http://localhost:3000/api/auth/callback/google`

- [ ] **Step 5: Verificar login**

  Abrir http://localhost:3000/login → debe mostrar botón "Entrar con Google" → login con cuenta `@coimpactob.com` → redirige a `/dashboard`.

- [ ] **Step 6: Commit**

  ```bash
  git add coimpactob-crm/backend/app/api/v1/endpoints/users.py
  git add coimpactob-crm/backend/app/api/v1/router.py
  git commit -m "feat: endpoint de roles de usuario, primer usuario es ADMIN"
  ```

---

## Chunk 4: Reportes Excel y PDF

### Archivos modificados/creados
- Modify: `backend/requirements.txt` — añadir openpyxl, reportlab
- Create: `backend/app/api/v1/endpoints/reports.py`
- Modify: `backend/app/api/v1/router.py` — registrar reports router
- Create: `app/api/reports/pipeline/route.ts` — proxy binario Excel
- Create: `app/api/reports/quarterly/route.ts` — proxy binario PDF
- Modify: `app/(app)/dashboard/page.tsx` — añadir botones de exportación

---

### Task 11: Dependencias Python para reportes

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Añadir las dependencias al final de `requirements.txt`**

  ```
  # Reports
  openpyxl==3.1.2
  reportlab==4.2.2
  ```

- [ ] **Step 2: Instalar**

  ```bash
  cd coimpactob-crm/backend
  pip install openpyxl==3.1.2 reportlab==4.2.2
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add coimpactob-crm/backend/requirements.txt
  git commit -m "deps: añadir openpyxl y reportlab para exportación"
  ```

---

### Task 12: Endpoint FastAPI de reportes

**Files:**
- Create: `backend/app/api/v1/endpoints/reports.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Crear `backend/app/api/v1/endpoints/reports.py`**

  ```python
  import io
  from datetime import datetime
  from fastapi import APIRouter, Depends, Query
  from fastapi.responses import StreamingResponse
  from app.database import get_db
  from app.services.deal_service import DealService

  router = APIRouter(prefix="/reports", tags=["reports"])


  @router.get("/pipeline.xlsx")
  async def export_pipeline_excel(db=Depends(get_db)):
      from openpyxl import Workbook
      from openpyxl.styles import Font, PatternFill, Alignment
      from openpyxl.utils import get_column_letter

      deal_svc = DealService(db)
      deals, _ = await deal_svc.list_deals(limit=500)

      wb = Workbook()

      # --- Hoja 1: Todos los deals ---
      ws1 = wb.active
      ws1.title = "Pipeline"
      headers = ["Prospecto", "Línea", "Servicio", "Etapa", "Valor ($)", "Valor Pond. ($)",
                 "Responsable", "Próxima Acción", "Fecha Cierre", "Creado"]
      for col, h in enumerate(headers, 1):
          cell = ws1.cell(row=1, column=col, value=h)
          cell.font = Font(bold=True, color="FFFFFF")
          cell.fill = PatternFill("solid", fgColor="1A7A4A")
          cell.alignment = Alignment(horizontal="center")

      for row_num, deal in enumerate(deals, 2):
          d = deal.model_dump(by_alias=True)
          ws1.append([
              d.get("prospectId", ""),
              d.get("line", ""),
              d.get("serviceType", ""),
              d.get("stage", ""),
              d.get("value") or 0,
              d.get("ponderatedValue") or 0,
              d.get("assignedTo", ""),
              d.get("nextAction", ""),
              str(d.get("expectedCloseDate", "") or ""),
              str(d.get("createdAt", "")[:10] if d.get("createdAt") else ""),
          ])

      for col in range(1, len(headers) + 1):
          ws1.column_dimensions[get_column_letter(col)].width = 20

      # --- Hoja 2: Por etapa ---
      ws2 = wb.create_sheet("Por Etapa")
      stages = {}
      for deal in deals:
          s = deal.stage
          if s not in stages:
              stages[s] = {"count": 0, "value": 0}
          stages[s]["count"] += 1
          stages[s]["value"] += deal.value or 0

      ws2.append(["Etapa", "Cantidad", "Valor Total ($)"])
      ws2["A1"].font = Font(bold=True)
      ws2["B1"].font = Font(bold=True)
      ws2["C1"].font = Font(bold=True)
      for stage, data in stages.items():
          ws2.append([stage, data["count"], data["value"]])

      # --- Hoja 3: Por servicio ---
      ws3 = wb.create_sheet("Por Servicio")
      services = {}
      for deal in deals:
          svc = deal.serviceType or "Sin clasificar"
          if svc not in services:
              services[svc] = {"count": 0, "value": 0}
          services[svc]["count"] += 1
          services[svc]["value"] += deal.value or 0

      ws3.append(["Servicio", "Deals", "Valor Total ($)"])
      ws3["A1"].font = Font(bold=True)
      ws3["B1"].font = Font(bold=True)
      ws3["C1"].font = Font(bold=True)
      for svc, data in services.items():
          ws3.append([svc, data["count"], data["value"]])

      output = io.BytesIO()
      wb.save(output)
      output.seek(0)

      filename = f"pipeline_{datetime.now().strftime('%Y%m%d')}.xlsx"
      return StreamingResponse(
          output,
          media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          headers={"Content-Disposition": f'attachment; filename="{filename}"'},
      )


  @router.get("/quarterly.pdf")
  async def export_quarterly_pdf(
      quarter: int = Query(2, ge=1, le=4),
      year: int = Query(2026),
      db=Depends(get_db),
  ):
      from reportlab.lib.pagesizes import letter
      from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
      from reportlab.lib.units import inch
      from reportlab.lib import colors
      from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
      from reportlab.lib.enums import TA_CENTER

      deal_svc = DealService(db)
      deals, _ = await deal_svc.list_deals(limit=500)

      output = io.BytesIO()
      doc = SimpleDocTemplate(output, pagesize=letter,
                              rightMargin=inch * 0.75, leftMargin=inch * 0.75,
                              topMargin=inch, bottomMargin=inch)

      styles = getSampleStyleSheet()
      title_style = ParagraphStyle("Title", parent=styles["Title"],
                                   textColor=colors.HexColor("#1A7A4A"),
                                   fontSize=22, alignment=TA_CENTER)
      h2_style = ParagraphStyle("H2", parent=styles["Heading2"],
                                textColor=colors.HexColor("#1A7A4A"), fontSize=14)
      body_style = styles["Normal"]

      story = []
      story.append(Paragraph(f"CoimpactoB — Reporte Trimestral", title_style))
      story.append(Paragraph(f"Q{quarter} {year}", title_style))
      story.append(Spacer(1, 0.3 * inch))
      story.append(Paragraph(f"Generado: {datetime.now().strftime('%d/%m/%Y %H:%M')}", body_style))
      story.append(Spacer(1, 0.4 * inch))

      # Deals ganados en el trimestre
      won_deals = [d for d in deals if d.stage == "GANADO"]
      story.append(Paragraph("Deals Ganados en el Trimestre", h2_style))
      story.append(Spacer(1, 0.1 * inch))

      if won_deals:
          table_data = [["Prospecto", "Línea", "Valor ($)", "Responsable"]]
          total_won = 0
          for d in won_deals:
              table_data.append([
                  d.prospectId or "",
                  d.line or "",
                  f"${(d.value or 0):,.0f}",
                  d.assignedTo or "",
              ])
              total_won += d.value or 0
          table_data.append(["TOTAL", "", f"${total_won:,.0f}", ""])

          t = Table(table_data, colWidths=[2.2 * inch, 1.5 * inch, 1.3 * inch, 1.5 * inch])
          t.setStyle(TableStyle([
              ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A7A4A")),
              ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
              ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
              ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
              ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#E8F5E9")),
              ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
          ]))
          story.append(t)
      else:
          story.append(Paragraph("Sin deals ganados en el trimestre.", body_style))

      story.append(Spacer(1, 0.4 * inch))

      # Pipeline activo por línea
      story.append(Paragraph("Pipeline Activo por Línea de Negocio", h2_style))
      story.append(Spacer(1, 0.1 * inch))

      lines = {}
      for deal in deals:
          if deal.stage in ("GANADO", "PERDIDO"):
              continue
          line = deal.line or "Sin clasificar"
          if line not in lines:
              lines[line] = {"count": 0, "value": 0}
          lines[line]["count"] += 1
          lines[line]["value"] += deal.value or 0

      if lines:
          line_data = [["Línea", "Deals Activos", "Valor Pipeline ($)"]]
          for line, data in lines.items():
              line_data.append([line, str(data["count"]), f"${data['value']:,.0f}"])
          lt = Table(line_data, colWidths=[2.5 * inch, 1.5 * inch, 2.5 * inch])
          lt.setStyle(TableStyle([
              ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A7A4A")),
              ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
              ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
              ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
              ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F8F4")]),
          ]))
          story.append(lt)

      doc.build(story)
      output.seek(0)

      filename = f"reporte_Q{quarter}_{year}.pdf"
      return StreamingResponse(
          output,
          media_type="application/pdf",
          headers={"Content-Disposition": f'attachment; filename="{filename}"'},
      )
  ```

- [ ] **Step 2: Registrar en router.py**

  Añadir imports y router:
  ```python
  from app.api.v1.endpoints import reports
  # ...
  api_router.include_router(reports.router)
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add coimpactob-crm/backend/app/api/v1/endpoints/reports.py
  git add coimpactob-crm/backend/app/api/v1/router.py
  git commit -m "feat: endpoints de exportación Excel y PDF trimestral"
  ```

---

### Task 13: Proxy binario en Next.js para reportes

**Files:**
- Create: `app/api/reports/pipeline/route.ts`
- Create: `app/api/reports/quarterly/route.ts`

- [ ] **Step 1: Crear `app/api/reports/pipeline/route.ts`**

  Nota: estos archivos NO usan `proxyToBackend` porque ese helper usa `.text()` que corrompe binarios. Usan fetch directo con `arrayBuffer()`.

  ```typescript
  import { NextResponse } from 'next/server'
  import { auth } from '@/auth'

  const BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'

  export async function GET() {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await fetch(`${BACKEND_URL}/api/v1/reports/pipeline.xlsx`, {
      headers: {
        'x-user-id': session.user?.id || '',
        'x-user-email': session.user?.email || '',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error generando reporte' }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    const filename = `pipeline_${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }
  ```

- [ ] **Step 2: Crear `app/api/reports/quarterly/route.ts`**

  ```typescript
  import { NextResponse } from 'next/server'
  import { auth } from '@/auth'
  import type { NextRequest } from 'next/server'

  const BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'

  export async function GET(req: NextRequest) {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = req.nextUrl.search || '?quarter=2&year=2026'
    const res = await fetch(`${BACKEND_URL}/api/v1/reports/quarterly.pdf${query}`, {
      headers: {
        'x-user-id': session.user?.id || '',
        'x-user-email': session.user?.email || '',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Error generando reporte' }, { status: res.status })
    }

    const buffer = await res.arrayBuffer()
    const quarter = new URL(req.url).searchParams.get('quarter') || '2'
    const year = new URL(req.url).searchParams.get('year') || '2026'
    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('quarter') || '2'
    const yr = searchParams.get('year') || '2026'
    const filename = `reporte_Q${q}_${yr}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }
  ```

- [ ] **Step 3: Commit**

  ```bash
  git add coimpactob-crm/app/api/reports/
  git commit -m "feat: proxy binario para descarga de Excel y PDF"
  ```

---

### Task 14: Botones de exportación en Dashboard

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Añadir sección de exportación al final del dashboard**

  En `app/(app)/dashboard/page.tsx`, añadir el import y la sección de exportación:

  Añadir import al inicio:
  ```typescript
  import { FileSpreadsheet, FileText } from 'lucide-react'
  import { Button } from '@/components/ui/button'
  ```

  Añadir al final del JSX (antes del último `</div>` de cierre):
  ```typescript
  <div className="rounded-xl border bg-white p-6 shadow-sm">
    <h2 className="mb-4 text-lg font-semibold">Exportar Reportes</h2>
    <div className="flex gap-3">
      <a href="/api/reports/pipeline" download>
        <Button variant="outline" className="flex items-center gap-2 text-green-700 border-green-300">
          <FileSpreadsheet className="w-4 h-4" />
          Pipeline Excel
        </Button>
      </a>
      <a href="/api/reports/quarterly?quarter=2&year=2026" download>
        <Button variant="outline" className="flex items-center gap-2 text-blue-700 border-blue-300">
          <FileText className="w-4 h-4" />
          Reporte Q2 2026 PDF
        </Button>
      </a>
    </div>
  </div>
  ```

- [ ] **Step 2: Verificar**
  - Abrir http://localhost:3000/dashboard
  - Scroll al final → sección "Exportar Reportes" con 2 botones
  - Click "Pipeline Excel" → descarga archivo .xlsx con 3 hojas
  - Click "Reporte Q2 2026 PDF" → descarga PDF con tabla de deals

- [ ] **Step 3: Commit final**

  ```bash
  git add coimpactob-crm/app/\(app\)/dashboard/page.tsx
  git commit -m "feat: botones de exportación Excel y PDF en dashboard"
  ```

---

## Checklist Final de Verificación

- [ ] http://localhost:3000/pipeline carga deals desde MongoDB
- [ ] Drag & drop de deals entre etapas funciona y persiste
- [ ] http://localhost:3000/dashboard muestra métricas reales
- [ ] http://localhost:3000/prospects lista prospectos con búsqueda
- [ ] Botón "Importar Google Sheets" funciona y muestra conteo de registros
- [ ] Login con Google funciona solo con emails `@coimpactob.com`
- [ ] Descarga de Excel tiene 3 hojas (Pipeline, Por Etapa, Por Servicio)
- [ ] Descarga de PDF tiene portada, deals ganados y pipeline por línea
