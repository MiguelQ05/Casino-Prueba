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
            v-for="i in 32"
            :key="i"
            class="marquee-bulb"
            :class="{ on: (bulbFrame + i) % 3 === 0 }"
          ></span>
        </div>
        <div class="marquee-text">
          <span class="marquee-title">LUXE DEVIL'S CASHIER</span>
          <span class="marquee-stars">★ ★ ★ ★ ★</span>
        </div>
        <div class="marquee-lights">
          <span
            v-for="i in 32"
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
          <div class="payout-row" v-for="p in payoutList" :key="p.mult + p.icons">
            <span class="payout-icons">{{ p.icons }}</span>
            <span class="payout-mult">×{{ p.mult }}</span>
          </div>
        </div>

        <!-- REELS SECTION -->
        <div class="reels-section">
          <!-- WIN DISPLAY -->
          <div class="win-display" :class="{ 'win-glow': lastWin > 0 && !spinning }" :key="'win-display-' + lastWin">
            <span class="win-label">GANANCIA</span>
            <span class="win-amount" :class="{ 'win-animate': lastWin > 0 && !spinning }">
              {{ lastWin > 0 && !spinning ? lastWin + '€' : '---' }}
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
                        ? `transform ${reel.duration}s cubic-bezier(0, 0.5, 0.2, 1)`
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
              <span class="credit-value gold-text">{{ balance }}€</span>
            </div>
            <div class="credit-box bet-box">
              <span class="credit-label">APUESTA</span>
              <span class="credit-value bet-val">{{ currentBet }}€</span>
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
            <div class="lever-hint" v-if="!spinning">TIRAR</div>
          </div>
        </div>
      </div>

      <!-- CONTROL PANEL -->
      <div class="control-panel">
        <div class="panel-top-trim"></div>
        
        <!-- Status Display Screen (Now the main UI) -->
        <div class="machine-status-screen">
          <div class="status-inner">
            <span v-if="spinning" class="status-text spinning-text">SORTEANDO DESTINO...</span>
            <span v-else-if="lastWin > 0" class="status-text win-text">¡HAS GANADO {{ lastWin }}€!</span>
            <span v-else class="status-text">TIRA DE LA PALANCA PARA JUGAR</span>
          </div>
        </div>

        <div class="panel-controls-row">
          <!-- Bet controls (Centered now) -->
          <div class="bet-section">
            <div class="bet-adjust">
              <button class="casino-btn btn-min" @click="setBet('min')" :disabled="spinning">
                <span class="btn-label">MÍN</span>
              </button>
              
              <button class="casino-btn btn-adjust" @click="changeBet(-10)" :disabled="spinning">
                <span class="btn-label">−</span>
              </button>

              <div class="bet-info">
                <span class="label">APUESTA</span>
                <span class="value">{{ currentBet }}€</span>
              </div>

              <button class="casino-btn btn-adjust" @click="changeBet(10)" :disabled="spinning">
                <span class="btn-label">+</span>
              </button>

              <button class="casino-btn btn-max" @click="setBet('max')" :disabled="spinning">
                <span class="btn-label">MÁX</span>
              </button>
            </div>
          </div>
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
      <div v-if="showWinModal" class="win-celebration" @click="showWinModal = false" :key="'win-modal-' + lastWin">
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
import { useBalance } from '../composables/useBalance.js'

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
  { combo: ['cherry','cherry','cherry'],mult: 5,   label: '🍒🍒🍒',   icons: '🍒 🍒 🍒' },
  { combo: ['lemon','lemon','lemon'],  mult: 3,   label: '🍋🍋🍋',   icons: '🍋 🍋 🍋' },
  { combo: ['grape','grape','grape'],  mult: 3,   label: '🍇🍇🍇',   icons: '🍇 🍇 🍇' },
  { combo: ['orange','orange','orange'],mult: 3,  label: '🍊🍊🍊',   icons: '🍊 🍊 🍊' },
  { combo: ['seven','seven',null],     mult: 5,   label: '7 7 ✦',     icons: '7️⃣ 7️⃣ ✦' },
  { combo: ['cherry','cherry',null],   mult: 2,   label: '🍒🍒✦',    icons: '🍒 🍒 ✦' },
  { combo: ['lemon','lemon',null],     mult: 1.5, label: '🍋🍋✦',    icons: '🍋 🍋 ✦' },
  { combo: ['grape','grape',null],     mult: 1.5, label: '🍇🍇✦',    icons: '🍇 🍇 ✦' },
  { combo: ['orange','orange',null],   mult: 1.5, label: '🍊🍊✦',    icons: '🍊 🍊 ✦' },
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

const SYMBOL_H = 110 // Slightly reduced for better fit

export default {
  name: 'SlotMachine',

  setup() {
    const { balance, deduct, credit, refill } = useBalance()
    return { balance, deduct, credit, refill }
  },

  data() {
    return {
      currentBet: 10,
      minBet: 10,
      maxBet: 500,
      betStep: 10,
      spinning: false,
      lastWin: 0,
      showWinModal: false,
      winModalTitle: '',
      leverPulling: false,
      leverReturning: false,
      bulbFrame: 0,
      bulbTimer: null,

      reels: [
        { strip: buildStrip(), offset: 0, spinning: false, duration: 2.5, result: null },
        { strip: buildStrip(), offset: 0, spinning: false, duration: 3.0, result: null },
        { strip: buildStrip(), offset: 0, spinning: false, duration: 3.5, result: null },
      ],
    }
  },

  computed: {
    payoutList() {
      return PAYOUTS.map(p => ({ icons: p.icons, mult: p.mult }))
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
      this.currentBet = Math.max(this.minBet, Math.min(this.maxBet, this.currentBet + delta))
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
      this.showWinModal = false // Explicitly hide any leftover modal
      this.deduct(this.currentBet)

      const results = this.reels.map(() => weightedRandom())

      this.reels.forEach((reel, ri) => {
        // Build a very long strip (150 symbols) to avoid any out-of-bounds
        const stripSize = 150
        const newStrip = buildStrip(stripSize)
        
        // The winning symbol will be at the very end of the animation
        const targetIdx = stripSize - 10 
        newStrip[targetIdx] = results[ri]
        reel.strip = newStrip

        // The start position should always be near the beginning (index 1 or 2)
        // so it travels the maximum distance without going out of bounds
        const startIdx = 1
        const startOffset = -(startIdx) * SYMBOL_H
        const newOffset = -(targetIdx - 1) * SYMBOL_H

        reel.spinning = false
        reel.offset = startOffset

        // Force reflow and start spin
        this.$nextTick(() => {
          const el = this.$el.querySelectorAll('.reel-strip')[ri]
          if (el) void el.offsetHeight 

          this.$nextTick(() => {
            reel.spinning = true
            reel.duration = 6 + ri * 3 // Staggered: 6s, 9s, 12s
            reel.offset = newOffset
            reel.result = results[ri]
          })
        })
      })

      // Wait for all reels (staggered 6s, 9s, 12s)
      const maxDur = 6 + (this.reels.length - 1) * 3
      await this.delay((maxDur + 0.5) * 1000)

      this.reels.forEach(r => { r.spinning = false })
      
      // BUILD COMBO FROM ACTUAL RESULTS
      const combo = results.map(r => r.id)
      const winMult = this.evaluateWin(combo)

      if (winMult > 0) {
        this.lastWin = winMult * this.currentBet
        this.credit(this.lastWin)
        this.triggerWinCelebration(winMult)
      }

      this.spinning = false
    },

    evaluateWin(combo) {
      // 1. Check for Three of a Kind first (Priority)
      for (const p of PAYOUTS) {
        if (p.combo.every((c, i) => c === null || c === combo[i])) {
          // This only matches if it follows the exact pattern (like 3 of a kind)
          if (!p.combo.includes(null)) return p.mult
        }
      }

      // 2. Flexible Pair Detection for fruits and sevens
      // We count how many of each symbol we have
      const counts = {}
      combo.forEach(id => { counts[id] = (counts[id] || 0) + 1 })

      if (counts['seven'] >= 2) return 5
      if (counts['cherry'] >= 2) return 2
      if (counts['lemon'] >= 2) return 1.5
      if (counts['grape'] >= 2) return 1.5
      if (counts['orange'] >= 2) return 1.5

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
        this.refill()
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
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Orbitron:wght@400;700;900&family=Press+Start+2P&family=Cinzel:wght@900&display=swap');

.slot-universe {
  --gold: #c9a84c;
  --gold-l: #f0d080;
  --gold-d: #8a6a20;
  --chrome: #d0d8e0;
  --chrome-d: #8090a0;
  --red-neon: #ff2244;
  --body-bg: #1a0a02;
  --panel-bg: #0f0f1a;
  
  background: transparent;
  height: 100%;
  display: flex;
  align-items: flex-start; /* Start from top */
  justify-content: center;
  padding: 10px;
  position: relative;
  overflow: hidden;
  font-family: 'Orbitron', monospace;
  user-select: none;
}

.ambient-light {
  position: absolute;
  width: 400px;
  height: 600px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.1;
  filter: blur(100px);
}
.ambient-light.left { left: -100px; top: 50%; transform: translateY(-50%); background: var(--red-neon); }
.ambient-light.right { right: -100px; top: 50%; transform: translateY(-50%); background: var(--gold); }

/* ===== MACHINE WRAPPER ===== */
.reel-strip {
  position: absolute;
  width: 100%;
  display: flex;
  flex-direction: column;
  will-change: transform, filter;
  transition: transform cubic-bezier(0.2, 0, 0.2, 1.1);
}
.reel-strip.spinning {
  filter: blur(2px);
}
.machine-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  filter: drop-shadow(0 20px 80px rgba(0,0,0,0.8));
  transform: scale(0.68); /* Finely tuned for no-scroll */
  transform-origin: top center;
  margin-top: 0;
}

/* ===== MARQUEE TOP ===== */
.marquee-top {
  width: 950px; /* Panoramico */
  background: linear-gradient(180deg, #151515 0%, #0a0a0a 100%);
  border: 4px solid var(--gold-d);
  border-bottom: none;
  border-radius: 20px 20px 0 0;
  padding: 8px 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
  box-shadow: 0 -10px 30px rgba(201,168,76,0.1);
}

.marquee-lights {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.marquee-bulb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #111;
  border: 1px solid #333;
  transition: background 0.1s, box-shadow 0.1s;
}
.marquee-bulb.on {
  background: var(--gold-l);
  box-shadow: 0 0 10px var(--gold-l), 0 0 20px rgba(240,208,128,0.4);
}

.marquee-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.marquee-title {
  font-family: 'Cinzel', serif;
  font-size: 2rem; /* Reduced to fit longer title */
  font-weight: 900;
  letter-spacing: 0.08em;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 50%, #8a6a20 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 15px rgba(201,168,76,0.3));
}

.marquee-stars {
  font-size: 0.8rem;
  letter-spacing: 0.8em;
  color: var(--gold);
  opacity: 0.8;
}

/* ===== MACHINE BODY ===== */
.machine-body {
  width: 950px;
  background: linear-gradient(165deg, #111 0%, #050505 100%);
  border-left: 5px solid var(--gold-d);
  border-right: 5px solid var(--gold-d);
  padding: 20px 30px;
  display: flex;
  gap: 30px;
  align-items: flex-start;
  position: relative;
}

/* ===== PAYOUT TABLE ===== */
.payout-table {
  background: linear-gradient(135deg, rgba(15,15,15,0.95) 0%, rgba(5,5,5,0.98) 100%);
  border: 2px solid var(--gold-d);
  border-radius: 15px;
  padding: 20px;
  width: 220px; /* Wider table column */
  flex-shrink: 0;
  box-shadow: 
    inset 0 0 20px #000,
    0 0 30px rgba(201,168,76,0.1);
  position: relative;
  overflow: hidden;
}

.payout-table::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(201,168,76,0.05) 0%, transparent 70%);
  pointer-events: none;
}

.payout-title {
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: var(--gold-l);
  text-align: center;
  margin-bottom: 10px;
  border-bottom: 1px solid rgba(201,168,76,0.2);
  padding-bottom: 6px;
  font-weight: 800;
}

.payout-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.7rem;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

.payout-row:last-child { border-bottom: none; }

.payout-icons { 
  color: #fff; 
  white-space: nowrap; 
  text-shadow: 0 0 5px rgba(255,255,255,0.2);
}

.payout-mult { 
  color: var(--gold-l); 
  font-weight: 900;
  font-family: 'Orbitron', sans-serif;
  text-shadow: 0 0 8px rgba(240,208,128,0.3);
}

/* ===== REELS SECTION ===== */
.reels-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.win-display {
  width: 100%;
  background: #000;
  border: 1px solid #333;
  border-radius: 10px;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.win-display.win-glow {
  border-color: #4eff90;
  box-shadow: 0 0 20px rgba(78,255,144,0.2);
}
.win-label { font-size: 0.6rem; letter-spacing: 0.3em; color: var(--gold); opacity: 0.6; font-weight: 800; }
.win-amount {
  font-size: 1.2rem;
  font-weight: 900;
  color: #333;
}
.win-amount.win-animate {
  color: #4eff90;
  text-shadow: 0 0 15px rgba(78,255,144,0.5);
}

.reels-frame {
  position: relative;
  background: #000;
  border: 4px solid #222;
  border-radius: 15px;
  overflow: hidden;
  box-shadow:
    0 0 0 2px #0a0a0a,
    0 0 0 4px var(--gold-d),
    inset 0 0 60px #000;
  width: 100%;
  height: 330px; /* Reduced from 360px */
}

.reels-inner {
  display: flex;
  height: 100%;
  padding: 0 10px;
  gap: 10px;
}

.reel-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #050505;
  border-radius: 10px;
}

.reel-symbol {
  width: 100%;
  height: 110px; /* Match SYMBOL_H */
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem; /* Slightly smaller icons */
  border-bottom: 1px solid rgba(255,255,255,0.02);
}

.sym-seven {
  font-family: 'Bebas Neue', sans-serif;
  color: var(--red-neon);
  font-weight: 900;
  font-size: 4rem;
  text-shadow: 0 0 25px var(--red-neon);
}
.sym-bar3 {
  font-family: 'Bebas Neue', sans-serif;
  color: var(--gold-l);
  font-size: 1.2rem;
  font-weight: 900;
}

.reel-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.05) 0%,
    transparent 30%,
    transparent 70%,
    rgba(255,255,255,0.05) 100%,
    linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.8) 100%)
  );
  pointer-events: none;
  z-index: 2;
}

.payline {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  height: 110px;
  border-top: 3px solid rgba(255,34,68,0.4);
  border-bottom: 3px solid rgba(255,34,68,0.4);
  background: rgba(255,34,68,0.05);
  pointer-events: none;
  z-index: 3;
}

.screw {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #444, #111);
  border: 1px solid #333;
}
.screw.tl { top: 8px; left: 8px; }
.screw.tr { top: 8px; right: 8px; }
.screw.bl { bottom: 8px; left: 8px; }
.screw.br { bottom: 8px; right: 8px; }

.credits-row {
  display: flex;
  gap: 15px;
  width: 100%;
}

.credit-box {
  flex: 1;
  background: #000;
  border: 1px solid #222;
  border-radius: 8px;
  padding: 10px 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.credit-label { font-size: 0.55rem; letter-spacing: 0.2em; color: #555; font-weight: 800; }
.credit-value { font-family: 'Press Start 2P', monospace; font-size: 0.75rem; color: var(--gold-l); }
.bet-val { color: var(--red-neon); }

/* ===== LEVER ===== */
.lever-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 50px;
}

.lever-mount {
  position: absolute;
  top: 50px; 
  right: -45px;
  width: 70px;
  height: 250px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
}

.lever-arm {
  position: absolute;
  top: -10px;
  left: 50%;
  transform-origin: center 220px;
  transform: translateX(-50%) rotate(25deg); /* Initial position pointing right-up */
  cursor: pointer;
  transition: transform 0.1s ease;
  z-index: 10;
}

.lever-pull { animation: leverPull 0.5s cubic-bezier(0.5, 0, 0.5, 1) forwards; }
.lever-return { animation: leverReturn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }

@keyframes leverPull {
  0% { transform: translateX(-50%) rotate(25deg); }
  100% { transform: translateX(-50%) rotate(110deg); } /* Pulled down and right */
}
@keyframes leverReturn {
  0% { transform: translateX(-50%) rotate(110deg); }
  100% { transform: translateX(-50%) rotate(25deg); }
}

.lever-shaft {
  width: 22px;
  height: 200px;
  background: linear-gradient(to right, #222, #888, #222);
  border-radius: 11px;
  box-shadow: inset 0 0 10px rgba(0,0,0,0.5);
}

.lever-ball {
  position: absolute;
  top: -25px;
  left: -16px;
  width: 55px;
  height: 55px;
  background: radial-gradient(circle at 35% 35%, var(--gold-l), var(--gold-d));
  border-radius: 50%;
  box-shadow: 
    inset -5px -5px 15px rgba(0,0,0,0.6),
    0 10px 25px rgba(0,0,0,0.5);
}

.lever-base {
  position: absolute;
  bottom: 0;
  width: 75px;
  height: 75px;
  background: #111;
  border: 4px solid #333;
  border-radius: 50%;
  z-index: -1; /* Behind the machine body */
}

.lever-hint { 
  position: absolute;
  bottom: 25px; 
  right: 85px; /* Positioned to the left of the larger base */
  font-size: 0.65rem; 
  color: var(--gold); 
  letter-spacing: 2px; 
  font-weight: 900; 
  text-shadow: 0 0 5px rgba(0,0,0,0.8);
  white-space: nowrap;
}

/* ===== CONTROL PANEL REDESIGN ===== */
.control-panel {
  width: 950px;
  background: linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%);
  border: 4px solid var(--gold-d);
  border-radius: 0 0 30px 30px;
  padding: 15px 50px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}

.panel-top-trim {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(to right, transparent, var(--gold), transparent);
}

.machine-status-screen {
  background: #000;
  border: 2px solid #222;
  border-radius: 12px;
  padding: 25px; /* Taller screen */
  margin-bottom: 25px;
  box-shadow: inset 0 0 30px #000;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.machine-status-screen::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: rgba(255,255,255,0.1);
}

.status-inner {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-text {
  font-family: 'Press Start 2P', cursive;
  font-size: 1rem; /* Significantly larger */
  color: #666;
  letter-spacing: 2px;
  text-shadow: 0 0 10px rgba(201,168,76,0.2);
}

.spinning-text {
  color: var(--gold-l);
  animation: blink 0.5s infinite;
}

.win-text {
  color: #4eff90;
  text-shadow: 0 0 20px rgba(78,255,144,0.8);
  font-size: 1.2rem;
  animation: bounceSmall 0.5s infinite;
}

@keyframes blink { 50% { opacity: 0.5; } }
@keyframes bounceSmall { 50% { transform: scale(1.05); } }

.panel-controls-row {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bet-section {
  width: 100%;
  max-width: 650px;
}

.bet-adjust {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 35px;
  background: rgba(0,0,0,0.8);
  padding: 12px 45px;
  border-radius: 25px;
  border: 3px solid #333;
  box-shadow: 
    inset 0 0 30px #000,
    0 10px 20px rgba(0,0,0,0.5);
}

/* ===== CASINO BUTTONS (REAL SLOT STYLE) ===== */
.casino-btn {
  position: relative;
  border: none;
  border-radius: 12px;
  padding: 4px;
  cursor: pointer;
  transition: all 0.1s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  height: 58px;
  /* Metallic Bezel */
  background: linear-gradient(135deg, #e0e0e0 0%, #888 25%, #fff 50%, #777 75%, #ccc 100%);
  box-shadow: 
    0 6px 0 #444, /* Side of the button assembly */
    0 8px 15px rgba(0,0,0,0.6);
}

.btn-label {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Orbitron', sans-serif;
  font-weight: 900;
  font-size: 0.9rem;
  color: white;
  text-shadow: 0 0 8px rgba(255,255,255,0.5);
  box-shadow: 
    inset 0 2px 5px rgba(255,255,255,0.4),
    inset 0 -2px 5px rgba(0,0,0,0.3);
}

/* Internal Glow & Colors */
.btn-min .btn-label { 
  background: radial-gradient(circle at 50% 30%, #ff6b6b 0%, #b91d1d 100%);
  box-shadow: inset 0 0 15px rgba(255,0,0,0.3);
}
.btn-max .btn-label { 
  background: radial-gradient(circle at 50% 30%, #51cf66 0%, #099268 100%);
  box-shadow: inset 0 0 15px rgba(0,255,0,0.3);
}
.btn-adjust .btn-label { 
  background: radial-gradient(circle at 50% 30%, #fcc419 0%, #d9480f 100%);
  font-size: 1.5rem;
}

/* Hover effects */
.casino-btn:hover:not(:disabled) .btn-label {
  filter: brightness(1.2);
}

/* Pressed State */
.casino-btn:active:not(:disabled) {
  transform: translateY(4px);
  box-shadow: 
    0 2px 0 #222,
    0 4px 10px rgba(0,0,0,0.8);
}

.casino-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

.casino-btn:disabled .btn-label {
  background: #333 !important;
  box-shadow: none !important;
}

.btn-adjust {
  width: 60px;
  min-width: 60px;
}

.bet-info {
  text-align: center;
  min-width: 120px;
}

.bet-info .label {
  display: block;
  font-size: 0.6rem;
  color: #555;
  margin-bottom: 5px;
  font-weight: 900;
  letter-spacing: 2px;
}

.bet-info .value {
  font-size: 1.8rem;
  color: white;
  font-weight: 900;
  text-shadow: 0 0 10px rgba(255,255,255,0.2);
}

/* CELEBRATION */
.win-celebration {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.win-modal {
  background: #111;
  border: 3px solid var(--gold);
  padding: 60px;
  border-radius: 40px;
  text-align: center;
  box-shadow: 0 0 100px rgba(201,168,76,0.2);
}

.win-modal-stars { font-size: 1.5rem; color: var(--gold); margin-bottom: 20px; letter-spacing: 15px; }
.win-modal-title { font-family: 'Cinzel', serif; font-size: 2.2rem; color: white; margin-bottom: 10px; }
.win-modal-amount { font-size: 4.5rem; font-weight: 900; color: #4eff90; text-shadow: 0 0 30px rgba(78,255,144,0.3); }

/* Confetti */
.confetti-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.confetti-piece {
  position: absolute;
  top: -10px;
  border-radius: 2px;
  animation: confettiFall linear forwards;
}
@keyframes confettiFall {
  0% { transform: translateY(0) rotate(0); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

@media (max-width: 700px) {
  .machine-wrapper { transform: scale(0.6); }
}
</style>
