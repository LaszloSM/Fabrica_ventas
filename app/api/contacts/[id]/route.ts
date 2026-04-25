import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(req, `/contacts/${id}`)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(req, `/contacts/${id}`)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(req, `/contacts/${id}`)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(req, `/contacts/${id}`)
}
