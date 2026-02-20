import { NextRequest, NextResponse } from 'next/server'

const GAMMA_API = 'https://gamma-api.polymarket.com'
const DATA_API = 'https://data-api.polymarket.com'
const CLOB_API = 'https://clob.polymarket.com'

const ALLOWED_ENDPOINTS = ['events', 'markets', 'trades', 'positions', 'prices-history', 'book', 'midpoint']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'events'

  if (endpoint.includes('..') || !ALLOWED_ENDPOINTS.some(e => endpoint === e || endpoint.startsWith(e + '/'))) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint') params.set(key, value)
  })

  let baseUrl = GAMMA_API
  if (endpoint.startsWith('trades') || endpoint.startsWith('positions')) {
    baseUrl = DATA_API
  } else if (endpoint.startsWith('prices-history') || endpoint.startsWith('book') || endpoint.startsWith('midpoint')) {
    baseUrl = CLOB_API
  }

  try {
    const res = await fetch(`${baseUrl}/${endpoint}?${params.toString()}`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
