import Phaser from 'phaser'

// Canvas is 800x500, GROUND_Y=440
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  preload() {
    this.generateAllAssets()
  }

  private generateAllAssets() {
    this.genGround()
    this.genRunner()
    this.genBird()
    this.genSpike()
    this.genCloud()
    this.genCoins()
    this.genBackgrounds()
    this.genParticle()
    this.genSun()
    this.genMoon()
    this.genRaindrop()
    this.genLightning()
    this.genMountain()
    this.genTree()
    this.genCityBuilding()
  }

  private genGround() {
    const g = this.make.graphics({ x: 0, y: 0 })
    // Top dirt strip
    g.fillStyle(0xC4A35A, 1)
    g.fillRect(0, 0, 64, 12)
    // Underground
    g.fillStyle(0x7B5726, 1)
    g.fillRect(0, 12, 64, 20)
    // Grass blade pattern
    g.fillStyle(0x5DBB4A, 1)
    g.fillRect(0, 0, 64, 6)
    // Texture dots
    g.fillStyle(0x9B7A3A, 0.7)
    for (let x = 0; x < 64; x += 10) {
      g.fillRect(x + 3, 14, 3, 3)
      g.fillRect(x + 7, 18, 2, 2)
    }
    g.generateTexture('ground', 64, 32)
    g.destroy()
  }

  private genRunner() {
    // 4 frames: idle, run1, run2, duck
    // Each frame 32x48px
    const frameW = 32, frameH = 48, numFrames = 4
    const rt = this.add.renderTexture(0, 0, frameW * numFrames, frameH)
    rt.setVisible(false)

    const drawFrame = (fi: number, isDuck: boolean) => {
      const g = this.make.graphics({ x: 0, y: 0 })
      const ox = fi * frameW
      const bodyY = isDuck ? 20 : 14

      // Shadow
      g.fillStyle(0x000000, 0.3)
      g.fillEllipse(ox + 16, frameH - 4, 24, 6)

      // Legs (animate based on frame)
      g.fillStyle(0x1A1A3E, 1)
      if (!isDuck) {
        const legOffset = fi === 1 ? -6 : fi === 2 ? 6 : 0
        g.fillRect(ox + 10, frameH - 18, 6, 14)
        g.fillRect(ox + 16, frameH - 18 + legOffset, 6, 14)
        // Shoes
        g.fillStyle(0xCC3300, 1)
        g.fillRect(ox + 8, frameH - 8, 10, 8)
        g.fillRect(ox + 14, frameH - 8 + legOffset, 10, 8)
      } else {
        // Duck legs - splayed
        g.fillRect(ox + 6, frameH - 14, 8, 10)
        g.fillRect(ox + 18, frameH - 14, 8, 10)
        g.fillStyle(0xCC3300, 1)
        g.fillRect(ox + 4, frameH - 8, 10, 8)
        g.fillRect(ox + 18, frameH - 8, 10, 8)
      }

      // Body/jacket - blue
      g.fillStyle(0x0055DD, 1)
      if (!isDuck) {
        g.fillRect(ox + 8, bodyY + 8, 16, 20)
      } else {
        g.fillRect(ox + 4, bodyY + 4, 24, 16)
      }

      // Belt
      g.fillStyle(0x8B4513, 1)
      g.fillRect(ox + 8, bodyY + 24, 16, 4)

      // Head
      g.fillStyle(0xFFCCAA, 1)
      if (!isDuck) {
        g.fillRect(ox + 8, bodyY - 14, 16, 16)
      } else {
        g.fillRect(ox + 10, bodyY - 8, 14, 12)
      }

      // Hair
      g.fillStyle(0x3D1C02, 1)
      if (!isDuck) {
        g.fillRect(ox + 8, bodyY - 14, 16, 5)
        g.fillRect(ox + 8, bodyY - 14, 4, 10)
      } else {
        g.fillRect(ox + 10, bodyY - 8, 14, 4)
      }

      // Eye
      g.fillStyle(0x222222, 1)
      if (!isDuck) {
        g.fillRect(ox + 20, bodyY - 8, 4, 4)
      } else {
        g.fillRect(ox + 20, bodyY - 2, 3, 3)
      }

      // Mouth (smile)
      g.fillStyle(0x884422, 1)
      if (!isDuck) {
        g.fillRect(ox + 18, bodyY - 3, 5, 2)
      }

      // Arm
      g.fillStyle(0x0044BB, 1)
      if (!isDuck) {
        const armY = fi === 1 ? bodyY + 10 : bodyY + 14
        g.fillRect(ox + 4, armY, 6, 12)
        g.fillRect(ox + 22, bodyY + 10, 6, 12)
        // Hand
        g.fillStyle(0xFFCCAA, 1)
        g.fillRect(ox + 4, armY + 10, 6, 6)
        g.fillRect(ox + 22, bodyY + 18, 6, 6)
      }

      rt.draw(g, 0, 0)
      g.destroy()
    }

    drawFrame(0, false) // idle
    drawFrame(1, false) // run1
    drawFrame(2, false) // run2
    drawFrame(3, true)  // duck

    // RenderTexture was used as drawing scratch pad — destroy it
    rt.destroy()

    // Generate individual runner textures
    for (let fi = 0; fi < numFrames; fi++) {
      const g = this.make.graphics({ x: 0, y: 0 })
      const isDuck = fi === 3
      const frameH2 = isDuck ? 28 : 48
      const bodyY = isDuck ? 8 : 14

      // Shadow
      g.fillStyle(0x000000, 0.3)
      g.fillEllipse(16, frameH2 - 4, 24, 6)

      // Legs
      g.fillStyle(0x1A1A3E, 1)
      if (!isDuck) {
        const legOffset = fi === 1 ? -5 : fi === 2 ? 5 : 0
        g.fillRect(10, frameH2 - 18, 6, 14)
        g.fillRect(16, frameH2 - 18 + legOffset, 6, 14)
        g.fillStyle(0xCC3300, 1)
        g.fillRect(8, frameH2 - 8, 9, 8)
        g.fillRect(14, frameH2 - 8 + legOffset, 9, 8)
      } else {
        g.fillRect(6, frameH2 - 12, 8, 10)
        g.fillRect(18, frameH2 - 12, 8, 10)
        g.fillStyle(0xCC3300, 1)
        g.fillRect(4, frameH2 - 6, 10, 6)
        g.fillRect(18, frameH2 - 6, 10, 6)
      }

      // Body
      g.fillStyle(0x0055DD, 1)
      if (!isDuck) {
        g.fillRect(8, bodyY + 8, 16, 20)
      } else {
        g.fillRect(4, bodyY + 4, 24, 14)
      }
      // Belt
      g.fillStyle(0x8B4513, 1)
      if (!isDuck) g.fillRect(8, bodyY + 24, 16, 3)

      // Head
      g.fillStyle(0xFFCCAAFF)
      if (!isDuck) {
        g.fillRect(8, bodyY - 14, 16, 16)
        // Hair
        g.fillStyle(0x3D1C02, 1)
        g.fillRect(8, bodyY - 14, 16, 5)
        g.fillRect(8, bodyY - 14, 4, 9)
        // Eye
        g.fillStyle(0x111111, 1)
        g.fillRect(20, bodyY - 8, 3, 3)
        // Cheek
        g.fillStyle(0xFF9999, 0.5)
        g.fillRect(16, bodyY - 5, 4, 3)
      } else {
        g.fillRect(10, bodyY - 8, 14, 12)
        g.fillStyle(0x3D1C02, 1)
        g.fillRect(10, bodyY - 8, 14, 4)
        g.fillStyle(0x111111, 1)
        g.fillRect(20, bodyY - 2, 3, 3)
      }

      // Scarf
      g.fillStyle(0xFF4444, 1)
      if (!isDuck) {
        g.fillRect(8, bodyY + 6, 16, 4)
      }

      const key = ['runner_0', 'runner_1', 'runner_2', 'runner_duck'][fi]
      g.generateTexture(key, 32, frameH2)
      g.destroy()
    }
  }

  private genBird() {
    // Bird frame 0 - wings up (40x28)
    const b0 = this.make.graphics({ x: 0, y: 0 })
    b0.fillStyle(0x1A1A1A, 1)
    b0.fillRect(8, 10, 24, 14) // body
    b0.fillRect(28, 6, 12, 10) // head
    b0.fillStyle(0xFF6600, 1)
    b0.fillRect(38, 8, 8, 4)  // beak
    b0.fillStyle(0xFFFFFF, 1)
    b0.fillRect(30, 7, 4, 4)  // eye white
    b0.fillStyle(0x000000, 1)
    b0.fillRect(31, 8, 2, 2)  // pupil
    // Wings up
    b0.fillStyle(0x333333, 1)
    b0.fillRect(0, 2, 12, 6)
    b0.fillRect(4, 0, 8, 4)
    b0.generateTexture('bird_0', 48, 28)
    b0.destroy()

    // Bird frame 1 - wings down
    const b1 = this.make.graphics({ x: 0, y: 0 })
    b1.fillStyle(0x1A1A1A, 1)
    b1.fillRect(8, 10, 24, 14)
    b1.fillRect(28, 6, 12, 10)
    b1.fillStyle(0xFF6600, 1)
    b1.fillRect(38, 8, 8, 4)
    b1.fillStyle(0xFFFFFF, 1)
    b1.fillRect(30, 7, 4, 4)
    b1.fillStyle(0x000000, 1)
    b1.fillRect(31, 8, 2, 2)
    // Wings down
    b1.fillStyle(0x333333, 1)
    b1.fillRect(0, 14, 12, 6)
    b1.fillRect(4, 18, 8, 4)
    b1.generateTexture('bird_1', 48, 28)
    b1.destroy()
  }

  private genSpike() {
    // Spike 24x44
    const s = this.make.graphics({ x: 0, y: 0 })
    // Shadow
    s.fillStyle(0x000000, 0.2)
    s.fillEllipse(12, 42, 20, 6)
    // Main triangle — neon cyan (visible against all backgrounds)
    s.fillStyle(0x00AAAA, 1)
    s.fillTriangle(12, 0, 0, 44, 24, 44)
    // Highlight
    s.fillStyle(0x44FFEE, 1)
    s.fillTriangle(12, 4, 4, 40, 12, 40)
    // Glow strip
    s.fillStyle(0x00FFDD, 0.4)
    s.fillTriangle(12, 2, 6, 36, 12, 36)
    s.generateTexture('spike', 24, 44)
    s.destroy()
  }

  private genCloud() {
    // Stormy cloud 64x36
    const c = this.make.graphics({ x: 0, y: 0 })
    // Dark cloud body
    c.fillStyle(0x445566, 1)
    c.fillRoundedRect(0, 12, 64, 24, 10)
    c.fillRoundedRect(10, 4, 36, 24, 12)
    c.fillRoundedRect(32, 0, 28, 20, 8)
    // Lightning inside
    c.fillStyle(0xFFFF00, 0.4)
    c.fillTriangle(28, 18, 22, 32, 32, 28)
    c.fillTriangle(32, 28, 28, 36, 36, 32)
    // Rain streaks
    c.fillStyle(0x6699CC, 0.6)
    for (let i = 0; i < 4; i++) {
      c.fillRect(12 + i * 12, 34, 2, 6)
    }
    c.generateTexture('cloud_obs', 64, 40)
    c.destroy()
  }

  private genCoins() {
    // Polymarket coin (blue) 28x28
    const coinPM = this.make.graphics({ x: 0, y: 0 })
    coinPM.fillStyle(0x0033BB, 1)
    coinPM.fillCircle(14, 14, 13)
    coinPM.fillStyle(0x2266DD, 1)
    coinPM.fillCircle(14, 14, 11)
    coinPM.fillStyle(0x0044AA, 1)
    coinPM.fillCircle(14, 14, 8)
    // P letter
    coinPM.fillStyle(0xAADDFF, 1)
    coinPM.fillRect(9, 8, 4, 12)
    coinPM.fillRect(9, 8, 8, 3)
    coinPM.fillRect(9, 13, 8, 3)
    coinPM.fillRect(17, 8, 3, 8)
    // Shine
    coinPM.fillStyle(0xDDEEFF, 0.6)
    coinPM.fillCircle(9, 9, 3)
    coinPM.generateTexture('coin_pm', 28, 28)
    coinPM.destroy()

    // Kalshi coin (purple) 28x28
    const coinKS = this.make.graphics({ x: 0, y: 0 })
    coinKS.fillStyle(0x6600BB, 1)
    coinKS.fillCircle(14, 14, 13)
    coinKS.fillStyle(0x9933EE, 1)
    coinKS.fillCircle(14, 14, 11)
    coinKS.fillStyle(0x7722CC, 1)
    coinKS.fillCircle(14, 14, 8)
    // K letter
    coinKS.fillStyle(0xDDAAFF, 1)
    coinKS.fillRect(9, 8, 4, 12)
    coinKS.fillRect(13, 12, 5, 3)
    coinKS.fillRect(13, 9, 4, 3)
    coinKS.fillRect(17, 8, 3, 4)
    coinKS.fillRect(17, 16, 3, 4)
    // Shine
    coinKS.fillStyle(0xEECCFF, 0.5)
    coinKS.fillCircle(9, 9, 3)
    coinKS.generateTexture('coin_ks', 28, 28)
    coinKS.destroy()

    // Opinion coin (yellow) 28x28
    const coinOP = this.make.graphics({ x: 0, y: 0 })
    coinOP.fillStyle(0xCC9900, 1)
    coinOP.fillCircle(14, 14, 13)
    coinOP.fillStyle(0xFFCC00, 1)
    coinOP.fillCircle(14, 14, 11)
    coinOP.fillStyle(0xDDAA00, 1)
    coinOP.fillCircle(14, 14, 8)
    // O letter
    coinOP.fillStyle(0xFFEE88, 1)
    coinOP.fillCircle(14, 14, 6)
    coinOP.fillStyle(0xDDAA00, 1)
    coinOP.fillCircle(14, 14, 4)
    // Shine
    coinOP.fillStyle(0xFFFACC, 0.5)
    coinOP.fillCircle(9, 9, 3)
    coinOP.generateTexture('coin_op', 28, 28)
    coinOP.destroy()
  }

  private genBackgrounds() {
    const themes = [
      // Sunny - bright sky, green rolling hills
      { key: 'bg_sunny', sky1: 0x4FC3F7, sky2: 0x87CEEB, ground: 0x4CAF50, hills: 0x388E3C },
      // Dark - night sky, red-tinted ground
      { key: 'bg_dark', sky1: 0x0A0A1A, sky2: 0x150520, ground: 0x6B0000, hills: 0x4A0000 },
      // Rainy - grey-green, misty
      { key: 'bg_rainy', sky1: 0x2E4A3E, sky2: 0x3D5A4E, ground: 0x3D6B50, hills: 0x2E5040 },
      // Stormy - very dark, electric purple
      { key: 'bg_stormy', sky1: 0x0A0014, sky2: 0x100020, ground: 0x3B0000, hills: 0x280000 },
    ]

    themes.forEach(({ key, sky1, sky2, ground, hills }) => {
      const g = this.make.graphics({ x: 0, y: 0 })
      // Sky gradient (simulated with bands)
      for (let y = 0; y < 360; y += 40) {
        const ratio = y / 360
        const r = ((sky1 >> 16) & 0xff) * (1 - ratio) + ((sky2 >> 16) & 0xff) * ratio
        const gv = ((sky1 >> 8) & 0xff) * (1 - ratio) + ((sky2 >> 8) & 0xff) * ratio
        const b = (sky1 & 0xff) * (1 - ratio) + (sky2 & 0xff) * ratio
        const col = (Math.round(r) << 16) | (Math.round(gv) << 8) | Math.round(b)
        g.fillStyle(col, 1)
        g.fillRect(0, y, 800, 42)
      }
      // Hills (far)
      g.fillStyle(hills, 0.7)
      g.fillEllipse(150, 380, 300, 100)
      g.fillEllipse(450, 370, 280, 90)
      g.fillEllipse(700, 385, 260, 80)
      // Ground strip
      g.fillStyle(ground, 1)
      g.fillRect(0, 400, 800, 100)
      // Ground top edge
      g.fillStyle(Phaser.Display.Color.ValueToColor(ground).brighten(20).color, 1)
      g.fillRect(0, 398, 800, 8)
      g.generateTexture(key, 800, 500)
      g.destroy()
    })

    // Stars (for dark/stormy)
    const stars = this.make.graphics({ x: 0, y: 0 })
    stars.fillStyle(0xFFFFFF, 1)
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 800
      const y = Math.random() * 300
      const size = Math.random() < 0.3 ? 3 : 2
      stars.fillRect(x, y, size, size)
    }
    stars.generateTexture('stars', 800, 300)
    stars.destroy()
  }

  private genParticle() {
    // Sparkle particle
    const p = this.make.graphics({ x: 0, y: 0 })
    p.fillStyle(0xFFFFFF, 1)
    p.fillRect(2, 0, 2, 6)
    p.fillRect(0, 2, 6, 2)
    p.generateTexture('sparkle', 6, 6)
    p.destroy()

    // Coin burst particle
    const cp = this.make.graphics({ x: 0, y: 0 })
    cp.fillStyle(0xFFD700, 1)
    cp.fillCircle(3, 3, 3)
    cp.generateTexture('particle_gold', 6, 6)
    cp.destroy()

    // Death dust particle
    const dp = this.make.graphics({ x: 0, y: 0 })
    dp.fillStyle(0xFF4444, 1)
    dp.fillRect(0, 0, 4, 4)
    dp.generateTexture('particle_red', 4, 4)
    dp.destroy()
  }

  private genSun() {
    const s = this.make.graphics({ x: 0, y: 0 })
    // Glow
    s.fillStyle(0xFFFF88, 0.3)
    s.fillCircle(24, 24, 22)
    s.fillStyle(0xFFDD00, 1)
    s.fillCircle(24, 24, 16)
    s.fillStyle(0xFFFF44, 1)
    s.fillCircle(24, 24, 12)
    // Rays
    s.fillStyle(0xFFDD00, 0.8)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8
      s.fillRect(24 + Math.cos(a) * 18, 24 + Math.sin(a) * 18, 4, 4)
    }
    s.generateTexture('sun', 48, 48)
    s.destroy()
  }

  private genMoon() {
    const m = this.make.graphics({ x: 0, y: 0 })
    m.fillStyle(0xCCCCAA, 1)
    m.fillCircle(20, 20, 18)
    m.fillStyle(0x0A0A1A, 1)
    m.fillCircle(28, 14, 14)
    // Craters
    m.fillStyle(0xAAAA88, 0.4)
    m.fillCircle(10, 22, 4)
    m.fillCircle(15, 30, 3)
    m.generateTexture('moon', 40, 40)
    m.destroy()
  }

  private genRaindrop() {
    const r = this.make.graphics({ x: 0, y: 0 })
    r.fillStyle(0x88AABB, 0.8)
    r.fillRect(0, 0, 2, 10)
    r.generateTexture('raindrop', 2, 10)
    r.destroy()
  }

  private genLightning() {
    const l = this.make.graphics({ x: 0, y: 0 })
    l.fillStyle(0xFFFF00, 1)
    l.fillTriangle(12, 0, 2, 22, 10, 22)
    l.fillTriangle(10, 22, 16, 22, 6, 44)
    l.generateTexture('lightning', 18, 44)
    l.destroy()
  }

  private genMountain() {
    const m = this.make.graphics({ x: 0, y: 0 })
    m.fillStyle(0x7799AA, 0.5)
    m.fillTriangle(80, 0, 0, 120, 160, 120)
    m.fillStyle(0x99BBCC, 0.3)
    m.fillTriangle(80, 10, 20, 100, 80, 100)
    // Snow cap
    m.fillStyle(0xEEEEFF, 0.8)
    m.fillTriangle(80, 0, 56, 36, 104, 36)
    m.generateTexture('mountain', 160, 120)
    m.destroy()
  }

  private genTree() {
    const t = this.make.graphics({ x: 0, y: 0 })
    t.fillStyle(0x1A5C1A, 1)
    t.fillTriangle(20, 0, 0, 32, 40, 32)
    t.fillTriangle(20, 8, 2, 44, 38, 44)
    t.fillTriangle(20, 18, 4, 56, 36, 56)
    t.fillStyle(0x3D2B1F, 1)
    t.fillRect(16, 56, 8, 16)
    t.generateTexture('tree', 40, 72)
    t.destroy()
  }

  private genCityBuilding() {
    // Far background building silhouette
    const b = this.make.graphics({ x: 0, y: 0 })
    b.fillStyle(0x222244, 0.7)
    b.fillRect(0, 20, 40, 80)
    b.fillRect(10, 0, 20, 24)
    // Windows
    b.fillStyle(0xFFFF88, 0.4)
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 2; col++) {
        if (Math.random() > 0.4) {
          b.fillRect(4 + col * 16, 28 + row * 12, 8, 6)
        }
      }
    }
    b.generateTexture('building', 40, 100)
    b.destroy()
  }

  create() {
    this.scene.start('MenuScene')
  }
}
