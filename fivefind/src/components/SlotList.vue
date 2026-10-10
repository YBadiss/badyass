<script setup lang="ts">
import { ref } from 'vue'
import SlotCard from './SlotCard.vue'
import { formatDate, googleMapsUrl } from '../lefive'
import { byDate, type CenterAvailability } from '../slots'

interface Props {
  availability: CenterAvailability[]
  slotCount: number
}

defineProps<Props>()

const collapsedCenters = ref<Set<number>>(new Set())

const toggleCenter = (centerId: number) => {
  if (collapsedCenters.value.has(centerId)) {
    collapsedCenters.value.delete(centerId)
  } else {
    collapsedCenters.value.add(centerId)
  }
}
</script>

<template>
  <div>
    <p class="results-count">{{ slotCount }} créneaux libres</p>

    <div class="center-groups">
      <div v-for="{ center, startTimes } in availability" :key="center.id" class="center-group">
        <h2 class="center-header" @click="toggleCenter(center.id)">
          <span class="toggle-icon">{{ collapsedCenters.has(center.id) ? '▶' : '▼' }}</span>
          <span>{{ center.name }}</span>
          <span v-if="startTimes.length" class="center-count">
            ({{ startTimes.length }} créneaux)
          </span>
          <span v-else class="center-count full">(complet)</span>
          <a
            :href="googleMapsUrl(center)"
            target="_blank"
            rel="noopener noreferrer"
            class="location-link"
            :title="`${center.street}, ${center.postalCode} ${center.city}`"
            @click.stop
          >
            <span>{{ center.city }}</span>
            <svg class="map-icon" viewBox="0 0 24 24">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </a>
        </h2>

        <div v-if="!collapsedCenters.has(center.id)" class="dates">
          <div v-for="[date, dateStartTimes] in byDate(startTimes)" :key="date" class="date-group">
            <h4 class="date-header">{{ formatDate(date) }}</h4>
            <div class="slots">
              <SlotCard
                v-for="startTime in dateStartTimes"
                :key="startTime.startUtc"
                :start-time="startTime"
                :center-id="center.id"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.results-count {
  color: var(--color-text-muted);
  font-size: var(--font-base);
  margin-bottom: var(--spacing-md);
  font-weight: 500;
}

.center-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.center-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.center-header {
  font-size: var(--font-lg);
  margin: 0;
  padding: var(--spacing-sm);
  border-bottom: 2px solid var(--color-border);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  transition: background-color var(--transition-fast);
}

.center-header:hover {
  color: var(--color-text-primary);
  background-color: var(--color-bg-light);
}

.toggle-icon {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  min-width: 16px;
}

.center-count {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: normal;
}

.center-count.full {
  color: var(--color-full);
}

.location-link {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-sm);
  font-weight: normal;
  color: var(--color-text-muted);
}

.location-link:hover {
  color: var(--color-primary);
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

.dates {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.date-header {
  margin: 0;
  font-size: var(--font-base);
  color: var(--color-text-muted);
}

.slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--spacing-md);
  margin-top: var(--spacing-sm);
}
</style>
