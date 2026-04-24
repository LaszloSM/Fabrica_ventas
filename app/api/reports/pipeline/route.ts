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
