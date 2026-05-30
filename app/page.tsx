'use client'

import GameClientWrapper from '../components/GameClientWrapper'
import WalletButton from '../components/WalletButton'
import Web3Provider from '../components/Web3Provider'

export default function Home() {
  return (
    <Web3Provider>
      <main className="min-h-screen flex flex-col items-center justify-start px-4 py-5"
        style={{ background: '#060912' }}>

        {/* Header */}
        <header className="w-full max-w-[800px] mb-3 flex items-center justify-between">
          <div>
            <h1 className="font-mono font-bold text-white tracking-widest"
              style={{ fontSize: '20px', fontFamily: '"Press Start 2P", monospace', lineHeight: 1.2 }}>
              PREDICT RUN
            </h1>
            <p className="text-gray-600 font-mono mt-1" style={{ fontSize: '10px' }}>
              Endless runner • Real-time prediction market data
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Wallet button (wagmi) */}
            <WalletButton />
            {/* Platform badges */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-700 font-mono" style={{ fontSize: '9px' }}>Powered by</span>
              <div className="flex gap-1.5">
                <span className="font-mono px-2 py-0.5 rounded"
                  style={{ fontSize: '9px', background: 'rgba(68,136,255,0.08)', color: '#4488FF', border: '1px solid rgba(68,136,255,0.25)' }}>
                  Polymarket
                </span>
                <span className="font-mono px-2 py-0.5 rounded"
                  style={{ fontSize: '9px', background: 'rgba(170,68,255,0.08)', color: '#AA44FF', border: '1px solid rgba(170,68,255,0.25)' }}>
                  Kalshi
                </span>
                <span className="font-mono px-2 py-0.5 rounded"
                  style={{ fontSize: '9px', background: 'rgba(255,215,0,0.08)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.25)' }}>
                  Opinion Labs
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Game + Report */}
        <GameClientWrapper />

        {/* Controls + Info row */}
        <div className="w-full max-w-[800px] mt-3 grid grid-cols-4 gap-2">
          {[
            { key: 'SPACE / Tap', desc: 'Jump', icon: '↑' },
            { key: '↓ / Swipe', desc: 'Duck', icon: '↓' },
            { key: 'Coins', desc: 'Collect for multiplier', icon: '●' },
            { key: 'Platforms', desc: 'Mix PM+KS+OP for bonus', icon: '×' },
          ].map(({ key, desc, icon }) => (
            <div key={key} className="rounded-lg px-3 py-2.5 border"
              style={{ background: '#0d1222', borderColor: '#1e2535' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-mono text-yellow-500" style={{ fontSize: '10px' }}>{icon}</span>
                <span className="font-mono text-yellow-400" style={{ fontSize: '9px', fontWeight: 700 }}>{key}</span>
              </div>
              <p className="font-mono text-gray-500" style={{ fontSize: '9px' }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="w-full max-w-[800px] mt-2 rounded-lg px-4 py-2.5 border"
          style={{ background: '#0d1222', borderColor: '#1e2535' }}>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {[
              { label: 'Bullish >60%', desc: 'Sunny skies', color: '#44FF88' },
              { label: 'Bearish <40%', desc: 'Dark storm', color: '#FF5555' },
              { label: 'Volatile ±10%', desc: 'Rain + lightning', color: '#88AAFF' },
              { label: 'High Vol >5M pUSD', desc: 'Speed boost!', color: '#FF8844' },
            ].map(t => (
              <div key={t.label} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: t.color }} />
                <span className="font-mono text-gray-500" style={{ fontSize: '9px' }}>
                  <span style={{ color: t.color }}>{t.label}</span>{' → '}{t.desc}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full max-w-[800px] mt-3 flex items-center justify-between"
          style={{ fontSize: '9px' }}>
          <span className="text-gray-700 font-mono">⚡ Powered by Polymarket</span>
          <span className="text-gray-700 font-mono">Read-only analytics — not financial advice</span>
          <span className="text-gray-700 font-mono">Polymarket Builders Program</span>
        </footer>
      </main>
    </Web3Provider>
  )
}
