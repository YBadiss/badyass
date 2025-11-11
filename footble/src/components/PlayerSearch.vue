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
      :placeholder="'Search for a player...'"
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
  padding: 0;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
}

:deep(.p-autocomplete) {
  width: 100%;
}

:deep(.p-autocomplete-input) {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  border: 2px solid #667eea;
  border-radius: 8px;
  background: #ffffff;
  color: #000000;
  transition: all 0.3s ease;
}

:deep(.p-autocomplete-input:disabled) {
  background: #f0f0f0;
  border-color: #999;
  cursor: not-allowed;
  opacity: 0.7;
}

:deep(.p-autocomplete-input:focus) {
  outline: none;
  border-color: #764ba2;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
}

:deep(.p-autocomplete-input::placeholder) {
  color: #999;
}

/* Dropdown panel */
:deep(.p-autocomplete-panel) {
  background: #ffffff;
  border: 2px solid #667eea;
  border-radius: 8px;
  margin-top: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
}

:deep(.p-autocomplete-overlay) {
  background: #ffffff;
  border: 2px solid #667eea;
  border-radius: 8px;
  margin-top: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
}

/* List container */
:deep(.p-autocomplete-list) {
  padding: 0.5rem;
  list-style: none;
  margin: 0;
}

/* Individual items */
:deep(.p-autocomplete-item) {
  padding: 0.75rem 1rem;
  color: #000000;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s ease;
  margin: 0.25rem 0;
}

:deep(.p-autocomplete-item:hover) {
  background: #e8ecff;
}

:deep(.p-autocomplete-item.p-focus) {
  background: #d4dcff;
  outline: none;
}

:deep(.p-autocomplete-item.p-highlight) {
  background: #667eea;
  color: #ffffff;
}

/* Empty message */
:deep(.p-autocomplete-empty-message) {
  padding: 1rem;
  color: #666;
  text-align: center;
  font-style: italic;
}

/* Scrollbar styling for dropdown */
:deep(.p-autocomplete-panel::-webkit-scrollbar) {
  width: 8px;
}

:deep(.p-autocomplete-panel::-webkit-scrollbar-track) {
  background: #f0f0f0;
  border-radius: 4px;
}

:deep(.p-autocomplete-panel::-webkit-scrollbar-thumb) {
  background: #667eea;
  border-radius: 4px;
}

:deep(.p-autocomplete-panel::-webkit-scrollbar-thumb:hover) {
  background: #764ba2;
}
</style>
