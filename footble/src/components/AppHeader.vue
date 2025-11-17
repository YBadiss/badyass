<script setup lang="ts">
import { ref } from 'vue'
import type Club from '../models/Club'

defineProps<{
  club?: Club | null
}>()

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

defineExpose({ isMenuOpen, closeMenu })
</script>

<template>
  <header class="app-header">
    <h1 class="logo-title">
      <img v-if="club" :src="club.logoUrl" :alt="club.name" class="club-logo" />
      <span>F</span>
      <img src="/footble-icon.png" alt="o" class="logo-icon" />
      <span>otble</span>
    </h1>
    <button class="menu-button" aria-label="Menu" @click="toggleMenu">
      <div class="hamburger">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </button>

    <!-- Menu Popup -->
    <Transition name="fade">
      <div v-if="isMenuOpen" class="menu-overlay" @click="closeMenu">
        <div class="menu-popup" @click.stop>
          <div class="menu-header">
            <h2>Menu</h2>
            <button class="close-button" @click="closeMenu">&times;</button>
          </div>
          <div class="menu-content">
            <slot></slot>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

h1 {
  font-size: 3rem;
  font-weight: 700;
  color: #667eea;
}

.logo-title {
  display: flex;
  align-items: center;
  gap: 0;
}

.logo-icon {
  height: 1.9rem;
  width: auto;
  margin: 0.6rem -0.1rem 0;
  display: inline-block;
}

.club-logo {
  height: 4rem;
  width: auto;
  margin-right: 0.5rem;
  display: inline-block;
  border-radius: 4px;
}

.menu-button {
  position: absolute;
  right: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  z-index: 10;
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 30px;
}

.hamburger span {
  display: block;
  height: 3px;
  background: #667eea;
  border-radius: 2px;
  transition: all 0.3s ease;
}

.menu-button:hover .hamburger span {
  background: #764ba2;
}

/* Menu Popup */
.menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.menu-popup {
  background: #1a1a1a;
  border: 2px solid #667eea;
  border-radius: 12px;
  max-width: 400px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 2px solid #333;
}

.menu-header h2 {
  font-size: 1.5rem;
  color: #ffffff;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #667eea;
}

.menu-content {
  padding: 1.5rem;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
