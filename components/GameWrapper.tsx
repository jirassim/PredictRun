'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { UnifiedMarket, AggregatedTrend } from '../game/types/market'

interface GameOverDetail {
  score: number
  multiplier: number
  platformsCollected: string[]
  collectedCoins: UnifiedMarket[]
  trend: AggregatedTrend | null
  platformStats: { polymarket: number; kalshi: number; opinion: number }
}

export default function GameWrapper() {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<import('phaser').Game | null>(null)
  const [gameOverData, setGameOverData] = useState<GameOverDetail | null>(null)
  const [showChart, setShowChart] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let mounted = true

    const initGame = async () => {
      const { createGame } = await import('../game/main')
      if (!mounted || !containerRef.current || gameRef.current) return
      gameRef.current = createGame(containerRef.current)
    }

    initGame()

    const handleGameOver = (e: Event) => {
      const detail = (e as CustomEvent<GameOverDetail>).detail
      setGameOverData(detail)
      setShowChart(true)
    }

    const handleRestart = () => {
      setShowChart(false)
      setGameOverData(null)
    }

    window.addEventListener('gameOver', handleGameOver)
    window.addEventListener('gameRestart', handleRestart)

    return () => {
      mounted = false
      window.removeEventListener('gameOver', handleGameOver)
      window.removeEventListener('gameRestart', handleRestart)
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  const getBarColor = (platform: string) => {
    if (platform === 'polymarket') return '#4488FF'
    if (platform === 'kalshi') return '#AA44FF'
    return '#FFD700'
  }

  const chartData = gameOverData?.collectedCoins.map(c => ({
    name: c.shortTitle.substring(0, 12),
    yes: Math.round(c.yesPrice * 100),
    platform: c.platform,
  })) || []

  const themeConfig: Record<string, { label: string; color: string; bg: string }> = {
    sunny:  { label: 'Bullish Market',    color: '#44FF88', bg: '#002211' },
    dark:   { label: 'Bearish Market',    color: '#FF5555', bg: '#220011' },
    rainy:  { label: 'Volatile Market',   color: '#88AAFF', bg: '#001133' },
    stormy: { label: 'High Volume Storm', color: '#FF8844', bg: '#221100' },
  }
  const theme = gameOverData?.trend?.theme || 'sunny'
  const tc = themeConfig[theme] || themeConfig.sunny

  return (
    <div className="relative w-full max-w-[800px] mx-auto">
      {/* Phaser canvas container — exact 800×500 ratio */}
      <div
        ref={containerRef}
        className="w-full border-2 border-gray-700 rounded-lg overflow-hidden shadow-2xl shadow-black/50"
        style={{ aspectRatio: '800/500', background: '#0a0e1a' }}
      />

      {/* Recharts game-over report card */}
      {showChart && gameOverData && (
        <div className="mt-3 rounded-lg border border-gray-700 overflow-hidden shadow-xl"
          style={{ background: '#080c18' }}>

          {/* Header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/60"
            style={{ background: '#0d1222' }}>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-mono text-xs uppercase tracking-widest">Market Report</span>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold"
                style={{ background: tc.bg, color: tc.color }}>
                {tc.label}
              </span>
            </div>
            <button
              onClick={() => setShowChart(false)}
              className="text-gray-600 hover:text-gray-300 text-xs font-mono transition-colors px-2 py-1 rounded hover:bg-gray-800"
            >
              [close]
            </button>
          </div>

          <div className="p-4">
            {/* Score row */}
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                <p className="text-gray-500 font-mono text-xs mb-0.5">SCORE</p>
                <p className="text-yellow-400 font-mono text-2xl font-bold leading-none">
                  {gameOverData.score.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                <p className="text-gray-500 font-mono text-xs mb-0.5">MULTIPLIER</p>
                <p className="text-orange-400 font-mono text-2xl font-bold leading-none">
                  ×{gameOverData.multiplier.toFixed(2)}
                </p>
              </div>

              {/* Platform coin counts */}
              <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                <p className="text-gray-500 font-mono text-xs mb-0.5">COINS</p>
                <div className="flex gap-3 font-mono text-sm font-bold">
                  <span style={{ color: '#4488FF' }}>
                    PM <span className="text-white">{gameOverData.platformStats.polymarket}</span>
                  </span>
                  <span style={{ color: '#AA44FF' }}>
                    KS <span className="text-white">{gameOverData.platformStats.kalshi}</span>
                  </span>
                  <span style={{ color: '#FFD700' }}>
                    OP <span className="text-white">{gameOverData.platformStats.opinion}</span>
                  </span>
                </div>
              </div>

              {/* Market stats */}
              {gameOverData.trend && (
                <>
                  <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                    <p className="text-gray-500 font-mono text-xs mb-0.5">AVG YES</p>
                    <p className="font-mono text-sm font-bold" style={{ color: tc.color }}>
                      {Math.round(gameOverData.trend.avgYesPrice * 100)}%
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                    <p className="text-gray-500 font-mono text-xs mb-0.5">24H VOL</p>
                    <p className="text-white font-mono text-sm font-bold">
                      {(() => {
                        const vol = Number(gameOverData.trend.totalVolume24h) || 0
                        return vol > 1_000_000
                          ? `$${(vol / 1_000_000).toFixed(1)}M`
                          : vol > 1000
                            ? `$${(vol / 1000).toFixed(0)}K`
                            : `$${vol.toFixed(0)}`
                      })()}
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg px-4 py-2 border border-gray-700/50">
                    <p className="text-gray-500 font-mono text-xs mb-0.5">MARKETS</p>
                    <p className="text-white font-mono text-sm font-bold">
                      {gameOverData.trend.markets.length}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Bar chart */}
            {chartData.length > 0 ? (
              <div>
                <p className="text-gray-500 font-mono text-xs mb-2 uppercase tracking-wider">
                  Collected Markets — Yes Probability (%)
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 5, right: 8, left: -18, bottom: 45 }}
                    barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e2535" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }}
                      angle={-40}
                      textAnchor="end"
                      interval={0}
                      axisLine={{ stroke: '#334' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: '#555', fontSize: 9, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <ReferenceLine y={50} stroke="#334" strokeDasharray="4 4" />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                      contentStyle={{
                        backgroundColor: '#0d1222',
                        border: '1px solid #334',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        borderRadius: '6px',
                      }}
                      formatter={(value: number | undefined, name: string | undefined) =>
                        [`${value ?? 0}%`, name === 'yes' ? 'Yes Prob' : String(name)] as [string, string]
                      }
                    />
                    <Bar dataKey="yes" name="yes" radius={[3, 3, 0, 0]} maxBarSize={28}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={getBarColor(entry.platform)} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Legend */}
                <div className="flex gap-4 mt-1">
                  {[
                    { color: '#4488FF', label: 'Polymarket' },
                    { color: '#AA44FF', label: 'Kalshi' },
                    { color: '#FFD700', label: 'Opinion Labs' },
                  ].map(p => (
                    <span key={p.label} className="flex items-center gap-1.5 text-xs font-mono text-gray-500">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block flex-shrink-0"
                        style={{ background: p.color }} />
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600 font-mono italic py-4 text-center">
                No coins collected — try collecting probability coins next run!
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-800/60 flex items-center justify-between">
            <p className="text-xs text-gray-700 font-mono">
              Read-only analytics — not financial advice. Powered by Polymarket.
            </p>
            <span className="text-xs text-gray-700 font-mono">
              Polymarket Builders Program
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
