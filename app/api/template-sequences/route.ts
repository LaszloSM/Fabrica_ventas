import { proxyToBackend } from '@/lib/backend-api'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/template-sequences')
}
