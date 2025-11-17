<script setup lang="ts">
import { ref } from 'vue'
import PlayerTransfers from './PlayerTransfers.vue'
import PlayerSearch from './PlayerSearch.vue'
import PlayerGuesses from './PlayerGuesses.vue'
import GameState from '../models/GameState.ts'
import Player from '../models/Player.ts'

const playerTransfersRef = ref<InstanceType<typeof PlayerTransfers> | null>(null)

const props = defineProps<{
  gameState: GameState
  mainUrl: string
}>()

const shareText = () => {
  const guessResults: ('🟢' | '🟡' | '🟠' | '🔴' | '➖')[] = props.gameState.guessedPlayers.map(
    guess => {
      const similarityColor = guess.getSimilarityColor(
        guess.getOverallSimilarity(props.gameState.player!)
      )
      if (similarityColor === 'green') return '🟢'
      else if (similarityColor === 'yellow') return '🟡'
      else if (similarityColor === 'orange') return '🟠'
      else return '🔴'
    }
  )
  for (let i = 0; i < props.gameState.maxGuesses - props.gameState.guessedPlayers.length; i++) {
    guessResults.push('➖')
  }

  return `#FOOTBLE #${props.gameState.gameNumber} | ${props.gameState.guessedPlayers.length}/${props.gameState.maxGuesses}\n\n${guessResults.join('')}\n\n${props.mainUrl}${window.location.search}`
}

const copyShareTextToClipboard = async () => {
  await navigator.clipboard.writeText(shareText())
}
</script>

<template>
  <PlayerTransfers
    ref="playerTransfersRef"
    :player="props.gameState.player"
    :main-url="props.mainUrl"
  />
  <div class="game-section">
    <PlayerSearch
      :all-players="props.gameState.allPlayers"
      :guessed-players="props.gameState.guessedPlayers"
      :is-game-over="props.gameState.isGameOver"
      @player-selected="(player: Player) => props.gameState.addGuess(player)"
    />
    <PlayerGuesses
      :guesses="props.gameState.guessedPlayers"
      :target-player="props.gameState.player"
      :max-guesses="props.gameState.maxGuesses"
      :is-game-won="props.gameState.isGameWon"
      :is-game-over="props.gameState.isGameOver"
      @share-clicked="copyShareTextToClipboard"
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
