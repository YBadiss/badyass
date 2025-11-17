<script setup lang="ts">
import { ref, defineProps, defineExpose, defineEmits } from 'vue'
import Menu from './Menu.vue'
import type Club from '../models/Club'

const props = defineProps<{
  club?: Club | null
  clubMapping: Record<string, string> | null
  playerMapping: Record<string, string> | null
}>()

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

const emit = defineEmits<{
  showTutorial: []
}>()

const showTutorial = () => {
  emit('showTutorial')
}

defineExpose({ isMenuOpen, closeMenu, showTutorial })
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
      <Menu
        v-if="isMenuOpen"
        :club-mapping="props.clubMapping"
        :player-mapping="props.playerMapping"
        @close="closeMenu"
        @show-tutorial="showTutorial"
      >
      </Menu>
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
