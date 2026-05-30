import Phaser from 'phaser'
import type { AggregatedTrend, UnifiedMarket } from '../types/market'
import { LeaderboardService } from '../systems/LeaderboardService'

// Platform colors — Polymarket=blue, Kalshi=purple, Opinion=yellow
const PLATFORM_COLORS: Record<string, number> = {
  polymarket: 0x4488FF,
  kalshi:     0xAA44FF,
  opinion:    0xFFD700,
}

interface GameOverData {
  score: number
  multiplier: number
  platformsCollected: string[]
  collectedCoins: UnifiedMarket[]
  trend: AggregatedTrend | null
  platformStats: { polymarket: number; kalshi: number; opinion: number }
}

export class GameOverScene extends Phaser.Scene {
  private leaderboard!: LeaderboardService

  constructor() {
    super({ key: 'GameOverScene' })
  }

  create(data: GameOverData) {
    const { width, height } = this.scale
    this.leaderboard = new LeaderboardService()

    // Save entry — use wallet address if connected, else anonymous
    const playerName = LeaderboardService.getShortAddress() || 'Player'
    this.leaderboard.addEntry({
      name: playerName,
      score: data.score,
      multiplier: data.multiplier,
      platformStats: data.platformStats,
      createdAt: Date.now(),
    })

    // --- Background (dark overlay with subtle gradient)
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85).setDepth(0)

    // Top scanlines for atmosphere
    const scan = this.add.graphics().setDepth(1).setAlpha(0.04)
    for (let y = 0; y < height; y += 4) {
      scan.fillStyle(0x000000, 1)
      scan.fillRect(0, y, width, 2)
    }

    // --- GAME OVER title
    // Glow background box
    this.add.rectangle(width / 2, 38, 380, 52, 0x1a0000, 1)
      .setStrokeStyle(2, 0xFF3333, 1).setDepth(2)

    const titleText = this.add.text(width / 2, 38, 'GAME OVER', {
      fontSize: '32px',
      color: '#FF3333',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#880000', blur: 0, fill: true },
    }).setOrigin(0.5).setDepth(3)

    // Flicker effect
    this.tweens.add({
      targets: titleText,
      alpha: 0.7,
      duration: 80,
      yoyo: true,
      repeat: 3,
      ease: 'Stepped',
    })

    // --- Score panel (center-left)
    const panelX = 20, panelY = 80
    const panelW = 380, panelH = 200

    this.add.rectangle(panelX + panelW / 2, panelY + panelH / 2, panelW, panelH, 0x0a0a1a, 1)
      .setStrokeStyle(1, 0x334455, 1).setDepth(2)

    // Final score
    this.add.text(panelX + 12, panelY + 10, 'FINAL SCORE', {
      fontSize: '9px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setDepth(3)

    this.add.text(panelX + 12, panelY + 24, data.score.toLocaleString(), {
      fontSize: '28px',
      color: '#FFD700',
      fontFamily: '"Press Start 2P", monospace',
      stroke: '#000000',
      strokeThickness: 3,
    }).setDepth(3)

    this.add.text(panelX + 12, panelY + 60, `× ${data.multiplier.toFixed(2)}  multiplier`, {
      fontSize: '11px',
      color: '#FFAA44',
      fontFamily: 'monospace',
    }).setDepth(3)

    // Divider
    this.add.rectangle(panelX + panelW / 2, panelY + 78, panelW - 24, 1, 0x334455).setDepth(3)

    // Platform coins collected
    const ps = data.platformStats
    const totalCoins = ps.polymarket + ps.kalshi + ps.opinion

    this.add.text(panelX + 12, panelY + 86, 'COINS COLLECTED', {
      fontSize: '8px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setDepth(3)

    // PM bar
    this.drawStatBar(panelX + 12, panelY + 100, 'PM', ps.polymarket, totalCoins || 1, PLATFORM_COLORS.polymarket, PLATFORM_COLORS.polymarket)
    // KS bar
    this.drawStatBar(panelX + 12, panelY + 116, 'KS', ps.kalshi, totalCoins || 1, PLATFORM_COLORS.kalshi, PLATFORM_COLORS.kalshi)
    // OP bar
    this.drawStatBar(panelX + 12, panelY + 132, 'OP', ps.opinion, totalCoins || 1, PLATFORM_COLORS.opinion, PLATFORM_COLORS.opinion)

    // Divider 2
    this.add.rectangle(panelX + panelW / 2, panelY + 152, panelW - 24, 1, 0x334455).setDepth(3)

    // Market theme
    if (data.trend) {
      const themeLabels: Record<string, { label: string; color: number }> = {
        sunny:  { label: 'BULLISH  Market  +60% YES', color: 0x44FF88 },
        dark:   { label: 'BEARISH  Market  <40% YES', color: 0xFF4444 },
        rainy:  { label: 'VOLATILE Market  +-10%',    color: 0x88AAFF },
        stormy: { label: 'HIGH VOL Storm   >5M pUSD', color: 0xFF8844 },
      }
      const themeInfo = themeLabels[data.trend.theme] || { label: data.trend.theme, color: 0xFFFFFF }

      this.add.text(panelX + 12, panelY + 160, 'MARKET THEME', {
        fontSize: '8px',
        color: '#666666',
        fontFamily: 'monospace',
      }).setDepth(3)

      this.add.text(panelX + 12, panelY + 172, themeInfo.label, {
        fontSize: '9px',
        color: `#${themeInfo.color.toString(16).padStart(6, '0')}`,
        fontFamily: 'monospace',
      }).setDepth(3)

      const avgPct = Math.round((Number(data.trend.avgYesPrice) || 0) * 100)
      const vol = Number(data.trend.totalVolume24h) || 0
      const volStr = vol > 1_000_000
        ? `$${(vol / 1_000_000).toFixed(1)}M`
        : vol > 1000
          ? `$${(vol / 1000).toFixed(0)}K`
          : `$${vol.toFixed(0)}`

      this.add.text(panelX + 200, panelY + 172, `Avg: ${avgPct}%  Vol: ${volStr}`, {
        fontSize: '9px',
        color: '#999999',
        fontFamily: 'monospace',
      }).setDepth(3)
    }

    // --- Leaderboard panel (right side)
    const lbX = 420, lbY = 80, lbW = 360, lbH = 200
    this.add.rectangle(lbX + lbW / 2, lbY + lbH / 2, lbW, lbH, 0x0a0a1a, 1)
      .setStrokeStyle(1, 0x334455, 1).setDepth(2)

    // Wallet indicator in leaderboard panel
    const shortAddr = LeaderboardService.getShortAddress()
    if (shortAddr) {
      this.add.rectangle(lbX + lbW - 12, lbY + 10, 130, 14, 0x001a00, 1)
        .setStrokeStyle(1, 0x44FF88, 0.5).setOrigin(1, 0).setDepth(3)
      this.add.text(lbX + lbW - 16, lbY + 4, `⬡ ${shortAddr}`, {
        fontSize: '7px', color: '#44FF88', fontFamily: 'monospace',
      }).setOrigin(1, 0).setDepth(4)
    } else {
      this.add.text(lbX + lbW - 12, lbY + 4, 'Connect wallet to save', {
        fontSize: '7px', color: '#333344', fontFamily: 'monospace',
      }).setOrigin(1, 0).setDepth(3)
    }

    this.drawLeaderboard(lbX + 12, lbY + 10, data.score)

    // --- Mini probability chart (bottom left, if coins collected)
    if (data.collectedCoins.length > 0) {
      const chartX = 20, chartY = 296, chartW = 380, chartH = 160
      this.add.rectangle(chartX + chartW / 2, chartY + chartH / 2, chartW, chartH, 0x0a0a1a, 1)
        .setStrokeStyle(1, 0x334455, 1).setDepth(2)

      this.add.text(chartX + 12, chartY + 10, 'COLLECTED MARKETS — YES PROBABILITY', {
        fontSize: '7px',
        color: '#666666',
        fontFamily: 'monospace',
      }).setDepth(3)

      this.drawMiniChart(chartX + 12, chartY + 26, data.collectedCoins)
    }

    // --- Rank badge (bottom right area)
    const rank = this.leaderboard.getRank(data.score)
    const rankColor = rank === 1 ? 0xFFD700 : rank <= 3 ? 0xCCCCCC : 0x888888
    const rankStr = rank === 1 ? '#1  NEW BEST!' : `#${rank}`

    this.add.rectangle(590, 310, 190, 40, 0x0a0a1a, 1)
      .setStrokeStyle(2, rankColor, 1).setDepth(2)

    this.add.text(590, 304, 'YOUR RANK', {
      fontSize: '8px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(3)

    this.add.text(590, 318, rankStr, {
      fontSize: '14px',
      color: `#${rankColor.toString(16).padStart(6, '0')}`,
      fontFamily: '"Press Start 2P", monospace',
    }).setOrigin(0.5).setDepth(3)

    // Top markets from trend (bottom right)
    if (data.trend && data.trend.markets.length > 0) {
      const tmX = 420, tmY = 296, tmW = 360, tmH = 160
      this.add.rectangle(tmX + tmW / 2, tmY + tmH / 2, tmW, tmH, 0x0a0a1a, 1)
        .setStrokeStyle(1, 0x334455, 1).setDepth(2)

      this.add.text(tmX + 12, tmY + 10, 'TOP MARKETS BY VOLUME', {
        fontSize: '7px',
        color: '#666666',
        fontFamily: 'monospace',
      }).setDepth(3)

      const topMarkets = [...data.trend.markets]
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, 6)

      topMarkets.forEach((m, i) => {
        const pct = Math.round(m.yesPrice * 100)
        const col = PLATFORM_COLORS[m.platform] || 0xFFFFFF
        const platTag = m.platform === 'polymarket' ? 'PM' : m.platform === 'kalshi' ? 'KS' : 'OP'

        // Platform tag
        this.add.rectangle(tmX + 22, tmY + 26 + i * 22, 22, 12, col, 0.2)
          .setStrokeStyle(1, col, 0.8).setDepth(3)
        this.add.text(tmX + 22, tmY + 26 + i * 22, platTag, {
          fontSize: '7px',
          color: `#${col.toString(16).padStart(6, '0')}`,
          fontFamily: 'monospace',
        }).setOrigin(0.5).setDepth(4)

        // Title
        const shortName = m.shortTitle.substring(0, 22)
        this.add.text(tmX + 38, tmY + 21 + i * 22, shortName, {
          fontSize: '8px',
          color: '#CCCCCC',
          fontFamily: 'monospace',
        }).setDepth(3)

        // Probability bar
        const barW = 80
        this.add.rectangle(tmX + 264 + barW / 2, tmY + 26 + i * 22, barW, 8, 0x333333).setDepth(3)
        this.add.rectangle(
          tmX + 264 + (pct / 100) * barW / 2,
          tmY + 26 + i * 22,
          (pct / 100) * barW, 8, col
        ).setDepth(4)

        this.add.text(tmX + 350, tmY + 21 + i * 22, `${pct}%`, {
          fontSize: '8px',
          color: `#${col.toString(16).padStart(6, '0')}`,
          fontFamily: 'monospace',
        }).setDepth(4)
      })
    }

    // --- Action buttons
    const btnY = 470

    const playBtn = this.add.rectangle(width / 2 - 110, btnY, 180, 34, 0x00AA44)
      .setStrokeStyle(2, 0x00FF66, 1).setDepth(2).setInteractive({ useHandCursor: true })

    this.add.text(width / 2 - 110, btnY, '▶  PLAY AGAIN', {
      fontSize: '11px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3)

    playBtn.on('pointerover', () => playBtn.setFillStyle(0x00CC55))
    playBtn.on('pointerout', () => playBtn.setFillStyle(0x00AA44))
    playBtn.on('pointerdown', () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gameRestart'))
      }
      this.scene.start('GameScene')
    })

    const shareBtn = this.add.rectangle(width / 2 + 90, btnY, 160, 34, 0x2255AA)
      .setStrokeStyle(2, 0x4488FF, 1).setDepth(2).setInteractive({ useHandCursor: true })

    this.add.text(width / 2 + 90, btnY, '↑  SHARE SCORE', {
      fontSize: '11px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(3)

    shareBtn.on('pointerover', () => shareBtn.setFillStyle(0x3366BB))
    shareBtn.on('pointerout', () => shareBtn.setFillStyle(0x2255AA))
    shareBtn.on('pointerdown', () => this.shareScore(data))

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown-SPACE', () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gameRestart'))
      }
      this.scene.start('GameScene')
    })
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gameRestart'))
      }
      this.scene.start('GameScene')
    })

    // Trigger React overlay
    this.triggerReactOverlay(data)
  }

  private drawStatBar(x: number, y: number, label: string, count: number, total: number, color: number, labelColor: number) {
    const barMaxW = 260
    const pct = total > 0 ? count / total : 0
    const barW = Math.max(pct > 0 ? 4 : 0, Math.round(pct * barMaxW))

    // Label
    this.add.text(x, y, label, {
      fontSize: '8px',
      color: `#${labelColor.toString(16).padStart(6, '0')}`,
      fontFamily: 'monospace',
    }).setDepth(3)

    // Background bar
    this.add.rectangle(x + 30 + barMaxW / 2, y + 4, barMaxW, 8, 0x1a1a2a).setDepth(3)
    // Fill
    if (barW > 0) {
      this.add.rectangle(x + 30 + barW / 2, y + 4, barW, 8, color).setDepth(4)
    }
    // Count
    this.add.text(x + 30 + barMaxW + 6, y, `${count}`, {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setDepth(3)
  }

  private drawMiniChart(x: number, y: number, coins: UnifiedMarket[]) {
    const maxBars = 16
    const displayCoins = coins.slice(-maxBars)
    const availableW = 356
    const barW = Math.floor(availableW / maxBars) - 2
    const barMaxH = 90

    // Y-axis labels
    for (let pct = 0; pct <= 100; pct += 25) {
      const py = y + barMaxH - (pct / 100) * barMaxH
      this.add.text(x - 2, py, `${pct}`, {
        fontSize: '6px',
        color: '#444444',
        fontFamily: 'monospace',
      }).setOrigin(1, 0.5).setDepth(3)
      // Grid line
      this.add.rectangle(x + availableW / 2, py, availableW, 1, 0x222233).setDepth(2)
    }

    displayCoins.forEach((coin, i) => {
      const barH = Math.max(2, Math.round(coin.yesPrice * barMaxH))
      const color = PLATFORM_COLORS[coin.platform] || 0xFFFFFF

      const bx = x + i * (barW + 2)
      const by = y + barMaxH

      // Bar shadow
      this.add.rectangle(bx + barW / 2 + 1, by - barH / 2 + 1, barW, barH, 0x000000, 0.5).setDepth(3)
      // Bar fill
      this.add.rectangle(bx + barW / 2, by - barH / 2, barW, barH, color).setDepth(4)

      // Pct label above bar
      if (barH > 12) {
        this.add.text(bx + barW / 2, by - barH - 2, `${Math.round(coin.yesPrice * 100)}`, {
          fontSize: '6px',
          color: `#${color.toString(16).padStart(6, '0')}`,
          fontFamily: 'monospace',
        }).setOrigin(0.5, 1).setDepth(5)
      }
    })

    // X-axis baseline
    this.add.rectangle(x + availableW / 2, y + barMaxH + 1, availableW, 1, 0x444444).setDepth(3)

    // Legend
    const legendY = y + barMaxH + 8
    const platforms = [
      { color: PLATFORM_COLORS.polymarket, label: 'Polymarket' },
      { color: PLATFORM_COLORS.kalshi,     label: 'Kalshi' },
      { color: PLATFORM_COLORS.opinion,    label: 'Opinion' },
    ]
    platforms.forEach((p, i) => {
      this.add.rectangle(x + i * 110 + 4, legendY + 4, 8, 8, p.color).setDepth(3)
      this.add.text(x + i * 110 + 12, legendY, p.label, {
        fontSize: '7px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setDepth(3)
    })
  }

  private drawLeaderboard(x: number, y: number, currentScore: number) {
    this.add.text(x, y, 'LEADERBOARD', {
      fontSize: '9px',
      color: '#FFD700',
      fontFamily: '"Press Start 2P", monospace',
    }).setDepth(3)

    const entries = this.leaderboard.getEntries().slice(0, 8)

    if (entries.length === 0) {
      this.add.text(x, y + 20, 'No scores yet — you are first!', {
        fontSize: '8px',
        color: '#555555',
        fontFamily: 'monospace',
      }).setDepth(3)
      return
    }

    entries.forEach((entry, i) => {
      const isCurrentScore = entry.score === currentScore && i === this.leaderboard.getRank(currentScore) - 1
      const medals = ['01', '02', '03', '04', '05', '06', '07', '08']
      const color = i === 0 ? '#FFD700' : i === 1 ? '#CCCCCC' : i === 2 ? '#CD7F32' : '#777777'

      // Highlight current score row
      if (isCurrentScore) {
        this.add.rectangle(x + 160, y + 22 + i * 20, 320, 16, 0x223344, 1).setDepth(2)
      }

      this.add.text(x, y + 18 + i * 20, medals[i], {
        fontSize: '8px',
        color,
        fontFamily: 'monospace',
      }).setDepth(3)

      this.add.text(x + 24, y + 18 + i * 20, entry.score.toLocaleString(), {
        fontSize: '10px',
        color: isCurrentScore ? '#FFFFFF' : color,
        fontFamily: 'monospace',
        stroke: isCurrentScore ? '#000000' : undefined,
        strokeThickness: isCurrentScore ? 2 : 0,
      }).setDepth(3)

      this.add.text(x + 140, y + 18 + i * 20, `×${entry.multiplier.toFixed(1)}`, {
        fontSize: '8px',
        color: '#FFAA44',
        fontFamily: 'monospace',
      }).setDepth(3)

      // Platform icons
      const ps = entry.platformStats
      const totalCoinsEntry = ps.polymarket + ps.kalshi + ps.opinion
      this.add.text(x + 200, y + 18 + i * 20,
        `PM:${ps.polymarket} KS:${ps.kalshi} OP:${ps.opinion}  [${totalCoinsEntry}]`, {
        fontSize: '7px',
        color: '#555555',
        fontFamily: 'monospace',
      }).setDepth(3)
    })
  }

  private shareScore(data: GameOverData) {
    const ps = data.platformStats
    const trend = data.trend
    const themeEmoji = trend
      ? { sunny: 'Bullish', dark: 'Bearish', rainy: 'Volatile', stormy: 'HIGH VOL' }[trend.theme] || trend.theme
      : 'Unknown'

    const text = [
      `PredictRun Score: ${data.score.toLocaleString()} (x${data.multiplier.toFixed(1)})`,
      `Market: ${themeEmoji}  Avg Yes: ${trend ? Math.round(trend.avgYesPrice * 100) : '--'}%`,
      `Coins: PM:${ps.polymarket} KS:${ps.kalshi} OP:${ps.opinion}`,
      `Powered by Polymarket | predictrun.vercel.app`,
    ].join('\n')

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {})
    }

    const notif = this.add.text(this.scale.width / 2, this.scale.height / 2, 'Copied to clipboard!', {
      fontSize: '13px',
      color: '#44FF44',
      fontFamily: 'monospace',
      backgroundColor: '#001100CC',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setDepth(30)

    this.tweens.add({
      targets: notif,
      alpha: 0,
      y: notif.y - 30,
      duration: 1200,
      delay: 800,
      onComplete: () => notif.destroy(),
    })
  }

  private triggerReactOverlay(data: GameOverData) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gameOver', { detail: data }))
    }
  }
}
