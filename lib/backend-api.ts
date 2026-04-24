import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/auth'

const BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'
const API_PREFIX = '/api/v1'

export async function proxyToBackend(req: NextRequest, path: string) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const method = req.method
  const query = req.nextUrl.search || ''
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text()
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

  const text = await response.text()

  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  })
}
