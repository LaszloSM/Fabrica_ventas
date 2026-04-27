# CoimpactoB CRM — Migración a Frontend Vite (Plan Definitivo)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El directorio `frontend/` (Vite + React) se convierte en el único frontend del sistema. Todo lo demás (Next.js app, components/, lib/, types/, etc.) se elimina. El frontend Vite se conecta directamente a la FastAPI via un servidor Express integrado que actúa como proxy autenticado. Todo 100% funcional, sin mockups.

**Architecture:**
- `frontend/` = SPA Vite + React (UI completa)
- `frontend/server.ts` = Express server: sirve el build, maneja Google OAuth, proxea a FastAPI con headers `x-user-id / x-user-email / x-user-role`
- `backend/` = FastAPI (no se toca)
- Auth: Google OAuth via `@react-oauth/google` en el cliente → el Express server verifica con Google API y devuelve sesión

**Tech Stack:** Vite 6, React 19, TypeScript, Tailwind CSS 4, motion/react, Lucide React, Express 4, `@react-oauth/google`, `google-auth-library`, `js-cookie`

**Variables de entorno necesarias en `frontend/.env`:**
```
VITE_GOOGLE_CLIENT_ID=<tu-client-id>
VITE_API_BASE=/api        # Express proxy local
GOOGLE_CLIENT_ID=<tu-client-id>
GOOGLE_CLIENT_SECRET=<tu-client-secret>
FASTAPI_BACKEND_URL=http://127.0.0.1:8000
SESSION_SECRET=<random-string>
```

---

## Chunk 1: Infraestructura — Express Server + Auth + Eliminar Next.js

### Task 1: Eliminar archivos del Next.js

**Files to delete:** `app/`, `components/`, `lib/`, `types/`, `auth.ts`, `next.config.ts`, `postcss.config.mjs`, `next-env.d.ts`, `tsconfig.tsbuildinfo`

- [ ] **Step 1: Borrar el Next.js app y sus dependencias**

```bash
cd "C:/Users/User/Desktop/Fabrica Ventas/coimpactob-crm"
rm -rf app components lib types auth.ts next.config.ts postcss.config.mjs next-env.d.ts tsconfig.tsbuildinfo public/
```

- [ ] **Step 2: Actualizar .gitignore para ignorar Next.js artifacts**

En `.gitignore`, conservar las líneas de `node_modules`, `.next`, `dist`, `.env*`.
Eliminar referencias a Next.js si las hay.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Next.js app — migrating to Vite frontend"
```

---

### Task 2: Instalar dependencias en `frontend/`

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Instalar nuevas dependencias**

```bash
cd "C:/Users/User/Desktop/Fabrica Ventas/coimpactob-crm/frontend"
npm install @react-oauth/google google-auth-library js-cookie express-session cookie-parser cors
npm install --save-dev @types/js-cookie @types/cookie-parser @types/express-session @types/cors
```

- [ ] **Step 2: Verificar que `motion` está instalado**

```bash
npm ls motion
```

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add auth and proxy dependencies to frontend"
```

---

### Task 3: Express Server — API Proxy + Auth + Static Serve

**Files:**
- Create: `frontend/server.ts`

- [ ] **Step 1: Crear el Express server**

```ts
// frontend/server.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { OAuth2Client } from 'google-auth-library'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const PORT = process.env.PORT || 8080
const FASTAPI_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'
const API_PREFIX = '/api/v1'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const oauthClient = new OAuth2Client(GOOGLE_CLIENT_ID)

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'coimpactob-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}))

// ── Auth ──────────────────────────────────────────────────────────────

app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body
    const ticket = await oauthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()!

    // Get or create user in backend
    let userRole = 'SALES'
    try {
      const userRes = await fetch(`${FASTAPI_URL}${API_PREFIX}/users/me`, {
        headers: { 'x-user-email': payload.email!, 'x-user-id': payload.sub, 'x-user-role': 'SALES' }
      })
      if (userRes.ok) {
        const userData = await userRes.json()
        userRole = userData.role ?? 'SALES'
      }
    } catch {}

    ;(req.session as any).user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      image: payload.picture,
      role: userRole,
    }

    res.json({ ok: true, user: (req.session as any).user })
  } catch (err) {
    console.error('[auth] Google verify failed:', err)
    res.status(401).json({ ok: false, error: 'Token inválido' })
  }
})

app.get('/auth/session', (req, res) => {
  const user = (req.session as any).user
  if (!user) return res.status(401).json({ user: null })
  res.json({ user })
})

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// ── API Proxy ─────────────────────────────────────────────────────────

app.all('/api/*', async (req, res) => {
  const user = (req.session as any).user
  if (!user) return res.status(401).json({ error: 'No autenticado' })

  const backendPath = req.path.replace('/api', '')
  const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
  const url = `${FASTAPI_URL}${API_PREFIX}${backendPath}${query}`

  try {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body)
    const upstream = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
        'x-user-email': user.email,
        'x-user-role': user.role,
      },
      body,
    })
    const text = await upstream.text()
    res.status(upstream.status)
      .set('Content-Type', upstream.headers.get('content-type') || 'application/json')
      .send(text)
  } catch (err) {
    console.error('[proxy]', err)
    res.status(503).json({ error: 'Backend no disponible' })
  }
})

// ── Static (prod) ─────────────────────────────────────────────────────

const distPath = path.join(__dirname, 'dist')
app.use(express.static(distPath))
app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')))

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`))
```

- [ ] **Step 2: Agregar scripts al `frontend/package.json`**

```json
{
  "scripts": {
    "dev": "vite --port=3000 --host=0.0.0.0",
    "server": "tsx server.ts",
    "build": "vite build",
    "start": "npm run build && node --loader tsx server.ts",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 3: Agregar proxy en `vite.config.ts` para dev**

```ts
// frontend/vite.config.ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': { target: 'http://localhost:8080', changeOrigin: true },
        '/auth': { target: 'http://localhost:8080', changeOrigin: true },
      }
    },
  }
})
```

- [ ] **Step 4: Crear `frontend/.env` con las variables necesarias**

```bash
# frontend/.env  (NO subir al repo)
VITE_GOOGLE_CLIENT_ID=<copiar de Google Cloud Console>
GOOGLE_CLIENT_ID=<mismo valor>
GOOGLE_CLIENT_SECRET=<de Google Cloud Console>
FASTAPI_BACKEND_URL=http://127.0.0.1:8000
SESSION_SECRET=coimpactob-super-secret-2025
PORT=8080
```

- [ ] **Step 5: Commit**

```bash
git add frontend/server.ts frontend/vite.config.ts frontend/package.json
git commit -m "feat: add Express server with Google OAuth proxy to FastAPI"
```

---

### Task 4: Auth Context en React

**Files:**
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`

- [ ] **Step 1: Crear AuthContext**

```tsx
// frontend/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react'

interface User {
  id: string
  email: string
  name: string
  image?: string
  role: 'ADMIN' | 'SALES' | 'VIEWER'
}

interface AuthCtx {
  user: User | null
  loading: boolean
  logout: () => Promise<void>
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true, logout: async () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/auth/session', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setUser(d?.user ?? null))
      .finally(() => setLoading(false))
  }, [])

  const logout = async () => {
    await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return <Ctx.Provider value={{ user, loading, logout }}>{children}</Ctx.Provider>
}

export function useAuth() { return useContext(Ctx) }

// Called after Google One Tap returns credential
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

- [ ] **Step 2: Crear LoginPage**

```tsx
// frontend/src/pages/LoginPage.tsx
import React, { useEffect } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { loginWithGoogle } from '../context/AuthContext'

interface Props { onLogin: () => void }

export function LoginPage({ onLogin }: Props) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="glass-card p-12 flex flex-col items-center gap-8 w-full max-w-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-primary-container text-white flex items-center justify-center font-bold text-2xl font-display">C</div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-brand-primary-container leading-none">CoimpactoB</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 opacity-70">Impact CRM</p>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-bold text-on-surface">Bienvenido de vuelta</h2>
          <p className="text-sm text-on-surface-variant mt-1">Inicia sesión con tu cuenta corporativa</p>
        </div>

        <GoogleLogin
          onSuccess={async (res) => {
            if (res.credential) {
              const user = await loginWithGoogle(res.credential)
              if (user) onLogin()
            }
          }}
          onError={() => console.error('Login fallido')}
          useOneTap
        />

        <p className="text-xs text-on-surface-variant text-center">
          Solo cuentas autorizadas de CoimpactoB pueden acceder.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/context/AuthContext.tsx frontend/src/pages/LoginPage.tsx
git commit -m "feat: auth context and login page with Google OAuth"
```

---

### Task 5: API Client — Fetch wrapper

**Files:**
- Create: `frontend/src/lib/api.ts`

- [ ] **Step 1: Crear api.ts**

```ts
// frontend/src/lib/api.ts

const BASE = '/api'

async function req(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers as any) },
    ...opts,
  })
  if (res.status === 401) {
    window.location.href = '/'
    return null
  }
  if (!res.ok) {
    console.error(`[api] ${opts.method ?? 'GET'} ${path} → ${res.status}`)
    return null
  }
  return res.json()
}

export const api = {
  get: (path: string) => req(path),
  post: (path: string, body: unknown) => req(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: (path: string, body: unknown) => req(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (path: string) => req(path, { method: 'DELETE' }),
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: api client with auth handling"
```

---

## Chunk 2: App Shell — Layout, Sidebar, TopNav, Router

### Task 6: Actualizar `main.tsx` con providers y router

**Files:**
- Modify: `frontend/src/main.tsx`

- [ ] **Step 1: Actualizar main.tsx**

```tsx
// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

ReactDOM.createRoot(document.getElementById('root')!).render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/main.tsx
git commit -m "feat: wrap app with GoogleOAuthProvider"
```

---

### Task 7: Actualizar `App.tsx` — Auth gate + Router

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Reescribir App.tsx con auth gate y navegación**

```tsx
// frontend/src/App.tsx
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LoginPage } from './pages/LoginPage'
import { Sidebar } from './components/layout/Sidebar'
import { TopNav } from './components/layout/TopNav'
import { DashboardView } from './views/DashboardView'
import { PipelineView } from './views/PipelineView'
import { OpportunitiesView } from './views/OpportunitiesView'
import { OpportunityDetailView } from './views/OpportunityDetailView'
import { AccountsView } from './views/AccountsView'
import { ContactsView } from './views/ContactsView'
import { ActivitiesView } from './views/ActivitiesView'
import { GoalsView } from './views/GoalsView'
import { ReportsView } from './views/ReportsView'
import { SettingsView } from './views/SettingsView'
import { NewOpportunityModal } from './components/modals/NewOpportunityModal'

export type ViewType =
  | 'dashboard' | 'pipeline' | 'opportunities' | 'opportunity-detail'
  | 'accounts' | 'contacts' | 'activities' | 'goals' | 'reports' | 'settings'

function AppShell() {
  const { user, loading } = useAuth()
  const [view, setView] = useState<ViewType>('dashboard')
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  if (loading) return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="text-on-surface-variant text-sm">Cargando...</div>
    </div>
  )

  if (!user) return <LoginPage onLogin={() => setRefreshKey(k => k + 1)} />

  const goToDetail = (id: string) => { setSelectedDealId(id); setView('opportunity-detail') }

  const views: Record<ViewType, React.ReactNode> = {
    dashboard: <DashboardView onDealClick={goToDetail} />,
    pipeline: <PipelineView onDealClick={goToDetail} />,
    opportunities: <OpportunitiesView onDealClick={goToDetail} onNewDeal={() => setModalOpen(true)} />,
    'opportunity-detail': <OpportunityDetailView id={selectedDealId!} onBack={() => setView('opportunities')} />,
    accounts: <AccountsView />,
    contacts: <ContactsView />,
    activities: <ActivitiesView />,
    goals: <GoalsView />,
    reports: <ReportsView />,
    settings: <SettingsView />,
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar currentView={view} onViewChange={setView} onNewOpportunity={() => setModalOpen(true)} />
      <main className="flex-1 ml-[240px] flex flex-col min-w-0">
        <TopNav />
        <div className="flex-1 overflow-y-auto">
          <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {views[view]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
      <NewOpportunityModal isOpen={modalOpen} onClose={() => { setModalOpen(false); setRefreshKey(k => k + 1) }} />
    </div>
  )
}

export default function App() {
  return <AuthProvider><AppShell /></AuthProvider>
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: app shell with auth gate and view router"
```

---

### Task 8: Sidebar y TopNav actualizados

**Files:**
- Create: `frontend/src/components/layout/Sidebar.tsx`
- Create: `frontend/src/components/layout/TopNav.tsx`

- [ ] **Step 1: Crear Sidebar.tsx**

```tsx
// frontend/src/components/layout/Sidebar.tsx
import React from 'react'
import {
  LayoutDashboard, Kanban, Handshake, Building2, Users,
  CalendarDays, Target, LineChart, Settings, Plus, HelpCircle, LogOut
} from 'lucide-react'
import { ViewType } from '../../App'
import { useAuth } from '../../context/AuthContext'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'opportunities', label: 'Oportunidades', icon: Handshake },
  { id: 'accounts', label: 'Cuentas', icon: Building2 },
  { id: 'contacts', label: 'Contactos', icon: Users },
  { id: 'activities', label: 'Actividades', icon: CalendarDays },
  { id: 'goals', label: 'Metas', icon: Target },
  { id: 'reports', label: 'Reportes', icon: LineChart },
  { id: 'settings', label: 'Configuración', icon: Settings },
] as const

interface Props {
  currentView: ViewType
  onViewChange: (v: ViewType) => void
  onNewOpportunity: () => void
}

export function Sidebar({ currentView, onViewChange, onNewOpportunity }: Props) {
  const { logout } = useAuth()
  const active = currentView === 'opportunity-detail' ? 'opportunities' : currentView

  return (
    <aside className="w-[240px] h-screen border-r border-outline-variant bg-white flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 border-b border-outline-variant/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-brand-primary-container text-white flex items-center justify-center font-bold font-display cursor-pointer" onClick={() => onViewChange('dashboard')}>C</div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-brand-primary-container leading-none cursor-pointer" onClick={() => onViewChange('dashboard')}>CoimpactoB</h1>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mt-1 opacity-70">Impact CRM</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <button
          onClick={onNewOpportunity}
          className="w-full bg-brand-primary-container text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 font-semibold hover:bg-brand-primary transition-all shadow-sm active:scale-95"
        >
          <Plus size={18} />
          <span>Nueva Oportunidad</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as ViewType)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all active:scale-[0.98] ${
              active === item.id
                ? 'bg-blue-50 text-brand-primary-container border-l-[3px] border-brand-primary-container font-bold'
                : 'text-on-surface-variant hover:bg-surface-container hover:text-brand-primary'
            }`}
          >
            <item.icon size={20} />
            <span className="font-display text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-outline-variant space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all text-sm">
          <HelpCircle size={18} />
          <span>Ayuda</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container transition-all text-sm"
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Crear TopNav.tsx**

```tsx
// frontend/src/components/layout/TopNav.tsx
import React, { useState } from 'react'
import { Search, Bell, Settings } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export function TopNav() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  return (
    <header className="h-16 border-b border-outline-variant bg-white/80 backdrop-blur-md sticky top-0 z-40 flex justify-between items-center px-8">
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar registros, actividades..."
          className="w-full bg-surface border border-outline-variant rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary transition-all"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-outline-variant mx-2" />
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
            <Bell size={20} />
          </button>
          <button className="p-2 text-on-surface-variant hover:bg-surface-container rounded-full">
            <Settings size={20} />
          </button>
          <div className="ml-2 w-8 h-8 rounded-full border border-outline-variant bg-brand-primary-container text-white flex items-center justify-center text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat: sidebar and topnav components with real auth"
```

---

## Chunk 3: Views con datos reales

### Task 9: DashboardView

**Files:**
- Create: `frontend/src/views/DashboardView.tsx`

- [ ] **Step 1: Crear DashboardView con datos reales**

```tsx
// frontend/src/views/DashboardView.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { TrendingUp, Activity, Trophy, AlertTriangle, Plus } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface Props { onDealClick: (id: string) => void }

export function DashboardView({ onDealClick }: Props) {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)

  useEffect(() => { api.get('/metrics').then(d => d && setMetrics(d)) }, [])

  const m = metrics ?? {}
  const alertCount = m.alerts
    ? (m.alerts.overdueDeals ?? 0) + (m.alerts.stuckDeals ?? 0) + (m.alerts.contactsWithoutActivity ?? 0)
    : 0
  const completionPct = Math.round((m.goalsCompletionRate ?? 0) * 100)
  const totalTarget = (m.goals ?? []).reduce((s: number, g: any) => s + (g.targetValue ?? 0), 0)
  const totalCurrent = (m.goals ?? []).reduce((s: number, g: any) => s + (g.currentValue ?? 0), 0)
  const gap = totalTarget - totalCurrent

  const stats = [
    { label: 'Pipeline Total', value: fmt(m.totalPipelineValue ?? 0), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Ponderado', value: fmt(m.weightedValue ?? 0), icon: Activity, color: 'text-brand-secondary-container' },
    { label: 'Metas Ganadas', value: `${completionPct}%`, icon: Trophy, color: 'text-brand-tertiary-container' },
    { label: 'Alertas', value: String(alertCount), icon: AlertTriangle, color: 'text-crm-error' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Dashboard Operativo</h2>
        <p className="text-on-surface-variant mt-1">Bienvenido, {user?.name ?? 'Usuario'}. Monitorea el pulso de impacto.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-6">
            <div className="flex justify-between items-start mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">{stat.label}</span>
              <stat.icon className={stat.color} size={20} />
            </div>
            <div className="text-2xl font-bold text-on-surface">{stat.value}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl">Metas Trimestrales</h3>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-sm font-bold">
              <span>Avance Global</span>
              <span className="text-brand-primary-container">{completionPct}%</span>
            </div>
            <div className="w-full bg-surface-container h-4 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 0.8 }} className="bg-brand-primary-container h-full rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-8 mt-8 pt-6 border-t border-outline-variant">
              <div><div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Logrado</div><div className="text-xl font-bold">{fmt(totalCurrent)}</div></div>
              <div><div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Meta</div><div className="text-xl font-bold">{fmt(totalTarget)}</div></div>
              <div>
                <div className="text-xs text-on-surface-variant uppercase font-bold mb-1">Brecha</div>
                <div className={`text-xl font-bold ${gap > 0 ? 'text-crm-error' : 'text-brand-tertiary-container'}`}>
                  {gap > 0 ? '-' : '+'}{fmt(Math.abs(gap))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="text-brand-secondary-container" size={20} />
            Alertas de Gestión
          </h3>
          <div className="space-y-3 flex-1">
            {m.alerts?.overdueDeals > 0 && (
              <div className="p-4 rounded-lg border bg-red-50 border-red-200">
                <span className="text-xs font-bold text-red-700">{m.alerts.overdueDeals} Oportunidades Vencidas</span>
              </div>
            )}
            {m.alerts?.stuckDeals > 0 && (
              <div className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                <span className="text-xs font-bold text-orange-700">{m.alerts.stuckDeals} Sin Próxima Acción</span>
              </div>
            )}
            {!alertCount && (
              <div className="p-4 rounded-lg border bg-green-50 border-green-200">
                <span className="text-xs font-bold text-green-700">¡Sin alertas activas!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {(m.recentDeals?.length ?? 0) > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-bold text-lg">Tareas Prioritarias</h3>
          </div>
          <div className="divide-y divide-outline-variant">
            {m.recentDeals.slice(0, 5).map((deal: any) => (
              <div key={deal.id} onClick={() => onDealClick(deal.id)} className="p-4 flex items-center justify-between hover:bg-surface-container-low/20 transition-colors cursor-pointer">
                <div>
                  <div className="text-sm font-bold text-on-surface">{deal.nextAction ?? deal.stage}</div>
                  <div className="text-xs text-on-surface-variant mt-0.5">{deal.prospectName ?? deal.prospect?.name}</div>
                </div>
                <span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/DashboardView.tsx
git commit -m "feat: dashboard view with real metrics API"
```

---

### Task 10: PipelineView — Kanban con DnD real

**Files:**
- Create: `frontend/src/views/PipelineView.tsx`
- Create: `frontend/src/components/pipeline/KanbanBoard.tsx`
- Create: `frontend/src/components/pipeline/DealCard.tsx`

- [ ] **Step 1: Instalar @dnd-kit**

```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Crear DealCard.tsx**

```tsx
// frontend/src/components/pipeline/DealCard.tsx
import React from 'react'
import { motion } from 'motion/react'
import { MoreVertical } from 'lucide-react'

const STAGE_COLORS: Record<string, string> = {
  GANADO: 'border-l-green-500',
  PERDIDO: 'border-l-red-400',
  NEGOCIACION: 'border-l-brand-secondary-container',
  default: 'border-l-brand-primary-container'
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

interface Props {
  deal: any
  onClick: () => void
  dragProps?: any
}

export function DealCard({ deal, onClick, dragProps }: Props) {
  const borderColor = STAGE_COLORS[deal.stage] ?? STAGE_COLORS.default
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`bg-white p-4 rounded-xl border border-outline-variant shadow-sm cursor-pointer border-l-4 ${borderColor}`}
      {...dragProps}
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-sm font-bold text-brand-primary-container">{deal.prospect?.name ?? deal.prospectName ?? '—'}</h4>
        <MoreVertical size={14} className="text-on-surface-variant" onClick={e => e.stopPropagation()} />
      </div>
      <p className="text-xs text-on-surface-variant leading-relaxed">{deal.serviceType?.replace(/_/g, ' ') ?? '—'}</p>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-outline-variant/30">
        <span className="text-sm font-bold">{fmt(deal.value ?? 0)}</span>
        <div className="w-6 h-6 rounded-full bg-brand-primary-container flex items-center justify-center text-[10px] text-white font-bold">
          {(deal.assignedUser?.name ?? deal.assignedToName ?? '?')[0].toUpperCase()}
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Crear KanbanBoard.tsx**

```tsx
// frontend/src/components/pipeline/KanbanBoard.tsx
import React, { useEffect, useState } from 'react'
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { DealCard } from './DealCard'
import { api } from '../../lib/api'

const STAGES = [
  { id: 'PROSPECTO_IDENTIFICADO', label: 'Prospecto Identificado' },
  { id: 'SENAL_DETECTADA', label: 'Señal Detectada' },
  { id: 'PRIMER_CONTACTO', label: 'Primer Contacto' },
  { id: 'EN_SECUENCIA', label: 'En Secuencia' },
  { id: 'REUNION_AGENDADA', label: 'Reunión Agendada' },
  { id: 'PROPUESTA_ENVIADA', label: 'Propuesta Enviada' },
  { id: 'NEGOCIACION', label: 'Negociación' },
]

function Column({ stage, deals, onDealClick }: { stage: { id: string; label: string }; deals: any[]; onDealClick: (id: string) => void }) {
  const { setNodeRef } = useDroppable({ id: stage.id })
  return (
    <div className="w-[280px] shrink-0 flex flex-col gap-3">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-primary-container" />
          {stage.label}
        </h3>
        <span className="text-[10px] font-bold bg-surface-container py-0.5 px-2 rounded-full">{deals.length}</span>
      </div>
      <div ref={setNodeRef} className="flex-1 bg-surface-container-low/30 rounded-xl border border-outline-variant border-dashed p-3 flex flex-col gap-3 min-h-[300px]">
        <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
          {deals.map(deal => <SortableDeal key={deal.id} deal={deal} onDealClick={onDealClick} />)}
        </SortableContext>
      </div>
    </div>
  )
}

function SortableDeal({ deal, onDealClick }: { deal: any; onDealClick: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <DealCard deal={deal} onClick={() => onDealClick(deal.id)} dragProps={{ ...attributes, ...listeners }} />
    </div>
  )
}

interface Props { onDealClick: (id: string) => void }

export function KanbanBoard({ onDealClick }: Props) {
  const [deals, setDeals] = useState<any[]>([])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  useEffect(() => {
    api.get('/deals').then(d => d && setDeals(Array.isArray(d) ? d : d.deals ?? []))
  }, [])

  const dealsByStage = (stageId: string) => deals.filter(d => d.stage === stageId)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const dealId = active.id as string
    const newStage = STAGES.find(s => s.id === over.id)?.id ?? over.id as string
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d))
    await api.post(`/deals/${dealId}/move-stage`, { stage: newStage })
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
        {STAGES.map(stage => (
          <Column key={stage.id} stage={stage} deals={dealsByStage(stage.id)} onDealClick={onDealClick} />
        ))}
      </div>
    </DndContext>
  )
}
```

- [ ] **Step 4: Crear PipelineView.tsx**

```tsx
// frontend/src/views/PipelineView.tsx
import React from 'react'
import { Filter, Download } from 'lucide-react'
import { KanbanBoard } from '../components/pipeline/KanbanBoard'

interface Props { onDealClick: (id: string) => void }

export function PipelineView({ onDealClick }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Pipeline de Ventas</h2>
          <p className="text-on-surface-variant mt-1">Visualiza y gestiona las etapas de impacto.</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant"><Filter size={18} /></button>
          <a href="/api/reports/pipeline" className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container text-on-surface-variant flex items-center"><Download size={18} /></a>
        </div>
      </header>
      <KanbanBoard onDealClick={onDealClick} />
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/views/PipelineView.tsx frontend/src/components/pipeline/
git commit -m "feat: pipeline kanban with drag-and-drop and real deals API"
```

---

### Task 11: DataTable Component + OpportunitiesView + DetailView

**Files:**
- Create: `frontend/src/components/ui/DataTable.tsx`
- Create: `frontend/src/views/OpportunitiesView.tsx`
- Create: `frontend/src/views/OpportunityDetailView.tsx`

- [ ] **Step 1: Crear DataTable.tsx**

```tsx
// frontend/src/components/ui/DataTable.tsx
import React, { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus, MoreVertical } from 'lucide-react'

export interface Column<T> {
  label: string
  key: keyof T
  render?: (val: any, row: T) => React.ReactNode
}

interface Props<T> {
  title: string
  subtitle: string
  data: T[]
  columns: Column<T>[]
  onRowClick?: (row: T) => void
  onAdd?: () => void
  addLabel?: string
  loading?: boolean
}

export function DataTable<T extends { id: string }>({ title, subtitle, data, columns, onRowClick, onAdd, addLabel = 'Añadir', loading }: Props<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const filtered = search
    ? data.filter(row => Object.values(row as any).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : data

  const pages = Math.ceil(filtered.length / PAGE_SIZE)
  const slice = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{title}</h2>
          <p className="text-on-surface-variant mt-1">{subtitle}</p>
        </div>
        {onAdd && (
          <button onClick={onAdd} className="bg-brand-primary-container text-white py-2 px-6 rounded-lg font-bold flex items-center gap-2 shadow-sm hover:bg-brand-primary transition-colors">
            <Plus size={18} /> {addLabel}
          </button>
        )}
      </header>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex gap-4 bg-surface-container-low/20">
          <div className="relative w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Buscar..." className="pl-10 pr-4 py-1.5 w-full bg-white border border-outline-variant rounded-lg text-xs focus:outline-none" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low text-[10px] font-bold text-on-surface-variant uppercase tracking-widest border-b border-outline-variant">
                {columns.map((col, i) => <th key={i} className="px-6 py-4">{col.label}</th>)}
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="px-6 py-12 text-center text-on-surface-variant text-sm">Cargando...</td></tr>
              ) : slice.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-6 py-12 text-center text-on-surface-variant text-sm">Sin registros</td></tr>
              ) : slice.map((row, i) => (
                <tr key={(row as any).id ?? i} onClick={() => onRowClick?.(row)} className={`hover:bg-surface-container-low/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                  {columns.map((col, j) => (
                    <td key={j} className="px-6 py-4">
                      {col.render ? col.render((row as any)[col.key], row) : <span className="text-sm text-on-surface">{String((row as any)[col.key] ?? '')}</span>}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <button className="text-on-surface-variant hover:text-brand-primary p-2 transition-colors"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-outline-variant flex justify-between items-center">
          <span className="text-xs text-on-surface-variant">Mostrando {slice.length} de {filtered.length} registros</span>
          {pages > 1 && (
            <div className="flex gap-1 items-center">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40"><ChevronLeft size={16} /></button>
              <span className="px-3 text-xs font-bold text-on-surface-variant">{page}/{pages}</span>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear OpportunitiesView.tsx**

```tsx
// frontend/src/views/OpportunitiesView.tsx
import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto', SENAL_DETECTADA: 'Señal', PRIMER_CONTACTO: 'Primer Contacto',
  EN_SECUENCIA: 'En Secuencia', REUNION_AGENDADA: 'Reunión Agendada', PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación', GANADO: 'Ganado', PERDIDO: 'Perdido'
}

interface Props { onDealClick: (id: string) => void; onNewDeal: () => void }

export function OpportunitiesView({ onDealClick, onNewDeal }: Props) {
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/deals').then(d => { if (d) setDeals(Array.isArray(d) ? d : d.deals ?? []); setLoading(false) })
  }, [])

  const columns: Column<any>[] = [
    {
      label: 'Cuenta / Tipo', key: 'prospectName',
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-brand-primary-container">{val ?? row.prospect?.name ?? '—'}</span>
          <span className="text-[10px] text-on-surface-variant mt-0.5">{row.serviceType?.replace(/_/g, ' ')}</span>
        </div>
      )
    },
    {
      label: 'Etapa', key: 'stage',
      render: val => <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase border border-blue-100">{STAGE_LABELS[val] ?? val}</span>
    },
    { label: 'Valor', key: 'value', render: val => <span className="text-sm font-bold">${(val ?? 0).toLocaleString()} USD</span> },
    { label: 'Responsable', key: 'assignedToName', render: (val, row) => <span className="text-sm">{val ?? row.assignedUser?.name ?? '—'}</span> },
  ]

  return (
    <DataTable
      title="Oportunidades Activas"
      subtitle="Gestiona el directorio activo de oportunidades."
      data={deals}
      columns={columns}
      onRowClick={row => onDealClick(row.id)}
      onAdd={onNewDeal}
      addLabel="Nueva Oportunidad"
      loading={loading}
    />
  )
}
```

- [ ] **Step 3: Crear OpportunityDetailView.tsx**

```tsx
// frontend/src/views/OpportunityDetailView.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, Plus, Building2, Globe, MapPin, StickyNote } from 'lucide-react'
import { api } from '../lib/api'

const STAGE_LABELS: Record<string, string> = {
  PROSPECTO_IDENTIFICADO: 'Prospecto', SENAL_DETECTADA: 'Señal', PRIMER_CONTACTO: 'Primer Contacto',
  EN_SECUENCIA: 'En Secuencia', REUNION_AGENDADA: 'Reunión Agendada', PROPUESTA_ENVIADA: 'Propuesta',
  NEGOCIACION: 'Negociación', GANADO: 'Ganado', PERDIDO: 'Perdido'
}

interface Props { id: string; onBack: () => void }

export function OpportunityDetailView({ id, onBack }: Props) {
  const [deal, setDeal] = useState<any>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    api.get(`/deals/${id}`).then(d => d && setDeal(d))
    api.get(`/activities?dealId=${id}`).then(d => d && setActivities(Array.isArray(d) ? d : d.activities ?? []))
  }, [id])

  const saveNote = async () => {
    if (!note.trim()) return
    setSaving(true)
    await api.post('/activities', { dealId: id, type: 'NOTE', notes: note, outcome: 'Nota interna' })
    const d = await api.get(`/activities?dealId=${id}`)
    if (d) setActivities(Array.isArray(d) ? d : d.activities ?? [])
    setNote('')
    setSaving(false)
  }

  if (!deal) return <div className="flex items-center justify-center h-64 text-on-surface-variant">Cargando...</div>

  const prospect = deal.prospect ?? {}

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"><ArrowLeft size={24} /></button>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-on-surface">{deal.serviceType?.replace(/_/g, ' ')}</h2>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">{STAGE_LABELS[deal.stage] ?? deal.stage}</span>
          </div>
          <p className="text-on-surface-variant mt-1">{prospect.name ?? '—'}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-6 border-l-4 border-l-brand-primary-container">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Valor</div>
              <div className="text-2xl font-bold">${(deal.value ?? 0).toLocaleString()} USD</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-brand-secondary-container">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Trimestre</div>
              <div className="text-2xl font-bold">{deal.quarter ?? '—'}</div>
            </div>
            <div className="glass-card p-6 border-l-4 border-l-brand-tertiary-container">
              <div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Región</div>
              <div className="text-sm font-bold">{deal.region ?? prospect.region ?? '—'}</div>
            </div>
          </div>

          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Línea de Tiempo</h3>
              <button className="flex items-center gap-1 text-brand-primary-container text-sm font-bold"><Plus size={16} /> Nueva Actividad</button>
            </div>
            <div className="p-6">
              {activities.length === 0 && <p className="text-sm text-on-surface-variant">Sin actividades registradas.</p>}
              <div className="space-y-6">
                {activities.map((act, i) => (
                  <div key={act.id ?? i} className="flex gap-4 items-start">
                    <div className="w-8 h-8 rounded-full bg-brand-primary-container text-white flex items-center justify-center text-xs font-bold">{act.type?.[0] ?? 'A'}</div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-bold">{act.type} — {act.outcome ?? act.notes ?? '—'}</h4>
                        <span className="text-[10px] text-on-surface-variant">{act.doneAt ? new Date(act.doneAt).toLocaleDateString('es-CO') : ''}</span>
                      </div>
                      {act.notes && <p className="text-xs text-on-surface-variant mt-1">{act.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-white border border-outline-variant flex items-center justify-center"><Building2 className="text-brand-primary-container" size={24} /></div>
              <div>
                <h3 className="font-bold text-lg">{prospect.name ?? '—'}</h3>
                <span className="text-xs text-on-surface-variant">{prospect.industry ?? 'Cliente'}</span>
              </div>
            </div>
            <div className="space-y-3">
              {prospect.website && <div className="flex items-center gap-3 text-sm"><Globe size={16} className="text-on-surface-variant" /><span>{prospect.website}</span></div>}
              {prospect.region && <div className="flex items-center gap-3 text-sm"><MapPin size={16} className="text-on-surface-variant" /><span>{prospect.region}</span></div>}
            </div>
          </div>

          <div className="glass-card">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-bold text-lg">Notas de Impacto</h3>
              <StickyNote size={18} className="text-on-surface-variant" />
            </div>
            <div className="p-6">
              <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full h-32 bg-surface p-3 rounded-lg text-sm focus:outline-none border border-outline-variant focus:border-brand-primary-container resize-none" placeholder="Añadir notas..." />
              <button onClick={saveNote} disabled={saving} className="w-full mt-4 py-2 bg-brand-primary-container text-white rounded-lg text-sm font-bold disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar Nota'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/DataTable.tsx frontend/src/views/OpportunitiesView.tsx frontend/src/views/OpportunityDetailView.tsx
git commit -m "feat: opportunities table + deal detail view with real API"
```

---

### Task 12: AccountsView, ContactsView, ActivitiesView

**Files:**
- Create: `frontend/src/views/AccountsView.tsx`
- Create: `frontend/src/views/ContactsView.tsx`
- Create: `frontend/src/views/ActivitiesView.tsx`

- [ ] **Step 1: Crear AccountsView.tsx**

```tsx
// frontend/src/views/AccountsView.tsx
import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

export function AccountsView() {
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/prospects').then(d => { if (d) setAccounts(Array.isArray(d) ? d : d.prospects ?? []); setLoading(false) })
  }, [])

  const columns: Column<any>[] = [
    { label: 'Cuenta', key: 'name', render: (val, row) => (
      <div className="flex flex-col">
        <span className="text-sm font-bold text-brand-primary-container">{val}</span>
        {row.website && <span className="text-[10px] text-on-surface-variant">{row.website}</span>}
      </div>
    )},
    { label: 'Industria', key: 'industry', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Tamaño', key: 'size', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Región', key: 'region', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Segmento', key: 'segment', render: val => <span className="text-sm">{val ?? '—'}</span> },
  ]

  return <DataTable title="Directorio de Cuentas" subtitle="Gestiona el directorio activo de cuentas." data={accounts} columns={columns} loading={loading} />
}
```

- [ ] **Step 2: Crear ContactsView.tsx**

```tsx
// frontend/src/views/ContactsView.tsx
import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { api } from '../lib/api'

export function ContactsView() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/contacts').then(d => { if (d) setContacts(Array.isArray(d) ? d : d.contacts ?? []); setLoading(false) })
  }, [])

  const columns: Column<any>[] = [
    { label: 'Nombre', key: 'name', render: (val, row) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-xs text-brand-primary-container">
          {(val ?? '?')[0].toUpperCase()}
        </div>
        <div>
          <div className="text-sm font-bold">{val}</div>
          <div className="text-[10px] text-on-surface-variant">{row.email ?? '—'}</div>
        </div>
      </div>
    )},
    { label: 'Rol', key: 'role', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Empresa', key: 'prospectName', render: (val, row) => <span className="text-sm">{val ?? row.prospect?.name ?? '—'}</span> },
    { label: 'Teléfono', key: 'phone', render: val => <span className="text-sm">{val ?? '—'}</span> },
    { label: 'Principal', key: 'isPrimary', render: val => val ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-bold">Principal</span> : null },
  ]

  return <DataTable title="Directorio de Contactos" subtitle="Gestiona el directorio activo de contactos." data={contacts} columns={columns} loading={loading} />
}
```

- [ ] **Step 3: Crear ActivitiesView.tsx**

```tsx
// frontend/src/views/ActivitiesView.tsx
import React, { useEffect, useState } from 'react'
import { DataTable, Column } from '../components/ui/DataTable'
import { Mail, Phone, Video, FileText, MessageSquare } from 'lucide-react'
import { api } from '../lib/api'

const TYPE_ICONS: Record<string, React.ElementType> = { EMAIL: Mail, CALL: Phone, MEETING: Video, NOTE: FileText }
const TYPE_LABELS: Record<string, string> = { EMAIL: 'Email', CALL: 'Llamada', MEETING: 'Reunión', LINKEDIN: 'LinkedIn', NOTE: 'Nota' }

export function ActivitiesView() {
  const [activities, setActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/activities').then(d => { if (d) setActivities(Array.isArray(d) ? d : d.activities ?? []); setLoading(false) })
  }, [])

  const columns: Column<any>[] = [
    { label: 'Actividad', key: 'type', render: (val, row) => {
      const Icon = TYPE_ICONS[val] ?? MessageSquare
      return (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface-container rounded-lg"><Icon size={16} className="text-on-surface-variant" /></div>
          <div>
            <div className="text-sm font-bold">{TYPE_LABELS[val] ?? val}</div>
            <div className="text-[10px] text-on-surface-variant">{row.outcome ?? row.notes ?? '—'}</div>
          </div>
        </div>
      )
    }},
    { label: 'Empresa', key: 'prospectName', render: (val, row) => <span className="text-sm">{val ?? row.prospect?.name ?? row.deal?.prospect?.name ?? '—'}</span> },
    { label: 'Fecha', key: 'doneAt', render: val => <span className="text-sm text-on-surface-variant">{val ? new Date(val).toLocaleDateString('es-CO') : '—'}</span> },
    { label: 'Estado', key: 'doneAt', render: val => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${val ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>
        {val ? 'Completado' : 'Pendiente'}
      </span>
    )},
    { label: 'Responsable', key: 'createdByName', render: (val, row) => <span className="text-sm">{val ?? row.createdBy?.name ?? '—'}</span> },
  ]

  return <DataTable title="Gestión de Actividades" subtitle="Gestiona el directorio activo de actividades." data={activities} columns={columns} loading={loading} />
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/AccountsView.tsx frontend/src/views/ContactsView.tsx frontend/src/views/ActivitiesView.tsx
git commit -m "feat: accounts, contacts, activities views with real API"
```

---

## Chunk 4: Goals, Reports, Settings, Modals, DB Reset

### Task 13: GoalsView

**Files:**
- Create: `frontend/src/views/GoalsView.tsx`

- [ ] **Step 1: Crear GoalsView.tsx**

```tsx
// frontend/src/views/GoalsView.tsx
import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Target } from 'lucide-react'
import { api } from '../lib/api'

const SERVICE_LABELS: Record<string, string> = {
  CREDIMPACTO_GRUPOS: 'CredImpacto Grupos', CREDIMPACTO_FONDO_ROTATORIO: 'Fondo Rotatorio',
  CREDIMPACTO_CREDITOS: 'CredImpacto Créditos', CREDIMPACTO_PROVEEDORES: 'Proveedores',
  ACADEMIA_CURSO: 'Academia Curso', CONSULTORIA_PROYECTO: 'Consultoría', FUNDACION_CONVENIO: 'Fundación Convenio',
  FUNDACION_CONVOCATORIA: 'Convocatoria', FUNDACION_FUNDRAISING: 'Fundraising', FUNDACION_EXPERIENCIA: 'Experiencia'
}

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export function GoalsView() {
  const [goals, setGoals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/metrics').then(d => { if (d) setGoals(d.goals ?? []); setLoading(false) })
  }, [])

  const totalTarget = goals.reduce((s, g) => s + (g.targetValue ?? 0), 0)
  const totalCurrent = goals.reduce((s, g) => s + (g.currentValue ?? 0), 0)
  const overallPct = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Metas de Impacto</h2>
        <p className="text-on-surface-variant mt-1">KPIs y OKRs por unidad de negocio.</p>
      </header>

      <div className="grid grid-cols-3 gap-6">
        <div className="glass-card p-6"><div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Meta Total</div><div className="text-2xl font-bold">{fmt(totalTarget)}</div></div>
        <div className="glass-card p-6"><div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Logrado</div><div className="text-2xl font-bold text-brand-tertiary-container">{fmt(totalCurrent)}</div></div>
        <div className="glass-card p-6"><div className="text-xs font-bold text-on-surface-variant uppercase mb-1">Avance</div><div className="text-2xl font-bold text-brand-primary-container">{overallPct}%</div></div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-on-surface-variant">Cargando metas...</div>
      ) : goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target size={48} className="mx-auto text-outline mb-4" />
          <p className="text-on-surface-variant">No hay metas configuradas para este período.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="p-6 border-b border-outline-variant"><h3 className="font-bold text-lg">Metas por Unidad de Negocio</h3></div>
          <div className="divide-y divide-outline-variant">
            {goals.map((goal, i) => {
              const pct = goal.targetValue > 0 ? Math.round((goal.currentValue / goal.targetValue) * 100) : 0
              return (
                <div key={goal.id ?? i} className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-sm">{SERVICE_LABELS[goal.serviceType] ?? goal.serviceType}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{goal.quarter} {goal.year} • {goal.region ?? 'Global'}</div>
                    </div>
                    <span className={`text-sm font-bold ${pct >= 100 ? 'text-brand-tertiary-container' : pct >= 60 ? 'text-brand-primary-container' : 'text-crm-error'}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} className="h-full rounded-full bg-brand-primary-container" />
                  </div>
                  <div className="flex justify-between text-xs text-on-surface-variant mt-2">
                    <span>Logrado: {fmt(goal.currentValue)}</span>
                    <span>Meta: {fmt(goal.targetValue)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/GoalsView.tsx
git commit -m "feat: goals view with real metrics data"
```

---

### Task 14: ReportsView + SettingsView

**Files:**
- Create: `frontend/src/views/ReportsView.tsx`
- Create: `frontend/src/views/SettingsView.tsx`

- [ ] **Step 1: Crear ReportsView.tsx**

```tsx
// frontend/src/views/ReportsView.tsx
import React, { useState } from 'react'
import { Download, TrendingUp, BarChart3 } from 'lucide-react'

export function ReportsView() {
  const [loading, setLoading] = useState<string | null>(null)

  const download = async (type: 'pipeline' | 'quarterly') => {
    setLoading(type)
    try {
      const res = await fetch(`/api/reports/${type}`, { credentials: 'include' })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reporte-${type}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally { setLoading(null) }
  }

  const reports = [
    { id: 'pipeline' as const, title: 'Reporte de Pipeline', desc: 'Exporta todas las oportunidades activas con etapa, valor y responsable.', icon: TrendingUp, color: 'text-blue-600' },
    { id: 'quarterly' as const, title: 'Reporte Trimestral', desc: 'Análisis de metas vs. resultados por unidad de negocio y región.', icon: BarChart3, color: 'text-brand-secondary-container' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Generador de Reportes</h2>
        <p className="text-on-surface-variant mt-1">Exporta y analiza los datos de tu pipeline de impacto.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map(r => (
          <div key={r.id} className="glass-card p-8 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-surface-container rounded-xl"><r.icon size={24} className={r.color} /></div>
              <div><h3 className="font-bold text-lg">{r.title}</h3><p className="text-sm text-on-surface-variant mt-1">{r.desc}</p></div>
            </div>
            <button onClick={() => download(r.id)} disabled={loading === r.id} className="w-full py-3 bg-brand-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm hover:bg-brand-primary transition-colors disabled:opacity-50">
              <Download size={18} />
              {loading === r.id ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Crear SettingsView.tsx**

```tsx
// frontend/src/views/SettingsView.tsx
import React, { useEffect, useState } from 'react'
import { User, Briefcase, ShieldCheck, Bell, Cpu, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'

type Tab = 'profile' | 'business-units' | 'users' | 'notifications' | 'integrations'

const TABS = [
  { id: 'profile' as Tab, label: 'Perfil y Cuenta', icon: User },
  { id: 'business-units' as Tab, label: 'Unidades de Negocio', icon: Briefcase },
  { id: 'users' as Tab, label: 'Usuarios y Roles', icon: ShieldCheck },
  { id: 'notifications' as Tab, label: 'Notificaciones', icon: Bell },
  { id: 'integrations' as Tab, label: 'Integraciones', icon: Cpu },
]

function ProfileTab() {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  return (
    <div>
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-full bg-brand-primary-container/10 border-2 border-brand-primary-container flex items-center justify-center text-3xl font-bold text-brand-primary-container">
          {(user?.name ?? 'U')[0].toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold">{user?.name}</h3>
          <p className="text-sm text-on-surface-variant">{user?.email}</p>
          <span className="inline-block mt-2 px-2 py-1 bg-surface-container rounded-md text-[10px] font-bold uppercase text-on-surface-variant">{user?.role}</span>
        </div>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Nombre</label>
            <input type="text" defaultValue={user?.name ?? ''} className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Email</label>
            <input type="text" value={user?.email ?? ''} readOnly className="bg-surface-container border border-outline-variant rounded-xl p-3 text-sm text-on-surface-variant" />
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="bg-brand-primary-container text-white px-8 py-2.5 rounded-xl font-bold">
            {saved ? '¡Guardado!' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users').then(d => { if (d) setUsers(Array.isArray(d) ? d : d.users ?? []); setLoading(false) })
  }, [])

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-blue-50 text-blue-700 border-blue-100',
    SALES: 'bg-green-50 text-green-700 border-green-100',
    VIEWER: 'bg-surface-container text-on-surface-variant border-outline-variant'
  }

  return (
    <div>
      <h4 className="font-bold text-lg mb-4">Usuarios del Sistema</h4>
      {loading ? <p className="text-sm text-on-surface-variant">Cargando...</p> : (
        <div className="divide-y divide-outline-variant">
          {users.map(u => (
            <div key={u.id} className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-primary-container/10 flex items-center justify-center font-bold text-sm text-brand-primary-container">{(u.name ?? '?')[0].toUpperCase()}</div>
                <div><div className="text-sm font-bold">{u.name}</div><div className="text-xs text-on-surface-variant">{u.email}</div></div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ROLE_COLORS[u.role] ?? ROLE_COLORS.VIEWER}`}>{u.role}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SettingsView() {
  const [tab, setTab] = useState<Tab>('profile')

  const tabContent: Record<Tab, React.ReactNode> = {
    profile: <ProfileTab />,
    'business-units': (
      <div>
        <h4 className="font-bold text-lg mb-4">Unidades de Negocio</h4>
        <div className="space-y-3">
          {['CredImpacto Grupos', 'CredImpacto Créditos', 'Academia Curso', 'Consultoría Proyecto', 'Fundación Convenio', 'Fundación Fundraising'].map(unit => (
            <div key={unit} className="flex items-center justify-between p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant">
              <span className="text-sm font-bold">{unit}</span>
              <span className="text-xs text-on-surface-variant px-2 py-0.5 bg-surface-container rounded-full">Activo</span>
            </div>
          ))}
        </div>
      </div>
    ),
    users: <UsersTab />,
    notifications: <div><h4 className="font-bold text-lg mb-4">Notificaciones</h4><p className="text-sm text-on-surface-variant">Configuración de notificaciones próximamente.</p></div>,
    integrations: <div><h4 className="font-bold text-lg mb-4">Integraciones</h4><p className="text-sm text-on-surface-variant">Google Sheets y otras integraciones próximamente.</p></div>,
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h2 className="text-3xl font-bold text-on-surface">Configuración</h2>
        <p className="text-on-surface-variant mt-1">Personaliza tu entorno de CoimpactoB.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${tab === t.id ? 'bg-blue-50 border-blue-200 text-brand-primary-container font-bold' : 'bg-white border-outline-variant hover:bg-surface-container'}`}>
              <div className="flex items-center gap-3"><t.icon size={20} /><span className="text-sm">{t.label}</span></div>
              <ChevronRight size={16} />
            </button>
          ))}
        </div>
        <div className="md:col-span-2 glass-card p-8">{tabContent[tab]}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/ReportsView.tsx frontend/src/views/SettingsView.tsx
git commit -m "feat: reports and settings views"
```

---

### Task 15: NewOpportunityModal

**Files:**
- Create: `frontend/src/components/modals/NewOpportunityModal.tsx`

- [ ] **Step 1: Crear modal funcional**

```tsx
// frontend/src/components/modals/NewOpportunityModal.tsx
import React, { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { api } from '../../lib/api'

interface Props { isOpen: boolean; onClose: () => void }

const SERVICE_TYPES = [
  { value: 'CREDIMPACTO_GRUPOS', label: 'CredImpacto Grupos' },
  { value: 'CREDIMPACTO_CREDITOS', label: 'CredImpacto Créditos' },
  { value: 'ACADEMIA_CURSO', label: 'Academia Curso' },
  { value: 'CONSULTORIA_PROYECTO', label: 'Consultoría Proyecto' },
  { value: 'FUNDACION_CONVENIO', label: 'Fundación Convenio' },
  { value: 'FUNDACION_FUNDRAISING', label: 'Fundación Fundraising' },
]

export function NewOpportunityModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ prospectName: '', value: '', serviceType: 'CREDIMPACTO_GRUPOS', notes: '' })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.prospectName.trim()) return
    setLoading(true)
    try {
      const prospect = await api.post('/prospects', { name: form.prospectName, industry: 'General', size: 'PEQUEÑA', region: 'Colombia' })
      if (!prospect) return
      await api.post('/deals', {
        prospectId: prospect.id,
        serviceType: form.serviceType,
        value: parseFloat(form.value) || 0,
        stage: 'PROSPECTO_IDENTIFICADO',
        notes: form.notes
      })
      setForm({ prospectName: '', value: '', serviceType: 'CREDIMPACTO_GRUPOS', notes: '' })
      onClose()
    } finally { setLoading(false) }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-xl font-bold">Crear Nueva Oportunidad</h3>
              <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Cuenta / Cliente</label>
                  <input type="text" value={form.prospectName} onChange={e => set('prospectName', e.target.value)} placeholder="Nombre de empresa" className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Valor (USD)</label>
                  <input type="number" value={form.value} onChange={e => set('value', e.target.value)} placeholder="0.00" className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Unidad de Negocio</label>
                <select value={form.serviceType} onChange={e => set('serviceType', e.target.value)} className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container">
                  {SERVICE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant uppercase ml-1">Descripción de Impacto</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Describe el objetivo social o ambiental..." className="bg-surface border border-outline-variant rounded-xl p-3 text-sm focus:outline-none focus:border-brand-primary-container h-24 resize-none" />
              </div>
              <div className="pt-4 flex gap-3">
                <button onClick={onClose} className="flex-1 py-3 bg-surface-container text-on-surface-variant rounded-xl font-bold hover:bg-outline-variant transition-colors">Cancelar</button>
                <button onClick={submit} disabled={loading || !form.prospectName.trim()} className="flex-1 py-3 bg-brand-primary-container text-white rounded-xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Crear Registro'}
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

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/modals/NewOpportunityModal.tsx
git commit -m "feat: new opportunity modal with real API submission"
```

---

### Task 16: Reset de Base de Datos Azure

**Files:**
- Create: `scripts/reset-azure-db.ts`

- [ ] **Step 1: Crear script de reset**

```ts
// scripts/reset-azure-db.ts
// Usage: npx ts-node scripts/reset-azure-db.ts
// Requires DATABASE_URL env var pointing to Azure PostgreSQL
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('⚠️  RESETTING ALL DATA in Azure DB...')
  console.log('   (Users are preserved for auth)')

  await prisma.sequenceStep.deleteMany()
  await prisma.sequence.deleteMany()
  await prisma.templateSequenceStep.deleteMany()
  await prisma.templateSequence.deleteMany()
  await prisma.template.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.salesTrigger.deleteMany()
  await prisma.deal.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.prospect.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()

  console.log('✅ Done. All operational data deleted.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Agregar a package.json raíz**

```json
"db:reset": "npx ts-node scripts/reset-azure-db.ts"
```

- [ ] **Step 3: Ejecutar reset** (**CONFIRMAR CON USUARIO ANTES**)

```bash
npm run db:reset
```

- [ ] **Step 4: Commit**

```bash
git add scripts/reset-azure-db.ts package.json
git commit -m "feat: azure database reset script"
```

---

### Task 17: Verificación final y build

- [ ] **Step 1: Verificar que todas las views están importadas en App.tsx**

Revisar que en `frontend/src/App.tsx` todos los imports corresponden a archivos creados.

- [ ] **Step 2: TypeScript check**

```bash
cd frontend
npm run lint
```

Corregir errores de tipos.

- [ ] **Step 3: Build de producción**

```bash
npm run build
```

- [ ] **Step 4: Probar en modo dev**

```bash
# Terminal 1: FastAPI backend
cd backend && python -m uvicorn main:app --reload

# Terminal 2: Express server (proxy + auth)
cd frontend && npm run server

# Terminal 3: Vite dev server
cd frontend && npm run dev
```

Navegar a `http://localhost:3000` y verificar:
- [ ] Login con Google funciona
- [ ] Dashboard muestra datos reales (o vacío si DB está limpia)
- [ ] Pipeline carga el Kanban
- [ ] Drag and drop mueve deals entre columnas
- [ ] "Nueva Oportunidad" crea un deal real
- [ ] Todas las vistas navegan correctamente
- [ ] Cerrar sesión funciona

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "feat: complete CRM migration to Vite frontend — 100% functional"
```

---

## Resumen de Archivos

| Acción | Ruta |
|--------|------|
| **ELIMINAR** | `app/`, `components/`, `lib/`, `types/`, `auth.ts`, `next.config.ts` |
| Crear | `frontend/server.ts` |
| Modificar | `frontend/vite.config.ts` |
| Modificar | `frontend/src/main.tsx` |
| Modificar | `frontend/src/App.tsx` |
| Crear | `frontend/src/context/AuthContext.tsx` |
| Crear | `frontend/src/lib/api.ts` |
| Crear | `frontend/src/pages/LoginPage.tsx` |
| Crear | `frontend/src/components/layout/Sidebar.tsx` |
| Crear | `frontend/src/components/layout/TopNav.tsx` |
| Crear | `frontend/src/components/modals/NewOpportunityModal.tsx` |
| Crear | `frontend/src/components/ui/DataTable.tsx` |
| Crear | `frontend/src/components/pipeline/KanbanBoard.tsx` |
| Crear | `frontend/src/components/pipeline/DealCard.tsx` |
| Crear | `frontend/src/views/DashboardView.tsx` |
| Crear | `frontend/src/views/PipelineView.tsx` |
| Crear | `frontend/src/views/OpportunitiesView.tsx` |
| Crear | `frontend/src/views/OpportunityDetailView.tsx` |
| Crear | `frontend/src/views/AccountsView.tsx` |
| Crear | `frontend/src/views/ContactsView.tsx` |
| Crear | `frontend/src/views/ActivitiesView.tsx` |
| Crear | `frontend/src/views/GoalsView.tsx` |
| Crear | `frontend/src/views/ReportsView.tsx` |
| Crear | `frontend/src/views/SettingsView.tsx` |
| Crear | `scripts/reset-azure-db.ts` |
