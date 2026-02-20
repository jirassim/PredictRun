import { NextRequest, NextResponse } from 'next/server'

const OPINION_PUBLIC_API = 'https://proxy.opinion.trade:8443/api/bsc/api/v2'
const OPINION_OPENAPI = 'https://proxy.opinion.trade:8443/openapi'

const PUBLIC_ENDPOINTS = ['topic', 'label', 'indicator', 'currency', 'activity']
const AUTH_ENDPOINTS = ['market', 'orderbook', 'trade', 'token']

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const endpoint = searchParams.get('endpoint') || 'topic'

  if (endpoint.includes('..')) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const isPublic = PUBLIC_ENDPOINTS.some(e => endpoint === e || endpoint.startsWith(e + '/'))
  const isAuth = AUTH_ENDPOINTS.some(e => endpoint === e || endpoint.startsWith(e + '/'))

  if (!isPublic && !isAuth) {
    return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 })
  }

  const params = new URLSearchParams()
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint' && key !== 'apiKey') params.set(key, value)
  })

  try {
    let url: string
    const headers: Record<string, string> = {}

    if (isPublic) {
      const queryStr = params.toString()
      url = `${OPINION_PUBLIC_API}/${endpoint}${queryStr ? `?${queryStr}` : ''}`
    } else {
      const apiKey = request.headers.get('x-opinion-api-key') || searchParams.get('apiKey') || process.env.OPINION_API_KEY || ''
      if (!apiKey) {
        return NextResponse.json({ error: 'Opinion API key required for this endpoint.' }, { status: 401 })
      }
      headers.apikey = apiKey
      const queryStr = params.toString()
      url = `${OPINION_OPENAPI}/${endpoint}${queryStr ? `?${queryStr}` : ''}`
    }

    const res = await fetch(url, { headers, next: { revalidate: 30 } })
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
