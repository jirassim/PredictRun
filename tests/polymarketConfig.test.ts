import { describe, expect, it } from 'vitest'
import {
  POLYMARKET_CLOB_HOST,
  POLYMARKET_DATA_HOST,
  POLYMARKET_GAMMA_HOST,
  POLYMARKET_COLLATERAL_ASSET,
  isAllowedPolymarketReadEndpoint,
  normalizePolymarketQuery,
  resolvePolymarketHost,
} from '../lib/polymarketConfig'

describe('polymarket read-only config', () => {
  it('routes public read endpoints to the expected hosts', () => {
    expect(resolvePolymarketHost('events')).toBe(POLYMARKET_GAMMA_HOST)
    expect(resolvePolymarketHost('markets')).toBe(POLYMARKET_GAMMA_HOST)
    expect(resolvePolymarketHost('trades')).toBe(POLYMARKET_DATA_HOST)
    expect(resolvePolymarketHost('positions')).toBe(POLYMARKET_DATA_HOST)
    expect(resolvePolymarketHost('price')).toBe(POLYMARKET_CLOB_HOST)
    expect(resolvePolymarketHost('prices-history')).toBe(POLYMARKET_CLOB_HOST)
    expect(resolvePolymarketHost('book')).toBe(POLYMARKET_CLOB_HOST)
  })

  it('keeps order endpoints out of the read-only proxy', () => {
    expect(isAllowedPolymarketReadEndpoint('order')).toBe(false)
    expect(isAllowedPolymarketReadEndpoint('orders')).toBe(false)
    expect(isAllowedPolymarketReadEndpoint('auth/api-key')).toBe(false)
  })

  it('normalizes legacy token_id into v2 prices-history market parameter', () => {
    const params = normalizePolymarketQuery('prices-history', new URLSearchParams('token_id=123&fidelity=60'))

    expect(params.get('token_id')).toBeNull()
    expect(params.get('market')).toBe('123')
    expect(params.get('fidelity')).toBe('60')
    expect(POLYMARKET_COLLATERAL_ASSET).toBe('pUSD')
  })
})
