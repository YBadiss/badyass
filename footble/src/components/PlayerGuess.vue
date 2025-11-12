<script setup lang="ts">
import { computed } from 'vue'
import Player from '../models/Player.ts'

interface Props {
  guess: Player
  index: number | null
  maxGuesses: number
  targetPlayer: Player | null
}

const props = defineProps<Props>()

// const scoreEmoji = computed(() => {
//   if (!props.targetPlayer || props.targetPlayer.clubs.length === 0) return '➖'

//   const similarity = overallSimilarity.value
//   const similarityColor = getSimilarityColor(similarity)

//   if (similarityColor === 'green') return '🟢'
//   if (similarityColor === 'yellow') return '🟡'
//   if (similarityColor === 'orange') return '🟠'
//   if (similarityColor === 'red') return '🔴'
// })

// Similarity scores for characteristics
const positionSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.targetPlayer.getPositionSimilarity(props.guess)
})

const citizenshipSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.targetPlayer.getCitizenshipSimilarity(props.guess)
})

const ageSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.targetPlayer.getAgeSimilarity(props.guess)
})

const clubSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.targetPlayer.getClubSimilarity(props.guess)
})

const overallSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.targetPlayer.getOverallSimilarity(props.guess)
})

// Display values
const positionDisplay = computed(() => {
  return props.guess.position.short_name || props.guess.position.group || 'Unknown'
})

// Get target player citizenship alpha2 codes
const targetCitizenships = computed(() => {
  if (!props.targetPlayer) return []
  return props.targetPlayer.citizenship.map(c => String(c.alpha2).toLowerCase())
})

// Check if a specific citizenship matches
const isCitizenshipMatch = (alpha2: string): boolean => {
  return targetCitizenships.value.includes(String(alpha2).toLowerCase())
}

const ageDisplay = computed(() => {
  return `${props.guess.age.toString()} years old`
})

const clubDisplay = computed(() => {
  return `${clubSimilarity.value * props.targetPlayer!.clubs.length}/${props.targetPlayer!.clubs.length} Clubs`
})
</script>

<template>
  <div class="guess-item" :class="props.guess.getSimilarityColor(overallSimilarity)">
    <div class="guess-content">
      <div class="guess-header">
        {{ index !== null ? `${index + 1}/${maxGuesses}` : '' }}
        <a
          :href="`https://www.transfermarkt.fr/${guess.slug}/profil/spieler/${guess.id}`"
          target="_blank"
          rel="noopener noreferrer"
          class="guess-name"
        >
          {{ guess.name }}
        </a>
      </div>
      <div class="characteristics">
        <div class="characteristic" :class="props.guess.getSimilarityColor(positionSimilarity)">
          <!-- <span class="characteristic-label">Position:</span> -->
          <span class="characteristic-value">{{ positionDisplay }}</span>
        </div>
        <div
          class="citizenship-flags"
          :class="props.guess.getSimilarityColor(citizenshipSimilarity)"
        >
          <div
            v-for="citizenship in guess.citizenship"
            :key="citizenship.alpha2"
            class="flag-circle"
            :class="{ match: isCitizenshipMatch(citizenship.alpha2) }"
          >
            <span
              :class="`fi fi-${citizenship.alpha2.toLowerCase()}`"
              :title="citizenship.country"
            ></span>
          </div>
        </div>
        <div class="characteristic" :class="props.guess.getSimilarityColor(ageSimilarity)">
          <!-- <span class="characteristic-label">Age:</span> -->
          <span class="characteristic-value">{{ ageDisplay }}</span>
        </div>
        <div class="characteristic" :class="props.guess.getSimilarityColor(clubSimilarity)">
          <!-- <span class="characteristic-label">Club:</span> -->
          <span class="characteristic-value">{{ clubDisplay }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guess-item {
  padding: 1rem;
  background: #1a1a1a;
  border: 2px solid #333;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.guess-item.green {
  background: #2d5016;
  border-color: #4caf50;
}

.guess-item.yellow {
  background: rgba(255, 235, 59, 0.2);
  border-color: #ffe70d;
}

.guess-item.orange {
  background: rgba(255, 152, 0, 0.2);
  border-color: #ff9800;
}

.guess-item.red {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.guess-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.guess-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.guess-name {
  color: #ffffff;
  font-size: 1.125rem;
  text-decoration: underline;
  transition: color 0.2s ease;
  flex: 1;
}

.guess-name:hover {
  color: #667eea;
}

.result-indicator {
  font-size: 1.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.characteristics {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.characteristic {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  border: 2px solid;
}

.characteristic-label {
  font-weight: 600;
  color: #ffffff;
}

.characteristic-value {
  color: #ffffff;
}

/* Color coding based on similarity */
.characteristic.green {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4caf50;
}

.characteristic.yellow {
  background: rgba(255, 235, 59, 0.2);
  border-color: #ffe70d;
}

.characteristic.orange {
  background: rgba(255, 152, 0, 0.2);
  border-color: #ff9800;
}

.characteristic.red {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.citizenship-flags {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  border: 2px solid;
}

.citizenship-flags.green {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4caf50;
}

.citizenship-flags.yellow {
  background: rgba(255, 235, 59, 0.2);
  border-color: #ffe70d;
}

.citizenship-flags.orange {
  background: rgba(255, 152, 0, 0.2);
  border-color: #ff9800;
}

.citizenship-flags.red {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.flag-circle {
  padding: 0.15rem 0.25rem;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid;
  overflow: hidden;
  position: relative;
}

.flag-circle.match {
  border-color: #4caf50;
  background: rgba(76, 175, 80, 0.2);
}

.flag-circle:not(.match) {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
}

.flag-circle .fi {
  font-size: 1rem;
  line-height: 1;
}
</style>
