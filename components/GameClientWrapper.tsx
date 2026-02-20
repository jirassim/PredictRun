'use client'

import dynamic from 'next/dynamic'

const GameWrapper = dynamic(() => import('./GameWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-[800px] mx-auto">
      <div
        className="w-full border-4 border-gray-700 rounded-lg flex items-center justify-center bg-gray-900"
        style={{ aspectRatio: '800/300' }}
      >
        <p className="text-gray-400 font-mono text-sm animate-pulse">Loading PredictRun...</p>
      </div>
    </div>
  ),
})

export default function GameClientWrapper() {
  return <GameWrapper />
}
