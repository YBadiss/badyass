<script setup lang="ts">
import { computed, ref } from 'vue'
import ClassCard from './ClassCard.vue'

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
  link: string
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
  classes: GymClass[]
  locationMap: Map<string, Location>
}

const props = defineProps<Props>()

const expandedLocations = ref<Set<string>>(new Set())

const groupedByLocation = computed(() => {
  const groups = new Map<string, GymClass[]>()

  props.classes.forEach(gymClass => {
    const location = gymClass.location
    if (!groups.has(location)) {
      groups.set(location, [])
    }
    groups.get(location)!.push(gymClass)
  })

  return groups
})

const toggleLocation = (locationName: string) => {
  if (expandedLocations.value.has(locationName)) {
    expandedLocations.value.delete(locationName)
  } else {
    expandedLocations.value.add(locationName)
  }
}
</script>

<template>
  <div>
    <p class="results-count">{{ classes.length }} cours trouvés</p>

    <div class="location-groups">
      <div
        v-for="[locationName, locationClasses] in groupedByLocation"
        :key="locationName"
        class="location-group"
      >
        <h2 class="location-header" @click="toggleLocation(locationName)">
          <span class="toggle-icon">{{ expandedLocations.has(locationName) ? '▼' : '▶' }}</span>
          <span>{{ locationName }}</span>
          <span class="location-count"> ({{ locationClasses.length }} cours)</span>
        </h2>
        <div v-if="expandedLocations.has(locationName)" class="classes">
          <ClassCard
            v-for="(gymClass, index) in locationClasses"
            :key="index"
            :gym-class="gymClass"
            :location="locationMap.get(gymClass.location)"
          />
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

.location-groups {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

.location-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.location-header {
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

.location-header:hover {
  background-color: var(--color-bg-light);
}

.toggle-icon {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  min-width: 16px;
}

.location-count {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
  font-weight: normal;
}

.classes {
  display: grid;
  gap: var(--spacing-md);
}
</style>
