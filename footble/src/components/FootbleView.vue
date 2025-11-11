<script setup lang="ts">
import { watch, onMounted, reactive, ref } from 'vue'
import PlayerTransfers from './PlayerTransfers.vue'
import PlayerSearch from './PlayerSearch.vue'
import PlayerGuesses from './PlayerGuesses.vue'
import Storage from '../storage.ts'
import GameState from '../game-state.ts'
import Player from '../models/Player.ts'

const emit = defineEmits<{
  pathContainerReady: [element: HTMLElement]
}>()

const MAX_GUESSES = 6
const STORAGE_KEY = 'footble'
const MAIN_URL = 'https://footble.net'

const storage = new Storage(STORAGE_KEY)
const gameState = reactive(new GameState(storage, MAX_GUESSES))
const playerTransfersRef = ref<InstanceType<typeof PlayerTransfers> | null>(null)

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
  await gameState.init()
})
</script>

<template>
  <PlayerTransfers ref="playerTransfersRef" :player="gameState.player" :main-url="MAIN_URL" />
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
  />
</template>

<style scoped>
/* Styles are now in child components */
</style>
