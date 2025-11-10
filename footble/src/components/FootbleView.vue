<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import PlayerTransfers from './PlayerTransfers.vue'
import PlayerSearch from './PlayerSearch.vue'
import PlayerGuesses from './PlayerGuesses.vue'
import Club from '../models/Club.ts'
import Player from '../models/Player.ts'

const MAX_GUESSES = 6
const STORAGE_KEY = 'footble-guesses'

const allPlayers = ref<Array<Player> | null>(null)
const topPlayers = ref<Array<Player> | null>(null)
const player = ref<Player | null>(null)
const guessedPlayers = ref<Player[]>([])

const isGameWon = computed(() => {
  return guessedPlayers.value.some((guess) => guess.id === player.value?.id)
})

const isGameOver = computed(() => {
  return isGameWon.value || guessedPlayers.value.length >= MAX_GUESSES
})

const getStorageKey = () => {
  if (!player.value) return null
  return `${STORAGE_KEY}-${player.value.id}`
}

const saveGuessesToStorage = () => {
  const key = getStorageKey()
  if (!key) return

  const guessIds = guessedPlayers.value.map((p) => p.id)
  localStorage.setItem(key, JSON.stringify(guessIds))
}

const loadGuessesFromStorage = () => {
  const key = getStorageKey()
  if (!key || !allPlayers.value) return

  try {
    const stored = localStorage.getItem(key)
    if (!stored) return

    const guessIds: string[] = JSON.parse(stored)
    guessedPlayers.value = guessIds
      .map((id) => allPlayers.value!.find((p) => p.id === id))
      .filter((p): p is Player => p !== undefined)
  } catch (error) {
    console.error('Failed to load guesses from storage:', error)
  }
}

// Watch guessedPlayers and save to localStorage whenever it changes
watch(guessedPlayers, saveGuessesToStorage, { deep: true })

const cleanPlayerName = (name: string): string => {
  return (
    name
      // Remove accents by decomposing and removing diacritical marks
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove non-ASCII characters
      .replace(/[^\x00-\x7F]/g, '')
      // Clean up any extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  )
}

const handlePlayerSelected = (selectedPlayer: Player) => {
  // Don't allow more guesses if game is over
  if (isGameOver.value) return

  // Add player to guesses if not already guessed
  if (!guessedPlayers.value.find((p) => p.id === selectedPlayer.id)) {
    guessedPlayers.value.push(selectedPlayer)
  }
}

onMounted(async () => {
  try {
    // Read all players from the public data
    const allPlayersResponse = await fetch('./players.json')
    allPlayers.value = (await allPlayersResponse.json()).map(
      (player: any) =>
        new Player(
          player.id,
          player.slug,
          cleanPlayerName(player.name),
          player.image,
          player.club_ids.map((clubId: string) => new Club(clubId))
        )
    )
    // Read top players from the public data
    const topPlayersResponse = await fetch('./top_players.json')
    topPlayers.value = (await topPlayersResponse.json()).map(
      (player: any) =>
        new Player(
          player.id,
          player.slug,
          cleanPlayerName(player.name),
          player.image,
          player.club_ids.map((clubId: string) => new Club(clubId))
        )
    )

    // Get today's player by getting today's day number since 2000-01-01 and modulo the number of top players
    const dayIndex = Math.floor(
      (new Date().getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24)
    )
    const playerIndex = dayIndex % topPlayers.value!.length
    player.value = topPlayers.value![playerIndex]

    console.log(dayIndex, playerIndex, player.value)

    // Load guesses from localStorage after player is set
    loadGuessesFromStorage()
  } catch (error) {
    console.error('Failed to load data:', error)
  }
})
</script>

<template>
  <PlayerTransfers :player="player" />
  <PlayerSearch
    :allPlayers="allPlayers"
    :guessed-players="guessedPlayers"
    :disabled="isGameOver"
    @player-selected="handlePlayerSelected"
  />
  <PlayerGuesses
    :guesses="guessedPlayers"
    :target-player="player"
    :max-guesses="MAX_GUESSES"
    :is-game-won="isGameWon"
  />
</template>

<style scoped>
/* Styles are now in child components */
</style>
