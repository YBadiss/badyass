<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import SearchSection from './components/SearchSection.vue'
import FilterSection, { type Filters } from './components/FilterSection.vue'
import SlotList from './components/SlotList.vue'
import MapView from './components/MapView.vue'
import ExtensionBanner from './components/ExtensionBanner.vue'
import { fetchCenters, fetchSlots, formatInZone, runPool, type Center, type Slot } from './lefive'
import { groupSlots } from './slots'
import { selectedCenterIds, type SearchParams } from './search'

// Each (centre, day) pair is one API call; keep searches polite
const MAX_REQUESTS = 60
const CONCURRENCY = 6
const STORAGE_KEY = 'fivefind-filters'
// Any change to the search re-runs it after this pause, so quick successive edits make one search
const SEARCH_DEBOUNCE_MS = 600

// Paris 13, Paris 17, Paris 18, Villette
const DEFAULT_CENTER_IDS = [51, 63, 69, 39]

const today = () => formatInZone(new Date(), 'Europe/Paris').date

const centers = ref<Center[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const defaultSearch = (): SearchParams => ({
  regions: [],
  centerIds: DEFAULT_CENTER_IDS,
  dates: [today()],
  fromTime: '18:00',
  toTime: '22:00'
})
const defaultFilters = (): Filters => ({
  durations: [60, 90, 120],
  fieldTypes: [],
  maxPricePerPlayer: null,
  filmedOnly: false
})

const search = ref<SearchParams>(defaultSearch())
const filters = ref<Filters>(defaultFilters())

// Results of the last search
const slots = ref<Slot[]>([])
const searchedCenters = ref<Center[]>([])
const searchedAt = ref<Date | null>(null)
const searchErrors = ref<string[]>([])
const searching = ref(false)
const progress = ref({ done: 0, total: 0 })

// View mode: 'list' or 'map'
const viewMode = ref<'list' | 'map'>('map')

// Search, filters and view are saved on every change and restored on load.
// Storage can be unavailable (private mode, blocked site data): the app then just doesn't remember.
const saveState = () => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ search: search.value, filters: filters.value, viewMode: viewMode.value })
    )
  } catch {
    // Nothing to do
  }
}

const restoreState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    const parsed = JSON.parse(saved)
    if (parsed.search) {
      // Saved dates may be in the past by now
      const dates = (parsed.search.dates as string[]).filter(d => d >= today())
      // Merge onto the defaults so fields added since the save get a value
      search.value = {
        ...defaultSearch(),
        ...parsed.search,
        dates: dates.length ? dates : [today()]
      }
    }
    if (parsed.filters) filters.value = { ...defaultFilters(), ...parsed.filters }
    if (parsed.viewMode === 'list' || parsed.viewMode === 'map') viewMode.value = parsed.viewMode
  } catch (e) {
    console.error('Failed to restore saved search:', e)
  }
}

const resetState = () => {
  search.value = defaultSearch()
  filters.value = defaultFilters()
}

// Each search gets a number; results from a search that was superseded meanwhile are dropped
let searchGeneration = 0

const runSearch = async () => {
  const generation = ++searchGeneration
  const ids = selectedCenterIds(search.value, centers.value)
  const selected = centers.value.filter(c => ids.includes(c.id))
  const dates = search.value.dates.filter(d => d >= today())
  const { fromTime, toTime } = search.value

  const tasks = selected.flatMap(center =>
    dates.map(date => () => fetchSlots({ center, date, fromTime, toTime }))
  )
  // Too many requests: keep the previous results, the search panel shows a warning
  if (tasks.length > MAX_REQUESTS) return

  searching.value = true
  progress.value = { done: 0, total: tasks.length }
  const { results, errors } = await runPool(tasks, CONCURRENCY, done => {
    if (generation === searchGeneration) progress.value = { done, total: tasks.length }
  })
  if (generation !== searchGeneration) return

  slots.value = results.flat()
  searchedCenters.value = selected
  searchErrors.value = errors
  searchedAt.value = new Date()
  searching.value = false
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined
const scheduleSearch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS)
}

const selectedIds = computed(() => selectedCenterIds(search.value, centers.value))

const availableFieldTypes = computed(() =>
  [...new Set(slots.value.map(s => s.fieldType).filter(Boolean))].sort()
)

const filteredSlots = computed(() =>
  slots.value.filter(slot => {
    if (!filters.value.durations.includes(slot.duration)) return false
    if (filters.value.fieldTypes.length && !filters.value.fieldTypes.includes(slot.fieldType)) {
      return false
    }
    if (
      filters.value.maxPricePerPlayer !== null &&
      slot.pricePerPlayer > filters.value.maxPricePerPlayer
    ) {
      return false
    }
    if (filters.value.filmedOnly && !slot.isFilmed) return false
    return true
  })
)

const availability = computed(() => groupSlots(filteredSlots.value, searchedCenters.value))

// A "créneau" is one start time at one centre, whatever the duration or pitch
const slotCount = computed(() =>
  availability.value.reduce((total, a) => total + a.startTimes.length, 0)
)

onMounted(async () => {
  // Restore saved filters first
  restoreState()
  watch([search, filters, viewMode], saveState, { deep: true })

  try {
    centers.value = await fetchCenters()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load data'
    console.error('Error loading centers:', e)
  } finally {
    loading.value = false
  }

  if (!centers.value.length) return
  // Watch only once centres are loaded, so restoring saved filters doesn't trigger a second search
  watch(search, scheduleSearch, { deep: true })
  await runSearch()
})
</script>

<template>
  <div class="container">
    <header>
      <h1>Five Find</h1>
      <p class="subtitle">Terrains de foot à 5 libres dans les centres LE FIVE, en direct.</p>
    </header>

    <main>
      <div v-if="loading" class="loading">Chargement des centres...</div>

      <div v-else-if="error" class="error">
        Erreur: {{ error }}
        <p class="hint">L'API de LE FIVE est peut-être indisponible, réessayez plus tard.</p>
      </div>

      <div v-else class="layout">
        <!-- Search and filters on the left, results on the right, so everything fits on one screen -->
        <aside class="sidebar">
          <SearchSection
            v-model:search="search"
            :centers="centers"
            :searching="searching"
            :progress="progress"
            :max-requests="MAX_REQUESTS"
          />

          <FilterSection
            v-model:filters="filters"
            :available-field-types="availableFieldTypes"
            @reset="resetState"
          />

          <p v-if="searchedAt" class="timestamp">
            Dernière recherche: {{ searchedAt.toLocaleString('fr-FR') }}
          </p>

          <div v-if="searchErrors.length" class="error partial-error">
            {{ searchErrors.length }} recherche(s) en échec:
            <ul>
              <li v-for="(message, index) in searchErrors" :key="index">{{ message }}</li>
            </ul>
          </div>
        </aside>

        <section class="results">
          <ExtensionBanner />

          <div class="view-tabs">
            <button :class="['tab', { active: viewMode === 'map' }]" @click="viewMode = 'map'">
              Carte
            </button>
            <button :class="['tab', { active: viewMode === 'list' }]" @click="viewMode = 'list'">
              Liste
            </button>
          </div>

          <template v-if="viewMode === 'list'">
            <SlotList v-if="searchedAt" :availability="availability" :slot-count="slotCount" />
            <div v-else class="empty">
              Choisissez des centres et des jours pour voir les créneaux libres.
            </div>
          </template>
          <MapView
            v-else-if="viewMode === 'map'"
            :centers="centers"
            :selected-ids="selectedIds"
            :availability="availability"
            :slot-count="slotCount"
          />
        </section>
      </div>
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--spacing-lg);
}

header {
  margin-bottom: var(--spacing-lg);
}

.layout {
  display: grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: var(--spacing-lg);
  align-items: start;
}

/* The sidebar stays in view while the results scroll */
.sidebar {
  position: sticky;
  top: var(--spacing-md);
  max-height: calc(100vh - 2 * var(--spacing-md));
  overflow-y: auto;
}

.results {
  min-width: 0;
}

@media (max-width: 900px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    max-height: none;
    overflow: visible;
  }
}

h1 {
  font-size: 2rem;
  margin: 0;
}

.subtitle {
  margin: var(--spacing-sm) 0 0 0;
  color: var(--color-text-muted);
  font-size: var(--font-base);
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

.partial-error {
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  text-align: left;
  font-size: var(--font-sm);
}

.partial-error ul {
  margin: var(--spacing-xs) 0 0 0;
}

.hint {
  margin-top: var(--spacing-md);
  font-size: var(--font-base);
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
