import { NextRequest, NextResponse } from 'next/server'
import {
  POLYMARKET_REQUEST_TIMEOUT_MS,
  isAllowedPolymarketReadEndpoint,
  normalizePolymarketQuery,
  resolvePolymarketHost,
} from '../../../lib/polymarketConfig'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'events'

  if (endpoint.includes('..') || !isAllowedPolymarketReadEndpoint(endpoint)) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') params.set(key, value)
  })

  const baseUrl = resolvePolymarketHost(endpoint)
  const normalizedParams = normalizePolymarketQuery(endpoint, params)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), POLYMARKET_REQUEST_TIMEOUT_MS)

  try {
    const res = await fetch(`${baseUrl}/${endpoint}?${normalizedParams.toString()}`, {
      next: { revalidate: 30 },
      signal: controller.signal,
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Polymarket request timeout' }, { status: 504 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
