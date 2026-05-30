import { afterEach, describe, expect, it, vi } from 'vitest'
import { GET } from '../app/api/polymarket/route'
import { POLYMARKET_CLOB_HOST, POLYMARKET_DATA_HOST } from '../lib/polymarketConfig'

function request(url: string) {
  return new Request(url) as Parameters<typeof GET>[0]
}

describe('polymarket API route', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('fetches v2 CLOB prices-history with market parameter', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ history: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('http://localhost/api/polymarket?endpoint=prices-history&token_id=asset-1&fidelity=60'))

    expect(response.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${POLYMARKET_CLOB_HOST}/prices-history?fidelity=60&market=asset-1`)
  })

  it('fetches read-only Data API endpoints without trading auth', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('http://localhost/api/polymarket?endpoint=trades&user=0xabc'))

    expect(response.status).toBe(200)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${POLYMARKET_DATA_HOST}/trades?user=0xabc`)
  })

  it('blocks non-read endpoints before fetch', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)

    const response = await GET(request('http://localhost/api/polymarket?endpoint=order'))

    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns 504 on upstream timeout', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    vi.stubGlobal('fetch', fetchMock)

    const responsePromise = GET(request('http://localhost/api/polymarket?endpoint=book&token_id=asset-1'))
    await vi.advanceTimersByTimeAsync(10_000)
    const response = await responsePromise

    expect(response.status).toBe(504)
  })
})
