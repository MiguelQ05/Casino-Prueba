<template>
  <div class="slot-universe">
    <!-- Ambient lights -->
    <div class="ambient-light left"></div>
    <div class="ambient-light right"></div>

    <div class="machine-wrapper">
      <!-- TOP MARQUEE -->
      <div class="marquee-top">
        <div class="marquee-lights">
          <span
            v-for="i in 20"
            :key="i"
            class="marquee-bulb"
            :class="{ on: (bulbFrame + i) % 3 === 0 }"
          ></span>
        </div>
        <div class="marquee-text">
          <span class="marquee-title">LUCKY SEVENS</span>
          <span class="marquee-stars">★ ★ ★</span>
        </div>
        <div class="marquee-lights">
          <span
            v-for="i in 20"
            :key="i"
            class="marquee-bulb"
            :class="{ on: (bulbFrame + i + 1) % 3 === 0 }"
          ></span>
        </div>
      </div>

      <!-- MACHINE BODY -->
      <div class="machine-body">
        <!-- PAYOUT TABLE -->
        <div class="payout-table">
          <div class="payout-title">TABLA DE PAGOS</div>
          <div class="payout-row" v-for="p in payouts" :key="p.combo">
            <span class="payout-icons">{{ p.icons }}</span>
            <span class="payout-mult">×{{ p.mult }}</span>
          </div>
        </div>

        <!-- REELS SECTION -->
        <div class="reels-section">
          <!-- WIN DISPLAY -->
          <div class="win-display" :class="{ 'win-glow': lastWin > 0 && !spinning }">
            <span class="win-label">GANANCIA</span>
            <span class="win-amount" :class="{ 'win-animate': lastWin > 0 && !spinning }">
              {{ lastWin > 0 && !spinning ? '+' + lastWin + '€' : '---' }}
            </span>
          </div>

          <!-- REELS FRAME -->
          <div class="reels-frame">
            <div class="reels-inner">
              <div
                v-for="(reel, ri) in reels"
                :key="ri"
                class="reel-container"
                :class="{ 'reel-spinning': reel.spinning }"
              >
                <!-- Visible window shows 3 symbols, middle is the payline -->
                <div
                  class="reel-strip"
                  :style="{
                    transform: `translateY(${reel.offset}px)`,
                    transition: reel.spinning
                      ? `transform ${reel.duration}s cubic-bezier(0.15, 0.85, 0.35, 1)`
                      : 'none'
                  }"
                >
                  <div
                    v-for="(sym, si) in reel.strip"
                    :key="si"
                    class="reel-symbol"
                    :class="sym.class"
                  >
                    {{ sym.icon }}
                  </div>
                </div>
                <!-- Shine overlay -->
                <div class="reel-shine"></div>
              </div>
            </div>
            <!-- Payline -->
            <div class="payline"></div>
            <!-- Corner screws -->
            <div class="screw tl"></div>
            <div class="screw tr"></div>
            <div class="screw bl"></div>
            <div class="screw br"></div>
          </div>

          <!-- CREDITS DISPLAY -->
          <div class="credits-row">
            <div class="credit-box">
              <span class="credit-label">CRÉDITOS</span>
              <span class="credit-value">{{ balance }}</span>
            </div>
            <div class="credit-box bet-box">
              <span class="credit-label">APUESTA</span>
              <span class="credit-value bet-val">{{ currentBet }}</span>
            </div>
          </div>
        </div>

        <!-- LEVER SIDE -->
        <div class="lever-side">
          <div class="lever-mount">
            <div
              class="lever-arm"
              :class="{ 'lever-pull': leverPulling, 'lever-return': leverReturning }"
              @click="pullLever"
            >
              <div class="lever-shaft"></div>
              <div class="lever-ball">
                <div class="lever-ball-shine"></div>
              </div>
            </div>
            <div class="lever-base"></div>
          </div>
          <div class="lever-hint" v-if="!spinning">TIRAR</div>
        </div>
      </div>

      <!-- CONTROL PANEL -->
      <div class="control-panel">
        <!-- Bet buttons -->
        <div class="bet-controls">
          <button class="btn-bet btn-min" @click="setBet('min')" :disabled="spinning">
            <span class="btn-icon">▼▼</span>
            <span>MÍN</span>
          </button>
          <button class="btn-bet btn-down" @click="changeBet(-1)" :disabled="spinning || currentBet <= minBet">
            <span>−</span>
          </button>
          <div class="bet-display">
            <span class="bet-display-label">APUESTA</span>
            <span class="bet-display-value">{{ currentBet }}€</span>
          </div>
          <button class="btn-bet btn-up" @click="changeBet(1)" :disabled="spinning || currentBet >= maxBet">
            <span>+</span>
          </button>
          <button class="btn-bet btn-max" @click="setBet('max')" :disabled="spinning">
            <span class="btn-icon">▲▲</span>
            <span>MÁX</span>
          </button>
        </div>

        <!-- Main buttons -->
        <div class="main-buttons">
          <button
            class="btn-spin"
            @click="spinReels"
            :disabled="spinning || balance < currentBet"
            :class="{ 'btn-spin-ready': !spinning && balance >= currentBet }"
          >
            <span v-if="!spinning">🎰 GIRAR</span>
            <span v-else class="spin-label-anim">⟳ GIRANDO</span>
          </button>
          <button class="btn-collect" @click="collect" :disabled="spinning || balance <= 0">
            <span>💰 COBRAR</span>
          </button>
        </div>
      </div>

      <!-- BOTTOM LEGS -->
      <div class="machine-legs">
        <div class="leg left-leg"></div>
        <div class="leg right-leg"></div>
      </div>
    </div>

    <!-- WIN CELEBRATION -->
    <transition name="celebrate-fade">
      <div v-if="showWinModal" class="win-celebration" @click="showWinModal = false">
        <div class="confetti-container">
          <div v-for="i in 30" :key="i" class="confetti-piece" :style="confettiStyle(i)"></div>
        </div>
        <div class="win-modal">
          <div class="win-modal-stars">★★★</div>
          <div class="win-modal-title">{{ winModalTitle }}</div>
          <div class="win-modal-amount">+{{ lastWin }}€</div>
          <div class="win-modal-sub">Toca para continuar</div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
const SYMBOLS = [
  { id: 'seven',   icon: '7',  class: 'sym-seven',  weight: 2  },
  { id: 'bar3',    icon: 'BAR', class: 'sym-bar3',  weight: 3  },
  { id: 'bell',    icon: '🔔', class: 'sym-bell',   weight: 5  },
  { id: 'cherry',  icon: '🍒', class: 'sym-cherry', weight: 8  },
  { id: 'lemon',   icon: '🍋', class: 'sym-lemon',  weight: 10 },
  { id: 'grape',   icon: '🍇', class: 'sym-grape',  weight: 10 },
  { id: 'orange',  icon: '🍊', class: 'sym-orange', weight: 10 },
  { id: 'star',    icon: '⭐', class: 'sym-star',   weight: 6  },
]

const PAYOUTS = [
  { combo: ['seven','seven','seven'],  mult: 100, label: '7 7 7',     icons: '7️⃣ 7️⃣ 7️⃣' },
  { combo: ['bar3','bar3','bar3'],     mult: 50,  label: 'BAR BAR BAR', icons: 'BAR BAR BAR' },
  { combo: ['bell','bell','bell'],     mult: 20,  label: '🔔🔔🔔',   icons: '🔔 🔔 🔔' },
  { combo: ['star','star','star'],     mult: 15,  label: '⭐⭐⭐',   icons: '⭐ ⭐ ⭐' },
  { combo: ['cherry','cherry','cherry'],mult:10,  label: '🍒🍒🍒',   icons: '🍒 🍒 🍒' },
  { combo: ['seven','seven',null],     mult: 5,   label: '7 7 ?',     icons: '7️⃣ 7️⃣ ✦' },
  { combo: ['cherry','cherry',null],   mult: 3,   label: '🍒🍒?',    icons: '🍒 🍒 ✦' },
  { combo: ['cherry',null,null],       mult: 2,   label: '🍒??',     icons: '🍒 ✦ ✦' },
]

function weightedRandom() {
  const total = SYMBOLS.reduce((s, sym) => s + sym.weight, 0)
  let r = Math.random() * total
  for (const sym of SYMBOLS) {
    r -= sym.weight
    if (r <= 0) return sym
  }
  return SYMBOLS[SYMBOLS.length - 1]
}

function buildStrip(size = 30) {
  return Array.from({ length: size }, () => weightedRandom())
}

const SYMBOL_H = 90 // px height per symbol cell

export default {
  name: 'SlotMachine',

  data() {
    return {
      balance: 500,
      currentBet: 5,
      minBet: 1,
      maxBet: 50,
      betStep: 1,
      spinning: false,
      lastWin: 0,
      showWinModal: false,
      winModalTitle: '',
      leverPulling: false,
      leverReturning: false,
      bulbFrame: 0,
      bulbTimer: null,

      payouts: PAYOUTS.map(p => ({ icons: p.icons, mult: p.mult })),

      reels: [
        { strip: buildStrip(), offset: 0, spinning: false, duration: 2.5, result: null },
        { strip: buildStrip(), offset: 0, spinning: false, duration: 3.0, result: null },
        { strip: buildStrip(), offset: 0, spinning: false, duration: 3.5, result: null },
      ],
    }
  },

  mounted() {
    this.initReelOffsets()
    this.bulbTimer = setInterval(() => { this.bulbFrame++ }, 200)
  },

  beforeUnmount() {
    clearInterval(this.bulbTimer)
  },

  methods: {
    initReelOffsets() {
      // Position each reel so middle row (index 1) shows a random symbol
      this.reels.forEach(reel => {
        const mid = Math.floor(reel.strip.length / 2)
        reel.offset = -(mid - 1) * SYMBOL_H
      })
    },

    setBet(type) {
      if (type === 'min') this.currentBet = this.minBet
      if (type === 'max') this.currentBet = Math.min(this.maxBet, this.balance)
    },

    changeBet(delta) {
      this.currentBet = Math.max(this.minBet, Math.min(this.maxBet, this.currentBet + delta * this.betStep))
    },

    async pullLever() {
      if (this.spinning || this.balance < this.currentBet) return
      this.leverPulling = true
      await this.delay(500)
      this.leverPulling = false
      this.leverReturning = true
      this.spinReels()
      await this.delay(800)
      this.leverReturning = false
    },

    async spinReels() {
      if (this.spinning || this.balance < this.currentBet) return
      this.spinning = true
      this.lastWin = 0
      this.balance -= this.currentBet

      // Pick final symbols for each reel
      const results = this.reels.map(() => weightedRandom())

      // For each reel: extend strip, set final offset, trigger CSS transition
      this.reels.forEach((reel, ri) => {
        // Build a long new strip ending with our chosen symbol
        const newStrip = buildStrip(40)
        // Set target symbol at position 20 (middle)
        newStrip[20] = results[ri]
        reel.strip = newStrip

        const targetIdx = 20
        const newOffset = -(targetIdx - 1) * SYMBOL_H

        // Trigger spin: we set a large initial offset (many rows above), then animate down
        const spinRows = 25 + ri * 5
        const startOffset = -(targetIdx - 1 - spinRows) * SYMBOL_H

        // Force offset without transition first
        reel.spinning = false
        reel.offset = startOffset

        this.$nextTick(() => {
          reel.spinning = true
          reel.duration = 2.5 + ri * 0.5
          reel.offset = newOffset
          reel.result = results[ri]
        })
      })

      // Wait for all reels to stop
      const maxDur = 2.5 + (this.reels.length - 1) * 0.5
      await this.delay((maxDur + 0.4) * 1000)

      // Evaluate result
      this.reels.forEach(r => { r.spinning = false })
      const combo = results.map(r => r.id)
      const win = this.evaluateWin(combo)

      if (win > 0) {
        this.lastWin = win * this.currentBet
        this.balance += this.lastWin
        this.triggerWinCelebration(win)
      }

      this.spinning = false
    },

    evaluateWin(combo) {
      for (const p of PAYOUTS) {
        const match = p.combo.every((c, i) => c === null || c === combo[i])
        if (match) return p.mult
      }
      return 0
    },

    triggerWinCelebration(mult) {
      if (mult >= 50) this.winModalTitle = '🎉 GRAN PREMIO 🎉'
      else if (mult >= 20) this.winModalTitle = '🔥 ¡INCREÍBLE!'
      else if (mult >= 10) this.winModalTitle = '✨ ¡GRAN WIN!'
      else if (mult >= 5) this.winModalTitle = '🎊 ¡WIN!'
      else this.winModalTitle = '💫 ¡PREMIO!'
      this.showWinModal = true
    },

    collect() {
      if (this.balance > 0) {
        alert(`Has cobrado ${this.balance}€. ¡Hasta la próxima!`)
        this.balance = 500
      }
    },

    confettiStyle(i) {
      const colors = ['#f0d080','#c9a84c','#ff4444','#44ff88','#4488ff','#ff44ff','#ffaa00']
      return {
        left: (Math.random() * 100) + '%',
        animationDelay: (Math.random() * 1.5) + 's',
        animationDuration: (1.5 + Math.random() * 1.5) + 's',
        background: colors[i % colors.length],
        width: (6 + Math.random() * 8) + 'px',
        height: (6 + Math.random() * 8) + 'px',
      }
    },

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
    },
  },
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@400;700;900&family=Press+Start+2P&display=swap');

:root {
  --gold: #c9a84c;
  --gold-l: #f0d080;
  --gold-d: #8a6a20;
  --chrome: #d0d8e0;
  --chrome-d: #8090a0;
  --red-neon: #ff2244;
  --body-bg: #1a0a02;
  --panel-bg: #0f0f1a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

.slot-universe {
  background: radial-gradient(ellipse at 50% 20%, #1a0a02 0%, #05050a 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
  font-family: 'Orbitron', monospace;
}

.ambient-light {
  position: fixed;
  width: 300px;
  height: 600px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.06;
  filter: blur(80px);
}
.ambient-light.left { left: -100px; top: 50%; transform: translateY(-50%); background: #ff2244; }
.ambient-light.right { right: -100px; top: 50%; transform: translateY(-50%); background: #c9a84c; }

/* ===== MACHINE WRAPPER ===== */
.machine-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 20px 60px rgba(201,168,76,0.25));
}

/* ===== MARQUEE TOP ===== */
.marquee-top {
  width: 540px;
  background: linear-gradient(180deg, #2a1505 0%, #1a0d02 100%);
  border: 3px solid var(--gold-d);
  border-bottom: none;
  border-radius: 16px 16px 0 0;
  padding: 10px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  box-shadow: 0 -4px 20px rgba(201,168,76,0.2);
}

.marquee-lights {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.marquee-bulb {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3a2a10;
  border: 1px solid #5a4020;
  transition: background 0.1s, box-shadow 0.1s;
}
.marquee-bulb.on {
  background: #f0d080;
  box-shadow: 0 0 6px #f0d080, 0 0 12px rgba(240,208,128,0.6);
}

.marquee-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.marquee-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  letter-spacing: 0.25em;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 50%, #8a6a20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 10px rgba(201,168,76,0.5));
}

.marquee-stars {
  font-size: 0.7rem;
  letter-spacing: 0.6em;
  color: var(--gold);
  opacity: 0.7;
}

/* ===== MACHINE BODY ===== */
.machine-body {
  width: 540px;
  background: linear-gradient(160deg, #1c1206 0%, #100c04 60%, #080808 100%);
  border-left: 3px solid var(--gold-d);
  border-right: 3px solid var(--gold-d);
  padding: 16px 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  position: relative;
}

/* Rivet details */
.machine-body::before,
.machine-body::after {
  content: '●';
  position: absolute;
  top: 10px;
  font-size: 0.5rem;
  color: var(--chrome-d);
  opacity: 0.4;
}
.machine-body::before { left: 10px; }
.machine-body::after { right: 10px; }

/* ===== PAYOUT TABLE ===== */
.payout-table {
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(201,168,76,0.25);
  border-radius: 6px;
  padding: 8px 10px;
  min-width: 110px;
  flex-shrink: 0;
}

.payout-title {
  font-size: 0.42rem;
  letter-spacing: 0.15em;
  color: var(--gold);
  opacity: 0.7;
  text-align: center;
  margin-bottom: 6px;
  border-bottom: 1px solid rgba(201,168,76,0.2);
  padding-bottom: 4px;
}

.payout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  font-size: 0.5rem;
  gap: 6px;
}
.payout-icons { color: #ddd; font-size: 0.5rem; letter-spacing: 0.05em; }
.payout-mult { color: var(--gold-l); font-weight: 700; font-size: 0.52rem; white-space: nowrap; }

/* ===== REELS SECTION ===== */
.reels-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* Win display */
.win-display {
  width: 100%;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.win-display.win-glow {
  border-color: #44ff88;
  box-shadow: 0 0 12px rgba(68,255,136,0.4), inset 0 0 8px rgba(68,255,136,0.05);
}
.win-label { font-size: 0.45rem; letter-spacing: 0.2em; color: var(--gold); opacity: 0.7; }
.win-amount {
  font-size: 0.9rem;
  font-weight: 700;
  color: #666;
  transition: color 0.3s;
}
.win-amount.win-animate {
  color: #44ff88;
  text-shadow: 0 0 12px rgba(68,255,136,0.7);
  animation: winPulse 0.5s ease-in-out 3;
}
@keyframes winPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* Reels frame */
.reels-frame {
  position: relative;
  background: #000;
  border: 3px solid var(--chrome-d);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 0 0 2px #1a1a1a,
    0 0 0 4px var(--gold-d),
    inset 0 0 30px rgba(0,0,0,0.9),
    0 4px 20px rgba(0,0,0,0.8);
  width: 100%;
  height: 270px;
}

.reels-inner {
  display: flex;
  height: 100%;
  padding: 0 4px;
  gap: 4px;
}

.reel-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: linear-gradient(180deg, #0a0a0a 0%, #050505 100%);
  border-left: 1px solid #1a1a1a;
  border-right: 1px solid #1a1a1a;
}

.reel-strip {
  position: absolute;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.reel-symbol {
  width: 100%;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  flex-shrink: 0;
  font-family: 'Orbitron', monospace;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

/* Symbol colors */
.sym-seven {
  font-size: 2.2rem;
  font-weight: 900;
  color: #ff2244;
  text-shadow: 0 0 10px rgba(255,34,68,0.8), 0 0 20px rgba(255,34,68,0.4);
  font-family: 'Bebas Neue', sans-serif;
  letter-spacing: 0;
}
.sym-bar3 {
  font-size: 0.85rem;
  font-weight: 900;
  color: #f0d080;
  text-shadow: 0 0 8px rgba(240,208,128,0.7);
  letter-spacing: 0.05em;
  font-family: 'Bebas Neue', sans-serif;
}
.sym-bell { filter: drop-shadow(0 0 6px rgba(255,200,0,0.6)); }
.sym-cherry { filter: drop-shadow(0 0 4px rgba(255,50,50,0.5)); }
.sym-lemon { filter: drop-shadow(0 0 4px rgba(255,255,0,0.4)); }
.sym-grape { filter: drop-shadow(0 0 4px rgba(180,0,255,0.4)); }
.sym-orange { filter: drop-shadow(0 0 4px rgba(255,140,0,0.4)); }
.sym-star { filter: drop-shadow(0 0 6px rgba(255,220,0,0.6)); }

/* Reel shine */
.reel-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 0%,
    transparent 30%,
    transparent 70%,
    rgba(255,255,255,0.04) 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* Payline */
.payline {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  height: 90px;
  border-top: 2px solid rgba(255,34,68,0.5);
  border-bottom: 2px solid rgba(255,34,68,0.5);
  pointer-events: none;
  z-index: 3;
  background: rgba(255,34,68,0.03);
}

/* Corner screws */
.screw {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, var(--chrome), var(--chrome-d));
  z-index: 5;
}
.screw.tl { top: 6px; left: 6px; }
.screw.tr { top: 6px; right: 6px; }
.screw.bl { bottom: 6px; left: 6px; }
.screw.br { bottom: 6px; right: 6px; }

/* Credits */
.credits-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.credit-box {
  flex: 1;
  background: rgba(0,0,0,0.7);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.credit-label {
  font-size: 0.42rem;
  letter-spacing: 0.15em;
  color: var(--gold);
  opacity: 0.6;
}

.credit-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #f0d080;
  font-family: 'Press Start 2P', monospace;
  font-size: 0.7rem;
}

.bet-box { border-color: rgba(255,34,68,0.3); }
.bet-val { color: #ff6688; }

/* ===== LEVER ===== */
.lever-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.lever-mount {
  position: relative;
  width: 40px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.lever-arm {
  position: absolute;
  top: 0;
  left: 50%;
  transform-origin: bottom center;
  transform: translateX(-50%) rotate(15deg);
  cursor: pointer;
  transition: transform 0.1s ease;
  z-index: 2;
}

.lever-arm.lever-pull {
  animation: leverPull 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.lever-arm.lever-return {
  animation: leverReturn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes leverPull {
  0%   { transform: translateX(-50%) rotate(15deg); }
  100% { transform: translateX(-50%) rotate(-38deg); }
}

@keyframes leverReturn {
  0%   { transform: translateX(-50%) rotate(-38deg); }
  70%  { transform: translateX(-50%) rotate(22deg); }
  100% { transform: translateX(-50%) rotate(15deg); }
}

.lever-arm:hover:not(.lever-pull):not(.lever-return) {
  transform: translateX(-50%) rotate(10deg);
}

.lever-shaft {
  width: 10px;
  height: 150px;
  background: linear-gradient(90deg, #607080 0%, #a0b8c8 30%, #d0e0e8 50%, #a0b8c8 70%, #607080 100%);
  border-radius: 5px;
  margin: 0 auto;
  box-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.lever-ball {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #ff5566, #cc1122, #880010);
  box-shadow:
    0 4px 8px rgba(0,0,0,0.6),
    0 0 12px rgba(255,34,68,0.5),
    inset 0 -3px 6px rgba(0,0,0,0.4);
  position: relative;
  margin: -5px auto 0;
  cursor: pointer;
}

.lever-ball-shine {
  position: absolute;
  top: 20%;
  left: 22%;
  width: 35%;
  height: 25%;
  background: rgba(255,255,255,0.4);
  border-radius: 50%;
  filter: blur(2px);
}

.lever-base {
  width: 30px;
  height: 20px;
  background: linear-gradient(180deg, var(--gold), var(--gold-d));
  border-radius: 4px 4px 8px 8px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

.lever-hint {
  font-size: 0.38rem;
  letter-spacing: 0.2em;
  color: var(--gold);
  opacity: 0.5;
  animation: blink 1.5s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.15; }
}

/* ===== CONTROL PANEL ===== */
.control-panel {
  width: 540px;
  background: linear-gradient(180deg, #0d0805 0%, #080808 100%);
  border: 3px solid var(--gold-d);
  border-top: none;
  border-radius: 0 0 8px 8px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.bet-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.btn-bet {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  background: linear-gradient(180deg, #2a1a08, #1a0f05);
  border: 1px solid var(--gold-d);
  border-radius: 4px;
  color: var(--gold);
  font-family: 'Orbitron', monospace;
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.15s;
  gap: 2px;
}

.btn-bet:hover:not(:disabled) {
  background: linear-gradient(180deg, #3a2a10, #2a1a08);
  border-color: var(--gold);
  box-shadow: 0 0 8px rgba(201,168,76,0.3);
}

.btn-bet:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-icon { font-size: 0.45rem; color: var(--gold-l); }

.btn-min, .btn-max { min-width: 50px; }
.btn-down, .btn-up {
  width: 34px;
  height: 34px;
  font-size: 1rem;
  padding: 0;
  border-radius: 50%;
  font-family: monospace;
}

.bet-display {
  flex: 1;
  max-width: 120px;
  background: rgba(0,0,0,0.6);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.bet-display-label { font-size: 0.4rem; letter-spacing: 0.2em; color: var(--gold); opacity: 0.6; }
.bet-display-value {
  font-family: 'Press Start 2P', monospace;
  font-size: 0.7rem;
  color: #ff6688;
  text-shadow: 0 0 8px rgba(255,102,136,0.5);
}

.main-buttons {
  display: flex;
  gap: 10px;
}

.btn-spin {
  flex: 1;
  padding: 14px;
  background: linear-gradient(180deg, #2a1a08, #1a0f05);
  border: 2px solid var(--gold-d);
  border-radius: 6px;
  color: var(--gold);
  font-family: 'Orbitron', monospace;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.5;
}

.btn-spin.btn-spin-ready {
  background: linear-gradient(180deg, #c9a84c, #8a6a20);
  border-color: var(--gold-l);
  color: #0a0a0a;
  opacity: 1;
  box-shadow: 0 0 16px rgba(201,168,76,0.4);
}

.btn-spin.btn-spin-ready:hover {
  background: linear-gradient(180deg, #f0d080, #c9a84c);
  box-shadow: 0 0 28px rgba(201,168,76,0.7);
  transform: translateY(-1px);
}

.btn-spin:disabled { cursor: not-allowed; }

.spin-label-anim {
  display: inline-block;
  animation: spinLabel 1s linear infinite;
}
@keyframes spinLabel {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.btn-collect {
  padding: 14px 18px;
  background: linear-gradient(180deg, #1a3a1a, #0f1f0f);
  border: 2px solid #2a5a2a;
  border-radius: 6px;
  color: #44cc66;
  font-family: 'Orbitron', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-collect:hover:not(:disabled) {
  background: linear-gradient(180deg, #2a5a2a, #1a3a1a);
  box-shadow: 0 0 12px rgba(68,204,102,0.3);
}

.btn-collect:disabled { opacity: 0.3; cursor: not-allowed; }

/* ===== LEGS ===== */
.machine-legs {
  display: flex;
  justify-content: space-between;
  width: 440px;
  padding: 0 40px;
}

.leg {
  width: 24px;
  height: 40px;
  background: linear-gradient(180deg, var(--gold-d) 0%, #4a3a10 100%);
  border-radius: 0 0 6px 6px;
  box-shadow: 2px 4px 8px rgba(0,0,0,0.5);
}

/* ===== WIN CELEBRATION ===== */
.win-celebration {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  background: rgba(0,0,0,0.7);
  cursor: pointer;
}

.confetti-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  border-radius: 2px;
  animation: confettiFall linear forwards;
}

@keyframes confettiFall {
  0% { top: -20px; transform: rotate(0deg) translateX(0); opacity: 1; }
  100% { top: 110vh; transform: rotate(720deg) translateX(60px); opacity: 0; }
}

.win-modal {
  background: linear-gradient(160deg, #1a1005, #0a0a0a);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 0 60px rgba(201,168,76,0.4);
  z-index: 1;
}

.win-modal-stars {
  font-size: 1.2rem;
  color: var(--gold);
  letter-spacing: 0.5em;
  margin-bottom: 10px;
  animation: starSpin 2s linear infinite;
}

@keyframes starSpin {
  0% { letter-spacing: 0.5em; opacity: 1; }
  50% { letter-spacing: 1em; opacity: 0.7; }
  100% { letter-spacing: 0.5em; opacity: 1; }
}

.win-modal-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 2rem;
  letter-spacing: 0.2em;
  color: var(--gold-l);
  text-shadow: 0 0 20px rgba(240,208,128,0.6);
  margin-bottom: 8px;
}

.win-modal-amount {
  font-family: 'Press Start 2P', monospace;
  font-size: 1.4rem;
  color: #44ff88;
  text-shadow: 0 0 20px rgba(68,255,136,0.6);
  margin-bottom: 16px;
}

.win-modal-sub {
  font-size: 0.5rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  opacity: 0.5;
}

/* Transition */
.celebrate-fade-enter-active, .celebrate-fade-leave-active {
  transition: opacity 0.4s, transform 0.4s;
}
.celebrate-fade-enter-from, .celebrate-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 580px) {
  .marquee-top, .machine-body, .control-panel { width: 360px; }
  .machine-legs { width: 300px; }
  .marquee-title { font-size: 1.4rem; }
  .payout-table { min-width: 80px; }
  .reel-symbol { font-size: 1.8rem; height: 80px; }
  .reels-frame { height: 240px; }
}
</style>
