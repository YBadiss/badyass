<script setup lang="ts">
import { watch, onMounted, reactive } from 'vue'
import PlayerTransfers from './PlayerTransfers.vue'
import PlayerSearch from './PlayerSearch.vue'
import PlayerGuesses from './PlayerGuesses.vue'
import Storage from '../storage.ts'
import GameState from '../game-state.ts'
import Player from '../models/Player.ts'

const MAX_GUESSES = 6
const STORAGE_KEY = 'footble-guesses'

const storage = new Storage(STORAGE_KEY)
const gameState = reactive(new GameState(storage, MAX_GUESSES))

// Watch guessedPlayers and save to localStorage whenever it changes
watch(gameState.guessedPlayers, () => gameState.saveToStorage(), { deep: true })

onMounted(async () => {
  await gameState.init()
})
</script>

<template>
  <PlayerTransfers :player="gameState.player" />
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
  />
</template>

<style scoped>
/* Styles are now in child components */
</style>
