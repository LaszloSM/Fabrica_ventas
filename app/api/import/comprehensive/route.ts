import { auth } from '@/auth'
import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Obtener el FormData de la request
    const formData = await req.formData()
    
    // Construir URL con query params si existen
    const url = new URL(req.url)
    const queryString = url.search || ''
    
    // Enviar al backend
    const res = await fetch(`${BACKEND_URL}/api/v1/import/comprehensive${queryString}`, {
      method: 'POST',
      headers: {
        'x-user-id': session.user?.id || '',
        'x-user-email': session.user?.email || '',
        'x-user-role': (session.user as any)?.role || '',
      },
      body: formData,
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Error forwarding request' }, { status: 500 })
  }
}
