<script setup>
import { ref, computed } from 'vue'
import { useBalance } from '../composables/useBalance.js'

const { balance } = useBalance()

const searchQuery = ref('')
const emit = defineEmits(['navigate', 'toggle-sidebar'])

const games = [
  { id: 'roulette', name: 'Ruleta Casino', keywords: ['ruleta', 'casino', 'roulette'] },
  { id: 'slots', name: 'Tragaperras (Slots)', keywords: ['tragaperras', 'slots', 'slot', 'traga'] },
  { id: 'blackjack', name: 'Blackjack VIP', keywords: ['blackjack', 'jack', 'black'] },
  { id: 'horses', name: 'Carrera de Caballos', keywords: ['caballos', 'horses', 'carrera'] },
]

const filteredSuggestions = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (query.length < 1) return []
  return games.filter(game => 
    game.name.toLowerCase().includes(query) || 
    game.keywords.some(k => k.includes(query))
  )
})

const selectGame = (gameId) => {
  emit('navigate', gameId)
  searchQuery.value = ''
}

const handleSearch = () => {
  if (filteredSuggestions.value.length > 0) {
    selectGame(filteredSuggestions.value[0].id)
  }
}
</script>

<template>
  <header class="betting-header">
    <div class="header-left">
      <div class="search-wrapper">
        <div class="search-bar">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Buscar juegos (Ruleta, Slots...)" 
            @keyup.enter="handleSearch"
          />
        </div>
        
        <!-- Suggestions Dropdown -->
        <transition name="fade-slide">
          <div v-if="filteredSuggestions.length" class="search-suggestions">
            <div 
              v-for="game in filteredSuggestions" 
              :key="game.id" 
              class="suggestion-item"
              @mousedown.prevent="selectGame(game.id)"
            >
              <span class="suggest-icon">🎮</span>
              <span class="suggest-name">{{ game.name }}</span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div class="header-right">
      <div class="balance-pill">
        <span class="currency">$</span>
        <span class="amount">{{ balance.toLocaleString() }}</span>
        <button class="deposit-btn" @click="balance += 1000">+</button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.betting-header {
  height: 70px;
  background: #0a0a0a;
  border-bottom: 1px solid #222;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  position: sticky;
  top: 0;
  z-index: 99; /* Higher z-index for dropdown */
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.sidebar-toggle {
  background: transparent;
  border: none;
  color: #aaa;
  width: 45px;
  height: 45px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.sidebar-toggle:hover {
  background: rgba(201, 168, 76, 0.1);
  transform: scale(1.1);
}

.toggle-icon {
  font-size: 1.8rem;
  color: #c9a84c;
  filter: drop-shadow(0 0 5px rgba(201, 168, 76, 0.3));
}

/* SEARCH WRAPPER & SUGGESTIONS */
.search-wrapper {
  position: relative;
  width: 300px;
}

.search-bar {
  background: #1a1a1a;
  border-radius: 20px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: #c9a84c;
  background: #222;
}

.search-bar input {
  background: transparent;
  border: none;
  color: white;
  outline: none;
  font-size: 0.85rem;
  width: 100%;
}

.search-suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  background: #151515;
  border: 1px solid #333;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.8);
  z-index: 100;
}

.suggestion-item {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid #222;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover {
  background: #222;
  color: #c9a84c;
}

.suggest-icon {
  font-size: 0.9rem;
  opacity: 0.5;
}

.suggest-name {
  font-size: 0.85rem;
  font-weight: 500;
}

/* TRANSITIONS */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 24px;
}

.balance-pill {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 25px;
  padding: 4px 4px 4px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.currency {
  color: #c9a84c;
  font-weight: 900;
}

.amount {
  color: white;
  font-weight: 700;
  font-family: monospace;
}

.deposit-btn {
  background: #c9a84c;
  border: none;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  color: #000;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.2s;
}

.deposit-btn:hover {
  transform: scale(1.1);
  background: #f0d080;
}

@media (max-width: 768px) {
  .search-wrapper {
    display: none;
  }
}
</style>
