<script setup>
import { ref } from 'vue'
import BettingSidebar from './components/BettingSidebar.vue'
import BettingHeader from './components/BettingHeader.vue'
import CasinoRoulette from './components/CasinoRoulette.vue'
import SlotMachine from './components/SlotMachine.vue'
import Blackjack from './components/Blackjack.vue'
import HorseRace from './components/HorseRace.vue'
import Plinko from './components/Plinko.vue'

const currentView = ref('roulette')
const isSidebarCollapsed = ref(false)

const switchView = (view) => {
  currentView.value = view
}

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<template>
  <div class="app-container">
    <BettingSidebar 
      @navigate="switchView" 
      @toggle-sidebar="toggleSidebar"
      :active-view="currentView" 
      :is-collapsed="isSidebarCollapsed"
    />
    
    <div class="main-content">
      <BettingHeader @navigate="switchView" @toggle-sidebar="toggleSidebar" />
      
      <main class="page-body" :class="{ 'blackjack-layout': currentView === 'blackjack' }">
        <div class="game-wrapper">
          <div class="view-container">
            <CasinoRoulette v-if="currentView === 'roulette'" />
            <SlotMachine v-else-if="currentView === 'slots'" />
            <Blackjack v-else-if="currentView === 'blackjack'" />
            <HorseRace v-else-if="currentView === 'horses'" />
            <Plinko v-else-if="currentView === 'plinko'" />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.app-container {
  display: flex;
  min-height: 100vh;
  background: 
    radial-gradient(circle at center, rgba(180, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.95) 100%),
    url('/upcoming_bg.png');
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
}

.page-body {
  display: flex;
  flex: 1;
  padding: 20px;
  gap: 20px;
}

.page-body.blackjack-layout {
  padding: 0;
}

.game-wrapper {
  flex: 1;
  overflow: auto;
}



.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 500px;
  color: #555;
  text-align: center;
  border: 2px dashed #222;
  border-radius: 20px;
  background: rgba(255,255,255,0.02);
}

.coming-soon h2 {
  color: var(--gold-l, #f0d080);
  font-family: 'Cinzel', serif;
  margin-bottom: 10px;
}
</style>
