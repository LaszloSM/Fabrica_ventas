import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/contacts')
}
