<script setup lang="ts">
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

defineProps<Props>()
</script>

<template>
  <div>
    <p class="results-count">{{ classes.length }} classes found</p>

    <div class="classes">
      <ClassCard
        v-for="(gymClass, index) in classes"
        :key="index"
        :gym-class="gymClass"
        :location="locationMap.get(gymClass.location)"
      />
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

.classes {
  display: grid;
  gap: var(--spacing-md);
}
</style>
