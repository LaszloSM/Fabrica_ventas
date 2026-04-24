import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  return proxyToBackend(req, `/deals/${id}/mark-lost`)
}
