<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import FilterSection from './components/FilterSection.vue'
import ClassList from './components/ClassList.vue'
import MapView from './components/MapView.vue'

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
  link: string
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

// Day of week type
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday, 6 = Saturday

interface DayTimeRange {
  enabled: boolean
  startTime: string // HH:mm format
  endTime: string // HH:mm format
}

// Filter state
const filterDays = ref<Map<DayOfWeek, DayTimeRange>>(
  new Map([
    [0, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Sunday
    [1, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Monday
    [2, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Tuesday
    [3, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Wednesday
    [4, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Thursday
    [5, { enabled: true, startTime: '08:00', endTime: '23:00' }], // Friday
    [6, { enabled: true, startTime: '08:00', endTime: '23:00' }] // Saturday
  ])
)
const filterStatus = ref<string[]>(['AVAILABLE'])
const filterActivities = ref<string[]>([])

// View mode: 'list' or 'map'
const viewMode = ref<'list' | 'map'>('map')

// Save filters to localStorage
const saveFilters = () => {
  const filtersToSave = {
    days: Array.from(filterDays.value.entries()),
    status: filterStatus.value,
    activities: filterActivities.value
  }
  localStorage.setItem('swedishfind-filters', JSON.stringify(filtersToSave))
}

// Restore filters from localStorage
const restoreFilters = () => {
  const saved = localStorage.getItem('swedishfind-filters')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.days) {
        filterDays.value = new Map(parsed.days)
      }
      if (parsed.status) {
        filterStatus.value = parsed.status
      }
      if (parsed.activities) {
        filterActivities.value = parsed.activities
      }
    } catch (e) {
      console.error('Failed to restore filters:', e)
    }
  }
}

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

// Extract unique activity names from the classes data
const availableActivities = computed(() => {
  if (!classesData.value) return []

  const activitySet = new Set<string>()
  classesData.value.classes.forEach(gymClass => {
    activitySet.add(gymClass.activity.name)
  })

  return Array.from(activitySet).sort()
})

// Filtered classes based on filter criteria
const filteredClasses = computed(() => {
  if (!classesData.value) return []

  return classesData.value.classes.filter(gymClass => {
    const classDate = new Date(gymClass.timestamp)
    const dayOfWeek = classDate.getDay() as DayOfWeek
    const classTime = `${String(classDate.getHours()).padStart(2, '0')}:${String(classDate.getMinutes()).padStart(2, '0')}`

    // Filter by day and time range
    const dayFilter = filterDays.value.get(dayOfWeek)
    if (!dayFilter || !dayFilter.enabled) {
      return false
    }

    // Check if class time is within the allowed time range for this day
    if (classTime < dayFilter.startTime || classTime > dayFilter.endTime) {
      return false
    }

    // Filter by status
    if (filterStatus.value.length > 0) {
      if (!filterStatus.value.includes(gymClass.status)) return false
    }

    // Filter by activity
    if (filterActivities.value.length > 0) {
      if (!filterActivities.value.includes(gymClass.activity.name)) return false
    }

    return true
  })
})

onMounted(async () => {
  // Restore saved filters first
  restoreFilters()

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
      <h1>Swedish Find</h1>
    </header>

    <main>
      <div v-if="loading" class="loading">Chargement des données...</div>

      <div v-else-if="error" class="error">
        Erreur: {{ error }}
        <p class="hint">Exécutez <code>npm run crawl</code> pour générer les données</p>
      </div>

      <div v-else-if="classesData">
        <p class="timestamp">
          Dernière mise à jour: {{ new Date(classesData.timestamp).toLocaleString('fr-FR') }}
        </p>

        <div v-if="classesData.classes.length === 0" class="empty">
          Aucun cours trouvé. Exécutez <code>npm run crawl</code> pour récupérer les données.
        </div>

        <div v-else>
          <FilterSection
            v-model:days="filterDays"
            v-model:status="filterStatus"
            v-model:activities="filterActivities"
            :available-activities="availableActivities"
            @save="saveFilters"
            @restore="restoreFilters"
          />

          <div class="view-tabs">
            <button :class="['tab', { active: viewMode === 'map' }]" @click="viewMode = 'map'">
              Carte
            </button>
            <button :class="['tab', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
              Liste
            </button>
          </div>

          <ClassList
            v-if="viewMode === 'list'"
            :classes="filteredClasses"
            :location-map="locationMap"
          />
          <MapView
            v-else-if="viewMode === 'map'"
            :classes="filteredClasses"
            :location-map="locationMap"
          />
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

.view-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
  border-bottom: 2px solid var(--color-border);
}

.tab {
  padding: var(--spacing-sm) var(--spacing-lg);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  font-size: var(--font-base);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.tab:hover {
  color: var(--color-text-primary);
}

.tab.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}
</style>
