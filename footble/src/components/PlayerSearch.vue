<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Player from '../models/Player.ts'

interface Props {
  allPlayers: Array<Player> | null
  guessedPlayers?: Array<Player>
  isGameOver?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  playerSelected: [player: Player]
}>()

const value = ref('')

const availablePlayers = computed(() => {
  if (!props.allPlayers) return null

  const guessedIds = new Set(props.guessedPlayers?.map(p => p.id) || [])
  return props.allPlayers.filter(player => !guessedIds.has(player.id))
})

const playerNames = computed(() => {
  return availablePlayers.value?.map(player => player.name).sort()
})

const filteredPlayerNames = computed(() => {
  if (playerNames.value && value.value.length > 0) {
    return playerNames.value
      .filter(name => name.toLowerCase().includes(value.value.toLowerCase()))
      .slice(0, 10)
  }
  return []
})

const search = () => {
  return filteredPlayerNames
}

const handleSelect = () => {
  // Find the selected player by name
  const selectedPlayer = availablePlayers.value?.find(player => player.name === value.value)
  if (selectedPlayer) {
    emit('playerSelected', selectedPlayer)
    // Clear the input after selection
    value.value = ''
  }
}
</script>

<template>
  <div v-if="!isGameOver" class="search-container">
    <AutoComplete
      v-model="value"
      :suggestions="filteredPlayerNames"
      :placeholder="'Guess the player...'"
      class="search-input"
      @complete="search"
      @item-select="handleSelect"
    />
  </div>
</template>

<style scoped>
.search-container {
  width: 100%;
  max-width: 600px;
  padding: 1rem;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
}

/* Input field styling */
:deep(.p-autocomplete) {
  width: 100%;
}

:deep(.p-autocomplete-input) {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  border: 2px solid #667eea;
  border-radius: 8px;
  background: #ffffff !important;
  color: #000000 !important;
  transition: all 0.3s ease;
}

:deep(.p-autocomplete-input:focus) {
  outline: none;
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

:deep(.p-autocomplete-input::placeholder) {
  color: #999;
}
</style>

<style>
/* Global styles for dropdown - must be unscoped to work with portal */
.p-autocomplete-panel {
  background: #ffffff !important;
  border: 2px solid #667eea !important;
  border-radius: 8px !important;
  margin-top: 0.5rem !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5) !important;
}

.p-autocomplete-list {
  padding: 0.5rem !important;
  background: #ffffff !important;
  color: #000000 !important;
}

.p-autocomplete-item {
  padding: 0.75rem 1rem !important;
  color: #000000 !important;
  background: #ffffff !important;
  cursor: pointer !important;
  border-radius: 4px !important;
  transition: background 0.2s ease !important;
  font-size: 1rem !important;
  margin: 0.25rem 0 !important;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell,
    sans-serif !important;
}

.p-autocomplete-item * {
  color: #000000 !important;
}

.p-autocomplete-item:hover {
  background: #e8ecff !important;
  color: #000000 !important;
}

.p-autocomplete-item:hover * {
  color: #000000 !important;
}

.p-autocomplete-item.p-focus {
  background: #d4dcff !important;
  color: #000000 !important;
  outline: none !important;
}

.p-autocomplete-item.p-focus * {
  color: #000000 !important;
}

.p-autocomplete-item.p-highlight {
  background: #667eea !important;
  color: #ffffff !important;
}

.p-autocomplete-item.p-highlight * {
  color: #ffffff !important;
}

.p-autocomplete-empty-message {
  padding: 1rem !important;
  color: #666 !important;
  background: #ffffff !important;
  text-align: center !important;
  font-style: italic !important;
}
</style>
