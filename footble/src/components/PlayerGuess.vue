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

const targetClubIds = computed(() => {
  return [...new Set(props.targetPlayer?.clubs.map(club => club.id) ?? [])]
})
const guessClubIds = computed(() => {
  return [...new Set(props.guess.clubs.map(club => club.id))]
})
const clubMatchScore = computed(() => {
  return guessClubIds.value.filter(clubId => targetClubIds.value.includes(clubId)).length
})
const isCorrect = computed(() => {
  return props.guess.id === props.targetPlayer?.id
})

const scoreEmoji = computed(() => {
  if (!props.targetPlayer || props.targetPlayer.clubs.length === 0) return '🔵'

  const similarity =
    clubMatchScore.value / targetClubIds.value.length +
    positionSimilarity.value +
    citizenshipSimilarity.value +
    ageSimilarity.value
  const percentage = (similarity / 4) * 100

  if (percentage < 10) return '🔴' // Red circle
  if (percentage < 40) return '🟠' // Orange circle
  if (percentage < 100) return '🟡' // Yellow circle
  return '🟢' // Green circle
})

const clubsWithMatchStatus = (guess: Player) => {
  if (!props.targetPlayer) return []

  const uniqueClubs = new Map()

  guess.clubs.forEach(club => {
    if (!uniqueClubs.has(club.id)) {
      uniqueClubs.set(club.id, {
        club,
        matches: targetClubIds.value.includes(club.id)
      })
    }
  })

  return Array.from(uniqueClubs.values())
}

// Similarity scores for characteristics
const positionSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.guess.getPositionSimilarity(props.targetPlayer)
})

const citizenshipSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.guess.getCitizenshipSimilarity(props.targetPlayer)
})

const ageSimilarity = computed(() => {
  if (!props.targetPlayer) return 0
  return props.guess.getAgeSimilarity(props.targetPlayer)
})

// Color coding based on similarity
const getSimilarityColor = (similarity: number): string => {
  if (similarity === 1) return 'green'
  if (similarity > 0.5) return 'yellow'
  if (similarity > 0.3) return 'orange'
  return 'red'
}

// Display values
const positionDisplay = computed(() => {
  return props.guess.position.short_name || props.guess.position.group || 'Unknown'
})

const citizenshipDisplay = computed(() => {
  return props.guess.citizenship.join(', ') || 'Unknown'
})

const ageDisplay = computed(() => {
  return props.guess.age.toString()
})
</script>

<template>
  <div class="guess-item" :class="{ correct: isCorrect }">
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
        <div class="result-indicator">{{ scoreEmoji }}</div>
      </div>
      <div class="club-badges">
        <div
          v-for="{ club, matches } in clubsWithMatchStatus(guess)"
          :key="club.id"
          class="club-badge"
          :class="{ matched: matches, unmatched: !matches }"
        >
          <img :src="club.logoUrl" :alt="club.id" class="club-logo" />
        </div>
      </div>
      <div class="characteristics">
        <div class="characteristic" :class="getSimilarityColor(positionSimilarity)">
          <span class="characteristic-label">Position:</span>
          <span class="characteristic-value">{{ positionDisplay }}</span>
        </div>
        <div class="characteristic" :class="getSimilarityColor(citizenshipSimilarity)">
          <span class="characteristic-label">Citizenship:</span>
          <span class="characteristic-value">{{ citizenshipDisplay }}</span>
        </div>
        <div class="characteristic" :class="getSimilarityColor(ageSimilarity)">
          <span class="characteristic-label">Age:</span>
          <span class="characteristic-value">{{ ageDisplay }}</span>
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

.guess-item.correct {
  background: #2d5016;
  border-color: #4caf50;
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

.club-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}

.club-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.club-badge.matched {
  background: #4caf50;
  border: 2px solid #4caf50;
}

.club-badge.unmatched {
  background: #ef4444;
  border: 2px solid #ef4444;
}

.club-logo {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
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
  border-color: #ffeb3b;
}

.characteristic.orange {
  background: rgba(255, 152, 0, 0.2);
  border-color: #ff9800;
}

.characteristic.red {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}
</style>
