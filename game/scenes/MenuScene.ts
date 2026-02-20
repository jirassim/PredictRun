import Phaser from 'phaser'

export class MenuScene extends Phaser.Scene {
  private platformStatus = { polymarket: false, kalshi: false, opinion: false }
  private statusGroup!: Phaser.GameObjects.Group
  private floatingCoins: { obj: Phaser.GameObjects.Image; vy: number; vx: number }[] = []
  private checkTimer = 0
  private bgStars!: Phaser.GameObjects.Image

  constructor() {
    super({ key: 'MenuScene' })
  }

  create() {
    const { width, height } = this.scale

    // Background
    this.add.image(width / 2, height / 2, 'bg_dark').setDepth(0)

    // Star layer
    try {
      this.bgStars = this.add.image(0, 0, 'stars').setOrigin(0, 0).setDepth(1).setAlpha(0.6)
    } catch { /* no stars texture */ }

    // Moon
    this.add.image(width - 80, 60, 'moon').setDepth(2).setAlpha(0.9)

    // Pixel-art title — drawn character by character for effect
    const titleBg = this.add.rectangle(width / 2, 80, 580, 56, 0x000000, 0.7).setDepth(5)
    titleBg.setStrokeStyle(3, 0xFFDD00, 1)

    const title = this.add.text(width / 2, 68, 'PREDICT RUN', {
      fontSize: '36px',
      color: '#FFD700',
      fontFamily: '"Press Start 2P", "Courier New", monospace',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: { offsetX: 3, offsetY: 3, color: '#AA8800', blur: 0, fill: true },
    }).setOrigin(0.5).setDepth(6)

    // Subtitle
    this.add.text(width / 2, 102, 'Powered by Polymarket + Kalshi + Opinion Labs', {
      fontSize: '10px',
      color: '#AAAAAA',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(6)

    // Blinking press start text
    const pressStart = this.add.text(width / 2, height / 2 + 20, '>> PRESS SPACE TO START <<', {
      fontSize: '16px',
      color: '#00FF88',
      fontFamily: 'monospace',
      stroke: '#003300',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(6)

    this.tweens.add({
      targets: pressStart,
      alpha: 0.1,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Controls hint
    this.add.text(width / 2, height / 2 + 55, 'SPACE / TAP = Jump   ↓ / SWIPE = Duck', {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(6)

    // Platform status area
    const statusBox = this.add.rectangle(width / 2, height / 2 - 30, 360, 36, 0x000000, 0.6).setDepth(5)
    statusBox.setStrokeStyle(1, 0x444444, 1)

    this.statusGroup = this.add.group()
    this.drawPlatformStatus()

    // Floating coin decorations
    this.spawnFloatingCoins()

    // Ground runner preview
    this.createRunnerPreview()

    // Scan-line overlay
    const scanline = this.add.graphics().setDepth(50).setAlpha(0.06)
    for (let y = 0; y < height; y += 4) {
      scanline.fillStyle(0x000000, 1)
      scanline.fillRect(0, y, width, 2)
    }

    // Title glow pulse
    this.tweens.add({
      targets: title,
      alpha: 0.85,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    // Input
    this.input.keyboard!.on('keydown-SPACE', () => this.startGame())
    this.input.keyboard!.on('keydown-ENTER', () => this.startGame())
    this.input.on('pointerdown', () => this.startGame())

    // Check APIs on start
    this.checkAPIs()

    // Powered by footer
    this.add.text(width - 8, height - 8, '⚡ Powered by Polymarket', {
      fontSize: '9px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(1, 1).setDepth(6)

    // High score display
    this.showHighScore()
  }

  private drawPlatformStatus() {
    this.statusGroup.clear(true, true)
    const { width, height } = this.scale

    const platforms = [
      { key: 'polymarket', label: 'PM', color: '#4488FF', active: this.platformStatus.polymarket },
      { key: 'kalshi', label: 'KS', color: '#AA44FF', active: this.platformStatus.kalshi },
      { key: 'opinion', label: 'OP', color: '#FFD700', active: this.platformStatus.opinion },
    ]

    platforms.forEach((p, i) => {
      const x = width / 2 - 100 + i * 100
      const y = height / 2 - 30
      const dot = this.add.text(x - 16, y, p.active ? '●' : '○', {
        fontSize: '12px',
        color: p.active ? p.color : '#444444',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setDepth(6)
      const label = this.add.text(x + 2, y, p.label, {
        fontSize: '11px',
        color: p.active ? p.color : '#555555',
        fontFamily: 'monospace',
      }).setOrigin(0, 0.5).setDepth(6)
      this.statusGroup.add(dot)
      this.statusGroup.add(label)
    })
  }

  private spawnFloatingCoins() {
    const { width, height } = this.scale
    const coinKeys = ['coin_pm', 'coin_ks', 'coin_op']
    for (let i = 0; i < 8; i++) {
      const key = coinKeys[i % 3]
      let coin: Phaser.GameObjects.Image
      try {
        coin = this.add.image(
          Math.random() * width,
          Math.random() * height,
          key
        ).setDisplaySize(20, 20).setAlpha(0.3).setDepth(3)
      } catch {
        continue
      }
      this.floatingCoins.push({
        obj: coin,
        vy: -0.3 - Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 0.3,
      })
    }
  }

  private createRunnerPreview() {
    const { height } = this.scale
    const groundY = height - 60
    // Ground line
    this.add.rectangle(400, groundY + 16, 800, 32, 0x5DBB4A, 1).setDepth(4)
    this.add.rectangle(400, groundY + 32, 800, 16, 0x7B5726, 1).setDepth(4)

    // Animated runner
    const runnerX = 150
    try {
      const runner = this.add.image(runnerX, groundY - 8, 'runner_1').setDisplaySize(32, 48).setDepth(7)
      let frame = 0
      this.time.addEvent({
        delay: 150,
        loop: true,
        callback: () => {
          frame = (frame + 1) % 3
          try {
            runner.setTexture(['runner_0', 'runner_1', 'runner_2'][frame])
          } catch { /* */ }
        },
      })
    } catch { /* */ }
  }

  private showHighScore() {
    try {
      const raw = localStorage.getItem('market_runner_leaderboard')
      if (raw) {
        const entries = JSON.parse(raw)
        if (entries.length > 0) {
          const best = entries[0].score
          this.add.text(this.scale.width / 2, this.scale.height - 40, `BEST SCORE: ${best.toLocaleString()}`, {
            fontSize: '12px',
            color: '#FFDD44',
            fontFamily: 'monospace',
          }).setOrigin(0.5).setDepth(6)
        }
      }
    } catch { /* */ }
  }

  update(_time: number, delta: number) {
    // Float coins
    this.floatingCoins.forEach(fc => {
      if (!fc.obj.active) return
      fc.obj.y += fc.vy * delta * 0.1
      fc.obj.x += fc.vx * delta * 0.1
      fc.obj.rotation += 0.01
      if (fc.obj.y < -30) {
        fc.obj.y = this.scale.height + 20
        fc.obj.x = Math.random() * this.scale.width
      }
    })
  }

  private async checkAPIs() {
    const results = await Promise.allSettled([
      fetch('/api/polymarket?endpoint=events&limit=1').then(r => r.ok),
      fetch('/api/kalshi?endpoint=events&limit=1').then(r => r.ok),
      fetch('/api/opinion?endpoint=topic&limit=1').then(r => r.ok),
    ])
    this.platformStatus = {
      polymarket: results[0].status === 'fulfilled' && (results[0] as PromiseFulfilledResult<boolean>).value,
      kalshi: results[1].status === 'fulfilled' && (results[1] as PromiseFulfilledResult<boolean>).value,
      opinion: results[2].status === 'fulfilled' && (results[2] as PromiseFulfilledResult<boolean>).value,
    }
    this.drawPlatformStatus()
  }

  private startGame() {
    this.floatingCoins.forEach(fc => fc.obj.destroy())
    this.floatingCoins = []
    this.scene.start('GameScene', { platformStatus: this.platformStatus })
  }
}
