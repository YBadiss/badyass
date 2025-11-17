<script setup lang="ts">
import { watch, onMounted, reactive, ref } from 'vue'
import PlayerTransfers from './PlayerTransfers.vue'
import PlayerSearch from './PlayerSearch.vue'
import PlayerGuesses from './PlayerGuesses.vue'
import TutorialPopup from './TutorialPopup.vue'
import Storage from '../storage.ts'
import GameState from '../game-state.ts'
import Player from '../models/Player.ts'

const emit = defineEmits<{
  pathContainerReady: [element: HTMLElement]
}>()

const MAX_GUESSES = 6
const STORAGE_KEY = 'footble-v1'
const MAIN_URL = 'https://footble.net'
const STARTING_DAY = 9445

const storage = new Storage(STORAGE_KEY)
const gameState = reactive(new GameState(storage, MAX_GUESSES))
const playerTransfersRef = ref<InstanceType<typeof PlayerTransfers> | null>(null)
const tutorialPopupRef = ref<InstanceType<typeof TutorialPopup> | null>(null)

// Watch guessedPlayers and save to localStorage whenever it changes
watch(
  () => gameState.guessedPlayers,
  () => gameState.saveToStorage(),
  { deep: true }
)

// Watch for pathContainerRef from PlayerTransfers and emit it up
watch(
  () => playerTransfersRef.value?.pathContainerRef,
  pathContainer => {
    if (pathContainer) {
      emit('pathContainerReady', pathContainer)
    }
  }
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

defineExpose({
  tutorialPopupRef,
  getAllPlayers: () => gameState.allPlayers,
  getAllClubs: () => gameState.clubs
})
</script>

<template>
  <TutorialPopup ref="tutorialPopupRef" :storage="storage" />
  <PlayerTransfers ref="playerTransfersRef" :player="gameState.player" :main-url="MAIN_URL" />
  <div class="game-section">
    <PlayerSearch
      :all-players="gameState.allPlayers"
      :guessed-players="gameState.guessedPlayers"
      :is-game-over="gameState.isGameOver"
      @player-selected="(player: Player) => gameState.addGuess(player)"
    />
    <PlayerGuesses
      :guesses="gameState.guessedPlayers"
      :target-player="gameState.player"
      :max-guesses="gameState.maxGuesses"
      :is-game-won="gameState.isGameWon"
      :is-game-over="gameState.isGameOver"
      :main-url="MAIN_URL"
      :game-number="gameState.dayNumber - STARTING_DAY + 1"
    />
  </div>
</template>

<style scoped>
.game-section {
  background: #1a1a1a;
  border-radius: 12px;
  padding: 0.2rem;
  margin: 0 auto;
  width: 100%;
  max-width: 600px;
}
</style>
