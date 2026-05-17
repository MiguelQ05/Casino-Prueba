<script setup>
defineProps(['activeView', 'isCollapsed'])
defineEmits(['navigate', 'toggle-sidebar'])
</script>

<template>
  <aside class="betting-sidebar" :class="{ collapsed: isCollapsed }">
    <div class="sidebar-logo" @click="$emit('toggle-sidebar')" title="Toggle Sidebar">
      <div class="logo-icon">♛</div>
      <span class="logo-text">LUXE<span>BET</span></span>
    </div>

    <nav class="sidebar-nav">
      <div class="nav-group">
        <a href="#" class="nav-item" :class="{ active: activeView === 'roulette' }" @click.prevent="$emit('navigate', 'roulette')" title="Ruleta">
          <span class="nav-icon">🎡</span>
          <span class="nav-text">Ruleta</span>
        </a>
        <a href="#" class="nav-item" :class="{ active: activeView === 'slots' }" @click.prevent="$emit('navigate', 'slots')" title="Tragaperras">
          <span class="nav-icon">🎰</span>
          <span class="nav-text">Tragaperras</span>
        </a>
        <a href="#" class="nav-item" :class="{ active: activeView === 'blackjack' }" @click.prevent="$emit('navigate', 'blackjack')" title="Blackjack">
          <span class="nav-icon">🃏</span>
          <span class="nav-text">Blackjack</span>
        </a>
        <a href="#" class="nav-item" :class="{ active: activeView === 'horses' }" @click.prevent="$emit('navigate', 'horses')" title="Carrera caballos">
          <span class="nav-icon">🏇</span>
          <span class="nav-text">Carrera caballos</span>
        </a>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div class="responsible-gaming">
        <span>+18 Juega con responsabilidad</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.betting-sidebar {
  width: 260px;
  background: #0f0f0f;
  height: 100vh;
  border-right: 1px solid #222;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  z-index: 10;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.betting-sidebar.collapsed {
  width: 80px;
}

.sidebar-logo {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #222;
  overflow: hidden;
  height: 70px;
  cursor: pointer;
  transition: background 0.2s;
}

.sidebar-logo:hover {
  background: rgba(255, 255, 255, 0.03);
}

.logo-icon {
  font-size: 1.8rem;
  color: #c9a84c;
  flex-shrink: 0;
  transition: transform 0.2s;
}

.sidebar-logo:hover .logo-icon {
  transform: scale(1.1);
  filter: drop-shadow(0 0 8px rgba(201, 168, 76, 0.4));
}

.betting-sidebar.collapsed .sidebar-logo {
  justify-content: center;
  padding: 24px 0;
}

.logo-text {
  font-family: 'Cinzel', serif;
  font-size: 1.2rem;
  font-weight: 900;
  color: white;
  letter-spacing: 2px;
  white-space: nowrap;
}

.betting-sidebar.collapsed .logo-text {
  display: none;
}

.logo-text span {
  color: #c9a84c;
}

.sidebar-nav {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.betting-sidebar.collapsed .sidebar-nav {
  padding: 20px 10px;
}

.nav-group {
  margin-bottom: 30px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  color: #aaa;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 0.9rem;
  margin-bottom: 4px;
  white-space: nowrap;
}

.betting-sidebar.collapsed .nav-item {
  justify-content: center;
  gap: 0;
  padding: 12px 0;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

.nav-item.active {
  background: rgba(201, 168, 76, 0.1);
  color: #c9a84c;
}

.nav-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.nav-text {
  transition: opacity 0.2s;
}

.betting-sidebar.collapsed .nav-text {
  display: none;
}

.sidebar-footer {
  padding: 20px;
  border-top: 1px solid #222;
  overflow: hidden;
}

.betting-sidebar.collapsed .sidebar-footer {
  display: none;
}

.responsible-gaming {
  font-size: 0.65rem;
  color: #444;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .betting-sidebar {
    width: 80px;
  }
  .logo-text, .nav-text, .sidebar-footer {
    display: none;
  }
  .sidebar-logo {
    justify-content: center;
  }
  .nav-item {
    justify-content: center;
  }
}
</style>
