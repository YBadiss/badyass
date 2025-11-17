<script setup lang="ts">
import CustomChallenge from './CustomChallenge.vue'

interface Props {
  clubMapping: Record<string, string> | null
  playerMapping: Record<string, string> | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  showTutorial: []
}>()

const closeMenu = () => {
  emit('close')
}

const showTutorial = () => {
  emit('showTutorial')
}

defineExpose({ closeMenu })
</script>

<template>
  <div class="menu-overlay" @click="closeMenu">
    <div class="menu-popup" @click.stop>
      <div class="menu-header">
        <h2>Menu</h2>
        <button class="close-button" @click="closeMenu">&times;</button>
      </div>
      <div class="menu-content">
        <div class="menu-section">
          <button class="menu-action-button" @click="showTutorial">
            <h3>How to Play</h3>
            <p class="menu-description">View the tutorial again</p>
          </button>
          <CustomChallenge
            :mapping="props.clubMapping"
            :url-param="'club'"
            title="Club Challenge"
            description="Club fan? Focus on your players!"
            placeholder="Search for a club..."
          />
          <CustomChallenge
            :mapping="props.playerMapping"
            :url-param="'player'"
            title="Player Challenge"
            description="Challenge your friends with any player!"
            placeholder="Search for a player..."
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
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

.menu-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.menu-section h3 {
  font-size: 1.25rem;
  color: #ffffff;
  margin: 0;
}

.menu-description {
  color: #999;
  font-size: 0.875rem;
  margin: 0;
}

.menu-action-button {
  padding: 0.75rem 1.5rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: flex-start;
  text-align: left;
  width: 100%;
}

.menu-action-button h3 {
  color: #ffffff;
}

.menu-action-button .menu-description {
  color: rgba(255, 255, 255, 0.8);
}

.menu-action-button:hover {
  background: #764ba2;
}

.menu-action-button:active {
  transform: scale(0.98);
}
</style>
