<template>
  <div class="plinko-app" ref="appRef">
    <!-- ░░░ HEADER ░░░ -->
    <header class="pk-header">
      <div class="pk-logo">
        <span class="logo-dot"></span>
        <span class="logo-text">PLINKO BOARD</span>
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

        <!-- DROP BUTTON -->
        <button
          class="pk-drop-btn"
          :disabled="betAmount <= 0 || betAmount > balance || isDropping"
          @click="dropBalls"
        >
          <span>🎯 DROP BALL{{ ballCount > 1 ? 'S' : '' }}</span>
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
import { useBalance } from '../composables/useBalance.js'

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
    8:  [5.6, 1.6, 1.1, 0.9, 0.5, 0.9, 1.1, 1.6, 5.6],
    9:  [5.6, 1.8, 1.3, 0.9, 0.7, 0.7, 0.9, 1.3, 1.8, 5.6],
    10: [8.9, 2.5, 1.5, 1.0, 0.7, 0.5, 0.7, 1.0, 1.5, 2.5, 8.9],
    11: [8.4, 3.0, 1.7, 1.1, 0.8, 0.6, 0.6, 0.8, 1.1, 1.7, 3.0, 8.4],
    12: [10,  3.0, 1.6, 1.1, 0.9, 0.6, 0.5, 0.6, 0.9, 1.1, 1.6, 3.0, 10],
    13: [8.1, 4.0, 2.5, 1.5, 1.0, 0.8, 0.6, 0.6, 0.8, 1.0, 1.5, 2.5, 4.0, 8.1],
    14: [7.1, 4.0, 2.5, 1.5, 1.1, 0.9, 0.7, 0.5, 0.7, 0.9, 1.1, 1.5, 2.5, 4.0, 7.1],
    15: [15,  6.0, 3.0, 2.0, 1.3, 1.0, 0.7, 0.6, 0.6, 0.7, 1.0, 1.3, 2.0, 3.0, 6.0, 15],
    16: [16,  7.0, 4.0, 2.0, 1.4, 1.1, 0.9, 0.6, 0.5, 0.6, 0.9, 1.1, 1.4, 2.0, 4.0, 7.0, 16],
  },
  medium: {
    8:  [13, 2.5, 1.1, 0.5, 0.3, 0.5, 1.1, 2.5, 13],
    9:  [18, 4.0, 1.5, 0.6, 0.3, 0.3, 0.6, 1.5, 4.0, 18],
    10: [22, 5.0, 1.8, 0.9, 0.5, 0.2, 0.5, 0.9, 1.8, 5.0, 22],
    11: [24, 6.0, 2.5, 1.4, 0.7, 0.3, 0.3, 0.7, 1.4, 2.5, 6.0, 24],
    12: [33, 10,  3.5, 1.6, 0.9, 0.4, 0.2, 0.4, 0.9, 1.6, 3.5, 10, 33],
    13: [43, 11,  4.5, 2.0, 1.1, 0.6, 0.3, 0.3, 0.6, 1.1, 2.0, 4.5, 11, 43],
    14: [58, 12,  5.0, 2.5, 1.3, 0.8, 0.4, 0.2, 0.4, 0.8, 1.3, 2.5, 5.0, 12, 58],
    15: [88, 15,  8.0, 3.0, 1.5, 0.9, 0.5, 0.2, 0.2, 0.5, 0.9, 1.5, 3.0, 8.0, 15, 88],
    16: [110,30,  9.0, 4.0, 2.0, 1.2, 0.7, 0.3, 0.2, 0.3, 0.7, 1.2, 2.0, 4.0, 9.0, 30, 110],
  },
  high: {
    8:  [29, 4.0, 1.5, 0.2, 0.2, 0.2, 1.5, 4.0, 29],
    9:  [43, 7.0, 2.0, 0.3, 0.2, 0.2, 0.3, 2.0, 7.0, 43],
    10: [76, 10,  3.0, 0.5, 0.2, 0.2, 0.2, 0.5, 3.0, 10, 76],
    11: [120,14,  4.0, 0.7, 0.2, 0.2, 0.2, 0.2, 0.7, 4.0, 14, 120],
    12: [170,24,  6.0, 1.0, 0.2, 0.2, 0.2, 0.2, 0.2, 1.0, 6.0, 24, 170],
    13: [260,37,  8.0, 1.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.3, 1.5, 8.0, 37, 260],
    14: [420,56,  12,  2.0, 0.4, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 2.0, 12,  56, 420],
    15: [620,83,  18,  3.0, 0.5, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.5, 3.0, 18, 83, 620],
    16: [1000,130,20,  5.0, 1.0, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1.0, 5.0, 20, 130, 1000],
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

const { balance } = useBalance()
const betAmount   = ref(1.00)
const risk        = ref('medium')
const rows        = ref(12)
const ballCount   = ref(1)
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

  // ── Calcular el espaciado constante spacingX ──
  // Queremos que la última fila (numRows - 1) tenga numRows + 2 pines
  // y que se extienda exactamente a lo largo de usableW.
  const lastPins   = numRows + 2
  const spacingX   = usableW / (lastPins - 1)

  // ── Generar pines en triángulo de Galton (Pirámide) ──
  for (let r = 0; r < numRows; r++) {
    const numPins  = r + 3 // Empieza con 3 pines y termina con numRows + 2
    const y        = padTop + rowSpacing * r + rowSpacing * 0.5
    const rowWidth = (numPins - 1) * spacingX
    const startX   = boardW / 2 - rowWidth / 2

    for (let c = 0; c < numPins; c++) {
      const x = startX + c * spacingX
      const pin = Bodies.circle(x, y, pinRadius, {
        isStatic:    true,
        restitution: 0.3,
        friction:    0.0,
        label:       'pin',
        render: {
          fillStyle:   '#2c2419',
          strokeStyle: '#c9a84c',
          lineWidth:   1.5,
        }
      })
      pinBodies.push(pin)
    }
  }

  // ── Calcular posiciones X de los slots ──
  // Los slots son los espacios entre los pines de la última fila (numRows + 1 slots)
  const numSlots   = numRows + 1
  const startXLast = boardW / 2 - ((numRows + 1) * spacingX) / 2

  for (let s = 0; s < numSlots; s++) {
    const x = startXLast + (s + 0.5) * spacingX
    slotXPositions.push(x)
  }

  // ── Paredes laterales diagonales físicas y visibles ──
  const diagonalWallOpts = {
    isStatic: true,
    friction: 0,
    restitution: 0.4,
    label: 'wall',
    render: {
      fillStyle:   'rgba(44, 36, 25, 0.8)', // Color de los pines
      strokeStyle: '#c9a84c', // Brillo dorado LuxeBet para el contorno
      lineWidth:   2,
    }
  }

  // Coordenadas de los pines extremos izquierdos
  const xTopLeft = boardW / 2 - spacingX
  const yTop = padTop + rowSpacing * 0.5
  const xBottomLeft = boardW / 2 - ((numRows + 1) * spacingX) / 2
  const yBottom = padTop + rowSpacing * (numRows - 0.5)

  const dxLeft = xBottomLeft - xTopLeft
  const dyLeft = yBottom - yTop
  const wallLength = Math.sqrt(dxLeft * dxLeft + dyLeft * dyLeft)
  const angleLeft = -Math.atan2(dxLeft, dyLeft) // Negado por la inversión del eje Y en pantalla

  const cxLeft = (xTopLeft + xBottomLeft) / 2
  const cyLeft = (yTop + yBottom) / 2

  // Vector unitario a lo largo de la pared izquierda
  const uxLeft = dxLeft / wallLength
  const uyLeft = dyLeft / wallLength

  // Vector perpendicular unitario apuntando hacia la izquierda (afuera)
  const pxLeft = -uyLeft
  const pyLeft = uxLeft

  // Desplazamiento exterior
  const shiftDist = pinRadius + ballRad + 4
  const cxLeftShifted = cxLeft + pxLeft * shiftDist
  const cyLeftShifted = cyLeft + pyLeft * shiftDist

  const leftWall = Bodies.rectangle(cxLeftShifted, cyLeftShifted, 6, wallLength + 15, {
    ...diagonalWallOpts,
    angle: angleLeft
  })

  // Coordenadas de los pines extremos derechos
  const xTopRight = boardW / 2 + spacingX
  const xBottomRight = boardW / 2 + ((numRows + 1) * spacingX) / 2

  const dxRight = xBottomRight - xTopRight
  const dyRight = yBottom - yTop
  const angleRight = -Math.atan2(dxRight, dyRight)

  const cxRight = (xTopRight + xBottomRight) / 2
  const cyRight = (yTop + yBottom) / 2

  // Vector unitario a lo largo de la pared derecha
  const uxRight = dxRight / wallLength
  const uyRight = dyRight / wallLength

  // Vector perpendicular unitario apuntando hacia la derecha (afuera)
  const pxRight = uyRight
  const pyRight = -uxRight

  const cxRightShifted = cxRight + pxRight * shiftDist
  const cyRightShifted = cyRight + pyRight * shiftDist

  const rightWall = Bodies.rectangle(cxRightShifted, cyRightShifted, 6, wallLength + 15, {
    ...diagonalWallOpts,
    angle: angleRight
  })

  // Suelo invisible para disparar el trigger de colisión
  const floorOpts = {
    isStatic: true, friction: 0, restitution: 0.4, label: 'floor',
    render: { fillStyle: 'transparent', visible: false }
  }
  const floor = Bodies.rectangle(boardW / 2, boardH + 20, boardW, 40, floorOpts)

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
  return { low: '#c9a84c', medium: '#e67e22', high: '#e74c3c' }[risk.value]
}

function riskBallGlow() {
  return { low: '#f0d080', medium: '#ffd32a', high: '#ff7675' }[risk.value]
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

    // Si todas las bolas resolvieron
    if (activeBalls.length === 0 && isDropping.value) {
      isDropping.value = false
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
  --bg:           transparent;
  --bg-panel:     rgba(10, 10, 10, 0.65);
  --bg-card:      rgba(26, 26, 26, 0.6);
  --border:       rgba(201, 168, 76, 0.15); /* Soft gold-tinted borders */
  --gold:         #c9a84c; /* LuxeBet Gold */
  --gold-light:   #f0d080;
  --gold-dark:    #8a6a20;
  --neon-cyan:    #f0d080; /* Mapped to gold-light */
  --neon-green:   #2ecc71; /* Emerald/win green */
  --neon-red:     #e74c3c; /* Luxe Red */
  --neon-purple:  #80001a; /* Crimson Red */
  --text:         #e6edf3;
  --text-muted:   #a0a0a0;
  --radius:       12px;

  background:     transparent;
  min-height:     100%;
  font-family:    'Space Mono', monospace;
  color:          var(--text);
  display:        flex;
  flex-direction: column;
  overflow:       hidden;
  border-radius:  16px;
  border:         1px solid rgba(255, 255, 255, 0.03);
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
  background:      rgba(10, 10, 10, 0.3);
  backdrop-filter: blur(5px);
  z-index:         100;
  flex-shrink:     0;
  border-radius:   16px 16px 0 0;
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
  50%     { box-shadow: 0 0 16px var(--neon-cyan), 0 0 32px var(--neon-cyan), 0 0 48px rgba(240,208,128,0.3); }
}

.logo-text {
  font-family:     'Syne', sans-serif;
  font-size:       1.3rem;
  font-weight:     800;
  letter-spacing:  0.25em;
  background:      linear-gradient(90deg, var(--gold-light), var(--gold));
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
  appearance: textfield;
}
.pk-input::-webkit-inner-spin-button,
.pk-input::-webkit-outer-spin-button { -webkit-appearance: none; appearance: none; }

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

.risk-btn.risk-low.active  { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.1); box-shadow: 0 0 10px rgba(201,168,76,0.2); }
.risk-btn.risk-medium.active { border-color: #e67e22; color: #e67e22; background: rgba(230,126,34,0.1); box-shadow: 0 0 10px rgba(230,126,34,0.2); }
.risk-btn.risk-high.active { border-color: var(--neon-red); color: var(--neon-red); background: rgba(231,76,60,0.1); box-shadow: 0 0 10px rgba(231,76,60,0.2); }

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
  background:     linear-gradient(135deg, var(--gold-light), var(--gold));
  border:         none;
  border-radius:  var(--radius);
  color:          #0d1117;
  font-family:    'Syne', sans-serif;
  font-size:      0.85rem;
  font-weight:    800;
  letter-spacing: 0.1em;
  cursor:         pointer;
  transition:     all 0.2s;
  box-shadow:     0 4px 20px rgba(201, 168, 76, 0.3);
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
  box-shadow: 0 8px 30px rgba(201, 168, 76, 0.5);
}
.pk-drop-btn:disabled {
  opacity:    0.4;
  cursor:     not-allowed;
  transform:  none;
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

.hist-mega { border-color: rgba(240, 208, 128, 0.4); background: rgba(240, 208, 128, 0.05); }
.hist-win  { border-color: rgba(230, 126, 34, 0.3); background: rgba(230, 126, 34, 0.05); }
.hist-even { border-color: rgba(201, 168, 76, 0.25); background: rgba(201, 168, 76, 0.02); }
.hist-lose { border-color: rgba(231, 76, 60, 0.25); background: rgba(231, 76, 60, 0.02); }

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
    radial-gradient(ellipse at 50% 30%, rgba(201, 168, 76, 0.06) 0%, transparent 60%),
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
.slot-mega { background: rgba(240, 208, 128, 0.25); border-color: var(--gold-light); color: var(--gold-light); box-shadow: 0 0 12px rgba(240, 208, 128, 0.4); }
.slot-high { background: rgba(230, 126, 34, 0.18);  border-color: #e67e22;  color: #ff9f43;   box-shadow: 0 0 10px rgba(230, 126, 34, 0.3); }
.slot-mid  { background: rgba(201, 168, 76, 0.15); border-color: var(--gold); color: var(--gold);  }
.slot-low  { background: rgba(138, 106, 32, 0.1); border-color: var(--gold-dark); color: #c9a84c; }
.slot-base { background: rgba(231, 76, 60, 0.08); border-color: rgba(231, 76, 60, 0.2); color: rgba(231, 76, 60, 0.7); }

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

.flash-good  { background: rgba(201, 168, 76, 0.15);  border-color: var(--gold);  box-shadow: 0 0 40px rgba(201, 168, 76, 0.4); }
.flash-big   { background: rgba(230, 126, 34, 0.15);   border-color: #e67e22;   box-shadow: 0 0 50px rgba(230, 126, 34, 0.5);  }
.flash-mega  { background: rgba(240, 208, 128, 0.2);   border-color: var(--gold-light);       box-shadow: 0 0 60px rgba(240, 208, 128, 0.6); }

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
