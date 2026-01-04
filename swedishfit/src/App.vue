<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import FilterSection from './components/FilterSection.vue'
import ClassList from './components/ClassList.vue'

type Activity = {
  name: string
  icon: string
}

type GymClass = {
  timestamp: string
  location: string
  activity: Activity
  teacher: string
  status: string // CANCELLED, PASSED, FULL, AVAILABLE
}

interface CrawledClasses {
  timestamp: string
  classes: GymClass[]
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

interface CrawledLocations {
  timestamp: string
  locations: Location[]
}

const classesData = ref<CrawledClasses | null>(null)
const locationsData = ref<CrawledLocations | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Filter state
const filterAfter = ref<string>('')
const filterBefore = ref<string>('')
const filterStatus = ref<string[]>(['AVAILABLE'])

// Initialize filter defaults
const initializeFilters = () => {
  // Default "after" to 1 hour ago
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)
  filterAfter.value = oneHourAgo.toISOString().slice(0, 16)

  // Default "before" to next week
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)
  filterBefore.value = nextWeek.toISOString().slice(0, 16)
}

// Initialize filters on load
initializeFilters()

// Create a map of location names to Location objects for quick lookup
const locationMap = computed(() => {
  const map = new Map<string, Location>()
  if (locationsData.value) {
    locationsData.value.locations.forEach(location => {
      map.set(location.name, location)
    })
  }
  return map
})

// Filtered classes based on filter criteria
const filteredClasses = computed(() => {
  if (!classesData.value) return []

  return classesData.value.classes.filter(gymClass => {
    const classDate = new Date(gymClass.timestamp)

    // Filter by "after" time
    if (filterAfter.value) {
      const afterDate = new Date(filterAfter.value)
      if (classDate < afterDate) return false
    }

    // Filter by "before" time
    if (filterBefore.value) {
      const beforeDate = new Date(filterBefore.value)
      if (classDate > beforeDate) return false
    }

    // Filter by status
    if (filterStatus.value.length > 0) {
      if (!filterStatus.value.includes(gymClass.status)) return false
    }

    return true
  })
})

onMounted(async () => {
  try {
    // Load both classes and locations data in parallel
    const [classesResponse, locationsResponse] = await Promise.all([
      fetch('/classes.json'),
      fetch('/locations.json')
    ])

    if (!classesResponse.ok) {
      throw new Error('Failed to load classes data')
    }
    if (!locationsResponse.ok) {
      console.warn('Failed to load locations data - maps links will not be available')
    }

    classesData.value = await classesResponse.json()

    if (locationsResponse.ok) {
      locationsData.value = await locationsResponse.json()
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load data'
    console.error('Error loading data:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="container">
    <header>
      <h1>Swedish Fit</h1>
    </header>

    <main>
      <div v-if="loading" class="loading">Loading data...</div>

      <div v-else-if="error" class="error">
        Error: {{ error }}
        <p class="hint">Run <code>npm run crawl</code> to generate data</p>
      </div>

      <div v-else-if="classesData">
        <p class="timestamp">
          Last updated: {{ new Date(classesData.timestamp).toLocaleString() }}
        </p>

        <div v-if="classesData.classes.length === 0" class="empty">
          No classes found. Run <code>npm run crawl</code> to fetch data.
        </div>

        <div v-else>
          <FilterSection
            v-model:after="filterAfter"
            v-model:before="filterBefore"
            v-model:status="filterStatus"
          />

          <ClassList :classes="filteredClasses" :location-map="locationMap" />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-xl);
}

header {
  margin-bottom: var(--spacing-xl);
}

h1 {
  font-size: var(--font-xl);
  margin: 0;
}

.loading,
.error,
.empty {
  padding: var(--spacing-xl);
  text-align: center;
  border-radius: var(--radius-md);
}

.error {
  background-color: var(--color-error-bg);
  color: var(--color-error-text);
}

.hint {
  margin-top: var(--spacing-md);
  font-size: var(--font-base);
}

code {
  background-color: var(--color-bg-code);
  padding: 0.2rem var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-family: monospace;
}

.timestamp {
  color: var(--color-text-muted);
  font-size: var(--font-base);
  margin-bottom: var(--spacing-md);
}
</style>
