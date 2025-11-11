<script setup lang="ts">
import { computed, ref } from 'vue'
import AutoComplete from 'primevue/autocomplete'
import Player from '../models/Player.ts'

interface Props {
  allPlayers: Array<Player> | null
}

const props = defineProps<Props>()

const value = ref('')
const selectedPlayer = ref<Player | null>(null)

const playerNames = computed(() => {
  return props.allPlayers?.map(player => player.name).sort()
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
  const player = props.allPlayers?.find(p => p.name === value.value)
  if (player) {
    selectedPlayer.value = player
  }
}

const openChallenge = () => {
  if (selectedPlayer.value) {
    const url = `${window.location.origin}${window.location.pathname}?player=${selectedPlayer.value.id}`
    window.open(url, '_blank')
    // Reset selection
    value.value = ''
    selectedPlayer.value = null
  }
}
</script>

<template>
  <div class="custom-challenge">
    <h3>Create Custom Challenge</h3>
    <p class="menu-description">Challenge your friends with any player</p>

    <div class="challenge-content">
      <AutoComplete
        v-model="value"
        :suggestions="filteredPlayerNames"
        placeholder="Search for a player..."
        class="challenge-search"
        @complete="search"
        @item-select="handleSelect"
      />

      <button class="challenge-button" :disabled="!selectedPlayer" @click="openChallenge">
        Open Challenge
      </button>
    </div>
  </div>
</template>

<style scoped>
.custom-challenge {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #444;
}

.custom-challenge h3 {
  font-size: 1.25rem;
  color: #ffffff;
  margin: 0;
}

.menu-description {
  color: #999;
  font-size: 0.875rem;
  margin: 0;
}

.challenge-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.challenge-search {
  width: 100%;
}

:deep(.p-autocomplete) {
  width: 100%;
}

:deep(.p-autocomplete-input) {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #667eea;
  border-radius: 6px;
  background: #ffffff;
  color: #000000;
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

.challenge-button {
  padding: 0.75rem 1rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.challenge-button:hover:not(:disabled) {
  background: #764ba2;
}

.challenge-button:active:not(:disabled) {
  transform: scale(0.98);
}

.challenge-button:disabled {
  background: #555;
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
