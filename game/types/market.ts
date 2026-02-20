export type Platform = 'polymarket' | 'kalshi' | 'opinion'
export type ApiStatus = 'ok' | 'error' | 'stale'

export interface UnifiedMarket {
  id: string
  platform: Platform
  title: string
  shortTitle: string
  yesPrice: number        // 0.0 - 1.0
  noPrice: number         // 0.0 - 1.0
  volume24h: number       // USD
  totalVolume: number     // USD
  endDate: string
  isActive: boolean
}

export interface AggregatedTrend {
  avgYesPrice: number
  totalVolume24h: number
  theme: 'sunny' | 'dark' | 'rainy' | 'stormy'
  speedMultiplier: number
  platformStatus: {
    polymarket: ApiStatus
    kalshi: ApiStatus
    opinion: ApiStatus
  }
  markets: UnifiedMarket[]
  lastUpdated: number
}

export interface CoinData {
  market: UnifiedMarket
  displayLabel: string
}

export interface LeaderboardEntry {
  name: string
  score: number
  multiplier: number
  platformStats: { polymarket: number; kalshi: number; opinion: number }
  createdAt: number
}
