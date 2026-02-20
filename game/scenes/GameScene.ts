import Phaser from 'phaser'
import { PredictionService } from '../systems/PredictionService'
import type { AggregatedTrend, UnifiedMarket } from '../types/market'

// Canvas 800x500
const GROUND_Y = 440
const RUNNER_X = 130
const BASE_SPEED = 320
const COIN_CHANCE = 0.018   // per frame — ~1 coin/3s at 60fps

// Obstacle chunk system — pre-designed passable patterns
type SpawnHeight = 'low' | 'mid' | 'high'
interface ScheduledSpawn { time: number; type: 'bird' | 'spike' | 'cloud' | 'stalactite'; height?: SpawnHeight }
interface ChunkItem { type: 'bird' | 'spike' | 'cloud' | 'stalactite'; delay: number; height?: SpawnHeight }

// Each chunk is guaranteed passable:
// spike → player jumps over
// bird/low → player ducks under (low = GROUND_Y-80, player hitbox duck = GROUND_Y-26)
// bird/mid → player jumps over
// bird/high → player runs under
// cloud/high → player runs or jumps under
const OBSTACLE_CHUNKS: ChunkItem[][] = [
  [{ type: 'spike', delay: 0 }],
  [{ type: 'spike', delay: 0 }, { type: 'spike', delay: 700 }],
  [{ type: 'bird', delay: 0, height: 'mid' }],
  [{ type: 'bird', delay: 0, height: 'low' }],
  [{ type: 'bird', delay: 0, height: 'high' }, { type: 'spike', delay: 700 }],
  [{ type: 'spike', delay: 0 }, { type: 'cloud', delay: 900, height: 'high' }],
  [{ type: 'spike', delay: 0 }, { type: 'spike', delay: 620 }, { type: 'spike', delay: 1250 }],
  [{ type: 'cloud', delay: 0, height: 'high' }, { type: 'spike', delay: 950 }],
  // Stalactite (hangs from above) — 'low' requires duck, 'high' can run under
  [{ type: 'stalactite', delay: 0, height: 'high' }],
  [{ type: 'stalactite', delay: 0, height: 'low' }],
  [{ type: 'stalactite', delay: 0, height: 'low' }, { type: 'spike', delay: 900 }],
]

interface CoinObj extends Phaser.Physics.Arcade.Image {
  marketData?: UnifiedMarket
  labelText?: Phaser.GameObjects.Text
  baseY?: number
}

interface ObstacleObj extends Phaser.Physics.Arcade.Image {
  obstacleType?: 'bird' | 'spike' | 'cloud' | 'stalactite'
  sineBase?: number
  labelText?: Phaser.GameObjects.Text
  wingTimer?: Phaser.Time.TimerEvent
}

export class GameScene extends Phaser.Scene {
  // Physics
  private runner!: Phaser.Physics.Arcade.Image
  private runnerGfx!: Phaser.GameObjects.Image
  private grounds!: Phaser.Physics.Arcade.StaticGroup
  private obstacles!: Phaser.Physics.Arcade.Group
  private coins!: Phaser.Physics.Arcade.Group

  // Particles
  private coinParticles!: Phaser.GameObjects.Particles.ParticleEmitter
  private deathParticles!: Phaser.GameObjects.Particles.ParticleEmitter

  // Input
  private jumpKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private spaceKey!: Phaser.Input.Keyboard.Key

  // State
  private isDead = false
  private isOnGround = false
  private isDucking = false
  private runFrame = 0
  private runFrameTimer = 0
  private score = 0
  private distanceScore = 0
  private coinBonus = 0
  private multiplier = 1.0
  private platformsCollected = new Set<string>()
  private currentSpeed = BASE_SPEED
  private gameTime = 0
  private jumpCount = 0 // double jump support

  // Chunk spawning
  private spawnSchedule: ScheduledSpawn[] = []
  private nextChunkTime = 3500  // ms — first chunk spawns after 3.5s

  // Shared AudioContext (reused across all sounds)
  private audioCtx: AudioContext | null = null

  // API health status dots in HUD
  private statusDots: { pm: Phaser.GameObjects.Arc; ks: Phaser.GameObjects.Arc; op: Phaser.GameObjects.Arc } | null = null

  // HUD
  private scoreText!: Phaser.GameObjects.Text
  private multiplierText!: Phaser.GameObjects.Text
  private tickerText!: Phaser.GameObjects.Text
  private themeLabel!: Phaser.GameObjects.Text
  private distBar!: Phaser.GameObjects.Rectangle

  // Background layers
  private bgImage!: Phaser.GameObjects.Image
  private starsImage!: Phaser.GameObjects.Image
  private celestial!: Phaser.GameObjects.Image
  private mountainGroup!: Phaser.GameObjects.Group
  private treeGroup!: Phaser.GameObjects.Group
  private currentTheme: AggregatedTrend['theme'] = 'sunny'
  private rainDrops: Phaser.GameObjects.Rectangle[] = []
  private lightningTimer = 0

  // Pit system
  private pitActive = false
  private pitLeft = 0
  private pitRight = 0
  private nextPitTime = 15000
  private pitWarning: Phaser.GameObjects.Text | null = null

  // API
  private predService!: PredictionService
  private lastTrend: AggregatedTrend | null = null
  private collectedCoins: UnifiedMarket[] = []

  // Scanline overlay
  private scanlineOverlay!: Phaser.GameObjects.Graphics

  constructor() {
    super({ key: 'GameScene' })
  }

  create() {
    // ─── Reset all state for clean restart (Phaser reuses scene instance) ─
    this.isDead = false
    this.isOnGround = false
    this.isDucking = false
    this.runFrame = 0
    this.runFrameTimer = 0
    this.score = 0
    this.distanceScore = 0
    this.coinBonus = 0
    this.multiplier = 1.0
    this.platformsCollected = new Set<string>()
    this.currentSpeed = BASE_SPEED
    this.gameTime = 0
    this.jumpCount = 0
    this.spawnSchedule = []
    this.nextChunkTime = 3500
    this.collectedCoins = []
    this.currentTheme = 'sunny'
    this.rainDrops = []
    this.lightningTimer = 0
    this.pitActive = false
    this.pitLeft = 0
    this.pitRight = 0
    this.nextPitTime = 15000
    this.pitWarning = null

    const { width, height } = this.scale

    // ─── Background layers ───────────────────────────────────────────
    this.bgImage = this.add.image(width / 2, height / 2, 'bg_sunny')
      .setDisplaySize(width, height).setDepth(0)

    // Stars (for dark/stormy - hidden initially)
    try {
      this.starsImage = this.add.image(0, 0, 'stars').setOrigin(0, 0).setDepth(1).setAlpha(0)
    } catch { /* */ }

    // Celestial body
    this.celestial = this.add.image(width - 80, 50, 'sun').setDepth(2)

    // Mountains (parallax)
    this.mountainGroup = this.add.group()
    for (let i = 0; i < 5; i++) {
      try {
        const m = this.add.image(i * 200 + 100, GROUND_Y - 60, 'mountain')
          .setDepth(3).setAlpha(0.5).setScale(0.8)
        this.mountainGroup.add(m)
      } catch { /* */ }
    }

    // Trees (parallax)
    this.treeGroup = this.add.group()
    for (let i = 0; i < 14; i++) {
      try {
        const t = this.add.image(i * 65 + 30, GROUND_Y - 4, 'tree')
          .setDepth(5).setScale(0.9)
        this.treeGroup.add(t)
      } catch { /* */ }
    }

    // ─── Scanline overlay ────────────────────────────────────────────
    this.scanlineOverlay = this.add.graphics().setDepth(100).setAlpha(0.04)
    for (let y = 0; y < height; y += 4) {
      this.scanlineOverlay.fillStyle(0x000000, 1)
      this.scanlineOverlay.fillRect(0, y, width, 2)
    }

    // ─── Ground ──────────────────────────────────────────────────────
    this.grounds = this.physics.add.staticGroup()
    const tileW = 64, numTiles = Math.ceil(width / tileW) + 3
    for (let i = 0; i < numTiles; i++) {
      const tile = this.grounds.create(i * tileW + tileW / 2, GROUND_Y + 16, 'ground') as Phaser.Physics.Arcade.Image
      tile.setDisplaySize(tileW, 32).refreshBody()
    }

    // ─── Runner ──────────────────────────────────────────────────────
    // Invisible physics body
    this.runner = this.physics.add.image(RUNNER_X, GROUND_Y - 28, 'runner_0')
      .setDisplaySize(28, 48)
      .setAlpha(0) // invisible physics body
      .setDepth(10)

    const body = this.runner.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 44).setOffset(4, 2)

    // Visible runner graphic
    this.runnerGfx = this.add.image(RUNNER_X, GROUND_Y - 28, 'runner_0')
      .setDisplaySize(32, 48).setDepth(11)

    this.physics.add.collider(this.runner, this.grounds, () => {
      const wasInAir = !this.isOnGround
      this.isOnGround = true
      if (wasInAir && this.jumpCount > 0 && !this.isDucking) {
        // Micro-shake on landing for game feel
        this.cameras.main.shake(60, 0.003)
        // Landing squash
        this.tweens.add({
          targets: this.runnerGfx,
          displayWidth: 38,
          displayHeight: 36,
          duration: 50,
          yoyo: true,
          ease: 'Cubic.Out',
        })
      }
      this.jumpCount = 0
    })

    // ─── Particles ───────────────────────────────────────────────────
    try {
      this.coinParticles = this.add.particles(0, 0, 'particle_gold', {
        speed: { min: 60, max: 160 },
        scale: { start: 1.2, end: 0 },
        lifespan: 600,
        quantity: 0,
        angle: { min: 240, max: 300 },
        gravityY: 200,
        emitting: false,
      }).setDepth(30)

      this.deathParticles = this.add.particles(0, 0, 'particle_red', {
        speed: { min: 80, max: 200 },
        scale: { start: 1.5, end: 0 },
        lifespan: 800,
        quantity: 0,
        gravityY: 300,
        emitting: false,
      }).setDepth(30)
    } catch { /* particles not critical */ }

    // ─── Obstacles + Coins groups ─────────────────────────────────────
    this.obstacles = this.physics.add.group()
    this.physics.add.overlap(this.runner, this.obstacles, () => this.handleDeath())

    this.coins = this.physics.add.group()
    this.physics.add.overlap(this.runner, this.coins, (_, coin) => {
      this.collectCoin(coin as CoinObj)
    })

    // ─── Input ────────────────────────────────────────────────────────
    this.jumpKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP)
    this.downKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN)
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)

    // Event-driven jump — fires the instant key is pressed (no polling lag)
    this.spaceKey.on('down', () => this.doJump())
    this.jumpKey.on('down', () => this.doJump())

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y < this.scale.height * 0.65) this.doJump()
      else this.startDuck()
    })
    this.input.on('pointerup', () => this.endDuck())

    // ─── HUD ──────────────────────────────────────────────────────────
    this.createHUD()

    // ─── Prediction Service ───────────────────────────────────────────
    this.predService = new PredictionService()
    this.predService.onTrendUpdate(trend => this.applyTrend(trend))
    this.predService.start()

    // ─── Initial background (sunny until data arrives) ────────────────
    this.applyThemeVisuals('sunny', false)
  }

  // ════════════════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════════════════
  update(time: number, delta: number) {
    if (this.isDead) return

    this.gameTime += delta
    const dt = delta / 1000

    // Speed ramp
    this.currentSpeed = Math.min(
      BASE_SPEED * 2.5,
      (BASE_SPEED + this.gameTime / 80) * (this.lastTrend?.speedMultiplier || 1)
    )

    // Check ground contact
    const body = this.runner.body as Phaser.Physics.Arcade.Body
    if (body.blocked.down) {
      this.isOnGround = true
      this.jumpCount = 0
    }

    // ── Input ── (jump handled by event listener in create() for zero lag)
    if (this.downKey.isDown) this.startDuck()
    else this.endDuck()

    // ── Animate runner ──
    this.runnerGfx.x = this.runner.x
    this.runnerGfx.y = this.runner.y
    if (!this.isOnGround) {
      this.runnerGfx.setTexture(this.isDucking ? 'runner_duck' : 'runner_1')
    } else {
      this.runFrameTimer += delta
      if (this.runFrameTimer > 120) {
        this.runFrame = (this.runFrame + 1) % 3
        this.runFrameTimer = 0
      }
      const tex = this.isDucking ? 'runner_duck' : ['runner_0', 'runner_1', 'runner_2'][this.runFrame]
      this.runnerGfx.setTexture(tex)
    }
    // Display size update handled in startDuck/endDuck, not every frame

    // ── Distance score ──
    this.distanceScore += dt * this.currentSpeed / 8
    this.score = Math.floor(this.distanceScore + this.coinBonus * this.multiplier)
    this.scoreText.setText(`${this.score.toLocaleString()}`)

    // ── Scroll ground tiles + pit management ──
    if (this.pitActive) {
      this.pitLeft -= this.currentSpeed * dt
      this.pitRight -= this.currentSpeed * dt
      if (this.pitRight < -100) this.pitActive = false
    }
    if (this.pitWarning?.active) {
      this.pitWarning.x = this.pitLeft - 20
      if (this.pitLeft < -80) { this.pitWarning.destroy(); this.pitWarning = null }
    }
    this.grounds.children.iterate((child) => {
      const tile = child as Phaser.Physics.Arcade.Image
      tile.x -= this.currentSpeed * dt
      if (tile.x < -32) tile.x += Math.ceil(this.scale.width / 64 + 3) * 64
      // Hide/disable tiles inside pit zone
      const body = tile.body as Phaser.Physics.Arcade.StaticBody
      if (this.pitActive && tile.x > this.pitLeft && tile.x < this.pitRight) {
        tile.setAlpha(0)
        body.enable = false
      } else if (!body.enable || tile.alpha < 1) {
        tile.setAlpha(1)
        body.enable = true
      }
      tile.refreshBody()
      return null
    })

    // ── Scroll parallax mountains ──
    this.mountainGroup.children.iterate((child) => {
      const m = child as Phaser.GameObjects.Image
      m.x -= this.currentSpeed * dt * 0.2
      if (m.x < -100) m.x += this.scale.width + 200
      return null
    })

    // ── Scroll parallax trees ──
    this.treeGroup.children.iterate((child) => {
      const t = child as Phaser.GameObjects.Image
      t.x -= this.currentSpeed * dt * 0.6
      if (t.x < -30) t.x += this.scale.width + 60
      return null
    })

    // ── Chunk-based obstacle spawning ──
    // Process any spawns whose time has arrived
    const dueNow = this.spawnSchedule.filter(s => s.time <= this.gameTime)
    this.spawnSchedule = this.spawnSchedule.filter(s => s.time > this.gameTime)
    for (const spawn of dueNow) {
      this.spawnObstacleFromSchedule(spawn.type, spawn.height)
    }
    // Schedule next chunk when queue drains and enough time has passed
    if (this.spawnSchedule.length === 0 && this.gameTime >= this.nextChunkTime) {
      this.scheduleNextChunk()
    }

    // ── Spawn coins ──
    if (Math.random() < COIN_CHANCE) {
      this.spawnCoin()
    }

    // ── Move/cleanup obstacles ──
    this.obstacles.children.iterate((child) => {
      const obs = child as ObstacleObj
      if (!obs || !obs.active) return null   // guard: destroyed in same frame

      obs.x -= this.currentSpeed * dt * 1.05

      if (obs.obstacleType === 'bird') {
        obs.y = (obs.sineBase || GROUND_Y - 120) + Math.sin(time * 0.003 + obs.x * 0.005) * 28
      }

      if (obs.labelText) {
        obs.labelText.x = obs.x
        obs.labelText.y = obs.y - 24
      }

      if (obs.x < -80) {
        obs.wingTimer?.remove()
        obs.labelText?.destroy()
        obs.destroy()
      }
      return null
    })

    // ── Move/cleanup coins ──
    this.coins.children.iterate((child) => {
      const coin = child as CoinObj
      if (!coin || !coin.active) return null  // guard: collectCoin() may destroy mid-frame

      coin.x -= this.currentSpeed * dt * 0.92

      // Float animation
      coin.y = (coin.baseY || GROUND_Y - 80) + Math.sin(time * 0.005 + coin.x * 0.008) * 10
      coin.rotation += dt * 2

      if (coin.labelText) {
        coin.labelText.x = coin.x
        coin.labelText.y = coin.y - 22
      }

      if (coin.x < -60) {
        coin.labelText?.destroy()
        coin.destroy()
      }
      return null
    })

    // ── Pit fall death + spawn trigger ──
    if (this.runner.y > GROUND_Y + 80) this.handleDeath()
    if (!this.pitActive && this.gameTime >= this.nextPitTime) this.spawnPit()

    // ── Weather effects ──
    if (this.currentTheme === 'rainy' || this.currentTheme === 'stormy') {
      this.updateRain(delta)
    }
    if (this.currentTheme === 'stormy') {
      this.lightningTimer -= delta
      if (this.lightningTimer < 0) {
        this.lightningTimer = 3000 + Math.random() * 4000
        this.cameras.main.flash(80, 220, 220, 255, true)
        this.cameras.main.shake(120, 0.004)
      }
    }

    // ── Ticker update every 3s ──
    if (this.lastTrend && Math.floor(time / 3000) !== Math.floor((time - delta) / 3000)) {
      this.updateTicker()
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // ACTIONS
  // ════════════════════════════════════════════════════════════════════
  private doJump() {
    if (this.isDead) return
    // Allow jump when on ground OR one double jump
    if (this.jumpCount >= 2) return

    const body = this.runner.body as Phaser.Physics.Arcade.Body
    const jumpVel = this.jumpCount === 0 ? -620 : -480 // double jump weaker
    body.setVelocityY(jumpVel)
    this.isOnGround = false
    this.jumpCount++

    // Visual squash & stretch
    this.tweens.add({
      targets: this.runnerGfx,
      scaleY: 1.3,
      scaleX: 0.8,
      duration: 80,
      yoyo: true,
      ease: 'Bounce',
    })

    this.playJumpSound()
  }

  private startDuck() {
    if (this.isDucking) return
    this.isDucking = true
    const body = this.runner.body as Phaser.Physics.Arcade.Body
    // Keep bottom of hitbox fixed — sprite top = GROUND_Y-52
    // Normal: size(20,44) offset(4,2)  → bottom = (GROUND_Y-52)+2+44 = GROUND_Y-6
    // Duck:   size(24,26) offset(4,20) → bottom = (GROUND_Y-52)+20+26 = GROUND_Y-6 ✓
    body.setSize(24, 26).setOffset(4, 20)
    this.runnerGfx.setDisplaySize(32, 48) // start from full size for tween
    // Squash effect: widen & flatten (8-bit duck)
    this.tweens.add({
      targets: this.runnerGfx,
      displayWidth: 40,
      displayHeight: 28,
      duration: 70,
      ease: 'Cubic.Out',
    })
  }

  private endDuck() {
    if (!this.isDucking) return
    this.isDucking = false
    const body = this.runner.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 44).setOffset(4, 2)
    // Stretch back: vertical pop when standing up
    this.tweens.add({
      targets: this.runnerGfx,
      displayWidth: 24,
      displayHeight: 56,
      duration: 60,
      ease: 'Back.Out',
      onComplete: () => {
        this.tweens.add({
          targets: this.runnerGfx,
          displayWidth: 32,
          displayHeight: 48,
          duration: 80,
          ease: 'Cubic.InOut',
        })
      },
    })
  }

  // ════════════════════════════════════════════════════════════════════
  // SPAWN — CHUNK SYSTEM
  // ════════════════════════════════════════════════════════════════════
  private scheduleNextChunk() {
    // Gap between chunks shrinks with speed but stays fair (min 1.6s)
    const speedRatio = this.currentSpeed / BASE_SPEED
    const gapMs = Math.max(1600, Math.round(3200 - speedRatio * 600))

    const startTime = this.gameTime + gapMs

    // Difficulty 0–1 over first 90s — unlock harder chunks gradually
    const difficulty = Math.min(1, this.gameTime / 90_000)
    const maxChunkIdx = Math.max(1, Math.floor(difficulty * OBSTACLE_CHUNKS.length))
    const chunkIdx = Math.floor(Math.random() * maxChunkIdx)
    const chunk = OBSTACLE_CHUNKS[chunkIdx]

    for (const item of chunk) {
      this.spawnSchedule.push({ time: startTime + item.delay, type: item.type, height: item.height })
    }

    // Next chunk allowed after last item in this chunk + gap
    const lastDelay = Math.max(...chunk.map(i => i.delay))
    this.nextChunkTime = startTime + lastDelay + gapMs
  }

  private spawnObstacleFromSchedule(type: 'bird' | 'spike' | 'cloud' | 'stalactite', height?: SpawnHeight) {
    const { width } = this.scale
    let obs: ObstacleObj

    if (type === 'bird') {
      // height mapping: low=duck-required, mid=jump-required, high=run-under
      const birdY = height === 'low'
        ? GROUND_Y - 72       // duck required (body top at ~GROUND_Y-72)
        : height === 'mid'
          ? GROUND_Y - 130    // must jump over
          : GROUND_Y - 175    // can run under safely

      obs = this.obstacles.create(width + 60, birdY, 'bird_0') as ObstacleObj
      obs.setDisplaySize(48, 28)
      obs.obstacleType = 'bird'
      obs.sineBase = birdY
      let wingFrame = 0
      obs.wingTimer = this.time.addEvent({
        delay: 220, loop: true,
        callback: () => {
          if (!obs.active) return
          wingFrame = (wingFrame + 1) % 2
          try { obs.setTexture(wingFrame === 0 ? 'bird_0' : 'bird_1') } catch { /* */ }
        },
      })
      const label = this.add.text(width + 60, birdY - 20,
        height === 'low' ? 'DUCK!' : height === 'high' ? '' : 'JUMP!', {
        fontSize: '8px', color: '#FF8888', fontFamily: 'monospace',
        backgroundColor: '#00000088', padding: { x: 2, y: 1 },
      }).setOrigin(0.5).setDepth(20)
      obs.labelText = label

    } else if (type === 'spike') {
      obs = this.obstacles.create(width + 40, GROUND_Y - 16, 'spike') as ObstacleObj
      obs.setDisplaySize(24, 44)
      obs.obstacleType = 'spike'

    } else if (type === 'stalactite') {
      // Rotated spike hanging from above
      // 'low': tip at GROUND_Y-42 (duck required), center y = GROUND_Y-64
      // 'high': tip at GROUND_Y-86 (run under safely), center y = GROUND_Y-108
      const stalY = height === 'low' ? GROUND_Y - 64 : GROUND_Y - 108
      obs = this.obstacles.create(width + 40, stalY, 'spike') as ObstacleObj
      obs.setDisplaySize(24, 44).setAngle(180)  // flip — points downward
      obs.obstacleType = 'stalactite'

      if (height === 'low') {
        const label = this.add.text(width + 40, stalY - 28, 'DUCK!', {
          fontSize: '8px', color: '#FF8888', fontFamily: 'monospace',
          backgroundColor: '#00000088', padding: { x: 2, y: 1 },
        }).setOrigin(0.5).setDepth(20)
        obs.labelText = label
      }

    } else {
      const cloudY = height === 'high' ? GROUND_Y - 180 : GROUND_Y - 145
      obs = this.obstacles.create(width + 60, cloudY, 'cloud_obs') as ObstacleObj
      obs.setDisplaySize(64, 40)
      obs.obstacleType = 'cloud'
    }

    const obsBody = obs.body as Phaser.Physics.Arcade.Body
    obsBody.setAllowGravity(false)
    obsBody.setImmovable(true)
    obs.setDepth(8)
  }


  private spawnCoin() {
    const { width } = this.scale
    if (!this.predService) return

    const markets = this.predService.getRandomCoins(1)
    if (markets.length === 0) return

    const market = markets[0]
    const texKey = market.platform === 'polymarket' ? 'coin_pm' :
                   market.platform === 'kalshi' ? 'coin_ks' : 'coin_op'

    // Randomize coin height
    const coinBaseY = GROUND_Y - 70 - Math.random() * 100

    let coin: CoinObj
    try {
      coin = this.coins.create(width + 40, coinBaseY, texKey) as CoinObj
    } catch {
      return
    }
    coin.setDisplaySize(28, 28)
    coin.marketData = market
    coin.baseY = coinBaseY
    const coinBody = coin.body as Phaser.Physics.Arcade.Body
    coinBody.setAllowGravity(false)
    coinBody.setImmovable(true)
    coin.setDepth(9)

    // Label
    const pct = Math.round(market.yesPrice * 100)
    const platformSymbol = market.platform === 'polymarket' ? '🔵' : market.platform === 'kalshi' ? '🟣' : '🟡'
    const label = this.add.text(width + 40, coinBaseY - 20, `${market.shortTitle.substring(0, 10)}\n${pct}%`, {
      fontSize: '8px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      backgroundColor: '#000000AA',
      padding: { x: 3, y: 1 },
      align: 'center',
    }).setOrigin(0.5).setDepth(15)
    coin.labelText = label

    // Spawn multiple coins in a row sometimes
    if (Math.random() < 0.35) {
      this.time.delayedCall(300 + Math.random() * 200, () => this.spawnCoin())
    }
  }

  private spawnPit() {
    const pitW = 96 + Math.random() * 64  // 1.5 – 2.5 tile widths
    this.pitLeft = this.scale.width + 40
    this.pitRight = this.pitLeft + pitW
    this.pitActive = true
    // Gap between pits shrinks slightly with time (min 8s)
    this.nextPitTime = this.gameTime + Math.max(8000, 14000 - this.gameTime / 200)

    // Warning sign shown just before the pit edge
    if (this.pitWarning) this.pitWarning.destroy()
    this.pitWarning = this.add.text(this.scale.width + 80, GROUND_Y - 22, '▼ PIT', {
      fontSize: '9px', color: '#FF4444', fontFamily: 'monospace',
      backgroundColor: '#000000AA', padding: { x: 3, y: 1 },
    }).setOrigin(0.5).setDepth(20)
  }

  private collectCoin(coin: CoinObj) {
    if (!coin.active) return

    const market = coin.marketData
    if (market) {
      this.platformsCollected.add(market.platform)
      const pts = 10 + Math.round(market.yesPrice * 30)
      this.coinBonus += pts

      // Multiplier scales with unique platforms collected
      this.multiplier = 1 + (this.platformsCollected.size - 1) * 0.75
      this.multiplierText.setText(`×${this.multiplier.toFixed(1)}`)

      this.collectedCoins.push(market)

      // Particles
      try {
        this.coinParticles.setPosition(coin.x, coin.y)
        this.coinParticles.explode(12)
      } catch { /* */ }

      // Flash + score popup
      this.cameras.main.flash(40, 255, 220, 50, true)
      const popup = this.add.text(coin.x, coin.y - 16, `+${pts}`, {
        fontSize: '16px',
        color: '#FFD700',
        fontFamily: 'monospace',
        stroke: '#000000',
        strokeThickness: 3,
      }).setDepth(25).setOrigin(0.5)
      this.tweens.add({
        targets: popup,
        y: popup.y - 50,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.Out',
        onComplete: () => popup.destroy(),
      })

      // Multiplier pulse
      if (this.platformsCollected.size > 1) {
        this.tweens.add({
          targets: this.multiplierText,
          scale: 1.4,
          duration: 150,
          yoyo: true,
          ease: 'Back',
        })
      }

      this.playCoinSound()
    }

    coin.labelText?.destroy()
    coin.destroy()
  }

  // ════════════════════════════════════════════════════════════════════
  // HUD
  // ════════════════════════════════════════════════════════════════════
  private createHUD() {
    const { width } = this.scale

    // Top HUD bar background
    this.add.rectangle(width / 2, 18, width, 36, 0x000000, 0.8).setDepth(90)
    // Bottom edge accent
    this.add.rectangle(width / 2, 36, width, 2, 0x333333, 1).setDepth(91)

    // Ticker
    this.tickerText = this.add.text(8, 5, 'Fetching market data...', {
      fontSize: '10px',
      color: '#00FF88',
      fontFamily: 'monospace',
    }).setDepth(92)

    // Score (right side)
    this.add.text(width - 8, 4, 'SCORE', {
      fontSize: '8px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(92)

    this.scoreText = this.add.text(width - 8, 14, '0', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(92)

    // Multiplier
    this.multiplierText = this.add.text(width - 8, 30, '×1.0', {
      fontSize: '10px',
      color: '#FFDD00',
      fontFamily: 'monospace',
    }).setOrigin(1, 0).setDepth(92)

    // Theme/speed indicator
    this.themeLabel = this.add.text(8, this.scale.height - 20, '', {
      fontSize: '9px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setDepth(92).setAlpha(0.8)

    // Platform status indicators — label + live dot
    // Each dot: gray=stale, green=ok, red=error
    const dotY = 18
    const { width: w } = this.scale
    const platforms = [
      { x: w / 2 - 52, label: 'PM' },
      { x: w / 2,      label: 'KS' },
      { x: w / 2 + 52, label: 'OP' },
    ]
    platforms.forEach(({ x, label }) => {
      this.add.text(x - 14, 10, label, { fontSize: '8px', color: '#555555', fontFamily: 'monospace' }).setDepth(92)
    })
    // Dots (circles) — stored for live color updates
    const pmDot = this.add.circle(w / 2 - 44, dotY, 4, 0x555555).setDepth(93)
    const ksDot = this.add.circle(w / 2 + 8, dotY, 4, 0x555555).setDepth(93)
    const opDot = this.add.circle(w / 2 + 60, dotY, 4, 0x555555).setDepth(93)
    this.statusDots = { pm: pmDot, ks: ksDot, op: opDot }
  }

  // ════════════════════════════════════════════════════════════════════
  // THEME
  // ════════════════════════════════════════════════════════════════════
  private applyTrend(trend: AggregatedTrend) {
    this.lastTrend = trend

    if (trend.theme !== this.currentTheme) {
      this.currentTheme = trend.theme
      this.applyThemeVisuals(trend.theme, true)
    }
    this.updateTicker()

    const labels: Record<string, string> = {
      sunny: '☀ Bullish >60%',
      dark: '● Bearish <40%',
      rainy: '~ Volatile ±10%',
      stormy: '⚡ High Vol >$5M',
    }
    this.themeLabel?.setText(labels[trend.theme] || '')

    // Update API health status dots
    if (this.statusDots) {
      const statusColor = (s: import('../types/market').ApiStatus) =>
        s === 'ok' ? 0x00FF88 : s === 'stale' ? 0xFFAA00 : 0xFF3333
      this.statusDots.pm.setFillStyle(statusColor(trend.platformStatus.polymarket))
      this.statusDots.ks.setFillStyle(statusColor(trend.platformStatus.kalshi))
      this.statusDots.op.setFillStyle(statusColor(trend.platformStatus.opinion))
    }
  }

  private applyThemeVisuals(theme: AggregatedTrend['theme'], animated: boolean) {
    const bgKeys: Record<string, string> = {
      sunny: 'bg_sunny',
      dark: 'bg_dark',
      rainy: 'bg_rainy',
      stormy: 'bg_stormy',
    }

    const changeBg = () => {
      try { this.bgImage.setTexture(bgKeys[theme]) } catch { /* */ }
      // Celestial body
      if (theme === 'dark' || theme === 'stormy') {
        try { this.celestial.setTexture('moon') } catch { /* */ }
        this.celestial.setAlpha(0.9)
      } else if (theme === 'sunny') {
        try { this.celestial.setTexture('sun') } catch { /* */ }
        this.celestial.setAlpha(1)
      } else {
        this.celestial.setAlpha(0)
      }
      // Stars
      if (this.starsImage) {
        this.starsImage.setAlpha(theme === 'dark' || theme === 'stormy' ? 0.5 : 0)
      }
    }

    if (animated) {
      this.tweens.add({
        targets: this.bgImage,
        alpha: 0,
        duration: 600,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          changeBg()
          this.tweens.add({ targets: this.bgImage, alpha: 1, duration: 800, ease: 'Sine.easeInOut' })
        },
      })
    } else {
      changeBg()
    }

    // Camera tint for dark themes
    if (theme === 'stormy') {
      this.cameras.main.setBackgroundColor('#000010')
    } else if (theme === 'dark') {
      this.cameras.main.setBackgroundColor('#000000')
    } else {
      this.cameras.main.setBackgroundColor('#4FC3F7')
    }
  }

  private updateTicker() {
    if (!this.lastTrend) return
    const { markets } = this.lastTrend

    const pm = markets.find(m => m.platform === 'polymarket')
    const ks = markets.find(m => m.platform === 'kalshi')
    const op = markets.find(m => m.platform === 'opinion')

    const parts: string[] = []
    if (pm) parts.push(`PM:${pm.shortTitle.substring(0, 10)} ${Math.round(pm.yesPrice * 100)}%`)
    if (ks) parts.push(`KS:${ks.shortTitle.substring(0, 10)} ${Math.round(ks.yesPrice * 100)}%`)
    if (op) parts.push(`OP:${op.shortTitle.substring(0, 10)} ${Math.round(op.yesPrice * 100)}%`)

    if (parts.length > 0) {
      this.tickerText?.setText(parts.join('   ') + '   ')
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // RAIN
  // ════════════════════════════════════════════════════════════════════
  private updateRain(delta: number) {
    const { width, height } = this.scale
    if (Math.random() < 0.5) {
      const drop = this.add.rectangle(
        Math.random() * width, -10, 2, 12, 0x7799BB, 0.6
      ).setDepth(60)
      this.rainDrops.push(drop)
    }

    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const d = this.rainDrops[i]
      d.y += 450 * delta / 1000
      d.x -= 80 * delta / 1000
      if (d.y > height + 10) {
        d.destroy()
        this.rainDrops.splice(i, 1)
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // DEATH
  // ════════════════════════════════════════════════════════════════════
  private handleDeath() {
    if (this.isDead) return
    this.isDead = true

    this.predService.stop()

    // Death effects
    this.cameras.main.shake(350, 0.025)
    this.cameras.main.flash(120, 255, 50, 50, true)

    try {
      this.deathParticles.setPosition(this.runner.x, this.runner.y)
      this.deathParticles.explode(20)
    } catch { /* */ }

    // Runner tumble
    this.tweens.add({
      targets: this.runnerGfx,
      y: this.runner.y + 80,
      rotation: Math.PI * 2,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.In',
    })

    // Freeze all motion
    this.currentSpeed = 0

    this.time.delayedCall(900, () => {
      this.cleanup()
      this.scene.start('GameOverScene', {
        score: this.score,
        multiplier: this.multiplier,
        platformsCollected: Array.from(this.platformsCollected),
        collectedCoins: this.collectedCoins,
        trend: this.lastTrend,
        platformStats: {
          polymarket: this.collectedCoins.filter(c => c.platform === 'polymarket').length,
          kalshi: this.collectedCoins.filter(c => c.platform === 'kalshi').length,
          opinion: this.collectedCoins.filter(c => c.platform === 'opinion').length,
        },
      })
    })
  }

  // ════════════════════════════════════════════════════════════════════
  // SOUNDS — shared AudioContext (browser auto-play compliant)
  // ════════════════════════════════════════════════════════════════════
  private getAudioCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContext()
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {})
      }
      return this.audioCtx
    } catch { return null }
  }

  private playJumpSound() {
    const ctx = this.getAudioCtx()
    if (!ctx) return
    try {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'square'
      o.frequency.setValueAtTime(280, ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(560, ctx.currentTime + 0.1)
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      o.start(); o.stop(ctx.currentTime + 0.18)
    } catch { /* */ }
  }

  private playCoinSound() {
    const ctx = this.getAudioCtx()
    if (!ctx) return
    try {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = 'square'
      o.frequency.setValueAtTime(660, ctx.currentTime)
      o.frequency.setValueAtTime(880, ctx.currentTime + 0.06)
      o.frequency.setValueAtTime(1320, ctx.currentTime + 0.1)
      g.gain.setValueAtTime(0.07, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      o.start(); o.stop(ctx.currentTime + 0.2)
    } catch { /* */ }
  }

  // ════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ════════════════════════════════════════════════════════════════════
  private cleanup() {
    this.pitWarning?.destroy()
    this.pitWarning = null
    this.rainDrops.forEach(d => d.destroy())
    this.rainDrops = []
    this.obstacles.children.iterate((child) => {
      const obs = child as ObstacleObj
      obs.labelText?.destroy()
      return null
    })
    this.coins.children.iterate((child) => {
      const coin = child as CoinObj
      coin.labelText?.destroy()
      return null
    })
  }

  shutdown() {
    this.predService?.stop()
    this.cleanup()
    // Close shared AudioContext to free browser resources
    this.audioCtx?.close().catch(() => {})
    this.audioCtx = null
  }
}
