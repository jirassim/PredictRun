import type { UnifiedMarket, AggregatedTrend, Platform, ApiStatus } from '../types/market'
import { POLYMARKET_COLLATERAL_ASSET } from '../../lib/polymarketConfig'

const POLL_INTERVAL = 12000 // 12 seconds

function normalizePolymarket(data: unknown[]): UnifiedMarket[] {
  return data.slice(0, 20).flatMap((event: unknown) => {
    const e = event as Record<string, unknown>
    const markets = (e.markets as unknown[]) || []
    return markets.slice(0, 2).map((m: unknown) => {
      const market = m as Record<string, unknown>
      const outcomes = (market.outcomePrices as string[]) || ['0.5', '0.5']
      const yesPrice = parseFloat(outcomes[0]) || 0.5
      return {
        id: `pm-${market.id || Math.random()}`,
        platform: 'polymarket' as Platform,
        title: (e.title as string) || (market.question as string) || 'Unknown Market',
        shortTitle: ((e.title as string) || 'Market').substring(0, 20),
        yesPrice,
        noPrice: 1 - yesPrice,
        volume24h: parseFloat(market.volume24hr as string) || 0,
        totalVolume: parseFloat(market.volume as string) || 0,
        collateralAsset: POLYMARKET_COLLATERAL_ASSET,
        endDate: (market.endDate as string) || '',
        isActive: market.active !== false,
      }
    })
  })
}

function normalizeKalshi(data: { events?: unknown[] }): UnifiedMarket[] {
  const events = data.events || []
  return events.slice(0, 20).flatMap((event: unknown) => {
    const e = event as Record<string, unknown>
    const markets = (e.markets as unknown[]) || []
    return markets.slice(0, 2).map((m: unknown) => {
      const market = m as Record<string, unknown>
      const yesPrice = (market.yes_ask as number || 50) / 100
      return {
        id: `ks-${market.ticker || Math.random()}`,
        platform: 'kalshi' as Platform,
        title: (e.title as string) || (market.title as string) || 'Unknown Market',
        shortTitle: ((e.title as string) || 'Market').substring(0, 20),
        yesPrice,
        noPrice: 1 - yesPrice,
        volume24h: Number(market.volume) || 0,
        totalVolume: Number(market.open_interest) || 0,
        endDate: (market.close_time as string) || '',
        isActive: market.status === 'open',
      }
    })
  })
}

function normalizeOpinion(data: unknown): UnifiedMarket[] {
  // Response shape: { errno, errmsg, result: { list: [...] } }
  let items: unknown[] = []
  if (Array.isArray(data)) {
    items = data
  } else {
    const d = data as Record<string, unknown>
    const result = d.result as Record<string, unknown> | undefined
    items = (result?.list as unknown[]) || (d.data as unknown[]) || []
  }
  return items.slice(0, 20).map((topic: unknown) => {
    const t = topic as Record<string, unknown>
    // yesBuyPrice is the yes price (0-1 range)
    const yesPrice = Math.min(1, Math.max(0, (t.yesBuyPrice as number) || (t.currentPrice as number) || 0.5))
    const condId = (t.conditionId as string) || String(t.createTime || Math.random())
    return {
      id: `op-${condId}`,
      platform: 'opinion' as Platform,
      title: (t.title as string) || (t.name as string) || 'Unknown Market',
      shortTitle: ((t.title as string) || (t.name as string) || 'Market').substring(0, 20),
      yesPrice,
      noPrice: 1 - yesPrice,
      volume24h: Number(t.volume24h) || 0,
      totalVolume: Number(t.totalVolume) || 0,
      endDate: '',
      isActive: true,
    }
  })
}

function computeTrend(
  markets: UnifiedMarket[],
  apiStatus: { polymarket: ApiStatus; kalshi: ApiStatus; opinion: ApiStatus }
): AggregatedTrend {
  if (markets.length === 0) {
    return {
      avgYesPrice: 0.5,
      totalVolume24h: 0,
      theme: 'sunny',
      speedMultiplier: 1,
      platformStatus: apiStatus,
      markets: [],
      lastUpdated: Date.now(),
    }
  }

  const avgYesPrice = markets.reduce((sum, m) => sum + (Number(m.yesPrice) || 0), 0) / markets.length
  const totalVolume24h = markets.reduce((sum, m) => sum + (Number(m.volume24h) || 0), 0)
  const deviation = Math.abs(avgYesPrice - 0.5)

  let theme: AggregatedTrend['theme'] = 'sunny'
  if (totalVolume24h > 5_000_000) {
    theme = 'stormy'
  } else if (deviation < 0.1) {
    theme = 'rainy'
  } else if (avgYesPrice < 0.4) {
    theme = 'dark'
  } else {
    theme = 'sunny'
  }

  const speedMultiplier = totalVolume24h > 5_000_000 ? 1.5 : totalVolume24h > 1_000_000 ? 1.2 : 1.0

  return { avgYesPrice, totalVolume24h, theme, speedMultiplier, platformStatus: apiStatus, markets, lastUpdated: Date.now() }
}

type TrendCallback = (trend: AggregatedTrend) => void

export class PredictionService {
  private markets: UnifiedMarket[] = []
  private callbacks: TrendCallback[] = []
  private timer: ReturnType<typeof setInterval> | null = null
  private currentTrend: AggregatedTrend | null = null
  // Per-platform API health tracking
  private apiStatus: { polymarket: ApiStatus; kalshi: ApiStatus; opinion: ApiStatus } = {
    polymarket: 'stale',
    kalshi: 'stale',
    opinion: 'stale',
  }
  private lastSuccessfulFetch: { polymarket: number; kalshi: number; opinion: number } = {
    polymarket: 0,
    kalshi: 0,
    opinion: 0,
  }

  getApiStatus() {
    return { ...this.apiStatus }
  }

  onTrendUpdate(cb: TrendCallback) {
    this.callbacks.push(cb)
  }

  getCurrentTrend(): AggregatedTrend | null {
    return this.currentTrend
  }

  start() {
    this.fetch()
    this.timer = setInterval(() => this.fetch(), POLL_INTERVAL)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
  }

  private async fetch() {
    const now = Date.now()
    const STALE_THRESHOLD = 60_000 // mark stale after 60s without a successful fetch

    const [pmResult, ksResult, opResult] = await Promise.allSettled([
      this.fetchPolymarket(),
      this.fetchKalshi(),
      this.fetchOpinion(),
    ])

    const allMarkets: UnifiedMarket[] = []

    const processResult = (
      result: PromiseSettledResult<UnifiedMarket[]>,
      platform: Platform
    ) => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allMarkets.push(...result.value)
        this.apiStatus[platform] = 'ok'
        this.lastSuccessfulFetch[platform] = now
      } else if (result.status === 'rejected' || (result.status === 'fulfilled' && result.value.length === 0)) {
        const timeSinceLast = now - this.lastSuccessfulFetch[platform]
        this.apiStatus[platform] = timeSinceLast > STALE_THRESHOLD ? 'error' : 'stale'
      }
    }

    processResult(pmResult, 'polymarket')
    processResult(ksResult, 'kalshi')
    processResult(opResult, 'opinion')

    this.markets = allMarkets
    const trend = computeTrend(allMarkets, { ...this.apiStatus })
    this.currentTrend = trend
    this.callbacks.forEach(cb => cb(trend))
  }

  private async fetchPolymarket(): Promise<UnifiedMarket[]> {
    const res = await fetch('/api/polymarket?endpoint=events&active=true&limit=30')
    if (!res.ok) throw new Error(`PM ${res.status}`)
    const data = await res.json()
    return normalizePolymarket(Array.isArray(data) ? data : [])
  }

  private async fetchKalshi(): Promise<UnifiedMarket[]> {
    const res = await fetch('/api/kalshi?endpoint=events&status=open&limit=30&with_nested_markets=true')
    if (!res.ok) throw new Error(`KS ${res.status}`)
    const data = await res.json()
    return normalizeKalshi(data)
  }

  private async fetchOpinion(): Promise<UnifiedMarket[]> {
    const res = await fetch('/api/opinion?endpoint=topic&sortBy=5&limit=20&page=1')
    if (!res.ok) throw new Error(`OP ${res.status}`)
    const data = await res.json()
    return normalizeOpinion(data)
  }

  getRandomCoins(count: number): UnifiedMarket[] {
    if (this.markets.length === 0) return []
    const shuffled = [...this.markets].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
}
