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
