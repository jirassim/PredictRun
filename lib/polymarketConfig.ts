export const POLYMARKET_GAMMA_HOST = 'https://gamma-api.polymarket.com'
export const POLYMARKET_DATA_HOST = 'https://data-api.polymarket.com'
export const POLYMARKET_CLOB_HOST = 'https://clob.polymarket.com'

export const POLYMARKET_COLLATERAL_ASSET = 'pUSD' as const
export type PolymarketCollateralAsset = typeof POLYMARKET_COLLATERAL_ASSET

export const POLYMARKET_GAMMA_ENDPOINTS = ['events', 'markets'] as const
export const POLYMARKET_DATA_ENDPOINTS = ['trades', 'positions'] as const
export const POLYMARKET_CLOB_ENDPOINTS = [
  'price',
  'prices-history',
  'book',
  'midpoint',
] as const

export const POLYMARKET_READ_ONLY_ENDPOINTS = [
  ...POLYMARKET_GAMMA_ENDPOINTS,
  ...POLYMARKET_DATA_ENDPOINTS,
  ...POLYMARKET_CLOB_ENDPOINTS,
] as const

export type PolymarketReadOnlyEndpoint = (typeof POLYMARKET_READ_ONLY_ENDPOINTS)[number]

export const POLYMARKET_REQUEST_TIMEOUT_MS = 10_000

export function isAllowedPolymarketReadEndpoint(endpoint: string): boolean {
  return POLYMARKET_READ_ONLY_ENDPOINTS.some(
    allowed => endpoint === allowed || endpoint.startsWith(`${allowed}/`)
  )
}

export function resolvePolymarketHost(endpoint: string): string {
  if (POLYMARKET_DATA_ENDPOINTS.some(allowed => endpoint === allowed || endpoint.startsWith(`${allowed}/`))) {
    return POLYMARKET_DATA_HOST
  }

  if (POLYMARKET_CLOB_ENDPOINTS.some(allowed => endpoint === allowed || endpoint.startsWith(`${allowed}/`))) {
    return POLYMARKET_CLOB_HOST
  }

  return POLYMARKET_GAMMA_HOST
}

export function normalizePolymarketQuery(endpoint: string, params: URLSearchParams): URLSearchParams {
  const normalized = new URLSearchParams(params)

  if (endpoint === 'prices-history' && normalized.has('token_id') && !normalized.has('market')) {
    const tokenId = normalized.get('token_id')
    normalized.delete('token_id')
    if (tokenId) normalized.set('market', tokenId)
  }

  return normalized
}
