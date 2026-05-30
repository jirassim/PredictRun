'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useEffect } from 'react'

export default function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  // Sync address to window so Phaser / LeaderboardService can read it
  useEffect(() => {
    window.__walletAddress = isConnected && address ? address : null
  }, [address, isConnected])

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null

  // No injected wallet available
  const injected = connectors.find(c => c.id === 'injected')
  if (!injected) {
    return (
      <a
        href="https://metamask.io"
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono px-3 py-1.5 rounded border transition-colors"
        style={{ fontSize: '9px', color: '#888', borderColor: '#333' }}
      >
        Get MetaMask ↗
      </a>
    )
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <div
          className="font-mono px-2.5 py-1.5 rounded border flex items-center gap-1.5"
          style={{
            fontSize: '9px',
            color: '#44FF88',
            borderColor: 'rgba(68,255,136,0.35)',
            background: 'rgba(68,255,136,0.06)',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: '#44FF88', boxShadow: '0 0 6px #44FF88' }}
          />
          {short}
        </div>
        <button
          onClick={() => disconnect()}
          className="font-mono px-2 py-1 rounded border transition-colors"
          style={{ fontSize: '9px', color: '#555', borderColor: '#2a2a2a' }}
          title="Disconnect wallet"
          onMouseEnter={e => { (e.target as HTMLElement).style.color = '#FF5555'; (e.target as HTMLElement).style.borderColor = 'rgba(255,85,85,0.3)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.color = '#555'; (e.target as HTMLElement).style.borderColor = '#2a2a2a' }}
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => connect({ connector: injected })}
      disabled={isPending}
      className="font-mono px-3 py-1.5 rounded border transition-all disabled:opacity-40"
      style={{ fontSize: '9px', color: '#888', borderColor: '#333', background: 'transparent' }}
      onMouseEnter={e => {
        if (!isPending) {
          (e.target as HTMLElement).style.color = '#FFD700'
          ;(e.target as HTMLElement).style.borderColor = 'rgba(255,215,0,0.4)'
        }
      }}
      onMouseLeave={e => {
        (e.target as HTMLElement).style.color = '#888'
        ;(e.target as HTMLElement).style.borderColor = '#333'
      }}
    >
      {isPending ? '◌ Connecting...' : '⬡ Connect Wallet'}
    </button>
  )
}
