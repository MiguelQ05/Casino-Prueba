<template>
  <div class="casino-roulette">
    <!-- Header -->
    <div class="casino-header">
      <h1 class="casino-title">GRAND CASINO</h1>
      <div class="casino-subtitle">EUROPEAN ROULETTE</div>
    </div>

    <div class="game-layout">
      <!-- LEFT: Roulette Wheel -->
      <div class="wheel-section">
        <div class="wheel-container" :class="{ spinning: isSpinning }">
          <!-- Outer decorative rim -->
          <div class="wheel-outer-rim">
            <div class="wheel-diamond" v-for="i in 12" :key="'d'+i" :style="{ transform: `rotate(${i * 30}deg) translateY(-165px)` }">◆</div>
          </div>

          <!-- Main spinning wheel -->
          <div class="wheel-main" :style="{ transform: `rotate(${wheelRotation}deg)`, transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.1, 0.7, 0.1, 1)` : 'none' }">
            <!-- Colored wedges background -->
            <div class="wheel-wedges" :style="{ background: wedgesGradient }"></div>
            
            <!-- Numbers -->
            <div
              v-for="(num, idx) in wheelOrder"
              :key="idx"
              class="wheel-number"
              :style="getSlotStyle(idx)"
            >
              <span :class="getNumberColor(num)">{{ num }}</span>
            </div>

            <!-- Inner glossy overlays -->
            <div class="wheel-gloss"></div>
          </div>

          <!-- Center hub -->
          <div class="wheel-center">
            <div class="wheel-hub">
              <div class="hub-inner">
                <span class="hub-symbol">♠</span>
              </div>
              <div class="hub-spokes">
                <div v-for="i in 4" :key="i" class="spoke" :style="{ transform: `rotate(${i * 90}deg)` }"></div>
              </div>
            </div>
          </div>

          <!-- Ball (Independent again to hide result) -->
          <div class="ball-track" :style="{ transform: `rotate(${ballAngle}deg)`, transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.1, 0.5, 0.2, 1)` : 'none' }">
            <div
              v-if="ballVisible"
              class="ball"
              :style="{ transform: `translateY(-${ballTrackRadius}px)`, transition: `all ${spinDuration}s ease-in` }"
            ></div>
          </div>
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
          <div class="history-label">ÚLTIMOS</div>
          <div class="history-numbers">
            <div
              v-for="(num, i) in history.slice(-8).reverse()"
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
            <div 
              class="chip chip-all-in" 
              :class="{ selected: selectedChip === balance && balance > 0 }"
              @click="selectedChip = balance"
              v-if="balance > 0"
            >
              <span>MAX</span>
            </div>
          </div>
          <div class="total-bet-display">
            APUESTA TOTAL: <strong>{{ totalBet }}€</strong>
          </div>
        </div>

        <!-- Betting grid -->
        <div class="betting-table">
          <div class="zero-row">
            <div class="bet-cell zero-cell" @click="placeBet('number', 0)">
              <span>0</span>
              <div class="bet-chips" v-if="getBetAmount('number', 0) > 0">
                <div class="placed-chip">{{ getBetAmount('number', 0) }}</div>
              </div>
            </div>
          </div>

          <div class="numbers-grid">
            <div
              v-for="num in tableNumbers"
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

          <div class="dozens-row">
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 1)">
              <span>1ª DOCENA</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 1) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 1) }}</div>
              </div>
            </div>
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 2)">
              <span>2ª DOCENA</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 2) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 2) }}</div>
              </div>
            </div>
            <div class="bet-cell dozen-cell" @click="placeBet('dozen', 3)">
              <span>3ª DOCENA</span>
              <div class="bet-chips" v-if="getBetAmount('dozen', 3) > 0">
                <div class="placed-chip">{{ getBetAmount('dozen', 3) }}</div>
              </div>
            </div>
          </div>

          <div class="outside-bets-row">
            <div class="bet-cell outside-cell" @click="placeBet('low')"><span>1-18</span>
              <div class="bet-chips" v-if="getBetAmount('low') > 0">
                <div class="placed-chip">{{ getBetAmount('low') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('even')"><span>PAR</span>
              <div class="bet-chips" v-if="getBetAmount('even') > 0">
                <div class="placed-chip">{{ getBetAmount('even') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell red-outside" @click="placeBet('red')"><span>ROJO</span>
              <div class="bet-chips" v-if="getBetAmount('red') > 0">
                <div class="placed-chip">{{ getBetAmount('red') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell black-outside" @click="placeBet('black')"><span>NEGRO</span>
              <div class="bet-chips" v-if="getBetAmount('black') > 0">
                <div class="placed-chip">{{ getBetAmount('black') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('odd')"><span>IMPAR</span>
              <div class="bet-chips" v-if="getBetAmount('odd') > 0">
                <div class="placed-chip">{{ getBetAmount('odd') }}</div>
              </div>
            </div>
            <div class="bet-cell outside-cell" @click="placeBet('high')"><span>19-36</span>
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
          <div class="result-number" :class="getNumberColor(winningNumber)">{{ winningNumber }}</div>
          <div class="result-message">{{ resultMessage }}</div>
          <div class="result-amount" :class="resultClass">
            <span v-if="lastWinnings > 0">+{{ lastWinnings }}€</span>
            <span v-else>-{{ lastTotalBet }}€</span>
          </div>
          <button class="dismiss-btn" @click="dismissResult">CONTINUAR</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { useBalance } from '../composables/useBalance.js'

export default {
  name: 'CasinoRoulette',

  setup() {
    const { balance, deduct, credit, refill } = useBalance()
    return { balance, deduct, credit, refill }
  },

  data() {
    return {
      // European Wheel Order
      wheelOrder: [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26],
      redNumbers: [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36],
      
      // State
      wheelRotation: 0,
      ballAngle: 0,
      ballTrackRadius: 180,
      ballVisible: false,
      ballLanding: false,
      isSpinning: false,
      spinDuration: 7,

      // Betting
      bets: {},
      selectedChip: 5,
      chips: [
        { value: 1, label: '1', class: 'chip-1' },
        { value: 5, label: '5', class: 'chip-5' },
        { value: 10, label: '10', class: 'chip-10' },
        { value: 25, label: '25', class: 'chip-25' },
        { value: 100, label: '100', class: 'chip-100' }
      ],
      
      // UI
      winningNumber: null,
      showResult: false,
      resultMessage: '',
      lastWinnings: 0,
      lastTotalBet: 0,
      resultClass: '',
      history: [],
      tableNumbers: [
        3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36,
        2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35,
        1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
      ]
    }
  },
  computed: {
    totalBet() {
      return Object.values(this.bets).reduce((a, b) => a + b, 0)
    },
    wedgesGradient() {
      const total = 37
      const step = 360 / total
      let gradientParts = []
      
      this.wheelOrder.forEach((num, i) => {
        const color = this.getNumberColor(num)
        const hex = color === 'green' ? '#1a7a40' : (color === 'red' ? '#c0222a' : '#1a1a1a')
        const start = i * step
        const end = (i + 1) * step
        gradientParts.push(`${hex} ${start}deg ${end}deg`)
      })
      
      return `conic-gradient(${gradientParts.join(', ')})`
    }
  },
  methods: {
    getSlotStyle(idx) {
      const slotAngle = 360 / 37
      const angle = (idx * slotAngle) + (slotAngle / 2)
      return {
        transform: `rotate(${angle}deg) translateY(-172px)`
      }
    },
    getNumberColor(num) {
      if (num === 0) return 'green'
      return this.redNumbers.includes(num) ? 'red' : 'black'
    },
    getBetAmount(type, val) {
      const key = val !== undefined ? `${type}-${val}` : type
      return this.bets[key] || 0
    },
    placeBet(type, val) {
      if (this.isSpinning) return
      if (this.balance < this.selectedChip) return
      
      const key = val !== undefined ? `${type}-${val}` : type
      this.bets[key] = (this.bets[key] || 0) + this.selectedChip
      this.deduct(this.selectedChip)
    },
    clearBets() {
      if (this.isSpinning) return
      this.credit(this.totalBet)
      this.bets = {}
    },
    spin() {
      if (this.isSpinning || this.totalBet === 0) return
      
      this.isSpinning = true
      this.showResult = false
      this.ballVisible = true
      this.lastTotalBet = this.totalBet
      
      const winIdx = Math.floor(Math.random() * 37)
      const winner = this.wheelOrder[winIdx]
      const slotAngle = 360 / 37
      
      // 1. WHEEL: Rotate to bring winner to a RANDOM global stop angle
      const randomStopOffset = Math.random() * 360
      const targetWheelAngle = (winIdx * slotAngle) + (slotAngle / 2)
      const currentWheelMod = this.wheelRotation % 360
      const wheelNeededMod = (360 - targetWheelAngle + randomStopOffset) % 360
      const wheelDiff = (wheelNeededMod - currentWheelMod + 360) % 360
      const wheelSpins = 6 * 360
      const finalWheelRotation = this.wheelRotation + wheelSpins + wheelDiff
      
      // 2. BALL: Rotate independently to land at the SAME random stop angle
      const currentBallMod = this.ballAngle % 360
      const ballSpins = 12 * 360
      // Ball ends at randomStopOffset mod 360
      const finalBallAngle = this.ballAngle - ballSpins - currentBallMod + randomStopOffset
      
      this.spinDuration = 10
      this.wheelRotation = finalWheelRotation
      this.ballAngle = finalBallAngle
      this.ballTrackRadius = 180 
      
      // Delay the "drop" of the ball radius to simulate landing
      setTimeout(() => {
        if (this.isSpinning) this.ballTrackRadius = 145
      }, 7500)
      
      setTimeout(() => {
        this.isSpinning = false
        setTimeout(() => {
          this.ballVisible = false
          this.winningNumber = winner
          this.history.push(winner)
          this.calculateWin(winner)
          this.showResult = true
        }, 1500)
      }, this.spinDuration * 1000)
    },
    calculateWin(winner) {
      let winAmount = 0
      for (const [key, amount] of Object.entries(this.bets)) {
        const [type, val] = key.split('-')
        const v = parseInt(val)
        
        if (type === 'number' && v === winner) winAmount += amount * 36
        else if (type === 'red' && this.redNumbers.includes(winner)) winAmount += amount * 2
        else if (type === 'black' && !this.redNumbers.includes(winner) && winner !== 0) winAmount += amount * 2
        else if (type === 'even' && winner !== 0 && winner % 2 === 0) winAmount += amount * 2
        else if (type === 'odd' && winner % 2 !== 0) winAmount += amount * 2
        else if (type === 'low' && winner >= 1 && winner <= 18) winAmount += amount * 2
        else if (type === 'high' && winner >= 19 && winner <= 36) winAmount += amount * 2
        else if (type === 'dozen') {
          if (v === 1 && winner >= 1 && winner <= 12) winAmount += amount * 3
          if (v === 2 && winner >= 13 && winner <= 24) winAmount += amount * 3
          if (v === 3 && winner >= 25 && winner <= 36) winAmount += amount * 3
        }
      }
      
      this.lastWinnings = winAmount
      this.credit(winAmount)
      this.resultMessage = winAmount > 0 ? '¡HAS GANADO!' : 'MEJOR SUERTE'
      this.resultClass = winAmount > 0 ? 'win' : 'loss'
      this.bets = {}
    },
    dismissResult() {
      this.showResult = false
      if (this.balance <= 0) this.refill()
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap');

.casino-roulette {
  --gold: #c9a84c;
  --gold-light: #f0d080;
  --gold-dark: #8a6a20;
  --felt: #1a5c3a;
  --red: #c0222a;
  --black: #1a1a1a;
  --green: #1a7a40;
  
  background: transparent;
  min-height: 100vh;
  padding: 20px;
  font-family: 'Cinzel', serif;
  color: #f5ead0;
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

/* Header */
.casino-header {
  text-align: center;
  margin-bottom: 20px;
}

.casino-title {
  font-size: 2.8rem;
  font-weight: 900;
  letter-spacing: 0.2em;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 50%, #8a6a20 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 10px rgba(201,168,76,0.4));
  margin: 0;
}

.casino-subtitle {
  font-size: 0.7rem;
  letter-spacing: 0.5em;
  color: var(--gold);
  opacity: 0.7;
}

/* Layout */
.game-layout {
  display: flex;
  gap: 40px;
  align-items: center;
  justify-content: center;
  max-width: 1200px;
  width: 100%;
}

/* Wheel Section */
.wheel-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;
}

.wheel-container {
  position: relative;
  width: 380px;
  height: 380px;
}

.wheel-outer-rim {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8a6a20 0%, #c9a84c 30%, #f0d080 50%, #c9a84c 70%, #8a6a20 100%);
  box-shadow: 
    0 15px 40px rgba(0,0,0,0.8),
    inset 0 0 10px rgba(0,0,0,0.5);
  z-index: 0;
}

.wheel-diamond {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 0.5rem;
  color: #000;
  opacity: 0.4;
  transform-origin: 0 0;
}

.wheel-main {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: #1a1a1a;
  box-shadow: inset 0 0 50px rgba(0,0,0,0.9);
  overflow: hidden;
  z-index: 1;
}

.wheel-wedges {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}

.wheel-number {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 24px;
  height: 24px;
  margin: -12px 0 0 -12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
}

.wheel-number span.green { 
  color: #4eff90; 
  text-shadow: 0 0 8px rgba(78,255,144,0.6); 
}

.wheel-gloss {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1) 0%, transparent 50%);
  pointer-events: none;
}

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
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c9a84c, #8a6a20, #c9a84c);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(255,255,255,0.3);
  position: relative;
}

.hub-inner {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background: radial-gradient(circle, #2d2d2d, #050505);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--gold-dark);
}

.hub-symbol { font-size: 2rem; color: var(--gold); filter: drop-shadow(0 0 5px rgba(201,168,76,0.5)); }

.hub-spokes .spoke {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 140px;
  height: 4px;
  background: linear-gradient(90deg, var(--gold), transparent);
  transform-origin: 0 50%;
  opacity: 0.3;
}

.ball-track {
  position: absolute;
  inset: 20px;
  border-radius: 50%;
  z-index: 3;
}

.ball {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #fff, #bbb, #777);
  box-shadow: 0 0 8px rgba(255,255,255,0.8), 2px 2px 5px rgba(0,0,0,0.5);
  z-index: 10;
}

/* Controls */
.spin-controls {
  display: flex;
  gap: 8px;
  width: 280px;
}

.balance-display {
  flex: 1;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--gold-dark);
  padding: 4px;
  border-radius: 4px;
  text-align: center;
}

.balance-label { font-size: 0.45rem; color: var(--gold); letter-spacing: 1px; }
.balance-amount { font-size: 0.9rem; font-weight: 700; color: #fff; display: block; }

.spin-btn {
  flex: 1.2;
  background: linear-gradient(180deg, #444, #111);
  border: 1px solid var(--gold-dark);
  color: var(--gold);
  border-radius: 4px;
  font-family: 'Cinzel', serif;
  font-weight: 700;
  font-size: 0.7rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s;
  opacity: 0.5;
}

.spin-btn.btn-ready {
  background: linear-gradient(180deg, var(--gold-light), var(--gold-dark));
  color: #000;
  opacity: 1;
  box-shadow: 0 0 20px rgba(201,168,76,0.4);
}

.spin-btn.btn-ready:hover { transform: translateY(-2px); box-shadow: 0 5px 25px rgba(201,168,76,0.6); }

.clear-btn {
  width: 40px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #888;
  border-radius: 4px;
  font-size: 0.5rem;
  cursor: pointer;
}

/* History */
.history-section { width: 100%; max-width: 280px; margin-top: 10px; }
.history-label { font-size: 0.4rem; color: var(--gold); text-align: center; margin-bottom: 5px; opacity: 0.6; letter-spacing: 2px; }
.history-numbers { display: flex; gap: 4px; justify-content: center; }
.history-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6rem;
  font-weight: 700;
  color: #fff;
}
.history-num.red { background: var(--red); }
.history-num.black { background: #222; border: 1px solid #444; }
.history-num.green { background: var(--green); }

/* Table Section */
.table-section {
  flex: 1;
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chip-selector {
  background: rgba(0,0,0,0.3);
  padding: 15px 25px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  border: 1px solid rgba(201,168,76,0.1);
}

.chips-row { display: flex; gap: 10px; }
.chip {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  cursor: pointer;
  border: 4px dashed rgba(255,255,255,0.3);
  transition: all 0.2s;
  position: relative;
}
.chip.selected { transform: scale(1.2) translateY(-5px); border-style: solid; box-shadow: 0 10px 20px rgba(0,0,0,0.5); }

.chip-1 { background: #9da3a8; color: #1a1a1a; }
.chip-5 { background: #c0222a; color: white; }
.chip-10 { background: #1e6091; color: white; }
.chip-25 { background: #1a7a40; color: white; }
.chip-100 { background: #c9a84c; color: #1a1a1a; }
.chip-all-in { 
  background: linear-gradient(135deg, #ff4d4d, #b30000); 
  color: white; 
  border-color: #ff9999 !important;
  font-size: 0.6rem !important;
}
.chip-all-in.selected {
  box-shadow: 0 0 15px rgba(255, 77, 77, 0.6);
}

.betting-table {
  background: var(--felt);
  border: 5px solid var(--gold-dark);
  border-radius: 12px;
  padding: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: inset 0 0 50px rgba(0,0,0,0.5);
}

.zero-row { height: 60px; margin-bottom: 2px; }
.zero-cell { width: 100%; height: 100%; background: var(--green); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 900; cursor: pointer; position: relative; }

.numbers-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(3, 60px);
  gap: 2px;
}

.bet-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.bet-cell:hover { filter: brightness(1.2); }
.number-cell.red { background: var(--red); }
.number-cell.black { background: var(--black); }

.dozens-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: 50px;
  gap: 2px;
  margin-top: 2px;
}
.dozen-cell { background: rgba(0,0,0,0.2); font-size: 0.8rem; }

.outside-bets-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  height: 50px;
  gap: 2px;
  margin-top: 2px;
}
.outside-cell { background: rgba(0,0,0,0.3); font-size: 0.7rem; }
.red-outside { background: rgba(192, 34, 42, 0.6) !important; }
.black-outside { background: rgba(26, 26, 26, 0.6) !important; }

.bet-chips {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  pointer-events: none;
}

.placed-chip {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--gold-light);
  color: #000;
  font-size: 0.7rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 4px 8px rgba(0,0,0,0.5);
}

/* Result Modal */
.result-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.result-modal {
  text-align: center;
  padding: 30px 50px;
  background: linear-gradient(135deg, #1a1a1a, #050505);
  border: 2px solid var(--gold);
  border-radius: 16px;
  box-shadow: 0 0 60px rgba(0,0,0,0.8);
}

.result-number { 
  font-size: 5rem; 
  font-weight: 900; 
  margin-bottom: 10px; 
}
.result-number.red { color: var(--red); text-shadow: 0 0 20px var(--red); }
.result-number.black { color: #fff; text-shadow: 0 0 20px #fff; }
.result-number.green { color: var(--green); text-shadow: 0 0 20px var(--green); }

.result-message { 
  font-size: 1.2rem; 
  letter-spacing: 3px; 
  color: var(--gold); 
  margin-bottom: 5px; 
}

.result-amount { 
  font-size: 2.2rem; 
  font-weight: 900; 
}
.result-amount.win { color: #4eff90; text-shadow: 0 0 15px rgba(78,255,144,0.4); }
.result-amount.loss { color: #ff4e4e; text-shadow: 0 0 15px rgba(255,78,78,0.4); }

.dismiss-btn {
  margin-top: 25px;
  padding: 10px 30px;
  background: var(--gold);
  border: none;
  border-radius: 6px;
  color: #000;
  font-family: 'Cinzel', serif;
  font-weight: 900;
  font-size: 0.8rem;
  cursor: pointer;
}

.result-fade-enter-active, .result-fade-leave-active { transition: all 0.5s ease; }
.result-fade-enter-from, .result-fade-leave-to { opacity: 0; transform: scale(0.8); }

@media (max-width: 1000px) {
  .game-layout { gap: 30px; }
  .wheel-container { width: 320px; height: 320px; }
  .wheel-number { font-size: 0.6rem; }
}
</style>
