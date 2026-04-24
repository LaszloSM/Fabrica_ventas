import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import type { NextRequest } from 'next/server'

const BACKEND_URL = process.env.FASTAPI_BACKEND_URL || 'http://127.0.0.1:8000'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const query = req.nextUrl.search
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
