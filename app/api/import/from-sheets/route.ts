import { NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-api'

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/import/from-sheets')
}
