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
  mainUrl: string
}

const props = defineProps<Props>()

const shareText = computed(() => {
  if (!props.targetPlayer || props.guesses.length === 0) return ''

  const targetClubIds = [...new Set(props.targetPlayer.clubs.map(club => club.id))]

  const rows = props.guesses.map(guess => {
    const guessClubIds = [...new Set(guess.clubs.map(club => club.id))]
    return targetClubIds.map(clubId => (guessClubIds.includes(clubId) ? '🟢' : '🔴')).join('')
  })

  return `#FOOTBLE | ${props.guesses.length}/${props.maxGuesses}\n\n${rows.join('\n')}\n\n${props.mainUrl}`
})

const copyButtonText = ref('Share')
const isCopied = ref(false)

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(shareText.value)
    copyButtonText.value = 'Copied!'
    isCopied.value = true
    setTimeout(() => {
      copyButtonText.value = 'Share'
      isCopied.value = false
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div v-if="guesses.length > 0" class="guesses-container">
    <div v-if="isGameOver" class="header-section">
      <div class="status-share-row">
        <div class="game-status" :class="{ win: isGameWon, lose: !isGameWon }">
          {{ isGameWon ? 'You Won! 🎉' : 'Game Over!' }}
        </div>
        <button class="share-button" :class="{ copied: isCopied }" @click="copyToClipboard">
          {{ copyButtonText }}
        </button>
      </div>
      <div v-if="!isGameWon && targetPlayer" class="answer-divider">
        <span>The answer was:</span>
      </div>
      <PlayerGuess
        v-if="!isGameWon && targetPlayer"
        :index="null"
        :guess="targetPlayer"
        :max-guesses="maxGuesses"
        :target-player="targetPlayer"
        class="answer-guess"
      />
    </div>
    <div class="guesses-list">
      <PlayerGuess
        v-for="(guess, index) in guesses"
        :key="`guess-${index}`"
        :index="index"
        :max-guesses="maxGuesses"
        :guess="guess"
        :target-player="targetPlayer"
      />
    </div>
  </div>
</template>

<style scoped>
.guesses-container {
  width: 100%;
  max-width: 600px;
  margin: 1rem auto 0;
  padding: 0;
}

.header-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-share-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.game-status {
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.game-status.win {
  background: #4caf50;
  color: #ffffff;
}

.game-status.lose {
  background: #ef4444;
  color: #ffffff;
}

.share-button {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  min-width: 150px;
  text-align: center;
  background: #667eea;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: inherit;
}

.share-button:hover:not(.copied) {
  background: #764ba2;
}

.share-button:active:not(.copied) {
  transform: scale(0.98);
}

.share-button.copied {
  background: #764ba2;
  cursor: default;
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
  background: #1a1a1a;
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
</style>
