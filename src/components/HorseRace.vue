<template>
  <div class="hr-universe">
    <!-- Fondo de cielo degradado -->
    <div class="sky" aria-hidden="true"></div>

    <!-- ═══════════════════════════════════════════
         HEADER — Saldo y título
    ════════════════════════════════════════════ -->
    <header class="hr-header">
      <div class="header-logo">
        <span class="logo-icon">🏆</span>
        <span class="logo-title">GRAND DERBY</span>
        <span class="logo-icon">🏆</span>
      </div>
    </header>

    <!-- ═══════════════════════════════════════════
         PISTA DE CARRERAS
    ════════════════════════════════════════════ -->
    <section class="track-container" ref="trackContainerRef">
      <!-- Tribuna decorativa -->
      <div class="grandstand" aria-hidden="true">
        <div v-for="i in 12" :key="i" class="gs-window"></div>
      </div>

      <!-- Pista principal -->
      <div class="track" ref="trackRef">
        <!-- Carril por cada caballo -->
        <div
          v-for="horse in horses"
          :key="horse.id"
          class="lane"
          :class="{ 'lane-winner': racePhase === 'finished' && horse.id === winnerId }"
        >
          <!-- Césped del carril -->
          <div class="lane-grass">
            <!-- Marcas de distancia -->
            <div class="distance-mark" v-for="p in [25, 50, 75]" :key="p" :style="{ left: p + '%' }"></div>
          </div>

          <!-- Caballo -->
          <div
            class="horse-wrapper"
            :style="{ left: `calc(${horse.position} * (100% - 70px) / 100)` }"
          >
            <div class="horse-emoji" :style="{ animationPlayState: racePhase === 'racing' ? 'running' : 'paused' }">
              🏇
            </div>
            <!-- Nombre flotante sobre el caballo -->
            <div class="horse-name-float" :style="{ color: horse.color }">
              {{ horse.shortName }}
            </div>
          </div>

          <!-- Indicador de posición en carrera -->
          <div class="lane-rank" v-if="racePhase === 'racing' || racePhase === 'finished'">
            {{ getLaneRank(horse.id) }}°
          </div>
        </div>

        <!-- Línea de salida -->
        <div class="start-line">
          <span class="line-label">SALIDA</span>
        </div>

        <!-- Línea de meta -->
        <div class="finish-line">
          <div class="finish-post top"></div>
          <div class="finish-flag">🏁</div>
          <div class="finish-post bottom"></div>
        </div>
      </div>

      <!-- Banner de resultado de carrera -->
      <Transition name="result-pop">
        <div v-if="racePhase === 'finished'" class="race-result-banner" :class="playerWon ? 'banner-win' : 'banner-lose'">
          <div class="banner-winner">
            🏇 <strong>{{ winnerName }}</strong> ha ganado la carrera
          </div>
          <div class="banner-player-result">
            <template v-if="playerBetHorseId !== null">
              <span v-if="playerWon" class="result-win-text">
                ¡GANASTE! +${{ winningsAmount.toLocaleString() }}
              </span>
              <span v-else class="result-lose-text">
                Mejor suerte la próxima. −${{ betAmount }}
              </span>
            </template>
            <template v-else>
              <span class="result-neutral-text">No tenías apuesta en esta carrera.</span>
            </template>
          </div>
        </div>
      </Transition>
    </section>

    <!-- ═══════════════════════════════════════════
         PANEL DE CONTROL DE APUESTAS
    ════════════════════════════════════════════ -->
    <section class="control-panel" ref="controlPanelRef">

      <!-- Tabla de caballos y cuotas -->
      <div class="odds-table">
        <div class="odds-title">PROGRAMA OFICIAL</div>
        <div class="odds-header">
          <span>CABALLO</span>
          <span>CUOTA</span>
          <span>ESTADO</span>
        </div>
        <div
          v-for="horse in horses"
          :key="horse.id"
          class="odds-row"
          :class="{
            'odds-row-selected': playerBetHorseId === horse.id,
            'odds-row-winner':   racePhase === 'finished' && horse.id === winnerId,
          }"
          @click="racePhase === 'idle' ? selectHorse(horse.id) : null"
        >
          <!-- Dot de color del caballo -->
          <span class="horse-dot" :style="{ background: horse.color }"></span>
          <span class="horse-full-name">{{ horse.name }}</span>
          <span class="horse-odds">{{ horse.oddsLabel }}</span>
          <span class="horse-status">
            <template v-if="racePhase === 'finished' && horse.id === winnerId">🥇</template>
            <template v-else-if="racePhase === 'racing' || racePhase === 'finished'">
              {{ Math.round(horse.position) }}%
            </template>
            <template v-else>
              <span class="readiness-bar">
                <span class="readiness-fill" :style="{ width: horse.readiness + '%', background: horse.color }"></span>
              </span>
            </template>
          </span>
        </div>
      </div>

      <!-- Sección de apuesta -->
      <div class="bet-section">
        <div class="bet-section-title">TU APUESTA</div>

        <!-- Saldo del jugador -->
        <div class="balance-pill" :class="{ 'flash-win': flashWin, 'flash-lose': flashLose }">
          <span class="balance-label">SALDO</span>
          <span class="balance-value">${{ balance.toLocaleString() }}</span>
        </div>


        <!-- Chips de apuesta rápida -->
        <div class="bet-field">
          <label class="field-label">FICHAS RÁPIDAS</label>
          <div class="chip-row">
            <button
              v-for="chip in chipValues"
              :key="chip"
              class="chip"
              :class="`chip-${chip}`"
              :disabled="racePhase !== 'idle' || chip > balance"
              @click="addChip(chip)"
            >
              ${{ chip }}
            </button>
            <button
              class="chip chip-all-in"
              :disabled="racePhase !== 'idle' || balance === 0"
              @click="betAmount = balance"
            >
              MAX
            </button>
          </div>
        </div>

        <!-- Input manual + clear -->
        <div class="bet-field bet-input-row">
          <label class="field-label">MONTO</label>
          <div class="input-wrap">
            <span class="input-prefix">$</span>
            <input
              type="number"
              v-model.number="betAmount"
              :disabled="racePhase !== 'idle'"
              :max="balance"
              min="1"
              class="bet-input"
              @input="clampBet"
            />
            <button class="btn-clear-bet" :disabled="racePhase !== 'idle'" @click="betAmount = 0">✕</button>
          </div>
        </div>

        <!-- Ganancia potencial -->
        <div class="potential-win" v-if="playerBetHorseId !== null && betAmount > 0">
          <span class="pw-label">GANANCIA POTENCIAL</span>
          <span class="pw-value">${{ potentialWin.toLocaleString() }}</span>
        </div>

        <!-- Botones de acción -->
        <div class="action-buttons">
          <button
            class="btn btn-start"
            :disabled="!canStartRace"
            @click="startRace"
          >
            <span v-if="racePhase === 'idle'">🏁 INICIAR CARRERA</span>
            <span v-else-if="racePhase === 'racing'" class="racing-dots">
              <span></span><span></span><span></span>
            </span>
          </button>
          <button
            v-if="racePhase === 'finished'"
            class="btn btn-new-race"
            @click="resetRace"
          >
            ↺ NUEVA CARRERA
          </button>
          <button
            v-if="balance <= 0"
            class="btn btn-refill"
            @click="refillBalance"
          >
            ⟳ Recargar $1000
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
// ─────────────────────────────────────────────────────────
//  IMPORTS
// ─────────────────────────────────────────────────────────
import { ref, reactive, computed, onUnmounted, nextTick } from 'vue'
import { useBalance } from '../composables/useBalance.js'

// ─────────────────────────────────────────────────────────
//  DEFINICIÓN DE CABALLOS
//  Cada caballo tiene:
//    - id        : identificador único
//    - name      : nombre completo
//    - shortName : nombre corto para mostrar sobre el emoji
//    - color     : color identificativo (para el dot y el nombre)
//    - odds      : multiplicador de pago (2 → paga 2:1, 5 → paga 5:1, etc.)
//    - oddsLabel : string legible de la cuota
//    - position  : posición actual en la pista (0-100 %)
// ─────────────────────────────────────────────────────────
const HORSE_DEFS = [
  { id: 1, name: 'Big E',               shortName: 'BIG E', color: '#e74c3c' },
  { id: 2, name: 'Baby Oil',            shortName: 'BABY',  color: '#2c3e50' },
  { id: 3, name: 'Big Yahu',            shortName: 'YAHU',  color: '#27ae60' },
  { id: 4, name: 'Jeffrey Goldesteins', shortName: 'JEFF',  color: '#f39c12' },
  { id: 5, name: 'Nate H',             shortName: 'NATE',  color: '#8e44ad' },
  { id: 6, name: 'Kirk Fury',           shortName: 'KIRK',  color: '#e67e22' },
]

/** Fichas disponibles para apuesta rápida */
const chipValues = [10, 25, 50, 100, 250]

/**
 * Genera 6 cuotas decimales únicas en el rango [1.1, 18.0],
 * ordenadas de menor a mayor, y las asigna aleatoriamente a los caballos.
 */
function generateRandomOdds() {
  const results = new Set()
  while (results.size < 6) {
    const raw = Math.random() * (8.0 - 1.1) + 1.1
    results.add(Math.round(raw * 10) / 10) // 1 decimal
  }
  return [...results].sort(() => Math.random() - 0.5) // mezclar
}

function applyRandomOdds(horseList) {
  const odds = generateRandomOdds()
  horseList.forEach((h, i) => {
    h.odds = odds[i]
    h.oddsLabel = odds[i].toFixed(1) + ':1'
    h.readiness = Math.floor(Math.random() * 70) + 20
  })
}

// ─────────────────────────────────────────────────────────
//  ESTADO REACTIVO
// ─────────────────────────────────────────────────────────

const { balance, deduct, credit, refill } = useBalance()

/** ID del caballo en el que el jugador apostó (null = sin selección) */
const playerBetHorseId = ref(null)

/** Monto apostado en la ronda actual */
const betAmount = ref(0)

/**
 * Fase de la carrera:
 *   'idle'     → esperando apuestas
 *   'racing'   → carrera en curso
 *   'finished' → carrera terminada, mostrando resultado
 */
const racePhase = ref('idle')

/** ID del caballo ganador (null si aún no terminó) */
const winnerId = ref(null)

/** Controla flash de saldo */
const flashWin  = ref(false)
const flashLose = ref(false)

/** Referencia al handle del setInterval para poder cancelarlo */
let raceInterval = null

/** Referencia al contenedor de la pista para hacer scroll al iniciar */
const trackContainerRef = ref(null)

/** Referencia al panel de apuesta para hacer scroll al terminar */
const controlPanelRef = ref(null)

/**
 * Estado reactivo de los caballos.
 * Cada objeto se crea a partir de HORSE_DEFS añadiendo la posición.
 */
const horses = reactive(
  HORSE_DEFS.map(h => ({ 
    ...h, 
    position: 0, 
    readiness: Math.floor(Math.random() * 60) + 30 
  }))
)

// Randomizar cuotas al arrancar por primera vez
applyRandomOdds(horses)

// ─────────────────────────────────────────────────────────
//  COMPUTED
// ─────────────────────────────────────────────────────────

/** Nombre del caballo ganador para mostrar en el banner */
const winnerName = computed(() => {
  if (winnerId.value === null) return ''
  return horses.find(h => h.id === winnerId.value)?.name ?? ''
})

/**
 * Ganancia total que recibiría el jugador si el caballo apostado gana.
 * Fórmula: apuesta * odds (incluye devolución de la apuesta original).
 */
const potentialWin = computed(() => {
  if (!playerBetHorseId.value || betAmount.value <= 0) return 0
  const horse = horses.find(h => h.id === playerBetHorseId.value)
  return horse ? betAmount.value * horse.odds : 0
})

/**
 * Indica si el jugador ganó la ronda (el caballo apostado es el ganador).
 */
const playerWon = computed(
  () => winnerId.value !== null && playerBetHorseId.value === winnerId.value
)

/**
 * Ganancias netas recibidas (apuesta * odds, ya calculado por endRace).
 * Se almacena en ref para mostrarlo en el banner.
 */
const winningsAmount = ref(0)

/**
 * El botón de inicio está disponible solo cuando:
 * - La fase es 'idle' (no hay carrera en curso)
 * - Hay un caballo seleccionado
 * - La apuesta es mayor a 0 y menor o igual al saldo
 */
const canStartRace = computed(() =>
  racePhase.value === 'idle' &&
  playerBetHorseId.value !== null &&
  betAmount.value > 0 &&
  betAmount.value <= balance.value
)

// ─────────────────────────────────────────────────────────
//  CLASIFICACIÓN EN TIEMPO REAL
// ─────────────────────────────────────────────────────────

/**
 * Devuelve la posición (1°, 2°…) del caballo dado en la carrera actual.
 * Ordena por posición descendente y retorna el índice + 1.
 */
function getLaneRank(horseId) {
  const sorted = [...horses].sort((a, b) => b.position - a.position)
  return sorted.findIndex(h => h.id === horseId) + 1
}

// ─────────────────────────────────────────────────────────
//  GESTIÓN DE APUESTAS
// ─────────────────────────────────────────────────────────

/** Selecciona un caballo desde la tabla de cuotas */
function selectHorse(id) {
  playerBetHorseId.value = id
}

/** Añade el valor de una ficha al monto apostado (sin superar el saldo) */
function addChip(amount) {
  betAmount.value = Math.min(betAmount.value + amount, balance.value)
}

/** Asegura que el monto apostado no supere el saldo ni sea negativo */
function clampBet() {
  if (betAmount.value < 0)             betAmount.value = 0
  if (betAmount.value > balance.value) betAmount.value = balance.value
}

// ─────────────────────────────────────────────────────────
//  MOTOR DE LA CARRERA
// ─────────────────────────────────────────────────────────

/**
 * ALGORITMO DE MOVIMIENTO PONDERADO POR CUOTAS
 * ─────────────────────────────────────────────
 * En cada tick, cada caballo avanza una cantidad aleatoria calculada así:
 *
 *   1. BASE_SPEED: velocidad base igual para todos (garantiza que todos
 *      tengan una oportunidad mínima de avanzar).
 *
 *   2. BIAS: ventaja estadística proporcional al inverso de las cuotas.
 *      Un caballo con odds=2 tiene bias=(1/2)=0.50
 *      Un caballo con odds=12 tiene bias=(1/12)≈0.08
 *      Esto hace que los favoritos avancen más en promedio.
 *
 *   3. LUCK_FACTOR: factor de aleatoriedad puro que da a los outsiders
 *      una oportunidad real de ganar por "suerte". Sin esto, el favorito
 *      ganaría casi siempre y no habría emoción.
 *
 *   Fórmula final:
 *     step = BASE_SPEED
 *          + BIAS * random(0, MAX_BIAS_BOOST)
 *          + LUCK_FACTOR * random(0, MAX_LUCK_BOOST)
 *
 *   Donde:
 *     MAX_BIAS_BOOST  = 1.8   (límite del bonus por favoritismo)
 *     MAX_LUCK_BOOST  = 2.2   (límite del bonus por suerte pura)
 *     BASE_SPEED      = 0.15  (% por tick, avance mínimo garantizado)
 */
const BASE_SPEED     = 0.15
const MAX_BIAS_BOOST = 1.8
const MAX_LUCK_BOOST = 2.2

/**
 * Calcula el avance de un caballo en un tick usando la fórmula ponderada.
 * @param {Object} horse - Objeto del caballo con su campo `odds`
 * @returns {number} Cantidad de % a avanzar este tick
 */
function calcStep(horse) {
  // Bias inversamente proporcional a la cuota: mejor favorito → mayor bias
  const bias       = 1 / horse.odds

  // Componente determinista (favoritismo estadístico)
  const biasBoost  = bias * Math.random() * MAX_BIAS_BOOST

  // Componente puramente aleatoria (el "factor suerte")
  const luckBoost  = Math.random() * MAX_LUCK_BOOST

  return BASE_SPEED + biasBoost + luckBoost
}

/**
 * Inicia la carrera:
 * 1. Descuenta la apuesta del saldo.
 * 2. Cambia la fase a 'racing'.
 * 3. Arranca el setInterval que mueve los caballos en cada tick.
 */
function startRace() {
  if (!canStartRace.value) return

  // Scroll al inicio de la pista para ver la salida y la meta
  nextTick(() => {
    if (trackContainerRef.value) {
      trackContainerRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })

  // Descontar apuesta
  deduct(betAmount.value)

  racePhase.value = 'racing'
  winnerId.value  = null

  /**
   * Tick de la carrera: cada 50ms (≈20 fps) avanzamos todos los caballos.
   * Intervalo corto = animación fluida pero con más carga de CPU.
   * Puedes aumentarlo a 80-100ms si buscas mayor eficiencia.
   */
  raceInterval = setInterval(() => {
    for (const horse of horses) {
      if (horse.position >= 100) continue  // ya llegó, no avanzar más

      horse.position = Math.min(horse.position + calcStep(horse), 100)

      // Detectar primer caballo en cruzar la meta (posición ≥ 100)
      if (horse.position >= 100 && winnerId.value === null) {
        winnerId.value = horse.id
        endRace()
        break
      }
    }
  }, 50)
}

/**
 * Finaliza la carrera:
 * - Detiene el intervalo.
 * - Calcula y acredita ganancias si el jugador acertó.
 * - Activa el flash de saldo correspondiente.
 */
function endRace() {
  clearInterval(raceInterval)
  raceInterval = null

  if (playerWon.value) {
    // Ganar: acreditar apuesta × odds (la apuesta ya fue descontada)
    const payout     = betAmount.value * horses.find(h => h.id === winnerId.value).odds
    credit(payout)
    winningsAmount.value = payout

    // Flash verde
    flashWin.value = true
    setTimeout(() => { flashWin.value = false }, 1200)
  } else {
    // Perder: la apuesta ya fue descontada al inicio
    winningsAmount.value = 0

    // Flash rojo
    flashLose.value = true
    setTimeout(() => { flashLose.value = false }, 1200)
  }

  // Pequeño delay para que los caballos terminen de renderizar antes del banner
  setTimeout(() => {
    racePhase.value = 'finished'
    // Scroll al panel de apuesta para que el jugador pueda apostar de nuevo
    nextTick(() => {
      if (controlPanelRef.value) {
        controlPanelRef.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  }, 300)
}

/**
 * Reinicia el estado para una nueva carrera.
 * Resetea posiciones, selección y fase, pero conserva el saldo.
 */
function resetRace() {
  clearInterval(raceInterval)
  raceInterval = null

  // Aleatorizar cuotas y estado de los caballos para cada carrera
  horses.forEach(h => { h.position = 0 })
  applyRandomOdds(horses)

  playerBetHorseId.value = null
  betAmount.value        = 0
  winnerId.value         = null
  winningsAmount.value   = 0
  racePhase.value        = 'idle'
}

/** Recarga el saldo a $1000 cuando el jugador se quedó sin dinero */
function refillBalance() {
  refill()
}

/** Limpiar el intervalo si el componente se desmonta */
onUnmounted(() => { clearInterval(raceInterval) })
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────
   TIPOGRAFÍA E IMPORTS
───────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Rajdhani:wght@500;700&display=swap');

/* ─────────────────────────────────────────────────────────
   VARIABLES
───────────────────────────────────────────────────────── */
* { box-sizing: border-box; margin: 0; padding: 0; }

.hr-universe {
  --green-dark:  #1a4a1a;
  --green-mid:   #1e6b1e;
  --green-light: #2d8c2d;
  --dirt:        #b8860b;
  --dirt-light:  #d4a017;
  --gold:        #c9a84c;
  --gold-light:  #f0d080;
  --gold-dark:   #8a6a20;
  --panel-bg:    rgba(10,15,10,0.92);
  --border-gold: rgba(201,168,76,0.35);

  font-family: 'Barlow Condensed', sans-serif;
  background: transparent;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: #e8e8e8;
  position: relative;
  overflow-x: hidden;
}

/* ─────────────────────────────────────────────────────────
   CIELO
───────────────────────────────────────────────────────── */
.sky {
  position: fixed;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

/* ─────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────── */
.hr-header {
  position: relative;
  z-index: 10;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border-gold);
  background: rgba(5,10,5,0.8);
  backdrop-filter: blur(4px);
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon { font-size: 1.3rem; }

.logo-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: clamp(1.4rem, 3vw, 2.2rem);
  letter-spacing: 0.3em;
  background: linear-gradient(180deg, #f0d080, #c9a84c, #8a6a20);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 10px rgba(201,168,76,0.3));
}

.balance-pill {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  padding: 10px 16px;
  margin-bottom: 8px;
  transition: box-shadow 0.3s;
}

.balance-label {
  font-size: 0.6rem;
  letter-spacing: 0.25em;
  color: var(--gold);
  opacity: 0.75;
  text-transform: uppercase;
}

.balance-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--gold-light);
}

.balance-pill.flash-win {
  animation: flashWinAnim 1.1s ease-out;
}
.balance-pill.flash-lose {
  animation: flashLoseAnim 1.1s ease-out;
}

@keyframes flashWinAnim {
  0%,100% { box-shadow: none; }
  30%     { box-shadow: 0 0 24px rgba(68,255,100,0.7); border-color: #44ff64; }
}
@keyframes flashLoseAnim {
  0%,100% { box-shadow: none; }
  30%     { box-shadow: 0 0 24px rgba(255,68,68,0.7); border-color: #ff4444; }
}

/* ─────────────────────────────────────────────────────────
   CONTENEDOR DE LA PISTA
───────────────────────────────────────────────────────── */
.track-container {
  position: relative;
  z-index: 5;
  padding: 16px 20px 8px;
  flex: 0 0 auto;
}

/* Tribuna decorativa */
.grandstand {
  height: 28px;
  display: flex;
  gap: 2px;
  margin-bottom: 6px;
  padding: 0 40px;
}

.gs-window {
  flex: 1;
  background: linear-gradient(180deg, #2a4a2a, #1a2e1a);
  border: 1px solid rgba(201,168,76,0.2);
  border-bottom: none;
  border-radius: 4px 4px 0 0;
}

/* ─────────────────────────────────────────────────────────
   PISTA
───────────────────────────────────────────────────────── */
.track {
  position: relative;
  border: 2px solid var(--gold-dark);
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(201,168,76,0.1),
    0 8px 32px rgba(0,0,0,0.6),
    inset 0 0 40px rgba(0,0,0,0.3);
}

/* ─────────────────────────────────────────────────────────
   CARRILES
───────────────────────────────────────────────────────── */
.lane {
  position: relative;
  height: 72px;
  border-bottom: 1px solid rgba(0,0,0,0.4);
  overflow: hidden;
  transition: background 0.5s;
}

.lane:last-child { border-bottom: none; }

/* Carril ganador → destello dorado */
.lane-winner {
  background: rgba(201,168,76,0.12) !important;
  box-shadow: inset 0 0 20px rgba(201,168,76,0.15);
}

.lane-grass {
  position: absolute;
  inset: 0;
  /* Alternancia de franjas verdes para simular césped */
  background: repeating-linear-gradient(
    90deg,
    #1e5c1e 0px,
    #1e5c1e 20px,
    #196019 20px,
    #196019 40px
  );
}

/* Marks de distancia (25 %, 50 %, 75 %) */
.distance-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255,255,255,0.08);
  border-left: 1px dashed rgba(255,255,255,0.06);
}

/* ─────────────────────────────────────────────────────────
   CABALLO
───────────────────────────────────────────────────────── */
.horse-wrapper {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  /* La transición suaviza el movimiento entre ticks */
  transition: left 0.05s linear;
  z-index: 4;
}

.horse-emoji {
  font-size: 2.4rem;
  line-height: 1;
  display: block;
  /* Animación de galope: oscilación vertical */
  animation: gallop 0.25s ease-in-out infinite alternate;
}

@keyframes gallop {
  from { transform: translateY(0px) scaleX(-1); }
  to   { transform: translateY(-4px) scaleX(-1.04); }
}

.horse-name-float {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
  white-space: nowrap;
  margin-top: -2px;
}

/* Ranking en tiempo real (derecha del carril) */
.lane-rank {
  position: absolute;
  right: 46px;   /* antes de la línea de meta */
  top: 50%;
  transform: translateY(-50%);
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.85rem;
  color: rgba(255,255,255,0.35);
  z-index: 3;
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────
   LÍNEA DE SALIDA
───────────────────────────────────────────────────────── */
.start-line {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 32px;
  background: linear-gradient(90deg, rgba(0,0,0,0.5), transparent);
  border-right: 3px solid rgba(255,255,255,0.3);
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.line-label {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.5rem;
  letter-spacing: 0.15em;
  color: rgba(255,255,255,0.4);
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* ─────────────────────────────────────────────────────────
   LÍNEA DE META
───────────────────────────────────────────────────────── */
.finish-line {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 40px;
  /* Patrón ajedrezado blanco/negro de meta */
  background: repeating-conic-gradient(
    #fff 0% 25%, #111 0% 50%
  ) 0 0 / 10px 10px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 2px 0;
  border-left: 2px solid rgba(201,168,76,0.5);
  box-shadow: -4px 0 16px rgba(0,0,0,0.4);
}

.finish-post {
  width: 8px;
  height: 10px;
  background: var(--gold);
  border-radius: 2px;
}

.finish-flag {
  font-size: 1.2rem;
}

/* ─────────────────────────────────────────────────────────
   BANNER DE RESULTADO DE CARRERA
───────────────────────────────────────────────────────── */
.race-result-banner {
  margin-top: 12px;
  padding: 12px 24px;
  border-radius: 8px;
  text-align: center;
  border: 2px solid;
  backdrop-filter: blur(6px);
}

.banner-win {
  background: rgba(20,60,20,0.85);
  border-color: #44dd88;
  box-shadow: 0 0 24px rgba(68,221,136,0.3);
}

.banner-lose {
  background: rgba(60,10,10,0.85);
  border-color: #ff4455;
  box-shadow: 0 0 20px rgba(255,68,85,0.25);
}

.banner-winner {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #fff;
  margin-bottom: 4px;
}

.result-win-text   { font-family: 'Bebas Neue', sans-serif; font-size: 1.3rem; color: #44ff88; letter-spacing: 0.15em; }
.result-lose-text  { font-family: 'Bebas Neue', sans-serif; font-size: 1.1rem; color: #ff6677; letter-spacing: 0.1em; }
.result-neutral-text { font-size: 0.85rem; color: #aaa; }

/* ─────────────────────────────────────────────────────────
   PANEL DE CONTROL
───────────────────────────────────────────────────────── */
.control-panel {
  position: relative;
  z-index: 10;
  display: flex;
  gap: 16px;
  padding: 16px 20px 20px;
  flex: 1;
  flex-wrap: wrap;
}

/* ── Tabla de cuotas ── */
.odds-table {
  background: var(--panel-bg);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  padding: 12px;
  flex: 1;
  min-width: 260px;
}

.odds-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  border-bottom: 1px solid var(--border-gold);
  padding-bottom: 6px;
  margin-bottom: 8px;
  text-align: center;
}

.odds-header {
  display: grid;
  grid-template-columns: 20px 1fr 60px 70px;
  gap: 6px;
  font-size: 0.55rem;
  letter-spacing: 0.2em;
  color: rgba(201,168,76,0.6);
  padding: 0 4px 4px;
}

.odds-row {
  display: grid;
  grid-template-columns: 20px 1fr 60px 70px;
  gap: 6px;
  align-items: center;
  padding: 7px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  border: 1px solid transparent;
}

.odds-row:hover {
  background: rgba(201,168,76,0.08);
}

.odds-row-selected {
  background: rgba(201,168,76,0.12) !important;
  border-color: rgba(201,168,76,0.4) !important;
}

.odds-row-winner {
  background: rgba(68,221,136,0.1) !important;
  border-color: rgba(68,221,136,0.4) !important;
}

.horse-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: block;
  flex-shrink: 0;
  box-shadow: 0 0 6px currentColor;
}

.horse-full-name {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.horse-odds {
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--gold-light);
  text-align: right;
}

.horse-status {
  font-size: 0.7rem;
  color: rgba(255,255,255,0.55);
  text-align: right;
}

/* Barra de "velocidad potencial" en fase idle */
.readiness-bar {
  display: block;
  height: 5px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
}

.readiness-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  opacity: 0.7;
}

/* ── Sección de apuesta ── */
.bet-section {
  background: var(--panel-bg);
  border: 1px solid var(--border-gold);
  border-radius: 8px;
  padding: 14px 16px;
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bet-section-title {
  font-family: 'Bebas Neue', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  border-bottom: 1px solid var(--border-gold);
  padding-bottom: 6px;
  text-align: center;
}

.bet-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 0.5rem;
  letter-spacing: 0.25em;
  color: rgba(201,168,76,0.65);
}

/* Select de caballo */
.horse-select {
  width: 100%;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 5px;
  color: #e8e8e8;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 0.85rem;
  padding: 7px 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c9a84c'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}

.horse-select:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Fichas rápidas */
.chip-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.chip {
  padding: 6px 0;
  border-radius: 20px;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  min-width: 46px;
  border: 2px dashed rgba(255,255,255,0.2);
  letter-spacing: 0.04em;
}

.chip:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
}

.chip:disabled { opacity: 0.3; cursor: not-allowed; }

.chip-10  { background: radial-gradient(circle,#3498db,#1a5276); color:#fff; border-color:#3498db; }
.chip-25  { background: radial-gradient(circle,#2ecc71,#1a6b3a); color:#fff; border-color:#2ecc71; }
.chip-50  { background: radial-gradient(circle,#9b59b6,#5b2c6f); color:#fff; border-color:#9b59b6; }
.chip-100 { background: radial-gradient(circle,#e74c3c,#922b21); color:#fff; border-color:#e74c3c; }
.chip-250 { background: radial-gradient(circle,#f0d080,#8a6a20); color:#1a1a1a; border-color:#c9a84c; }
.chip-all-in { 
  background: linear-gradient(135deg, #ff4d4d, #b30000); 
  color: white; 
  border-color: #ff9999 !important;
  border-style: solid !important;
}

/* Input manual */
.bet-input-row { flex-direction: column; }

.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 5px;
  overflow: hidden;
}

.input-prefix {
  padding: 0 8px;
  color: var(--gold);
  font-weight: 700;
  font-size: 1rem;
}

.bet-input {
  flex: 1;
  background: transparent;
  border: none;
  color: #e8e8e8;
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  padding: 7px 4px;
  outline: none;
  /* Ocultar flechas del input number */
  -moz-appearance: textfield;
  appearance: textfield;
}

.bet-input::-webkit-inner-spin-button,
.bet-input::-webkit-outer-spin-button { -webkit-appearance: none; }

.bet-input:disabled { opacity: 0.45; }

.btn-clear-bet {
  background: transparent;
  border: none;
  color: rgba(255,68,68,0.6);
  padding: 0 10px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: color 0.15s;
}
.btn-clear-bet:hover:not(:disabled) { color: #ff4444; }
.btn-clear-bet:disabled { opacity: 0.3; cursor: not-allowed; }

/* Ganancia potencial */
.potential-win {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(68,221,136,0.07);
  border: 1px solid rgba(68,221,136,0.25);
  border-radius: 5px;
  padding: 6px 12px;
}

.pw-label {
  font-size: 0.5rem;
  letter-spacing: 0.2em;
  color: rgba(68,221,136,0.7);
}

.pw-value {
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: #44dd88;
}

/* ── Botones de acción ── */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}

.btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-family: 'Bebas Neue', sans-serif;
  font-size: 1rem;
  letter-spacing: 0.2em;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-start {
  background: linear-gradient(180deg, #c9a84c, #8a6a20);
  color: #0a0a0a;
  border: 1px solid var(--gold-light);
  box-shadow: 0 0 16px rgba(201,168,76,0.3);
}

.btn-start:hover:not(:disabled) {
  background: linear-gradient(180deg, #f0d080, #c9a84c);
  box-shadow: 0 0 28px rgba(201,168,76,0.6);
  transform: translateY(-1px);
}

.btn-new-race {
  background: linear-gradient(180deg, #27ae60, #1a6b3a);
  color: #fff;
  border: 1px solid #2ecc71;
}

.btn-new-race:hover {
  background: linear-gradient(180deg, #2ecc71, #27ae60);
  box-shadow: 0 0 16px rgba(46,204,113,0.4);
}

.btn-refill {
  background: transparent;
  color: var(--gold);
  border: 1px solid var(--border-gold);
  font-size: 0.8rem;
}

.btn-refill:hover {
  background: rgba(201,168,76,0.1);
}

/* Animación de puntos durante la carrera */
.racing-dots {
  display: flex;
  gap: 6px;
}

.racing-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #0a0a0a;
  animation: dot 0.9s ease-in-out infinite;
}

.racing-dots span:nth-child(2) { animation-delay: 0.18s; }
.racing-dots span:nth-child(3) { animation-delay: 0.36s; }

@keyframes dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%            { opacity: 1;   transform: scale(1.2); }
}

/* ─────────────────────────────────────────────────────────
   TRANSICIONES
───────────────────────────────────────────────────────── */
.result-pop-enter-active { animation: popIn 0.4s cubic-bezier(0.34,1.56,0.64,1); }
.result-pop-leave-active { transition: opacity 0.2s, transform 0.2s; }
.result-pop-enter-from   { opacity: 0; transform: scale(0.7) translateY(10px); }
.result-pop-leave-to     { opacity: 0; transform: scale(0.9); }

@keyframes popIn {
  from { opacity: 0; transform: scale(0.6) translateY(14px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ─────────────────────────────────────────────────────────
   RESPONSIVE
───────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .control-panel { flex-direction: column; }
  .horse-emoji   { font-size: 1.9rem; }
  .lane          { height: 58px; }
  .logo-title    { font-size: 1.1rem; }
  .chip          { min-width: 38px; font-size: 0.65rem; }
}
</style>
