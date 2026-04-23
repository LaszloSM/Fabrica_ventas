import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyToBackend(req, `/deals/${id}`)
}
