<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from 'vue'
import AppHeader from './components/AppHeader.vue'
import TutorialPopup from './components/TutorialPopup.vue'
import FootbleView from './components/FootbleView.vue'
import Storage from './models/Storage.ts'
import GameState from './models/GameState.ts'
import { MAX_GUESSES, STORAGE_KEY, MAIN_URL } from './constants.ts'

const storage = new Storage(STORAGE_KEY)
const gameState = reactive(new GameState(storage, MAX_GUESSES))

// Watch guessedPlayers and save to localStorage whenever it changes
watch(
  () => gameState.guessedPlayers,
  () => gameState.saveToStorage(),
  { deep: true }
)

onMounted(async () => {
  try {
    // Check for player ID in URL query parameters
    const urlParams = new URLSearchParams(window.location.search)
    const playerId = urlParams.get('player')
    const clubId = urlParams.get('club')

    await gameState.init(playerId || undefined, clubId || undefined)
  } catch (error) {
    console.error('Failed to mount FootbleView:', error)
    // Could show an error message to the user here
  }
})

const tutorialPopupRef = ref<InstanceType<typeof TutorialPopup> | null>(null)

const showTutorial = () => {
  tutorialPopupRef.value?.showTutorial()
}

const clubMapping = computed(() => {
  return (
    gameState.clubs.reduce(
      (acc, club) => {
        acc[club.name] = club.id
        return acc
      },
      {} as Record<string, string>
    ) || null
  )
})

const playerMapping = computed(() => {
  return (
    gameState.allPlayers.reduce(
      (acc, player) => {
        acc[player.name] = player.id
        return acc
      },
      {} as Record<string, string>
    ) || null
  )
})
</script>

<template>
  <div id="app">
    <AppHeader
      :club="gameState.customClub"
      :club-mapping="clubMapping"
      :player-mapping="playerMapping"
      @show-tutorial="showTutorial"
    >
    </AppHeader>
    <TutorialPopup ref="tutorialPopupRef" :storage="storage" />
    <FootbleView :game-state="gameState as GameState" :main-url="MAIN_URL" />
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
</style>
