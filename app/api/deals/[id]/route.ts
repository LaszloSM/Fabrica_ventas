import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  return proxyToBackend(req, `/deals/${id}`)
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  return proxyToBackend(req, `/deals/${id}`)
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  return proxyToBackend(req, `/deals/${id}`)
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params
  return proxyToBackend(req, `/deals/${id}`)
}
