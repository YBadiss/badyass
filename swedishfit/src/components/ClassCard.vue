<script setup lang="ts">
import { computed } from 'vue'

type Activity = {
  name: string
  icon: string
}

type GymClass = {
  timestamp: string
  location: string
  activity: Activity
  teacher: string
  status: string
}

type GPSCoordinates = {
  lon: number
  lat: number
}

type Location = {
  name: string
  address: string
  gpsCoordinates: GPSCoordinates
}

interface Props {
  gymClass: GymClass
  location?: Location
}

const props = defineProps<Props>()

const googleMapsUrl = computed(() => {
  if (props.location && props.location.gpsCoordinates) {
    const { lat, lon } = props.location.gpsCoordinates
    return `https://maps.google.com/maps?t=m&ll=${lat},${lon}&q=${lat},${lon}`
  }
  return null
})

const formattedTime = computed(() => {
  const date = new Date(props.gymClass.timestamp)
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  const monthNames = [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre'
  ]

  const dayName = dayNames[date.getDay()]
  const day = date.getDate()
  const month = monthNames[date.getMonth()]
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${dayName} ${day} ${month}, ${hours}h${minutes}`
})
</script>

<template>
  <div class="class-card">
    <div class="class-header">
      <img
        v-if="gymClass.activity.icon"
        :src="gymClass.activity.icon"
        :alt="gymClass.activity.name"
        class="activity-icon"
      />
      <div class="class-info">
        <h3>{{ gymClass.activity.name }}</h3>
        <a
          v-if="googleMapsUrl"
          :href="googleMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="location-link"
        >
          <span class="location">{{ gymClass.location }}</span>
          <svg class="map-icon" viewBox="0 0 24 24">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
        </a>
        <p v-else class="location">{{ gymClass.location }}</p>
      </div>
      <span :class="['status', gymClass.status.toLowerCase()]">
        {{ gymClass.status }}
      </span>
    </div>
    <div class="class-details">
      <div class="detail"><strong>Animation:</strong> {{ gymClass.teacher }}</div>
      <div class="detail"><strong>Horaire:</strong> {{ formattedTime }}</div>
    </div>
  </div>
</template>

<style scoped>
.class-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-white);
  transition: box-shadow var(--transition-fast);
}

.class-card:hover {
  box-shadow: var(--shadow-card);
}

.class-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.activity-icon {
  width: 32px;
  height: 32px;
}

.class-info {
  flex: 1;
}

.class-info h3 {
  margin: 0;
  font-size: var(--font-lg);
}

.location {
  margin: var(--spacing-xs) 0 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-base);
}

.location-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  text-decoration: none;
  color: inherit;
  margin-top: var(--spacing-xs);
  transition: color var(--transition-fast);
}

.location-link:hover {
  color: var(--color-primary);
}

.location-link:hover .location {
  color: var(--color-primary);
  text-decoration: underline;
}

.map-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.status {
  padding: var(--spacing-xs) 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: bold;
  text-transform: uppercase;
}

.status.available {
  background-color: var(--color-status-available-bg);
  color: var(--color-status-available-text);
}

.status.full {
  background-color: var(--color-status-full-bg);
  color: var(--color-status-full-text);
}

.status.passed {
  background-color: var(--color-status-passed-bg);
  color: var(--color-status-passed-text);
}

.status.cancelled {
  background-color: var(--color-status-cancelled-bg);
  color: var(--color-status-cancelled-text);
}

.class-details {
  display: flex;
  gap: var(--spacing-xl);
  font-size: var(--font-base);
}

.detail {
  color: var(--color-text-secondary);
}

.detail strong {
  color: var(--color-text-primary);
}
</style>
