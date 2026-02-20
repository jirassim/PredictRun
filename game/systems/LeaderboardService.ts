import type { LeaderboardEntry } from '../types/market'

const LEGACY_KEY = 'market_runner_leaderboard'  // backward-compat key for anonymous play
const MAX_ENTRIES = 10

/** Storage key scoped to the connected wallet address, or legacy key for anonymous */
function storageKey(): string {
  if (typeof window !== 'undefined') {
    const addr = window.__walletAddress
    if (typeof addr === 'string' && addr.length > 0) {
      return `market-runner-lb-${addr.toLowerCase()}`
    }
  }
  return LEGACY_KEY
}

export class LeaderboardService {
  private entries: LeaderboardEntry[] = []

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(storageKey())
      if (raw) this.entries = JSON.parse(raw)
    } catch {
      this.entries = []
    }
  }

  private save() {
    try {
      localStorage.setItem(storageKey(), JSON.stringify(this.entries))
    } catch { /* ignore */ }
  }

  addEntry(entry: LeaderboardEntry) {
    this.entries.push(entry)
    this.entries.sort((a, b) => b.score - a.score)
    this.entries = this.entries.slice(0, MAX_ENTRIES)
    this.save()
  }

  getEntries(): LeaderboardEntry[] {
    return this.entries
  }

  getRank(score: number): number {
    return this.entries.filter(e => e.score > score).length + 1
  }

  isHighScore(score: number): boolean {
    if (this.entries.length < MAX_ENTRIES) return true
    return score > (this.entries[this.entries.length - 1]?.score || 0)
  }

  /** True when a wallet is connected */
  static isWalletConnected(): boolean {
    if (typeof window === 'undefined') return false
    const addr = window.__walletAddress
    return typeof addr === 'string' && addr.length > 0
  }

  /** Returns shortened wallet address e.g. "0x1234...5678" or null if not connected */
  static getShortAddress(): string | null {
    if (typeof window === 'undefined') return null
    const addr = window.__walletAddress
    if (!addr || addr.length === 0) return null
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }
}
