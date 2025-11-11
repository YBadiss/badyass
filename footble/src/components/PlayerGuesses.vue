<script setup lang="ts">
import { computed, ref } from 'vue'
import PlayerGuess from './PlayerGuess.vue'
import Player from '../models/Player.ts'

interface Props {
  guesses: Player[]
  targetPlayer: Player | null
  maxGuesses: number
  isGameWon: boolean
  isGameOver: boolean
}

const props = defineProps<Props>()

const shareText = computed(() => {
  if (!props.targetPlayer || props.guesses.length === 0) return ''

  const targetClubIds = [...new Set(props.targetPlayer.clubs.map(club => club.id))]

  const rows = props.guesses.map(guess => {
    const guessClubIds = [...new Set(guess.clubs.map(club => club.id))]
    return targetClubIds.map(clubId => (guessClubIds.includes(clubId) ? '🟢' : '🔴')).join('')
  })

  return `#FOOTBLE | ${props.guesses.length}/${props.maxGuesses}\n\n${rows.join('\n')}\n\nhttps://badyass.xyz/footble`
})

const copyButtonText = ref('Share')

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copyButtonText.value = 'Copied!'
    setTimeout(() => {
      copyButtonText.value = 'Share'
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    copyButtonText.value = 'Failed'
    setTimeout(() => {
      copyButtonText.value = 'Share'
    }, 2000)
  }
}
</script>

<template>
  <div v-if="guesses.length > 0" class="guesses-container">
    <div class="header-section">
      <h2>Your Guesses ({{ guesses.length }}/{{ maxGuesses }})</h2>
      <div v-if="isGameWon" class="game-status win">You Won! 🎉</div>
      <div v-else-if="guesses.length >= maxGuesses" class="game-status lose">Game Over!</div>
    </div>
    <div class="guesses-list">
      <PlayerGuess
        v-for="guess in guesses"
        :key="guess.id"
        :guess="guess"
        :target-player="targetPlayer"
      />
      <div v-if="isGameOver && !isGameWon && targetPlayer" class="answer-divider">
        <span>The answer was:</span>
      </div>
      <PlayerGuess
        v-if="isGameOver && !isGameWon && targetPlayer"
        :guess="targetPlayer"
        :target-player="targetPlayer"
        class="answer-guess"
      />
    </div>
    <button v-if="isGameWon || isGameOver" class="share-button" @click="copyToClipboard">
      {{ copyButtonText }}
    </button>
  </div>
</template>

<style scoped>
.guesses-container {
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

h2 {
  color: #ffffff;
  font-size: 1.5rem;
  margin: 0;
  text-align: center;
}

.game-status {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 1.125rem;
  font-weight: 600;
}

.game-status.win {
  background: #4caf50;
  color: #ffffff;
}

.game-status.lose {
  background: #ef4444;
  color: #ffffff;
}

.guesses-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.answer-divider {
  text-align: center;
  padding: 1rem 0;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  position: relative;
}

.answer-divider span {
  background: #000000;
  padding: 0 1rem;
  position: relative;
  z-index: 1;
}

.answer-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  background: #667eea;
}

.answer-guess {
  border: 2px solid #667eea;
}

.share-button {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-button:hover {
  background: #764ba2;
}

.share-button:active {
  transform: scale(0.98);
}
</style>
