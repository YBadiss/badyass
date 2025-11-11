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

  const percentage = (clubMatchScore.value / targetClubIds.value.length) * 100

  if (percentage < 33) return '🔴' // Red circle
  if (percentage < 50) return '🟠' // Orange circle
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
</style>
