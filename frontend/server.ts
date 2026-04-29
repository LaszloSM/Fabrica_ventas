import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import MongoStore from 'connect-mongo'
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

// ── Startup diagnostics ───────────────────────────────────────────────
console.log(`[startup] PORT               = ${PORT}`)
console.log(`[startup] NODE_ENV           = ${process.env.NODE_ENV ?? '(unset)'}`)
console.log(`[startup] FASTAPI_BACKEND_URL= ${process.env.FASTAPI_BACKEND_URL ?? '(UNSET — using fallback localhost!)'}`)
console.log(`[startup] FASTAPI_URL        = ${FASTAPI_URL}`)
console.log(`[startup] GOOGLE_CLIENT_ID   = ${GOOGLE_CLIENT_ID ? 'SET' : 'UNSET ⚠️'}`)
console.log(`[startup] COSMOSDB_CONN_STR  = ${process.env.COSMOSDB_CONN_STR ? 'SET' : '(unset — in-memory sessions)'}`)
console.log(`[startup] SESSION_SECRET     = ${process.env.SESSION_SECRET ? 'SET' : '(using default)'}`)
// ─────────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === 'production'

app.set('trust proxy', 1)
app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())

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
        autoRemove: 'disabled',
      })
    : undefined,
  cookie: {
    secure: isProd,
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS * 1000,
    sameSite: isProd ? 'none' : 'lax',
  }
}))

// ── Auth ──────────────────────────────────────────────────────────────

app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body
    const ticket = await oauthClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID })
    const payload = ticket.getPayload()!

    // Get user role from backend with retry
    let userRole = 'SALES'
    let userData: { role?: string; id?: string } | null = null
    let backendReachable = false
    let lastError = ''

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 8000) // 8s timeout
        const backendUrl = `${FASTAPI_URL}${API_PREFIX}/users/me`
        const userRes = await fetch(backendUrl, {
          signal: controller.signal,
          headers: {
            'x-user-email': payload.email!,
            'x-user-name': payload.name ?? '',
            'x-user-id': payload.sub,
            'x-user-role': 'SALES',
          }
        })
        clearTimeout(timer)

        if (userRes.ok) {
          userData = await userRes.json()
          userRole = userData?.role ?? 'SALES'
          backendReachable = true
          break
        } else {
          lastError = `HTTP ${userRes.status} from ${backendUrl}`
          console.error(`[auth] Backend returned ${userRes.status} on attempt ${attempt + 1} — ${backendUrl}`)
          await new Promise(r => setTimeout(r, 800))
        }
      } catch (fetchErr: any) {
        lastError = fetchErr?.name === 'AbortError'
          ? `Timeout (>8s) reaching ${FASTAPI_URL}`
          : `${fetchErr?.code ?? fetchErr?.name ?? 'FETCH_ERROR'}: ${fetchErr?.message}`
        console.error(`[auth] Backend fetch attempt ${attempt + 1} failed: ${lastError}`)
        await new Promise(r => setTimeout(r, 800))
      }
    }

    if (!backendReachable) {
      console.error(`[auth] Backend unreachable after 3 attempts for ${payload.email}. Last error: ${lastError}`)
      return res.status(503).json({
        ok: false,
        error: 'El sistema de usuarios no está disponible. Intenta nuevamente en unos segundos.',
        _debug: lastError,   // visible in browser console / Azure logs
      })
    }

    const dbUserId = userData?.id ?? null

    ;(req.session as any).user = {
      id: payload.sub,
      dbId: dbUserId,
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
        'x-user-id': user.dbId ?? user.id,
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

app.post('/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }))
})

// ── Diagnostic (no auth required) ────────────────────────────────────
app.get('/check-backend', async (_req, res) => {
  const probe = async (url: string, headers: Record<string,string> = {}) => {
    try {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(url, { signal: ctrl.signal, headers })
      const text = await r.text()
      return { url, status: r.status, ok: r.ok, body: text.slice(0, 400) }
    } catch (e: any) {
      return { url, status: null, ok: false,
               error: e?.name === 'AbortError' ? 'Timeout >8s' : `${e?.code ?? e?.name}: ${e?.message}` }
    }
  }

  const [health, usersMe] = await Promise.all([
    probe(`${FASTAPI_URL}/health`),
    probe(`${FASTAPI_URL}${API_PREFIX}/users/me`, {
      'x-user-email': 'diag@health.check',
      'x-user-name': 'diag',
      'x-user-id': 'diag',
      'x-user-role': 'SALES',
    }),
  ])

  res.json({
    fastapi_url: FASTAPI_URL,
    fastapi_backend_url_env: process.env.FASTAPI_BACKEND_URL ?? '(UNSET)',
    health,
    users_me: usersMe,
  })
})
// ─────────────────────────────────────────────────────────────────────

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
        'x-user-id': user.dbId ?? user.id,
        'x-user-email': user.email,
        'x-user-role': user.role,
      },
      body,
    })
    const text = await upstream.text()
    res
      .status(upstream.status)
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
