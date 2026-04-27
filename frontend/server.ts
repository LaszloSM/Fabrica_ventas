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

    // Get user role from backend
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
