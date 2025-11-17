<script setup lang="ts">
import { ref, computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FootbleView from './components/FootbleView.vue'
import CustomChallenge from './components/CustomChallenge.vue'

const pathContainerRef = ref<HTMLElement | null>(null)
const footbleViewRef = ref<InstanceType<typeof FootbleView> | null>(null)

const showTutorial = () => {
  footbleViewRef.value?.tutorialPopupRef?.showTutorial()
}

const allPlayers = computed(() => {
  return footbleViewRef.value?.getAllPlayers() || null
})

const allClubs = computed(() => {
  return footbleViewRef.value?.getAllClubs() || null
})

const customClub = computed(() => {
  return footbleViewRef.value?.getCustomClub() || null
})

defineExpose({ pathContainerRef })
</script>

<template>
  <div id="app">
    <AppHeader :club="customClub">
      <div class="menu-section">
        <button class="menu-action-button" @click="showTutorial">
          <h3>How to Play</h3>
          <p class="menu-description">View the tutorial again</p>
        </button>
        <CustomChallenge
          :mapping="
            allClubs?.reduce(
              (acc, club) => {
                acc[club.name] = club.id
                return acc
              },
              {} as Record<string, string>
            ) || null
          "
          :url-param="'club'"
          title="Club Challenge"
          description="Club fan? Focus on your players!"
          placeholder="Search for a club..."
        />
        <CustomChallenge
          :mapping="
            allPlayers?.reduce(
              (acc, player) => {
                acc[player.name] = player.id
                return acc
              },
              {} as Record<string, string>
            ) || null
          "
          :url-param="'player'"
          title="Player Challenge"
          description="Challenge your friends with any player!"
          placeholder="Search for a player..."
        />
      </div>
    </AppHeader>
    <FootbleView ref="footbleViewRef" @path-container-ready="pathContainerRef = $event" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #0a0a0a;
  color: #ffffff;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 1rem;
  gap: 0.5rem;
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
