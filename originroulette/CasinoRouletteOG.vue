<template>
  <div class="casino-roulette">
    <!-- Header -->
    <div class="casino-header">
      <div class="header-ornament">✦</div>
      <h1 class="casino-title">GRAND CASINO</h1>
      <div class="casino-subtitle">EUROPEAN ROULETTE</div>
      <div class="header-ornament">✦</div>
    </div>

    <div class="game-layout">
      <!-- LEFT: Roulette Wheel -->
      <div class="wheel-section">
        <div class="wheel-container" :class="{ spinning: isSpinning }">
          <!-- Outer rim -->
          <div class="wheel-outer-rim">
            <div class="wheel-diamond" v-for="i in 18" :key="'d'+i" :style="{ transform: `rotate(${i * 20}deg) translateY(-50%)` }">◆</div>
          </div>

          <!-- Main wheel -->
          <div class="wheel-main" :style="{ transform: `rotate(${wheelRotation}deg)`, transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.1, 0.7, 0.3, 1)` : 'none' }">
            <div
              v-for="(slot, idx) in wheelSlots"
              :key="idx"
              class="wheel-slot"
              :style="getSlotStyle(idx)"
            >
              <div class="slot-number" :class="slot.color">{{ slot.number }}</div>
            </div>
          </div>

          <!-- Center hub -->
          <div class="wheel-center">
            <div class="wheel-hub">
              <div class="hub-inner">
                <span class="hub-symbol">♠</span>
              </div>
            </div>
          </div>

          <!-- Ball -->
          <div class="ball-track">
            <div
              class="ball"
              :style="{
                transform: `rotate(${ballAngle}deg) translateY(-${ballTrackRadius}px)`,
                opacity: ballVisible ? 1 : 0
              }"
            ></div>
          </div>

          <!-- Winner marker -->
          <div class="wheel-marker">▼</div>
        </div>

        <!-- Spin controls -->
        <div class="spin-controls">
          <div class="balance-display">
            <span class="balance-label">SALDO</span>
            <span class="balance-amount">{{ balance.toLocaleString() }}€</span>
          </div>
          <button
            class="spin-btn"
            @click="spin"
            :disabled="isSpinning || totalBet === 0"
            :class="{ 'btn-ready': totalBet > 0 && !isSpinning }"
          >
            <span v-if="!isSpinning">{{ totalBet > 0 ? '▶ GIRAR' : 'APUESTA' }}</span>
            <span v-else class="spinning-text">GIRANDO...</span>
          </button>
          <button class="clear-btn" @click="clearBets" :disabled="isSpinning">
            ✕ LIMPIAR
          </button>
        </div>

        <!-- Last numbers -->
        <div class="history-section">
          <div class="history-label">ÚLTIMOS NÚMEROS</div>
          <div class="history-numbers">
            <div
              v-for="(num, i) in history.slice(-12).reverse()"
              :key="i"
              class="history-num"
              :class="getNumberColor(num)"
            >{{ num }}</div>
          </div>
        </div>
      </div>

      <!-- RIGHT: Betting Table -->
      <div class="table-section">
        <!-- Chip selector -->
        <div class="chip-selector">
          <div class="chip-label">FICHA</div>
          <div class="chips-row">
            <div
              v-for="chip in chips"
              :key="chip.value"
              class="chip"
              :class="[chip.class, { selected: selectedChip === chip.value }]"
              @click="selectedChip = chip.value"
            >
              <span>{{ chip.label }}</span>
            </div>
          </div>
          <div class="total-bet-display">
            APUESTA TOTAL: <strong>{{ totalBet }}€</strong>
          </div>
        </div>

        <!-- Betting grid -->
        <div class="betting-table">
          <!-- Zero -->
          <div class="zero-row">
            <div class="bet-cell zero-cell" @click="placeBet('number', 0)" :data-bets="getBetDisplay('number-0')">
              <span>0</span>
              <div class="bet-chips" v-if="getBetAmount('number', 0) > 0">
                <div class="placed-chip">{{ getBetAmount('number', 0) }}</div>
              </div>
            </div>
          </div>

          <!-- Numbers grid 1-36 -->
          <div class="numbers-grid">
            <div
              v-for="num in 36"
              :key="num"
              class="bet-cell number-cell"
              :class="getNumberColor(num)"
              @click="placeBet('number', num)"
            >
              <span>{{ num }}</span>
              <div class="bet-chips" v-if="getBetAmount('number', num) > 0">
                <div class="placed-chip">{{ getBetAmount('number', num) }}</div>
              </div>
            </div>
          </div>

          <!-- Dozens -->
          <div class="dozens-row">
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 1)">
              <span>1ª DOCENA</span><span class="payout-tag">2:1</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 1) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 1) }}</div>
              </div>
            </div>
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 2)">
              <span>2ª DOCENA</span><span class="payout-tag">2:1</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 2) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 2) }}</div>
              </div>
            </div>
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 3)">
              <span>3ª DOCENA</span><span class="payout-tag">2:1</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 3) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 3) }}</div>
              </div>
            </div>
          </div>

          <!-- Outside bets -->
          <div class="outside-bets-row">
            <div class="bet-cell outside-cell" @click="placeBet('low')">
              <span>1-18</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('low') > 0">
                <div class="placed-chip">{{ getBetAmount('low') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('even')">
              <span>PAR</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('even') > 0">
                <div class="placed-chip">{{ getBetAmount('even') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell red-outside" @click="placeBet('red')">
              <span>ROJO</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('red') > 0">
                <div class="placed-chip">{{ getBetAmount('red') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell black-outside" @click="placeBet('black')">
              <span>NEGRO</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('black') > 0">
                <div class="placed-chip">{{ getBetAmount('black') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('odd')">
              <span>IMPAR</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('odd') > 0">
                <div class="placed-chip">{{ getBetAmount('odd') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('high')">
              <span>19-36</span><span class="payout-tag">1:1</span>
              <div class="bet-chips" v-if="getBetAmount('high') > 0">
                <div class="placed-chip">{{ getBetAmount('high') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Result Modal -->
    <transition name="result-fade">
      <div v-if="showResult" class="result-overlay" @click="dismissResult">
        <div class="result-modal" :class="resultClass" @click.stop>
          <div class="result-ornament">✦ ✦ ✦</div>
          <div class="result-number" :class="getNumberColor(winningNumber)">{{ winningNumber }}</div>
          <div class="result-color">{{ getNumberColorName(winningNumber) }}</div>
          <div class="result-message">{{ resultMessage }}</div>
          <div class="result-winnings" v-if="lastWinnings > 0">+{{ lastWinnings }}€</div>
          <div class="result-winnings loss" v-else>-{{ lastBetAmount }}€</div>
          <div class="result-ornament">✦ ✦ ✦</div>
          <button class="dismiss-btn" @click="dismissResult">CONTINUAR</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'CasinoRoulette',
  data() {
    return {
      // Wheel setup (European roulette order)
      wheelOrder: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
      redNumbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],

      // Game state
      wheelRotation: 0,
      ballAngle: 0,
      ballTrackRadius: 130,
      ballVisible: false,
      isSpinning: false,
      spinDuration: 5,

      // Bets
      bets: {},
      selectedChip: 5,
      chips: [
        { value: 1, label: '1', class: 'chip-1' },
        { value: 5, label: '5', class: 'chip-5' },
        { value: 10, label: '10', class: 'chip-10' },
        { value: 25, label: '25', class: 'chip-25' },
        { value: 100, label: '100', class: 'chip-100' },
      ],

      // Result
      winningNumber: null,
      showResult: false,
      resultMessage: '',
      lastWinnings: 0,
      lastBetAmount: 0,
      resultClass: '',
      history: [],

      // Balance
      balance: 1000,
    }
  },
  computed: {
    wheelSlots() {
      return this.wheelOrder.map(num => ({
        number: num,
        color: num === 0 ? 'green' : this.redNumbers.includes(num) ? 'red' : 'black'
      }))
    },
    totalBet() {
      return Object.values(this.bets).reduce((sum, v) => sum + v, 0)
    }
  },
  methods: {
    getSlotStyle(idx) {
      const total = this.wheelOrder.length
      const angle = (idx / total) * 360
      return {
        transform: `rotate(${angle}deg)`,
      }
    },

    getNumberColor(num) {
      if (num === 0) return 'green'
      return this.redNumbers.includes(num) ? 'red' : 'black'
    },

    getNumberColorName(num) {
      if (num === 0) return 'VERDE'
      return this.redNumbers.includes(num) ? 'ROJO' : 'NEGRO'
    },

    getBetKey(type, value) {
      return value !== undefined ? `${type}-${value}` : type
    },

    getBetAmount(type, value) {
      const key = this.getBetKey(type, value)
      return this.bets[key] || 0
    },

    getBetDisplay(key) {
      return this.bets[key] || 0
    },

    placeBet(type, value) {
      if (this.isSpinning) return
      if (this.balance < this.selectedChip) {
        alert('Saldo insuficiente')
        return
      }
      const key = this.getBetKey(type, value)
      if (!this.bets[key]) this.bets[key] = 0
      this.bets[key] += this.selectedChip
      this.balance -= this.selectedChip
    },

    clearBets() {
      // Refund bets
      this.balance += this.totalBet
      this.bets = {}
    },

    spin() {
      if (this.isSpinning || this.totalBet === 0) return
      this.isSpinning = true
      this.showResult = false
      this.ballVisible = true

      // Pick random winning number
      const winIdx = Math.floor(Math.random() * this.wheelOrder.length)
      const winning = this.wheelOrder[winIdx]

      // Calculate wheel rotation to land on winner
      const slotAngle = 360 / this.wheelOrder.length
      const targetAngle = winIdx * slotAngle
      const extraSpins = (5 + Math.floor(Math.random() * 3)) * 360
      const finalRotation = this.wheelRotation + extraSpins + (360 - (this.wheelRotation % 360)) + targetAngle + (slotAngle / 2)

      this.spinDuration = 5 + Math.random() * 2
      this.wheelRotation = finalRotation

      // Animate ball
      this.animateBall(winning, winIdx)

      setTimeout(() => {
        this.isSpinning = false
        this.ballVisible = false
        this.winningNumber = winning
        this.history.push(winning)
        this.calculateWinnings(winning)
        this.showResult = true
      }, (this.spinDuration + 0.2) * 1000)
    },

    animateBall(winningNum, winIdx) {
      const duration = this.spinDuration * 1000
      const start = Date.now()
      const slotAngle = 360 / this.wheelOrder.length
      const finalBallAngle = winIdx * slotAngle

      const animate = () => {
        if (!this.isSpinning) return
        const elapsed = Date.now() - start
        const progress = Math.min(elapsed / duration, 1)
        // Ball goes opposite direction, decelerating
        const ballSpeed = (1 - progress) * 20 + 2
        this.ballAngle -= ballSpeed
        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      requestAnimationFrame(animate)
    },

    calculateWinnings(winning) {
      let totalWin = 0
      const savedBets = { ...this.bets }
      this.lastBetAmount = this.totalBet

      for (const [key, amount] of Object.entries(savedBets)) {
        const [type, value] = key.split('-')
        const numValue = parseInt(value)

        let payout = 0

        if (type === 'number') {
          if (numValue === winning) payout = amount * 36
        } else if (type === 'red') {
          if (this.redNumbers.includes(winning)) payout = amount * 2
        } else if (type === 'black') {
          if (!this.redNumbers.includes(winning) && winning !== 0) payout = amount * 2
        } else if (type === 'even') {
          if (winning !== 0 && winning % 2 === 0) payout = amount * 2
        } else if (type === 'odd') {
          if (winning % 2 !== 0) payout = amount * 2
        } else if (type === 'low') {
          if (winning >= 1 && winning <= 18) payout = amount * 2
        } else if (type === 'high') {
          if (winning >= 19 && winning <= 36) payout = amount * 2
        } else if (type === 'dozen') {
          const d = numValue
          const inDozen = (d === 1 && winning >= 1 && winning <= 12) ||
                         (d === 2 && winning >= 13 && winning <= 24) ||
                         (d === 3 && winning >= 25 && winning <= 36)
          if (inDozen) payout = amount * 3
        }

        totalWin += payout
      }

      this.lastWinnings = totalWin
      this.balance += totalWin

      if (totalWin > 0) {
        this.resultMessage = '¡GANASTE!'
        this.resultClass = 'win'
      } else {
        this.resultMessage = 'MEJOR SUERTE'
        this.resultClass = 'loss'
      }

      this.bets = {}
    },

    dismissResult() {
      this.showResult = false
      if (this.balance <= 0) {
        this.balance = 1000
      }
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@400;700&display=swap');

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.casino-roulette {
  --gold: #c9a84c;
  --gold-light: #f0d080;
  --gold-dark: #8a6a20;
  --felt: #1a5c3a;
  --felt-dark: #0f3d27;
  --felt-light: #256b45;
  --red: #c0222a;
  --red-dark: #8a1520;
  --black: #1a1a1a;
  --black-light: #2d2d2d;
  --green-num: #1a7a40;
  --cream: #f5ead0;
  --bg-dark: #0a0a0a;

  background: radial-gradient(ellipse at 50% 30%, #1a0a05 0%, #0a0a0a 70%);
  min-height: 100vh;
  padding: 20px;
  font-family: 'Cinzel', serif;
  color: var(--cream);
  position: relative;
  overflow: hidden;
}

/* Noise texture overlay */
.casino-roulette::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
}

/* Header */
.casino-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;
}

.casino-title {
  font-family: 'Cinzel Decorative', serif;
  font-size: clamp(1.4rem, 3vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.3em;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 50%, #8a6a20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 0 20px rgba(201,168,76,0.4));
}

.casino-subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.5em;
  color: var(--gold);
  opacity: 0.7;
  position: absolute;
  bottom: -14px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

.header-ornament {
  color: var(--gold);
  font-size: 1.2rem;
  opacity: 0.6;
}

/* Layout */
.game-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: center;
  position: relative;
  z-index: 1;
  flex-wrap: wrap;
}

/* ===== WHEEL SECTION ===== */
.wheel-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.wheel-container {
  position: relative;
  width: 340px;
  height: 340px;
}

/* Outer decorative rim */
.wheel-outer-rim {
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a6a20 0%, #c9a84c 30%, #f0d080 50%, #c9a84c 70%, #8a6a20 100%);
  box-shadow:
    0 0 0 4px #0a0a0a,
    0 0 30px rgba(201,168,76,0.5),
    inset 0 0 20px rgba(0,0,0,0.5);
  z-index: 0;
}

.wheel-diamond {
  position: absolute;
  top: 50%;
  left: 50%;
  transform-origin: 0 0;
  font-size: 0.6rem;
  color: #0a0a0a;
  opacity: 0.6;
}

/* Main spinning wheel */
.wheel-main {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #1a1a1a;
  overflow: hidden;
  z-index: 1;
  box-shadow: inset 0 0 40px rgba(0,0,0,0.8);
}

.wheel-slot {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 50%;
  transform-origin: 0% 100%;
  overflow: hidden;
}

.slot-number {
  position: absolute;
  bottom: 5px;
  right: 12px;
  font-size: 0.55rem;
  font-weight: 700;
  color: white;
  transform: rotate(85deg);
  transform-origin: center;
  letter-spacing: 0;
}

.slot-number.red {
  color: #ff6060;
  text-shadow: 0 0 4px rgba(255,60,60,0.6);
}
.slot-number.black {
  color: #aaa;
}
.slot-number.green {
  color: #4eff90;
  text-shadow: 0 0 4px rgba(78,255,144,0.6);
}

/* Visual separation between slots */
.wheel-slot::after {
  content: '';
  position: absolute;
  bottom: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom right,
    transparent 49%,
    rgba(201,168,76,0.15) 50%,
    transparent 51%
  );
  pointer-events: none;
}

/* Draw colored wedges using box shadows trick */
.wheel-main::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    /* European roulette color sequence: 0=green, then alternating red/black */
    #1a7a40 0deg 9.73deg,
    #c0222a 9.73deg 19.46deg,
    #1a1a1a 19.46deg 29.19deg,
    #c0222a 29.19deg 38.92deg,
    #1a1a1a 38.92deg 48.65deg,
    #c0222a 48.65deg 58.38deg,
    #1a1a1a 58.38deg 68.11deg,
    #c0222a 68.11deg 77.84deg,
    #1a1a1a 77.84deg 87.57deg,
    #c0222a 87.57deg 97.3deg,
    #1a1a1a 97.3deg 107.03deg,
    #c0222a 107.03deg 116.76deg,
    #1a1a1a 116.76deg 126.49deg,
    #c0222a 126.49deg 136.22deg,
    #1a1a1a 136.22deg 145.95deg,
    #c0222a 145.95deg 155.68deg,
    #1a1a1a 155.68deg 165.41deg,
    #c0222a 165.41deg 175.14deg,
    #1a1a1a 175.14deg 184.87deg,
    #c0222a 184.87deg 194.6deg,
    #1a1a1a 194.6deg 204.33deg,
    #c0222a 204.33deg 214.06deg,
    #1a1a1a 214.06deg 223.79deg,
    #c0222a 223.79deg 233.52deg,
    #1a1a1a 233.52deg 243.25deg,
    #c0222a 243.25deg 252.98deg,
    #1a1a1a 252.98deg 262.71deg,
    #c0222a 262.71deg 272.44deg,
    #1a1a1a 272.44deg 282.17deg,
    #c0222a 282.17deg 291.9deg,
    #1a1a1a 291.9deg 301.63deg,
    #c0222a 301.63deg 311.36deg,
    #1a1a1a 311.36deg 321.09deg,
    #c0222a 321.09deg 330.82deg,
    #1a1a1a 330.82deg 340.55deg,
    #c0222a 340.55deg 350.28deg,
    #1a1a1a 350.28deg 360deg
  );
}

/* Numbers overlay on wheel (radial lines) */
.wheel-main::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: repeating-conic-gradient(
    rgba(201,168,76,0.08) 0deg,
    rgba(201,168,76,0.08) 0.3deg,
    transparent 0.3deg,
    transparent 9.73deg
  );
  pointer-events: none;
}

/* Ball track */
.ball-track {
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  z-index: 3;
  pointer-events: none;
}

.ball {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 14px;
  margin: -7px 0 0 -7px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ffffff, #cccccc, #888888);
  box-shadow: 0 0 6px rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.6);
  transform-origin: 7px 7px;
  transition: opacity 0.3s;
}

/* Center hub */
.wheel-center {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 4;
  pointer-events: none;
}

.wheel-hub {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a84c, #8a6a20, #c9a84c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 0 4px #1a1a1a, 0 0 0 6px var(--gold), 0 0 20px rgba(201,168,76,0.4);
}

.hub-inner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, #2d2d2d, #0a0a0a);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--gold-dark);
}

.hub-symbol {
  font-size: 1.5rem;
  color: var(--gold);
  filter: drop-shadow(0 0 6px rgba(201,168,76,0.6));
}

/* Marker */
.wheel-marker {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.4rem;
  color: var(--gold-light);
  z-index: 5;
  filter: drop-shadow(0 0 6px rgba(240,208,128,0.8));
}

/* Spin controls */
.spin-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 340px;
}

.balance-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--gold-dark);
  border-radius: 4px;
  padding: 8px 12px;
  min-width: 100px;
}

.balance-label {
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: var(--gold);
  opacity: 0.7;
}

.balance-amount {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--gold-light);
}

.spin-btn {
  flex: 1;
  padding: 12px 16px;
  background: linear-gradient(180deg, #4a4a4a 0%, #1a1a1a 100%);
  border: 2px solid var(--gold-dark);
  border-radius: 4px;
  color: var(--gold);
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.5;
}

.spin-btn.btn-ready {
  background: linear-gradient(180deg, #c9a84c 0%, #8a6a20 100%);
  border-color: var(--gold-light);
  color: #0a0a0a;
  opacity: 1;
  box-shadow: 0 0 20px rgba(201,168,76,0.4);
}

.spin-btn.btn-ready:hover:not(:disabled) {
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 100%);
  box-shadow: 0 0 30px rgba(201,168,76,0.7);
  transform: translateY(-1px);
}

.spin-btn:disabled { cursor: not-allowed; }

.spinning-text {
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.clear-btn {
  padding: 12px 12px;
  background: transparent;
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 4px;
  color: var(--gold);
  font-family: 'Cinzel', serif;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.7;
}

.clear-btn:hover:not(:disabled) {
  border-color: var(--gold);
  opacity: 1;
}

.clear-btn:disabled { cursor: not-allowed; opacity: 0.3; }

/* History */
.history-section {
  width: 340px;
}

.history-label {
  font-size: 0.55rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  opacity: 0.6;
  margin-bottom: 6px;
  text-align: center;
}

.history-numbers {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.history-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  flex-shrink: 0;
}

.history-num.red { background: var(--red); color: white; }
.history-num.black { background: var(--black-light); color: white; border: 1px solid #444; }
.history-num.green { background: var(--green-num); color: white; }

/* ===== TABLE SECTION ===== */
.table-section {
  flex: 1;
  min-width: 320px;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Chip selector */
.chip-selector {
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(201,168,76,0.2);
  border-radius: 6px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.chip-label {
  font-size: 0.6rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  opacity: 0.6;
  white-space: nowrap;
}

.chips-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  border: 3px dashed rgba(255,255,255,0.2);
  position: relative;
  user-select: none;
}

.chip::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
}

.chip.selected {
  transform: scale(1.15) translateY(-3px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.5), 0 0 0 2px white;
}

.chip-1 { background: radial-gradient(circle, #aaa, #666); color: #1a1a1a; border-color: #888; }
.chip-5 { background: radial-gradient(circle, #e74c3c, #922b21); color: white; border-color: #e74c3c; }
.chip-10 { background: radial-gradient(circle, #3498db, #1a5276); color: white; border-color: #3498db; }
.chip-25 { background: radial-gradient(circle, #2ecc71, #1a6b3a); color: white; border-color: #2ecc71; }
.chip-100 { background: radial-gradient(circle, #f0d080, #8a6a20); color: #1a1a1a; border-color: #c9a84c; }

.total-bet-display {
  margin-left: auto;
  font-size: 0.65rem;
  color: var(--cream);
  opacity: 0.8;
  white-space: nowrap;
}

.total-bet-display strong {
  color: var(--gold-light);
}

/* Betting table */
.betting-table {
  background: var(--felt);
  border: 3px solid var(--gold-dark);
  border-radius: 8px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(201,168,76,0.1),
    inset 0 0 40px rgba(0,0,0,0.3),
    0 8px 32px rgba(0,0,0,0.6);
  position: relative;
}

.betting-table::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 59px,
    rgba(201,168,76,0.05) 59px,
    rgba(201,168,76,0.05) 60px
  );
  pointer-events: none;
}

/* Zero row */
.zero-row {
  display: flex;
  border-bottom: 1px solid rgba(201,168,76,0.2);
}

.zero-cell {
  width: 100%;
  padding: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  background: linear-gradient(180deg, #1a7a40, #0f5a2d) !important;
  color: white !important;
  text-align: center;
  justify-content: center;
  border: none !important;
}

/* Numbers grid */
.numbers-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  border-bottom: 1px solid rgba(201,168,76,0.2);
}

.bet-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  border: 1px solid rgba(201,168,76,0.15);
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
  font-size: 0.75rem;
  font-weight: 600;
  user-select: none;
  overflow: visible;
}

.bet-cell:hover {
  filter: brightness(1.3);
  z-index: 2;
  box-shadow: inset 0 0 12px rgba(255,255,255,0.15);
}

.number-cell.red {
  background: linear-gradient(180deg, #c0222a, #8a1520);
  color: white;
}

.number-cell.black {
  background: linear-gradient(180deg, #2d2d2d, #1a1a1a);
  color: white;
}

.number-cell.green {
  background: linear-gradient(180deg, #1a7a40, #0f5a2d);
  color: white;
}

/* Dozens */
.dozens-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border-bottom: 1px solid rgba(201,168,76,0.2);
}

.dozen-cell {
  background: rgba(0,0,0,0.2);
  color: var(--cream);
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  min-height: 36px;
  flex-direction: row;
  gap: 6px;
  justify-content: center;
}

/* Outside bets */
.outside-bets-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
}

.outside-cell {
  background: rgba(0,0,0,0.15);
  color: var(--cream);
  font-size: 0.6rem;
  letter-spacing: 0.05em;
  min-height: 40px;
  flex-direction: column;
  gap: 2px;
}

.red-outside {
  background: linear-gradient(180deg, rgba(192,34,42,0.4), rgba(138,21,32,0.4)) !important;
}
.black-outside {
  background: linear-gradient(180deg, rgba(45,45,45,0.6), rgba(26,26,26,0.6)) !important;
}

.payout-tag {
  font-size: 0.5rem;
  color: var(--gold);
  opacity: 0.7;
}

/* Placed chips on bets */
.bet-chips {
  position: absolute;
  top: -8px;
  right: -8px;
  z-index: 10;
}

.placed-chip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle, #f0d080, #c9a84c);
  color: #0a0a0a;
  font-size: 0.5rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.6);
  font-family: 'Cinzel', serif;
}

/* ===== RESULT MODAL ===== */
.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.result-modal {
  background: linear-gradient(160deg, #1a1005 0%, #0a0a0a 100%);
  border: 2px solid var(--gold);
  border-radius: 12px;
  padding: 40px 60px;
  text-align: center;
  box-shadow: 0 0 60px rgba(201,168,76,0.3), 0 0 120px rgba(201,168,76,0.1);
  min-width: 300px;
}

.result-ornament {
  color: var(--gold);
  font-size: 0.8rem;
  letter-spacing: 0.3em;
  opacity: 0.5;
  margin: 8px 0;
}

.result-number {
  font-size: 5rem;
  font-weight: 900;
  line-height: 1;
  margin: 16px 0 4px;
}

.result-number.red { color: #ff4444; text-shadow: 0 0 30px rgba(255,68,68,0.6); }
.result-number.black { color: #aaaaaa; text-shadow: 0 0 30px rgba(170,170,170,0.4); }
.result-number.green { color: #44ff88; text-shadow: 0 0 30px rgba(68,255,136,0.6); }

.result-color {
  font-size: 0.7rem;
  letter-spacing: 0.4em;
  opacity: 0.6;
  color: var(--cream);
  margin-bottom: 16px;
}

.result-message {
  font-size: 1.2rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  color: var(--gold-light);
  margin-bottom: 8px;
}

.result-winnings {
  font-size: 2rem;
  font-weight: 700;
  color: #44ff88;
  text-shadow: 0 0 20px rgba(68,255,136,0.5);
  margin-bottom: 8px;
}

.result-winnings.loss {
  color: #ff6666;
  text-shadow: 0 0 20px rgba(255,102,102,0.5);
}

.dismiss-btn {
  margin-top: 20px;
  padding: 10px 32px;
  background: linear-gradient(180deg, #c9a84c, #8a6a20);
  border: none;
  border-radius: 4px;
  color: #0a0a0a;
  font-family: 'Cinzel', serif;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.2s;
}

.dismiss-btn:hover {
  background: linear-gradient(180deg, #f0d080, #c9a84c);
  box-shadow: 0 0 20px rgba(201,168,76,0.5);
}

/* Transitions */
.result-fade-enter-active, .result-fade-leave-active {
  transition: all 0.4s ease;
}
.result-fade-enter-from, .result-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Responsive */
@media (max-width: 800px) {
  .game-layout {
    flex-direction: column;
    align-items: center;
  }

  .table-section {
    width: 100%;
    max-width: 560px;
  }

  .numbers-grid {
    grid-template-columns: repeat(9, 1fr);
  }

  .outside-bets-row {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
