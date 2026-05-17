<template>
  <div class="bj-universe">
    <div class="game-board">
      <!-- Ambient felt texture overlay -->
      <div class="felt-texture" aria-hidden="true"></div>

      <!-- ═══════════════════════════════════════════
           HEADER — Saldo y apuesta activa
      ════════════════════════════════════════════ -->
      <header class="bj-header">
        <div class="stat-pill">
          <span class="stat-label">SALDO</span>
          <span class="stat-value" :class="{ 'flash-green': flashBalance }">
            ${{ balance.toLocaleString() }}
          </span>
        </div>

        <div class="logo-wrap">
          <span class="logo-suit">♠</span>
          <span class="logo-text">BLACKJACK</span>
          <span class="logo-suit red">♥</span>
        </div>

        <div class="stat-pill">
          <span class="stat-label">APUESTA</span>
          <span class="stat-value bet-color">${{ currentBet }}</span>
        </div>
      </header>

      <!-- ═══════════════════════════════════════════
           MESA DE JUEGO
      ════════════════════════════════════════════ -->
      <main class="bj-table">
        <!-- ── DECORACIÓN: MAZO (SHOE) ── -->
        <div class="deck-stack" aria-hidden="true">
          <div class="deck-card-layer"></div>
          <div class="deck-card-layer"></div>
          <div class="deck-card-layer"></div>
          <div class="deck-card-top">
            <div class="card-back-pattern"></div>
          </div>
        </div>

        <!-- ── ZONA CRUPIER ── -->
        <section class="dealer-zone zone">
          <h2 class="zone-label">
            CRUPIER
            <span v-if="dealerScore > 0" class="score-badge">
              {{ dealerScore }}
            </span>
          </h2>

          <div class="cards-row">
            <TransitionGroup name="card-deal" tag="div" class="cards-inner">
              <div
                v-for="(card, i) in dealerHand"
                :key="card.id"
                class="card"
                :class="{ 'is-flipped': !card.hidden }"
                :style="{ '--deal-delay': `${i * 0.12}s` }"
              >
                <div class="card-inner">
                  <div class="card-face card-back">
                    <div class="card-back-pattern"></div>
                  </div>
                  <div class="card-face card-front" :class="`suit-${card.suitClass}`">
                    <span class="card-corner top">{{ card.rank }}</span>
                    <span class="card-suit-center">{{ card.suitSymbol }}</span>
                    <span class="card-corner bottom">{{ card.rank }}</span>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </section>

        <!-- ── BANNER DE RESULTADO ── -->
        <Transition name="banner-pop">
          <div v-if="resultMessage" class="result-banner" :class="resultClass">
            <span class="result-icon">{{ resultIcon }}</span>
            <span class="result-text">{{ resultMessage }}</span>
            <span v-if="resultPayout" class="result-payout">{{ resultPayout }}</span>
          </div>
        </Transition>

        <!-- ── ZONA JUGADOR ── -->
        <section class="player-zone zone">
          <div class="cards-row">
            <TransitionGroup name="card-deal" tag="div" class="cards-inner">
              <div
                v-for="(card, i) in playerHand"
                :key="card.id"
                class="card"
                :class="{ 'is-flipped': !card.hidden }"
                :style="{ '--deal-delay': `${i * 0.12}s` }"
              >
                <div class="card-inner">
                  <div class="card-face card-back">
                    <div class="card-back-pattern"></div>
                  </div>
                  <div class="card-face card-front" :class="`suit-${card.suitClass}`">
                    <span class="card-corner top">{{ card.rank }}</span>
                    <span class="card-suit-center">{{ card.suitSymbol }}</span>
                    <span class="card-corner bottom">{{ card.rank }}</span>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <h2 class="zone-label player-label">
            JUGADOR
            <span v-if="playerHand.length > 0" class="score-badge" :class="{ 'score-bust': playerScore > 21 }">
              {{ playerScore }}
            </span>
          </h2>
        </section>

      </main>

      <!-- ═══════════════════════════════════════════
           PANEL DE CONTROL
      ════════════════════════════════════════════ -->
      <footer class="bj-controls">

        <!-- FASE: Apuestas -->
        <Transition name="panel-slide">
          <div v-if="gamePhase === 'betting'" class="control-panel betting-panel">
            <p class="panel-title">SELECCIONA TU APUESTA</p>

            <div class="chip-row">
              <button
                v-for="chip in chipValues"
                :key="chip"
                class="chip"
                :class="`chip-${chip}`"
                :disabled="chip > balance"
                @click="addBet(chip)"
              >
                ${{ chip }}
              </button>
            </div>

            <div class="bet-actions">
              <button class="btn btn-ghost" :disabled="currentBet === 0" @click="clearBet">
                ✕ Borrar
              </button>
              <button class="btn btn-ghost btn-all-in" :disabled="balance === 0" @click="currentBet = balance">
                🔥 All In
              </button>
              <div class="bet-preview">${{ currentBet }}</div>
              <button
                class="btn btn-primary btn-play"
                :disabled="currentBet === 0 || gamePhase === 'dealing'"
                @click="dealInitial"
              >
                ▶ Jugar
              </button>
            </div>
          </div>
        </Transition>

        <!-- FASE: Turno del jugador -->
        <Transition name="panel-slide">
          <div v-if="gamePhase === 'playerTurn'" class="control-panel action-panel">
            <button class="btn btn-action btn-hit" @click="hit">
              <span class="btn-icon">＋</span> Pedir
            </button>
            <button class="btn btn-action btn-stand" @click="stand">
              <span class="btn-icon">✋</span> Plantarse
            </button>
            <button
              class="btn btn-action btn-double"
              :disabled="!canDouble"
              @click="doubleDown"
              :title="!canDouble ? 'Solo disponible en la primera acción' : 'Doblar apuesta'"
            >
              <span class="btn-icon">×2</span> Doblar
            </button>
          </div>
        </Transition>

        <!-- FASE: Fin de ronda -->
        <Transition name="panel-slide">
          <div v-if="gamePhase === 'roundOver'" class="control-panel end-panel">
            <button class="btn btn-primary btn-wide" @click="newRound">
              ↺ Nueva Ronda
            </button>
            <button v-if="balance < 10" class="btn btn-ghost btn-wide" @click="resetGame">
              ⟳ Reiniciar ($1000)
            </button>
          </div>
        </Transition>

        <!-- FASE: Animación crupier -->
        <Transition name="panel-slide">
          <div v-if="gamePhase === 'dealerTurn'" class="control-panel dealer-thinking">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
          </div>
        </Transition>

      </footer>
    </div>
  </div>
</template>

<script setup>
// ─────────────────────────────────────────────────────────
//  IMPORTS
// ─────────────────────────────────────────────────────────
import { ref, computed, nextTick } from 'vue'
import { useBalance } from '../composables/useBalance.js'

// ─────────────────────────────────────────────────────────
//  CONSTANTES DE LA BARAJA
// ─────────────────────────────────────────────────────────

/** Los cuatro palos con su símbolo Unicode y clase CSS. */
const SUITS = [
  { name: 'hearts',   symbol: '♥', suitClass: 'red'   },
  { name: 'diamonds', symbol: '♦', suitClass: 'red'   },
  { name: 'clubs',    symbol: '♣', suitClass: 'black' },
  { name: 'spades',   symbol: '♠', suitClass: 'black' },
]

/** Rangos de las cartas con su valor base. */
const RANKS = [
  { rank: 'A',  value: 11 },
  { rank: '2',  value: 2  },
  { rank: '3',  value: 3  },
  { rank: '4',  value: 4  },
  { rank: '5',  value: 5  },
  { rank: '6',  value: 6  },
  { rank: '7',  value: 7  },
  { rank: '8',  value: 8  },
  { rank: '9',  value: 9  },
  { rank: '10', value: 10 },
  { rank: 'J',  value: 10 },
  { rank: 'Q',  value: 10 },
  { rank: 'K',  value: 10 },
]

/** Denominaciones de fichas disponibles para apostar. */
const chipValues = [5, 10, 25, 50, 100]

// ─────────────────────────────────────────────────────────
//  ESTADO REACTIVO
// ─────────────────────────────────────────────────────────

const { balance, deduct, credit, refill } = useBalance()

/** Apuesta de la ronda actual (se deduce del saldo al iniciar). */
const currentBet = ref(0)

/**
 * Fase del juego. Valores posibles:
 *   'betting'    → pantalla de selección de apuesta
 *   'playerTurn' → el jugador puede Pedir / Plantarse / Doblar
 *   'dealerTurn' → el crupier juega automáticamente (animación)
 *   'roundOver'  → mostrar resultado, esperar nueva ronda
 */
const gamePhase  = ref('betting')

/** Mano del jugador — array de objetos carta. */
const playerHand = ref([])

/** Mano del crupier — array de objetos carta. */
const dealerHand = ref([])

/** Mensaje de resultado visible en el banner central. */
const resultMessage = ref('')

/** Clase CSS para colorear el banner (win / lose / push / blackjack). */
const resultClass   = ref('')

/** Texto secundario con la cantidad ganada/perdida. */
const resultPayout  = ref('')

/** Emoji/icono que acompaña al resultado. */
const resultIcon    = ref('')

/** Controla el flash verde del saldo al ganar. */
const flashBalance  = ref(false)

/** Contador global para IDs únicos de cartas (evita problemas con TransitionGroup). */
let cardIdCounter = 0

// ─────────────────────────────────────────────────────────
//  FUNCIONES DE BARAJA
// ─────────────────────────────────────────────────────────

/**
 * Genera una baraja completa de 52 cartas.
 * Cada carta es un objeto plano con todos los datos necesarios para renderizarla.
 */
function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rankObj of RANKS) {
      deck.push({
        id:          ++cardIdCounter,   // ID único para Vue key
        rank:        rankObj.rank,
        value:       rankObj.value,
        suitName:    suit.name,
        suitSymbol:  suit.symbol,
        suitClass:   suit.suitClass,
        hidden:      false,             // true = mostrar dorso (carta del crupier)
        justRevealed: false,            // activa animación de volteo
      })
    }
  }
  return deck
}

/**
 * Baraja un array in-place usando el algoritmo Fisher-Yates.
 * Complejidad O(n), distribución perfectamente uniforme.
 * @param {Array} arr - Array a barajar (se modifica en lugar)
 * @returns {Array} El mismo array barajado
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/** Referencia a la baraja activa en memoria. */
let deck = []

/**
 * Saca la carta del tope de la baraja.
 * Si la baraja se agota, regenera y vuelve a barajar (shoe continuo).
 * @param {boolean} hidden - Si true, la carta se entrega boca abajo
 * @returns {Object} Objeto carta
 */
function drawCard(hidden = false) {
  if (deck.length === 0) deck = shuffle(createDeck())
  const cardData = deck.pop()
  return {
    ...cardData,
    id: Date.now() + Math.random(),
    hidden: !!hidden
  }
}

// ─────────────────────────────────────────────────────────
//  LÓGICA DE PUNTUACIÓN
// ─────────────────────────────────────────────────────────

/**
 * Calcula la puntuación de una mano de cartas.
 *
 * REGLA DEL AS:
 * Los Ases empiezan valiendo 11. Si al sumar el total supera 21
 * y hay al menos un As contado como 11, se le resta 10 (pasa a valer 1).
 * Esto se repite por cada As en la mano hasta que la puntuación ≤ 21
 * o no queden Ases "duros" que reducir.
 *
 * Ejemplo: A + A + 9 = 11 + 11 + 9 = 31 → reduce 1er As → 21 ✓
 * Ejemplo: A + 9 + 5 = 11 + 9 + 5 = 25 → reduce As → 15 ✓
 *
 * @param {Array} hand - Array de objetos carta
 * @param {boolean} skipHidden - Si true, ignora cartas con hidden=true
 * @returns {number} Puntuación total
 */
function calcScore(hand, skipHidden = false) {
  let total   = 0
  let aces    = 0   // número de Ases contados como 11

  for (const card of hand) {
    if (skipHidden && card.hidden) continue
    total += card.value
    if (card.rank === 'A') aces++
  }

  // Reducir Ases de 11 a 1 mientras la mano se pase de 21
  while (total > 21 && aces > 0) {
    total -= 10   // 11 → 1 (diferencia de 10)
    aces--
  }

  return total
}

// ─────────────────────────────────────────────────────────
//  COMPUTED
// ─────────────────────────────────────────────────────────

/** Puntuación visible del jugador (solo cartas reveladas). */
const playerScore = computed(() => calcScore(playerHand.value, true))

/** Puntuación visible del crupier (solo cartas reveladas). */
const dealerScore = computed(() => calcScore(dealerHand.value, true))

/**
 * El jugador puede Doblar solo en su primera acción (2 cartas en mano)
 * y si tiene saldo suficiente para cubrir la apuesta adicional.
 */
const canDouble = computed(
  () => playerHand.value.length === 2 && balance.value >= currentBet.value
)

/**
 * Detecta Blackjack natural: exactamente 2 cartas sumando 21.
 * @param {Array} hand
 */
function isBlackjack(hand) {
  return hand.length === 2 && calcScore(hand) === 21
}

// ─────────────────────────────────────────────────────────
//  FLUJO DEL JUEGO
// ─────────────────────────────────────────────────────────

/** Añade una ficha al monto de apuesta actual (sin descontar saldo aún). */
function addBet(amount) {
  if (currentBet.value + amount > balance.value) return
  currentBet.value += amount
}

/** Cancela la apuesta seleccionada en la fase de betting. */
function clearBet() {
  currentBet.value = 0
}

/**
 * Inicia la ronda: descuenta la apuesta, reparte 4 cartas iniciales
 * (2 al jugador, 2 al crupier — la segunda del crupier va oculta)
 * y comprueba si hay Blackjack inmediato.
 */
/**
 * Inicia la ronda: descuenta la apuesta, reparte 4 cartas iniciales
 * de forma secuencial y animada siguiendo la coreografía de casino.
 */
async function dealInitial() {
  // Evitar doble clic o múltiples ejecuciones
  if (gamePhase.value !== 'betting') return
  
  // Establecer fase de reparto inmediatamente
  gamePhase.value = 'dealing'

  // Limpiar estado de la ronda anterior
  playerHand.value = []
  dealerHand.value = []
  resultMessage.value = ''
  resultClass.value   = ''
  resultPayout.value  = ''
  resultIcon.value    = ''

  // Descontar apuesta del saldo
  deduct(currentBet.value)

  // Asegurar baraja disponible
  if (deck.length < 10) deck = shuffle(createDeck())

  // 1. Primera carta Jugador (boca abajo)
  const p1 = drawCard(true)
  playerHand.value.push(p1)
  await wait(600)

  // 2. Primera carta Crupier (boca abajo y se revela)
  const d1 = drawCard(true)
  dealerHand.value.push(d1)
  await wait(800)
  revealCard(dealerHand.value[0])
  await wait(600)

  // 3. Segunda carta Jugador (boca abajo)
  const p2 = drawCard(true)
  playerHand.value.push(p2)
  await wait(600)

  // 4. Segunda carta Crupier (boca abajo, se queda así)
  const d2 = drawCard(true)
  dealerHand.value.push(d2)
  await wait(800)

  // 5. Revelar mano del jugador (a la vez)
  revealCard(playerHand.value[0])
  revealCard(playerHand.value[1])
  await wait(800)

  gamePhase.value = 'playerTurn'

  // Comprobar Blackjack natural del jugador en la mano inicial
  if (isBlackjack(playerHand.value)) {
    resolveBlackjackOpening()
  }
}

/**
 * Resuelve la apertura cuando el jugador tiene Blackjack natural.
 * Hay que revelar la carta oculta del crupier para ver si también tiene BJ.
 */
function resolveBlackjackOpening() {
  revealDealerCard()
  if (isBlackjack(dealerHand.value)) {
    // Empate (Push): ambos tienen Blackjack
    endRound('push')
  } else {
    // Blackjack del jugador: paga 3:2
    endRound('blackjack')
  }
}

// ── ACCIONES DEL JUGADOR ──────────────────────────────────

/** Jugador pide carta. */
async function hit() {
  if (gamePhase.value !== 'playerTurn') return
  
  const card = drawCard(true)
  playerHand.value.push(card)
  
  // Pausa ligeramente mayor para asegurar que la carta aterrice boca abajo
  await wait(900)
  revealCard(playerHand.value[playerHand.value.length - 1])
  await wait(600)

  if (playerScore.value > 21) {
    endRound('bust')
  } else if (playerScore.value === 21) {
    // Si llega a 21 exactos, pasamos turno automáticamente
    stand()
  }
}

/** Stand: el jugador se planta y empieza el turno del crupier. */
function stand() {
  gamePhase.value = 'dealerTurn'
  runDealerTurn()
}

/** Jugador dobla la apuesta, recibe UNA carta y termina su turno. */
async function doubleDown() {
  if (!canDouble.value) return
  
  // Descontar la parte adicional de la apuesta
  deduct(currentBet.value)
  currentBet.value *= 2
  
  const card = drawCard(true)
  playerHand.value.push(card)
  
  await wait(800)
  revealCard(playerHand.value[playerHand.value.length - 1])
  await wait(600)

  if (playerScore.value > 21) {
    endRound('bust')
  } else {
    stand()
  }
}

// ── TURNO DEL CRUPIER ─────────────────────────────────────

/**
 * Ejecuta el turno del crupier con delays animados para que el jugador
 * pueda ver cómo el crupier va sacando cartas.
 *
 * REGLAS DEL CRUPIER:
 * 1. Revela su carta oculta.
 * 2. Pide carta mientras su puntuación sea < 17.
 * 3. Se planta en 17 o más (incluido "17 suave" — A+6).
 * 4. Si supera 21: bust del crupier → jugador gana.
 */
async function runDealerTurn() {
  // Pequeña pausa antes de revelar para que se vea la transición
  await wait(400)
  revealDealerCard()
  await wait(600)

  // El crupier sigue pidiendo mientras su puntuación REAL sea < 17
  while (calcScore(dealerHand.value) < 17) {
    await wait(700)
    const card = drawCard(true)
    dealerHand.value.push(card)
    await wait(800)
    revealCard(dealerHand.value[dealerHand.value.length - 1])
    await wait(600)
  }

  await wait(500)

  // Resolver resultado (usar puntuación real para el crupier)
  const ps = playerScore.value
  const ds = calcScore(dealerHand.value)

  if (ds > 21) {
    endRound('dealerBust')
  } else if (ps > ds) {
    endRound('win')
  } else if (ds > ps) {
    endRound('lose')
  } else {
    endRound('push')
  }
}

/** Voltea la carta oculta del crupier activando la animación de flip. */
function revealDealerCard() {
  const hidden = dealerHand.value.find(c => c.hidden)
  revealCard(hidden)
}

/** Generalización para revelar cualquier carta con rotación 3D. */
function revealCard(card) {
  if (card && card.hidden) {
    card.hidden = false
  }
}

// ── RESOLUCIÓN DE RONDA ───────────────────────────────────

/**
 * Calcula ganancias y muestra el resultado final.
 *
 * Tablas de pago:
 *   - blackjack : apuesta × 2.5  (ganancia neta 1.5× = pago 3:2)
 *   - win       : apuesta × 2    (ganancia neta 1×   = pago 1:1)
 *   - push      : apuesta × 1    (devuelve la apuesta, sin ganancia)
 *   - bust/lose : apuesta × 0    (ya fue descontada al inicio)
 *
 * @param {'blackjack'|'win'|'push'|'bust'|'lose'|'dealerBust'} outcome
 */
function endRound(outcome) {
  gamePhase.value = 'roundOver'

  let payout       = 0
  let msgText      = ''
  let cssClass     = ''
  let icon         = ''
  let payoutText   = ''

  switch (outcome) {
    case 'blackjack':
      // Blackjack natural: paga 3:2 sobre la apuesta original
      payout      = Math.floor(currentBet.value * 2.5)
      msgText     = '¡BLACKJACK!'
      cssClass    = 'result-blackjack'
      icon        = '🃏'
      payoutText  = `+$${payout - currentBet.value} (3:2)`
      break

    case 'win':
    case 'dealerBust':
      payout      = currentBet.value * 2
      msgText     = outcome === 'dealerBust' ? '¡Crupier se pasó!' : '¡GANASTE!'
      cssClass    = 'result-win'
      icon        = outcome === 'dealerBust' ? '💥' : '🏆'
      payoutText  = `+$${currentBet.value}`
      break

    case 'push':
      payout      = currentBet.value   // devolver la apuesta
      msgText     = 'EMPATE'
      cssClass    = 'result-push'
      icon        = '🤝'
      payoutText  = 'Apuesta devuelta'
      break

    case 'bust':
      payout      = 0
      msgText     = '¡Te pasaste!'
      cssClass    = 'result-lose'
      icon        = '💀'
      payoutText  = `-$${currentBet.value}`
      break

    case 'lose':
      payout      = 0
      msgText     = 'PERDISTE'
      cssClass    = 'result-lose'
      icon        = '😔'
      payoutText  = `-$${currentBet.value}`
      break
  }

  // Acreditar ganancias al saldo
  if (payout > 0) credit(payout)

  // Flash verde en el saldo si el jugador recibe dinero
  if (payout > currentBet.value) {
    flashBalance.value = true
    setTimeout(() => { flashBalance.value = false }, 1000)
  }

  // Actualizar estado reactivo del banner
  resultMessage.value = msgText
  resultClass.value   = cssClass
  resultIcon.value    = icon
  resultPayout.value  = payoutText
}

// ─────────────────────────────────────────────────────────
//  UTILIDADES DE RONDA
// ─────────────────────────────────────────────────────────

/** Prepara una nueva ronda: limpia las manos y vuelve a la fase de apuestas. */
function newRound() {
  playerHand.value    = []
  dealerHand.value    = []
  currentBet.value    = 0
  resultMessage.value = ''
  resultClass.value   = ''
  resultPayout.value  = ''
  resultIcon.value    = ''
  gamePhase.value     = 'betting'
}

/** Reinicia completamente el juego con saldo inicial. */
function resetGame() {
  refill()
  newRound()
}

/**
 * Helper: devuelve una Promise que resuelve tras `ms` milisegundos.
 * Permite usar await en el turno del crupier para animar paso a paso.
 */
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────
   IMPORTS DE FUENTES
───────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cinzel+Decorative:wght@700&family=EB+Garamond:wght@400;500&display=swap');

/* ─────────────────────────────────────────────────────────
   VARIABLES CSS (Locales)
───────────────────────────────────────────────────────── */
.bj-universe {
  /* Colores del tapete */
  --felt-base:    #1a8e4f;
  --felt-mid:     #147a44;
  --felt-dark:    #0e6335;
  --felt-edge:    #0a4d29;

  /* Oro / acento */
  --gold:         #c9a84c;
  --gold-light:   #f0d080;
  --gold-dark:    #8a6a20;

  /* Cartas */
  --card-bg:      #fdfaf4;
  --card-red:     #c0222a;
  --card-black:   #1a1a2e;
  --card-shadow:  rgba(0,0,0,0.5);
  --card-back:    #1a3a7a;

  /* Resultados */
  --win-color:    #44dd88;
  --lose-color:   #ff4455;
  --push-color:   #f0d080;
  --bj-color:     #ffd700;
}

/* ─────────────────────────────────────────────────────────
   RESET & CONTENEDOR RAÍZ
───────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.bj-universe {
  position: relative;
  height: 100%;
  min-height: 850px;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  overflow: visible; /* Allow shadow to spread */
  font-family: 'Cinzel', serif;
  color: #fff;
  user-select: none;
  padding: 0;
  margin-top: -1px; /* Overlap the 1px header border */
}

.game-board {
  position: relative;
  width: 1400px;
  height: 850px;
  flex-shrink: 0;
  background:
    radial-gradient(ellipse at 50% 0%, var(--felt-base) 0%, var(--felt-mid) 40%, var(--felt-dark) 70%, var(--felt-edge) 100%);
  border: 8px solid var(--gold-dark);
  border-top: none;
  border-radius: 0 0 700px 700px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 100px 150px;
  box-shadow: 
    0 50px 100px rgba(0,0,0,0.9),
    inset 0 -30px 100px rgba(0,0,0,0.8);
  overflow: hidden;
}

.felt-texture {
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Ccircle cx='1' cy='1' r='0.5' fill='rgba(0,0,0,0.15)'/%3E%3Ccircle cx='3' cy='3' r='0.4' fill='rgba(255,255,255,0.05)'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 1;
  opacity: 0.6;
  border-radius: 0 0 700px 700px;
}

/* ─────────────────────────────────────────────────────────
   HEADER
───────────────────────────────────────────────────────── */
.bj-header {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 780px;
  padding: 10px 24px 5px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-text {
  font-family: 'Cinzel Decorative', serif;
  font-size: clamp(1.1rem, 2.5vw, 1.7rem);
  font-weight: 700;
  letter-spacing: 0.2em;
  background: linear-gradient(180deg, #f0d080 0%, #c9a84c 55%, #8a6a20 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 0 12px rgba(201,168,76,0.4));
}

.logo-suit {
  font-size: 1.4rem;
  color: var(--gold);
  opacity: 0.7;
}
.logo-suit.red { color: var(--card-red); }

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(201,168,76,0.3);
  border-radius: 8px;
  padding: 6px 18px;
  min-width: 100px;
}

.stat-label {
  font-size: 0.5rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  opacity: 0.75;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--gold-light);
  transition: color 0.3s;
}

.stat-value.flash-green {
  animation: flashGreen 0.9s ease-out;
}
@keyframes flashGreen {
  0%, 100% { color: var(--gold-light); }
  30%       { color: #66ff99; text-shadow: 0 0 14px rgba(102,255,153,0.7); }
}

.stat-value.bet-color { color: #ff9944; }

/* ─────────────────────────────────────────────────────────
   MESA PRINCIPAL
───────────────────────────────────────────────────────── */
.bj-table {
  position: relative;
  z-index: 5;
  flex: 1;
  width: 100%;
  max-width: 780px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;
  padding: 0 16px;
  gap: 5px;
}

/* Óvalo decorativo de la mesa */
.bj-table::before {
  content: '';
  position: absolute;
  inset: 20px;
  border: 2px solid rgba(201,168,76,0.25);
  border-radius: 50% / 40%;
  pointer-events: none;
}

/* ─────────────────────────────────────────────────────────
   ZONAS (CRUPIER / JUGADOR)
───────────────────────────────────────────────────────── */
.zone {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 5px 0;
}

.dealer-zone { padding-top: 25px; }
.player-zone { padding-bottom: 25px; }

.zone-label {
  font-size: 0.62rem;
  letter-spacing: 0.35em;
  color: rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  gap: 8px;
}

.player-label { order: 1; margin-top: 6px; }

.score-badge {
  background: rgba(0,0,0,0.45);
  border: 1px solid rgba(201,168,76,0.4);
  border-radius: 20px;
  padding: 2px 10px;
  font-size: 0.75rem;
  color: var(--gold-light);
  font-weight: 700;
  transition: background 0.3s, color 0.3s;
}

.score-badge.dimmed   { opacity: 0.55; }
.score-badge.score-bust {
  background: rgba(192,34,42,0.5);
  border-color: var(--card-red);
  color: #ffaaaa;
}

/* ─────────────────────────────────────────────────────────
   FILA DE CARTAS
───────────────────────────────────────────────────────── */
.cards-row {
  width: 100%;
  display: flex;
  justify-content: center;
}

.cards-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  min-height: 120px;
  align-items: center;
}

/* ─────────────────────────────────────────────────────────
   CARTAS
───────────────────────────────────────────────────────── */
.card {
  position: relative;
  width: 72px;
  height: 108px;
  flex-shrink: 0;
  perspective: 1000px;
}

.card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.card.is-flipped .card-inner {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  border-radius: 9px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px var(--card-shadow),
    0 1px 3px rgba(0,0,0,0.4),
    inset 0 0 0 1px rgba(0,0,0,0.06);
}

.card-front {
  background: var(--card-bg);
  transform: rotateY(180deg);
}

.card-back {
  background: var(--card-back) !important;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.1);
}

/* Símbolos de palos rojos */
.suit-red .card-corner,
.suit-red .card-suit-center { color: var(--card-red); }

/* Símbolos de palos negros */
.suit-black .card-corner,
.suit-black .card-suit-center { color: var(--card-black); }

.card-corner {
  position: absolute;
  font-family: 'EB Garamond', serif;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1;
  padding: 4px 5px;
}
.card-corner.top    { top: 2px; left: 4px; }
.card-corner.bottom { bottom: 2px; right: 4px; transform: rotate(180deg); }

.card-suit-center {
  font-size: 1.9rem;
  line-height: 1;
}

.card-back-pattern {
  width: 85%;
  height: 88%;
  border: 2px solid rgba(255,255,255,0.25);
  border-radius: 5px;
  background:
    repeating-linear-gradient(
      45deg,
      rgba(255,255,255,0.04) 0px,
      rgba(255,255,255,0.04) 2px,
      transparent 2px,
      transparent 8px
    ),
    repeating-linear-gradient(
      -45deg,
      rgba(255,255,255,0.04) 0px,
      rgba(255,255,255,0.04) 2px,
      transparent 2px,
      transparent 8px
    );
}

/* ─────────────────────────────────────────────────────────
   BANNER DE RESULTADO
───────────────────────────────────────────────────────── */
.result-banner {
  position: relative;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: rgba(0,0,0,0.7);
  border: 2px solid;
  border-radius: 12px;
  padding: 10px 32px;
  backdrop-filter: blur(4px);
  text-align: center;
}

.result-icon    { font-size: 1.5rem; }
.result-text    { font-size: 1.1rem; font-weight: 700; letter-spacing: 0.15em; }
.result-payout  { font-size: 0.65rem; letter-spacing: 0.2em; opacity: 0.85; }

.result-win,
.result-blackjack {
  border-color: var(--win-color);
  color: var(--win-color);
  box-shadow: 0 0 24px rgba(68,221,136,0.3);
}
.result-blackjack {
  border-color: var(--bj-color);
  color: var(--bj-color);
  box-shadow: 0 0 30px rgba(255,215,0,0.4);
  animation: bjGlow 1.2s ease-in-out infinite alternate;
}
@keyframes bjGlow {
  from { box-shadow: 0 0 20px rgba(255,215,0,0.3); }
  to   { box-shadow: 0 0 40px rgba(255,215,0,0.6); }
}

.result-lose   { border-color: var(--lose-color); color: var(--lose-color); box-shadow: 0 0 18px rgba(255,68,85,0.25); }
.result-push   { border-color: var(--push-color); color: var(--push-color); box-shadow: 0 0 18px rgba(240,208,128,0.25); }

/* ─────────────────────────────────────────────────────────
   PANEL DE CONTROLES (FOOTER)
───────────────────────────────────────────────────────── */
.bj-controls {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 780px;
  min-height: 100px;
  padding: 5px 20px 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

/* Panel de apuestas */
.panel-title {
  font-size: 0.58rem;
  letter-spacing: 0.3em;
  color: var(--gold);
  opacity: 0.75;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

/* Fichas */
.chip {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px dashed rgba(255,255,255,0.25);
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s, filter 0.12s;
  position: relative;
}
.chip::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.12);
}
.chip:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.08);
  box-shadow: 0 8px 20px rgba(0,0,0,0.5);
}
.chip:disabled { opacity: 0.3; cursor: not-allowed; }

.chip-5   { background: radial-gradient(circle, #e74c3c, #922b21); color: #fff; border-color: #e74c3c; }
.chip-10  { background: radial-gradient(circle, #3498db, #1a5276); color: #fff; border-color: #3498db; }
.chip-25  { background: radial-gradient(circle, #2ecc71, #1a6b3a); color: #fff; border-color: #2ecc71; }
.chip-50  { background: radial-gradient(circle, #9b59b6, #5b2c6f); color: #fff; border-color: #9b59b6; }
.chip-100 { background: radial-gradient(circle, #f0d080, #8a6a20); color: #1a1a1a; border-color: #c9a84c; }

.bet-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.bet-preview {
  font-family: 'Cinzel', serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: #ff9944;
  min-width: 80px;
  text-align: center;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,153,68,0.3);
  border-radius: 6px;
  padding: 6px 12px;
}

/* ── Panel de acciones (turno jugador) ── */
.action-panel {
  flex-direction: row;
  justify-content: center;
  gap: 14px;
}

/* ── Botones generales ── */
.btn {
  font-family: 'Cinzel', serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn:disabled { opacity: 0.35; cursor: not-allowed; }

.btn-primary {
  background: linear-gradient(180deg, #c9a84c, #8a6a20);
  color: #0a0a0a;
  border: 1px solid var(--gold-light);
  box-shadow: 0 0 14px rgba(201,168,76,0.3);
}
.btn-primary:hover:not(:disabled) {
  background: linear-gradient(180deg, #f0d080, #c9a84c);
  box-shadow: 0 0 24px rgba(201,168,76,0.6);
  transform: translateY(-1px);
}

.btn-ghost {
  background: transparent;
  color: var(--gold);
  border: 1px solid rgba(201,168,76,0.35);
}
.btn-ghost:hover:not(:disabled) {
  border-color: var(--gold);
  background: rgba(201,168,76,0.08);
}

.btn-all-in {
  border-color: #ff4455;
  color: #ff4455;
}
.btn-all-in:hover:not(:disabled) {
  background: rgba(255, 68, 85, 0.1);
  border-color: #ff6677;
  color: #ff6677;
}

.btn-wide { min-width: 180px; justify-content: center; }

/* Botones de acción del juego (LuxeBet Premium) */
.btn-action {
  min-width: 140px;
  height: 54px;
  padding: 0 20px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(201, 168, 76, 0.4);
  border-bottom: 3px solid var(--gold);
  color: var(--gold-light);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.btn-action:hover:not(:disabled) {
  background: rgba(201, 168, 76, 0.15);
  border-color: var(--gold-light);
  color: #fff;
  transform: translateY(-4px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.btn-action:active:not(:disabled) {
  transform: translateY(-1px);
}

.btn-action:disabled {
  opacity: 0.25;
  cursor: not-allowed;
  filter: grayscale(1);
}

/* Efectos de resplandor sutil (Glows) */
.btn-hit:hover:not(:disabled) { box-shadow: 0 0 20px rgba(46, 204, 113, 0.3); }
.btn-stand:hover:not(:disabled) { box-shadow: 0 0 20px rgba(231, 76, 60, 0.3); }
.btn-double:hover:not(:disabled) { box-shadow: 0 0 25px rgba(201, 168, 76, 0.4); }

.btn-icon {
  font-size: 1.15rem;
  color: var(--gold);
  transition: all 0.3s;
}

.btn-action:hover .btn-icon {
  transform: scale(1.2);
  color: #fff;
}

/* ── Panel fin de ronda ── */
.end-panel {
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
}

/* ── Puntos de espera (turno crupier) ── */
.dealer-thinking {
  flex-direction: row;
  gap: 8px;
}
.thinking-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--gold);
  opacity: 0.4;
  animation: dotPulse 1.1s ease-in-out infinite;
}
.thinking-dot:nth-child(2) { animation-delay: 0.22s; }
.thinking-dot:nth-child(3) { animation-delay: 0.44s; }
@keyframes dotPulse {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%            { opacity: 1;   transform: scale(1.2); }
}

/* ─────────────────────────────────────────────────────────
   DECORACIÓN: MAZO DE CARTAS (SHOE)
───────────────────────────────────────────────────────── */
.deck-stack {
  position: absolute;
  left: 12%;
  top: 32%;
  width: 72px;
  height: 108px;
  transform: rotate(-15deg);
  z-index: 2;
  pointer-events: none;
}

.deck-card-layer {
  position: absolute;
  inset: 0;
  background: var(--card-back);
  border-radius: 9px;
  border: 1px solid rgba(0,0,0,0.2);
  box-shadow: 2px 2px 5px rgba(0,0,0,0.4);
}

.deck-card-layer:nth-child(1) { transform: translate(6px, 6px); }
.deck-card-layer:nth-child(2) { transform: translate(4px, 4px); }
.deck-card-layer:nth-child(3) { transform: translate(2px, 2px); }

.deck-card-top {
  position: absolute;
  inset: 0;
  background: var(--card-back);
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 1px 1px 3px rgba(0,0,0,0.3);
}

/* ─────────────────────────────────────────────────────────
   TRANSICIONES DE CARTAS (TransitionGroup)
───────────────────────────────────────────────────────── */
.card-deal-enter-active {
  animation: dealIn 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: var(--deal-delay, 0s);
}
.card-deal-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.card-deal-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

.dealer-zone .card {
  --deal-from-x: -300px;
  --deal-from-y: 100px;
  --deal-mid-x: 0px;
  --deal-mid-y: -35px; /* Ajustado para el texto CRUPIER */
}
.player-zone .card {
  --deal-from-x: -300px;
  --deal-from-y: -280px;
  --deal-mid-x: 0px;
  --deal-mid-y: -340px; /* Ajustado para el texto CRUPIER */
}

@keyframes dealIn {
  0% { 
    opacity: 0; 
    transform: translate(var(--deal-from-x), var(--deal-from-y)) scale(0.7) rotate(-25deg); 
    filter: blur(4px);
  }
  45% {
    opacity: 1;
    transform: translate(var(--deal-mid-x), var(--deal-mid-y)) scale(0.95) rotate(0deg); 
    filter: blur(0);
  }
  65% {
    opacity: 1;
    transform: translate(var(--deal-mid-x), var(--deal-mid-y)) scale(0.95) rotate(0deg); 
  }
  100% { 
    opacity: 1; 
    transform: translate(0, 0) scale(1) rotate(0deg); 
  }
}

/* ─────────────────────────────────────────────────────────
   TRANSICIONES DE PANELES
───────────────────────────────────────────────────────── */
.panel-slide-enter-active { transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1); }
.panel-slide-leave-active { transition: all 0.2s ease-in; position: absolute; }
.panel-slide-enter-from   { opacity: 0; transform: translateY(20px); }
.panel-slide-leave-to     { opacity: 0; transform: translateY(-10px); }

/* ─────────────────────────────────────────────────────────
   TRANSICIÓN BANNER RESULTADO
───────────────────────────────────────────────────────── */
.banner-pop-enter-active { animation: bannerPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.banner-pop-leave-active { transition: all 0.2s ease-in; }
.banner-pop-enter-from   { opacity: 0; transform: scale(0.7); }
.banner-pop-leave-to     { opacity: 0; transform: scale(0.9); }
@keyframes bannerPop {
  from { opacity: 0; transform: scale(0.6); }
  to   { opacity: 1; transform: scale(1);   }
}

/* ─────────────────────────────────────────────────────────
   RESPONSIVE
───────────────────────────────────────────────────────── */
@media (max-width: 500px) {
  .card { width: 60px; height: 90px; }
  .card-suit-center { font-size: 1.5rem; }
  .card-corner { font-size: 0.75rem; }
  .chip { width: 48px; height: 48px; font-size: 0.6rem; }
  .btn-action { padding: 10px 14px; min-width: 84px; }
  .logo-text { font-size: 1rem; }
}
</style>
