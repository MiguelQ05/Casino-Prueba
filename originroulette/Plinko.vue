<template>
  <div class="plinko-app" ref="appRef">
    <!-- ░░░ HEADER ░░░ -->
    <header class="pk-header">
      <div class="pk-logo">
        <span class="logo-dot"></span>
        <span class="logo-text">PLINKO</span>
      </div>
      <div class="pk-balance-wrap">
        <span class="balance-label">BALANCE</span>
        <span class="balance-value" :class="{ 'flash-up': balFlash === 'up', 'flash-down': balFlash === 'down' }">
          ${{ balance.toFixed(2) }}
        </span>
      </div>
    </header>

    <!-- ░░░ MAIN LAYOUT ░░░ -->
    <div class="pk-layout">

      <!-- ═══ LEFT PANEL ═══ -->
      <aside class="pk-sidebar">

        <!-- BET AMOUNT -->
        <div class="pk-section">
          <label class="pk-label">BET AMOUNT</label>
          <div class="pk-input-row">
            <span class="pk-input-prefix">$</span>
            <input
              type="number"
              class="pk-input"
              v-model.number="betAmount"
              :min="0.10"
              :max="balance"
              step="0.10"
              @input="clampBet"
            />
          </div>
          <div class="pk-bet-chips">
            <button v-for="m in [0.5, 2, 5, 10]" :key="m" class="chip-btn" @click="multiplyBet(m)">
              {{ m >= 1 ? '+' + m + 'x' : '½' }}
            </button>
          </div>
        </div>

        <!-- RISK MODE -->
        <div class="pk-section">
          <label class="pk-label">RISK</label>
          <div class="pk-risk-buttons">
            <button
              v-for="r in risks"
              :key="r.id"
              class="risk-btn"
              :class="[`risk-${r.id}`, { active: risk === r.id }]"
              @click="setRisk(r.id)"
              :disabled="isDropping"
            >
              {{ r.label }}
            </button>
          </div>
        </div>

        <!-- ROWS -->
        <div class="pk-section">
          <label class="pk-label">ROWS <span class="pk-value-tag">{{ rows }}</span></label>
          <input
            type="range"
            class="pk-range"
            v-model.number="rows"
            min="8"
            max="16"
            step="1"
            :disabled="isDropping"
            @change="rebuildBoard"
          />
          <div class="pk-range-labels"><span>8</span><span>16</span></div>
        </div>

        <!-- BALLS COUNT -->
        <div class="pk-section">
          <label class="pk-label">BALLS <span class="pk-value-tag">{{ ballCount }}</span></label>
          <input type="range" class="pk-range" v-model.number="ballCount" min="1" max="5" step="1" />
          <div class="pk-range-labels"><span>1</span><span>5</span></div>
        </div>

        <!-- AUTOBET -->
        <div class="pk-section">
          <div class="pk-toggle-row">
            <span class="pk-label" style="margin:0">AUTO BET</span>
            <div class="pk-toggle" :class="{ on: autoBet }" @click="toggleAuto">
              <div class="pk-toggle-thumb"></div>
            </div>
          </div>
          <div v-if="autoBet" class="pk-auto-config">
            <label class="pk-label-sm">BETS REMAINING</label>
            <input type="number" class="pk-input pk-input-sm" v-model.number="autoCount" min="1" max="999" />
          </div>
        </div>

        <!-- DROP BUTTON -->
        <button
          class="pk-drop-btn"
          :class="{ 'btn-pulsing': autoBet && isDropping }"
          :disabled="betAmount <= 0 || betAmount > balance || isDropping && !autoBet"
          @click="dropBalls"
        >
          <span v-if="!isDropping || !autoBet">🎯 DROP BALL{{ ballCount > 1 ? 'S' : '' }}</span>
          <span v-else>⟳ AUTO {{ autoRemaining }} LEFT</span>
        </button>

        <!-- HISTORY -->
        <div class="pk-section pk-history">
          <label class="pk-label">LAST RESULTS</label>
          <div class="pk-history-list">
            <TransitionGroup name="hist">
              <div
                v-for="h in history.slice(0, 12)"
                :key="h.id"
                class="hist-item"
                :class="h.cls"
              >
                <span class="hist-mult">{{ h.mult }}x</span>
                <span class="hist-delta" :class="h.delta >= 0 ? 'pos' : 'neg'">
                  {{ h.delta >= 0 ? '+' : '' }}${{ Math.abs(h.delta).toFixed(2) }}
                </span>
              </div>
            </TransitionGroup>
          </div>
        </div>
      </aside>

      <!-- ═══ CANVAS AREA ═══ -->
      <div class="pk-board-wrap" ref="boardWrap">
        <!-- Matter.js renders here -->
        <canvas ref="canvasRef" class="pk-canvas"></canvas>

        <!-- Slot labels overlay -->
        <div class="pk-slots-overlay" ref="slotsOverlay">
          <div
            v-for="(slot, i) in currentMultipliers"
            :key="i"
            class="pk-slot"
            :class="[slotClass(slot), { 'slot-hit': slotHits[i] > 0 }]"
            :style="slotStyle(i)"
          >
            {{ slot }}x
          </div>
        </div>

        <!-- Win flash overlay -->
        <Transition name="win-flash">
          <div v-if="winFlash" class="pk-win-flash" :class="winFlash.cls">
            <div class="wf-mult">{{ winFlash.mult }}x</div>
            <div class="wf-amount">+${{ winFlash.amount }}</div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup>
// ─────────────────────────────────────────────────────────────────────────────
//  IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
import {
  ref, reactive, computed, watch, onMounted, onUnmounted, nextTick
} from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
//  MATTER.JS — cargado dinámicamente desde CDN para no necesitar instalación
//  (equivalente a: import Matter from 'matter-js' si está en node_modules)
// ─────────────────────────────────────────────────────────────────────────────
let Matter = null

async function loadMatter() {
  return new Promise((resolve, reject) => {
    if (window.Matter) { Matter = window.Matter; resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
    s.onload  = () => { Matter = window.Matter; resolve() }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTES DE CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────

/** Multiplicadores por modo de riesgo y número de filas */
const MULTIPLIERS = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    9:  [5.6, 2.0, 1.6, 1.0, 0.7, 0.7, 1.0, 1.6, 2.0, 5.6],
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    11: [8.4, 3.0, 1.9, 1.3, 1.0, 0.7, 0.7, 1.0, 1.3, 1.9, 3.0, 8.4],
    12: [10,  3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10],
    13: [8.1, 4.0, 3.0, 1.9, 1.2, 0.9, 0.7, 0.7, 0.9, 1.2, 1.9, 3.0, 4.0, 8.1],
    14: [7.1, 4.0, 1.9, 1.4, 1.3, 1.1, 1.0, 0.5, 1.0, 1.1, 1.3, 1.4, 1.9, 4.0, 7.1],
    15: [15,  8.0, 3.0, 2.0, 1.5, 1.1, 1.0, 0.7, 0.7, 1.0, 1.1, 1.5, 2.0, 3.0, 8.0, 15],
    16: [16,  9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16],
  },
  medium: {
    8:  [13, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
    9:  [18, 4.0, 1.7, 0.9, 0.5, 0.5, 0.9, 1.7, 4.0, 18],
    10: [22, 5.0, 2.0, 1.4, 0.6, 0.4, 0.6, 1.4, 2.0, 5.0, 22],
    11: [24, 6.0, 3.0, 1.8, 0.7, 0.5, 0.5, 0.7, 1.8, 3.0, 6.0, 24],
    12: [33, 11, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11, 33],
    13: [43, 13, 6.0, 3.0, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3.0, 6.0, 13, 43],
    14: [58, 15, 7.0, 4.0, 1.9, 1.0, 0.5, 0.2, 0.5, 1.0, 1.9, 4.0, 7.0, 15, 58],
    15: [88, 18, 11, 5.0, 2.0, 1.0, 0.5, 0.3, 0.3, 0.5, 1.0, 2.0, 5.0, 11, 18, 88],
    16: [110,41, 10, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10, 41, 110],
  },
  high: {
    8:  [29, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
    9:  [43, 7.0, 2.0, 0.6, 0.2, 0.2, 0.6, 2.0, 7.0, 43],
    10: [76, 10, 3.0, 0.9, 0.3, 0.2, 0.3, 0.9, 3.0, 10, 76],
    11: [120,14, 5.2, 1.4, 0.4, 0.2, 0.2, 0.4, 1.4, 5.2, 14, 120],
    12: [170,24, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24, 170],
    13: [260,37, 11, 4.0, 1.0, 0.2, 0.2, 0.2, 0.2, 1.0, 4.0, 11, 37, 260],
    14: [420,56, 18, 5.0, 1.9, 0.3, 0.2, 0.2, 0.3, 1.9, 5.0, 18, 56, 420],
    15: [620,83, 27, 8.0, 3.0, 0.5, 0.2, 0.2, 0.2, 0.5, 3.0, 8.0, 27, 83, 620],
    16: [1000,130,26,9.0,4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26, 130,1000],
  }
}

/** Configuración de física por nivel de riesgo */
const PHYSICS_CONFIG = {
  low:    { restitution: 0.55, friction: 0.01, frictionAir: 0.02, spreadBias: 0.15 },
  medium: { restitution: 0.62, friction: 0.005,frictionAir: 0.015,spreadBias: 0.22 },
  high:   { restitution: 0.70, friction: 0.001,frictionAir: 0.010,spreadBias: 0.30 },
}

// ─────────────────────────────────────────────────────────────────────────────
//  ESTADO REACTIVO
// ─────────────────────────────────────────────────────────────────────────────

const appRef      = ref(null)
const boardWrap   = ref(null)
const canvasRef   = ref(null)
const slotsOverlay= ref(null)

const balance     = ref(1000.00)
const betAmount   = ref(1.00)
const risk        = ref('medium')
const rows        = ref(12)
const ballCount   = ref(1)
const autoBet     = ref(false)
const autoCount   = ref(10)
const autoRemaining = ref(0)
const isDropping  = ref(false)
const balFlash    = ref(null)   // 'up' | 'down' | null
const winFlash    = ref(null)   // { mult, amount, cls } | null
const slotHits    = reactive({}) // index → hit count (para animaciones)
const history     = ref([])      // historial de resultados
let histId        = 0

const risks = [
  { id: 'low',    label: 'LOW'    },
  { id: 'medium', label: 'MED'    },
  { id: 'high',   label: 'HIGH'   },
]

// ─────────────────────────────────────────────────────────────────────────────
//  COMPUTED
// ─────────────────────────────────────────────────────────────────────────────

const currentMultipliers = computed(() => MULTIPLIERS[risk.value]?.[rows.value] ?? [])

// ─────────────────────────────────────────────────────────────────────────────
//  MOTOR MATTER.JS
// ─────────────────────────────────────────────────────────────────────────────

// Referencias al motor de física
let engine     = null
let render     = null
let runner     = null

/** Dimensiones actuales del board */
let boardW = 0
let boardH = 0

/** Posiciones X de los slots inferiores (calculadas al rebuild) */
let slotXPositions = []

/** Bolas activas en la simulación */
let activeBalls = []

/** Loop de animación propio (para sincronizar render + lógica) */
let rafId = null

/** Cuerpos de los pines */
let pinBodies = []

/** Cuerpos de las paredes */
let wallBodies = []

/**
 * Inicializa el engine de Matter.js y el renderer.
 * Se llama una vez al montar el componente.
 */
function initMatter() {
  const { Engine, Render, Runner, Events } = Matter

  // Dimensiones reales del canvas
  const rect = boardWrap.value.getBoundingClientRect()
  boardW = rect.width  || 520
  boardH = rect.height || 620

  canvasRef.value.width  = boardW
  canvasRef.value.height = boardH

  // Crear engine con gravedad configurable
  engine = Engine.create({
    gravity: { x: 0, y: 1.8, scale: 0.001 },
    positionIterations: 10,
    velocityIterations: 8,
  })

  // Renderer de Matter.js apuntando a nuestro canvas
  render = Render.create({
    canvas: canvasRef.value,
    engine: engine,
    options: {
      width:       boardW,
      height:      boardH,
      background:  'transparent',
      wireframes:  false,
      pixelRatio:  window.devicePixelRatio || 1,
    }
  })

  // Runner
  runner = Runner.create({ isFixed: false, delta: 1000 / 60 })
  Runner.run(runner, engine)
  Render.run(render)

  // Escuchar colisiones para detectar llegada al slot
  Events.on(engine, 'collisionStart', onCollision)

  // Construir pines y paredes
  buildBoard()

  // Loop propio para lógica de bolas que salen del board
  startLogicLoop()
}

/**
 * Construye los pines (cuerpos circulares estáticos) y las paredes laterales.
 * Se llama al iniciar y al cambiar el número de filas.
 */
function buildBoard() {
  const { Bodies, Composite, Body } = Matter

  // Limpiar cuerpos anteriores (pines + paredes)
  if (pinBodies.length) Composite.remove(engine.world, pinBodies)
  if (wallBodies.length) Composite.remove(engine.world, wallBodies)
  pinBodies  = []
  wallBodies = []
  slotXPositions = []

  const numRows   = rows.value
  const padTop    = 60
  const padBottom = 70
  const padSides  = 20
  const usableH   = boardH - padTop - padBottom
  const usableW   = boardW - padSides * 2
  const rowSpacing= usableH / numRows
  const pinRadius = Math.max(4, Math.min(7, boardW / (numRows * 5)))
  const ballRad   = pinRadius * 1.65

  // Guardar para uso externo
  window._plinkoRadii = { pin: pinRadius, ball: ballRad }

  // ── Generar pines en triángulo de Galton ──
  // Fila r tiene (r + 2) pines, centrados horizontalmente
  for (let r = 0; r < numRows; r++) {
    const numPins  = r + 2
    const spacing  = usableW / (numPins + 1)
    const y        = padTop + rowSpacing * r + rowSpacing * 0.5

    for (let c = 0; c < numPins; c++) {
      const x = padSides + spacing * (c + 1)
      const pin = Bodies.circle(x, y, pinRadius, {
        isStatic:    true,
        restitution: 0.3,
        friction:    0.0,
        label:       'pin',
        render: {
          fillStyle:   '#3a4a5c',
          strokeStyle: '#5ae0ff',
          lineWidth:   1.5,
        }
      })
      pinBodies.push(pin)
    }
  }

  // ── Calcular posiciones X de los slots ──
  // Los slots coinciden con los espacios entre los pines de la última fila
  const lastRow    = numRows - 1
  const lastPins   = lastRow + 2
  const lastSpacing= usableW / (lastPins + 1)
  const numSlots   = lastPins + 1

  for (let s = 0; s < numSlots; s++) {
    const x = padSides + lastSpacing * s + lastSpacing * 0.5
    slotXPositions.push(x)
  }

  // ── Paredes laterales (invisibles) ──
  const wallOpts = {
    isStatic: true, friction: 0, restitution: 0.4, label: 'wall',
    render: { fillStyle: 'transparent', visible: false }
  }

  const leftWall  = Bodies.rectangle(padSides - 5, boardH / 2, 10, boardH, wallOpts)
  const rightWall = Bodies.rectangle(boardW - padSides + 5, boardH / 2, 10, boardH, wallOpts)
  const floor     = Bodies.rectangle(boardW / 2, boardH + 20, boardW, 40, { ...wallOpts, label: 'floor' })

  wallBodies = [leftWall, rightWall, floor]

  // Agregar al mundo
  Matter.Composite.add(engine.world, [...pinBodies, ...wallBodies])
}

/**
 * Crea una bola y la suelta desde la parte superior.
 *
 * TRUCO DE PROBABILIDAD INTERNA:
 * Añadimos un sesgo horizontal aleatorio (spreadBias) que depende del modo
 * de riesgo. Esto hace que en HIGH el movimiento sea más impredecible.
 * La física real de Matter.js hace el resto → rebotes auténticos.
 *
 * Para influir en el resultado sin romper la física visual, podemos añadir
 * una velocidad inicial horizontal pequeña sesgada hacia un slot objetivo.
 * El bias es suficientemente pequeño para que parezca natural.
 */
function spawnBall(targetSlotHint = null) {
  const { Bodies, Composite, Body } = Matter
  const { restitution, friction, frictionAir, spreadBias } = PHYSICS_CONFIG[risk.value]
  const { pin: pinR, ball: ballR } = window._plinkoRadii || { pin: 5, ball: 8 }

  const dropX = boardW / 2 + (Math.random() - 0.5) * 12
  const dropY = 20

  const ballBody = Bodies.circle(dropX, dropY, ballR, {
    restitution,
    friction,
    frictionAir,
    density:     0.004,
    label:       'ball',
    render: {
      fillStyle:   riskBallColor(),
      strokeStyle: riskBallGlow(),
      lineWidth:   2,
    }
  })

  // Velocidad inicial con spread bias (controlado)
  let vx = (Math.random() - 0.5) * spreadBias * 3

  // Si tenemos un hint de slot objetivo, añadir sesgo sutil hacia él
  if (targetSlotHint !== null && slotXPositions.length > 0) {
    const targetX = slotXPositions[targetSlotHint]
    const dir     = targetX > boardW / 2 ? 1 : -1
    vx += dir * spreadBias * 0.5  // sesgo muy suave, no determinista
  }

  Body.setVelocity(ballBody, { x: vx, y: 1.5 })

  // Metadata de la bola
  ballBody._meta = {
    id:        Date.now() + Math.random(),
    bet:       betAmount.value,
    resolved:  false,
    birthTime: Date.now(),
  }

  Composite.add(engine.world, ballBody)
  activeBalls.push(ballBody)
  return ballBody
}

/**
 * Devuelve el color de la bola según el nivel de riesgo.
 */
function riskBallColor() {
  return { low: '#4ee7b8', medium: '#f7b731', high: '#ff4757' }[risk.value]
}

function riskBallGlow() {
  return { low: '#00ffa3', medium: '#ffd32a', high: '#ff6b81' }[risk.value]
}

/**
 * Manejador de colisiones de Matter.js.
 * Detecta cuando una bola toca el suelo (floor) y resuelve la apuesta.
 */
function onCollision(event) {
  const pairs = event.pairs
  for (const pair of pairs) {
    const { bodyA, bodyB } = pair
    const ball  = bodyA.label === 'ball' ? bodyA : bodyB.label === 'ball' ? bodyB : null
    const floor = bodyA.label === 'floor' ? bodyA : bodyB.label === 'floor' ? bodyB : null
    if (ball && floor && !ball._meta.resolved) {
      resolveBall(ball)
    }
  }
}

/**
 * Resuelve la apuesta de una bola cuando llega al fondo.
 * Encuentra el slot más cercano y aplica el multiplicador correspondiente.
 */
function resolveBall(ball) {
  ball._meta.resolved = true

  const ballX   = ball.position.x
  const mults   = currentMultipliers.value
  const numSlots= mults.length

  // Mapear posición X del canvas → índice de slot
  const padSides  = 20
  const usableW   = boardW - padSides * 2
  const slotW     = usableW / numSlots
  const relX      = ballX - padSides
  let slotIndex   = Math.floor(relX / slotW)
  slotIndex       = Math.max(0, Math.min(numSlots - 1, slotIndex))

  const mult   = mults[slotIndex]
  const payout = ball._meta.bet * mult
  const delta  = payout - ball._meta.bet

  // Actualizar balance
  balance.value = Math.max(0, +(balance.value + delta).toFixed(2))

  // Flash del balance
  balFlash.value = delta >= 0 ? 'up' : 'down'
  setTimeout(() => { balFlash.value = null }, 700)

  // Animación del slot
  slotHits[slotIndex] = (slotHits[slotIndex] || 0) + 1
  setTimeout(() => { slotHits[slotIndex] = Math.max(0, (slotHits[slotIndex] || 1) - 1) }, 600)

  // Win flash overlay para multiplicadores altos
  if (mult >= 10) {
    winFlash.value = {
      mult,
      amount: payout.toFixed(2),
      cls:    mult >= 50 ? 'flash-mega' : mult >= 20 ? 'flash-big' : 'flash-good',
    }
    setTimeout(() => { winFlash.value = null }, 1800)
  }

  // Historial
  const cls = mult >= 10 ? 'hist-mega' : mult >= 2 ? 'hist-win' : mult >= 1 ? 'hist-even' : 'hist-lose'
  history.value.unshift({ id: ++histId, mult, delta: +delta.toFixed(2), cls })
  if (history.value.length > 50) history.value.pop()
}

/**
 * Loop de lógica propio (via requestAnimationFrame).
 * Elimina bolas que hayan sido resueltas o lleven demasiado tiempo en juego.
 */
function startLogicLoop() {
  function tick() {
    rafId = requestAnimationFrame(tick)
    const now    = Date.now()
    const toRemove = activeBalls.filter(b =>
      b._meta.resolved || (now - b._meta.birthTime > 15000)
    )
    for (const b of toRemove) {
      if (!b._meta.resolved) resolveBall(b)
      Matter.Composite.remove(engine.world, b)
    }
    activeBalls = activeBalls.filter(b => !toRemove.includes(b))

    // Si todas las bolas resolvieron y hay auto-bet activo
    if (activeBalls.length === 0 && isDropping.value) {
      isDropping.value = false
      if (autoBet.value && autoRemaining.value > 0) {
        autoRemaining.value--
        if (autoRemaining.value > 0) {
          setTimeout(dropBalls, 300)
        } else {
          autoBet.value = false
        }
      }
    }
  }
  rafId = requestAnimationFrame(tick)
}

/**
 * Suelta las bolas configuradas (puede ser 1-5 simultáneas).
 * Descuenta la apuesta total del balance antes de soltar.
 */
async function dropBalls() {
  if (betAmount.value <= 0) return
  const totalCost = betAmount.value * ballCount.value
  if (totalCost > balance.value) return

  // Si es el primer drop de una secuencia auto
  if (autoBet.value && autoRemaining.value === 0) {
    autoRemaining.value = autoCount.value
  }

  balance.value = +(balance.value - totalCost).toFixed(2)
  isDropping.value = true

  // Soltar las bolas con pequeño delay entre ellas
  for (let i = 0; i < ballCount.value; i++) {
    await new Promise(r => setTimeout(r, i * 120))
    spawnBall()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS DE UI
// ─────────────────────────────────────────────────────────────────────────────

/** Clase CSS de un slot según su multiplicador */
function slotClass(mult) {
  if (mult >= 50)  return 'slot-mega'
  if (mult >= 10)  return 'slot-high'
  if (mult >= 3)   return 'slot-mid'
  if (mult >= 1.5) return 'slot-low'
  return 'slot-base'
}

/** Estilo inline de un slot (posición x) */
function slotStyle(i) {
  const n      = currentMultipliers.value.length
  const pct    = (i / n) * 100
  const width  = (1 / n) * 100
  return { left: pct + '%', width: width + '%' }
}

/** Cambia el riesgo y reconstruye el board */
function setRisk(r) {
  risk.value = r
  nextTick(rebuildBoard)
}

/** Reconstruye el tablero (pines) al cambiar filas o riesgo */
function rebuildBoard() {
  if (!engine) return
  // Limpiar bolas activas antes de reconstruir
  for (const b of activeBalls) Matter.Composite.remove(engine.world, b)
  activeBalls = []
  isDropping.value = false
  buildBoard()
}

function clampBet() {
  if (betAmount.value < 0)              betAmount.value = 0
  if (betAmount.value > balance.value)  betAmount.value = +balance.value.toFixed(2)
}

function multiplyBet(m) {
  if (m < 1) betAmount.value = +(betAmount.value * 0.5).toFixed(2)
  else       betAmount.value = Math.min(+(betAmount.value * m).toFixed(2), balance.value)
}

function toggleAuto() {
  autoBet.value = !autoBet.value
  if (!autoBet.value) autoRemaining.value = 0
}

// ─────────────────────────────────────────────────────────────────────────────
//  RESIZE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
function handleResize() {
  if (!boardWrap.value || !render) return
  const rect = boardWrap.value.getBoundingClientRect()
  const newW = rect.width
  const newH = rect.height
  if (newW === boardW && newH === boardH) return

  boardW = newW
  boardH = newH
  canvasRef.value.width  = boardW
  canvasRef.value.height = boardH
  Matter.Render.setSize(render, boardW, boardH)
  rebuildBoard()
}

// ─────────────────────────────────────────────────────────────────────────────
//  LIFECYCLE
// ─────────────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadMatter()
  await nextTick()
  initMatter()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (runner) Matter.Runner.stop(runner)
  if (render) { Matter.Render.stop(render); render.canvas.remove() }
  if (engine) Matter.Engine.clear(engine)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────────
   VARIABLES GLOBALES
───────────────────────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@600;700;800&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }

.plinko-app {
  --bg:           #0d1117;
  --bg-panel:     #161b22;
  --bg-card:      #1c2230;
  --border:       rgba(255,255,255,0.07);
  --gold:         #f7b731;
  --neon-cyan:    #5ae0ff;
  --neon-green:   #4ee7b8;
  --neon-red:     #ff4757;
  --neon-purple:  #a55eea;
  --text:         #e6edf3;
  --text-muted:   #7d8590;
  --radius:       10px;

  background:     var(--bg);
  min-height:     100vh;
  font-family:    'Space Mono', monospace;
  color:          var(--text);
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────────────────────────── */
.pk-header {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         12px 24px;
  border-bottom:   1px solid var(--border);
  background:      rgba(22,27,34,0.95);
  backdrop-filter: blur(10px);
  z-index:         100;
  flex-shrink:     0;
}

.pk-logo {
  display:     flex;
  align-items: center;
  gap:         10px;
}

.logo-dot {
  width:         10px;
  height:        10px;
  border-radius: 50%;
  background:    var(--neon-cyan);
  box-shadow:    0 0 10px var(--neon-cyan), 0 0 20px var(--neon-cyan);
  animation:     logoPulse 2s ease-in-out infinite;
}

@keyframes logoPulse {
  0%,100% { box-shadow: 0 0 8px var(--neon-cyan), 0 0 16px var(--neon-cyan); }
  50%     { box-shadow: 0 0 16px var(--neon-cyan), 0 0 32px var(--neon-cyan), 0 0 48px rgba(90,224,255,0.3); }
}

.logo-text {
  font-family:     'Syne', sans-serif;
  font-size:       1.3rem;
  font-weight:     800;
  letter-spacing:  0.25em;
  background:      linear-gradient(90deg, var(--neon-cyan), var(--neon-green));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.pk-balance-wrap {
  display:        flex;
  flex-direction: column;
  align-items:    flex-end;
}

.balance-label {
  font-size:      0.55rem;
  letter-spacing: 0.3em;
  color:          var(--text-muted);
}

.balance-value {
  font-family:    'Syne', sans-serif;
  font-size:      1.2rem;
  font-weight:    700;
  color:          var(--gold);
  transition:     color 0.2s;
}

.balance-value.flash-up {
  animation: flashUp 0.6s ease-out;
}

.balance-value.flash-down {
  animation: flashDown 0.6s ease-out;
}

@keyframes flashUp {
  0%,100% { color: var(--gold); }
  40%     { color: var(--neon-green); text-shadow: 0 0 14px var(--neon-green); }
}
@keyframes flashDown {
  0%,100% { color: var(--gold); }
  40%     { color: var(--neon-red); text-shadow: 0 0 14px var(--neon-red); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   LAYOUT
───────────────────────────────────────────────────────────────────────────── */
.pk-layout {
  display:    flex;
  flex:       1;
  overflow:   hidden;
  gap:        0;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
.pk-sidebar {
  width:        280px;
  flex-shrink:  0;
  background:   var(--bg-panel);
  border-right: 1px solid var(--border);
  overflow-y:   auto;
  padding:      16px 14px;
  display:      flex;
  flex-direction: column;
  gap:          14px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.pk-section {
  display:        flex;
  flex-direction: column;
  gap:            7px;
}

.pk-label {
  font-size:      0.6rem;
  letter-spacing: 0.25em;
  color:          var(--text-muted);
  display:        flex;
  justify-content: space-between;
  align-items:    center;
}

.pk-label-sm {
  font-size:      0.55rem;
  letter-spacing: 0.2em;
  color:          var(--text-muted);
}

.pk-value-tag {
  font-family:  'Syne', sans-serif;
  font-size:    0.75rem;
  font-weight:  700;
  color:        var(--neon-cyan);
}

/* Input numérico */
.pk-input-row {
  display:    flex;
  align-items: center;
  background: var(--bg-card);
  border:     1px solid var(--border);
  border-radius: var(--radius);
  overflow:   hidden;
  transition: border-color 0.2s;
}
.pk-input-row:focus-within { border-color: var(--neon-cyan); box-shadow: 0 0 0 2px rgba(90,224,255,0.15); }

.pk-input-prefix {
  padding:    0 10px;
  color:      var(--text-muted);
  font-size:  0.85rem;
}

.pk-input {
  flex:       1;
  background: transparent;
  border:     none;
  outline:    none;
  color:      var(--text);
  font-family: 'Space Mono', monospace;
  font-size:  0.9rem;
  padding:    9px 10px 9px 0;
  -moz-appearance: textfield;
}
.pk-input::-webkit-inner-spin-button,
.pk-input::-webkit-outer-spin-button { -webkit-appearance: none; }

.pk-input-sm { font-size: 0.75rem; padding: 6px 8px; }

/* Chips de apuesta */
.pk-bet-chips {
  display: flex;
  gap:     5px;
}

.chip-btn {
  flex:          1;
  padding:       5px 0;
  background:    var(--bg-card);
  border:        1px solid var(--border);
  border-radius: 6px;
  color:         var(--text-muted);
  font-family:   'Space Mono', monospace;
  font-size:     0.6rem;
  cursor:        pointer;
  transition:    all 0.15s;
}
.chip-btn:hover {
  border-color: var(--neon-cyan);
  color:        var(--neon-cyan);
  background:   rgba(90,224,255,0.05);
}

/* Botones de riesgo */
.pk-risk-buttons { display: flex; gap: 5px; }

.risk-btn {
  flex:          1;
  padding:       8px 0;
  background:    var(--bg-card);
  border:        1px solid var(--border);
  border-radius: 8px;
  color:         var(--text-muted);
  font-family:   'Space Mono', monospace;
  font-size:     0.62rem;
  letter-spacing: 0.1em;
  cursor:        pointer;
  transition:    all 0.15s;
}
.risk-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.risk-btn.risk-low.active  { border-color: var(--neon-green); color: var(--neon-green); background: rgba(78,231,184,0.1); box-shadow: 0 0 10px rgba(78,231,184,0.2); }
.risk-btn.risk-medium.active { border-color: var(--gold); color: var(--gold); background: rgba(247,183,49,0.1); box-shadow: 0 0 10px rgba(247,183,49,0.2); }
.risk-btn.risk-high.active { border-color: var(--neon-red); color: var(--neon-red); background: rgba(255,71,87,0.1); box-shadow: 0 0 10px rgba(255,71,87,0.2); }

/* Range slider */
.pk-range {
  width:            100%;
  -webkit-appearance: none;
  appearance:       none;
  height:           4px;
  border-radius:    2px;
  background:       var(--bg-card);
  outline:          none;
  cursor:           pointer;
}
.pk-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width:         16px;
  height:        16px;
  border-radius: 50%;
  background:    var(--neon-cyan);
  box-shadow:    0 0 8px var(--neon-cyan);
  cursor:        pointer;
}
.pk-range:disabled { opacity: 0.4; cursor: not-allowed; }
.pk-range:disabled::-webkit-slider-thumb { cursor: not-allowed; }

.pk-range-labels {
  display:         flex;
  justify-content: space-between;
  font-size:       0.55rem;
  color:           var(--text-muted);
}

/* Toggle */
.pk-toggle-row {
  display:     flex;
  align-items: center;
  justify-content: space-between;
}

.pk-toggle {
  width:         44px;
  height:        24px;
  border-radius: 12px;
  background:    var(--bg-card);
  border:        1px solid var(--border);
  cursor:        pointer;
  position:      relative;
  transition:    background 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.pk-toggle.on {
  background:    rgba(90,224,255,0.2);
  border-color:  var(--neon-cyan);
  box-shadow:    0 0 10px rgba(90,224,255,0.3);
}
.pk-toggle-thumb {
  position:      absolute;
  top:           2px;
  left:          2px;
  width:         18px;
  height:        18px;
  border-radius: 50%;
  background:    var(--text-muted);
  transition:    transform 0.2s, background 0.2s;
}
.pk-toggle.on .pk-toggle-thumb {
  transform:  translateX(20px);
  background: var(--neon-cyan);
}

.pk-auto-config {
  display:        flex;
  flex-direction: column;
  gap:            5px;
}

/* DROP BUTTON */
.pk-drop-btn {
  width:          100%;
  padding:        13px;
  background:     linear-gradient(135deg, var(--neon-cyan), #3a8fdd);
  border:         none;
  border-radius:  var(--radius);
  color:          #0d1117;
  font-family:    'Syne', sans-serif;
  font-size:      0.85rem;
  font-weight:    800;
  letter-spacing: 0.1em;
  cursor:         pointer;
  transition:     all 0.2s;
  box-shadow:     0 4px 20px rgba(90,224,255,0.3);
  position:       relative;
  overflow:       hidden;
}
.pk-drop-btn::after {
  content:    '';
  position:   absolute;
  inset:      0;
  background: linear-gradient(transparent, rgba(255,255,255,0.08));
}
.pk-drop-btn:hover:not(:disabled) {
  transform:  translateY(-2px);
  box-shadow: 0 8px 30px rgba(90,224,255,0.5);
}
.pk-drop-btn:disabled {
  opacity:    0.4;
  cursor:     not-allowed;
  transform:  none;
}
.pk-drop-btn.btn-pulsing {
  animation: btnPulse 1.2s ease-in-out infinite;
}
@keyframes btnPulse {
  0%,100% { box-shadow: 0 4px 20px rgba(90,224,255,0.3); }
  50%     { box-shadow: 0 4px 40px rgba(90,224,255,0.8); }
}

/* HISTORY */
.pk-history { flex: 1; min-height: 0; }

.pk-history-list {
  display:        flex;
  flex-direction: column;
  gap:            4px;
  max-height:     220px;
  overflow-y:     auto;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.hist-item {
  display:         flex;
  justify-content: space-between;
  align-items:     center;
  padding:         5px 8px;
  border-radius:   6px;
  border:          1px solid var(--border);
  background:      var(--bg-card);
  font-size:       0.65rem;
  transition:      all 0.2s;
}

.hist-mega { border-color: rgba(247,183,49,0.4); background: rgba(247,183,49,0.05); }
.hist-win  { border-color: rgba(78,231,184,0.3); }
.hist-even { border-color: rgba(90,224,255,0.2); }
.hist-lose { border-color: rgba(255,71,87,0.2); }

.hist-mult { font-weight: 700; color: var(--text); }
.hist-delta.pos { color: var(--neon-green); }
.hist-delta.neg { color: var(--neon-red);   }

/* History transition */
.hist-enter-active { transition: all 0.3s ease; }
.hist-enter-from   { opacity: 0; transform: translateX(-10px); }

/* ─────────────────────────────────────────────────────────────────────────────
   BOARD
───────────────────────────────────────────────────────────────────────────── */
.pk-board-wrap {
  flex:       1;
  position:   relative;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(90,224,255,0.04) 0%, transparent 60%),
    var(--bg);
  overflow:   hidden;
}

/* Canvas de Matter.js */
.pk-canvas {
  display: block;
  width:   100%;
  height:  100%;
}

/* ─────────────────────────────────────────────────────────────────────────────
   SLOTS OVERLAY
───────────────────────────────────────────────────────────────────────────── */
.pk-slots-overlay {
  position:  absolute;
  bottom:    0;
  left:      0;
  right:     0;
  height:    52px;
  padding:   0 20px;
  display:   flex;
  align-items: center;
}

.pk-slot {
  position:    absolute;
  bottom:      6px;
  height:      40px;
  display:     flex;
  align-items: center;
  justify-content: center;
  font-family: 'Syne', sans-serif;
  font-size:   clamp(0.45rem, 1vw, 0.7rem);
  font-weight: 700;
  border-radius: 6px;
  border:      1px solid;
  transition:  all 0.15s;
  cursor:      default;
  padding:     0 2px;
  text-align:  center;
}

/* Colores de multiplicadores */
.slot-mega { background: rgba(247,183,49,0.15); border-color: rgba(247,183,49,0.5); color: var(--gold); box-shadow: 0 0 12px rgba(247,183,49,0.3); }
.slot-high { background: rgba(255,71,87,0.12);  border-color: rgba(255,71,87,0.4);  color: var(--neon-red);   box-shadow: 0 0 10px rgba(255,71,87,0.2); }
.slot-mid  { background: rgba(90,224,255,0.10); border-color: rgba(90,224,255,0.35);color: var(--neon-cyan);  }
.slot-low  { background: rgba(78,231,184,0.08); border-color: rgba(78,231,184,0.3); color: var(--neon-green); }
.slot-base { background: rgba(255,255,255,0.04);border-color: rgba(255,255,255,0.1);color: var(--text-muted); }

/* Animación cuando una bola cae en el slot */
.slot-hit {
  animation: slotPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes slotPop {
  0%   { transform: scaleY(1);   filter: brightness(1); }
  30%  { transform: scaleY(1.3); filter: brightness(2); }
  100% { transform: scaleY(1);   filter: brightness(1); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   WIN FLASH OVERLAY
───────────────────────────────────────────────────────────────────────────── */
.pk-win-flash {
  position:    absolute;
  top:         50%;
  left:        50%;
  transform:   translate(-50%, -50%);
  display:     flex;
  flex-direction: column;
  align-items: center;
  gap:         4px;
  padding:     16px 32px;
  border-radius: 14px;
  border:      2px solid;
  pointer-events: none;
  z-index:     50;
  backdrop-filter: blur(8px);
}

.flash-good  { background: rgba(90,224,255,0.15);  border-color: var(--neon-cyan);  box-shadow: 0 0 40px rgba(90,224,255,0.4); }
.flash-big   { background: rgba(255,71,87,0.15);   border-color: var(--neon-red);   box-shadow: 0 0 50px rgba(255,71,87,0.5);  }
.flash-mega  { background: rgba(247,183,49,0.2);   border-color: var(--gold);       box-shadow: 0 0 60px rgba(247,183,49,0.6); }

.wf-mult {
  font-family: 'Syne', sans-serif;
  font-size:   2.5rem;
  font-weight: 800;
  line-height: 1;
  color:       var(--gold);
  text-shadow: 0 0 20px currentColor;
}

.wf-amount {
  font-family: 'Space Mono', monospace;
  font-size:   1rem;
  color:       var(--neon-green);
}

.win-flash-enter-active { animation: winIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.win-flash-leave-active { transition: opacity 0.4s, transform 0.4s; }
.win-flash-enter-from   { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
.win-flash-leave-to     { opacity: 0; transform: translate(-50%, -70%) scale(1.1); }
@keyframes winIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESULT BANNER
───────────────────────────────────────────────────────────────────────────── */
.result-pop-enter-active { animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.result-pop-leave-active { transition: all 0.2s; }
.result-pop-enter-from   { opacity: 0; transform: scale(0.7) translateY(10px); }
.result-pop-leave-to     { opacity: 0; }
@keyframes popIn {
  from { opacity: 0; transform: scale(0.6) translateY(14px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESPONSIVE
───────────────────────────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .pk-layout    { flex-direction: column-reverse; }
  .pk-sidebar   { width: 100%; max-height: 340px; flex-direction: row; flex-wrap: wrap; overflow-y: auto; padding: 10px; gap: 8px; }
  .pk-section   { flex: 1 1 140px; gap: 5px; }
  .pk-history   { flex: 1 1 100%; }
  .pk-drop-btn  { padding: 10px; font-size: 0.75rem; }
  .pk-board-wrap{ flex: 1 1 300px; }
}
</style>
