<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatInZone, type Center } from '../lefive'

export interface SearchParams {
  centerIds: number[]
  dates: string[] // YYYY-MM-DD
  fromTime: string // HH:MM
  toTime: string // HH:MM
}

interface Props {
  centers: Center[]
  search: SearchParams
  searching: boolean
  progress: { done: number; total: number }
  maxRequests: number
}

interface Emits {
  (e: 'update:search', value: SearchParams): void
  (e: 'submit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const centerQuery = ref('')
const DAYS_AHEAD = 14

const update = (patch: Partial<SearchParams>) =>
  emit('update:search', { ...props.search, ...patch })

// Next DAYS_AHEAD days, in Paris time
const upcomingDates = computed(() => {
  const now = Date.now()
  return Array.from(
    { length: DAYS_AHEAD },
    (_, i) => formatInZone(new Date(now + i * 24 * 60 * 60 * 1000), 'Europe/Paris').date
  )
})

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Centres grouped by region, filtered by the text query (name, city or postcode)
const centersByRegion = computed(() => {
  const query = normalize(centerQuery.value.trim())
  const groups = new Map<string, Center[]>()
  for (const center of props.centers) {
    const haystack = normalize(
      `${center.name} ${center.city} ${center.postalCode} ${center.region}`
    )
    if (query && !haystack.includes(query)) continue
    if (!groups.has(center.region)) groups.set(center.region, [])
    groups.get(center.region)!.push(center)
  }
  return [...groups.entries()].sort(([a], [b]) => {
    // Île-de-France has most centres, keep it first
    if (a === 'Île-de-France') return -1
    if (b === 'Île-de-France') return 1
    return a.localeCompare(b, 'fr')
  })
})

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value]

const toggleCenter = (id: number) => update({ centerIds: toggle(props.search.centerIds, id) })

const toggleDate = (date: string) => update({ dates: toggle(props.search.dates, date).sort() })

const isRegionSelected = (centers: Center[]) =>
  centers.every(c => props.search.centerIds.includes(c.id))

const toggleRegion = (centers: Center[]) => {
  const ids = centers.map(c => c.id)
  const centerIds = isRegionSelected(centers)
    ? props.search.centerIds.filter(id => !ids.includes(id))
    : [...new Set([...props.search.centerIds, ...ids])]
  update({ centerIds })
}

// Only count dates that are still upcoming (saved searches may hold past dates)
const activeDates = computed(() => props.search.dates.filter(d => upcomingDates.value.includes(d)))

const requestCount = computed(() => props.search.centerIds.length * activeDates.value.length)

const canSubmit = computed(
  () =>
    !props.searching &&
    requestCount.value > 0 &&
    requestCount.value <= props.maxRequests &&
    !!props.search.fromTime &&
    !!props.search.toTime
)
</script>

<template>
  <form class="search-container" @submit.prevent="canSubmit && emit('submit')">
    <div class="search-group">
      <div class="group-header">
        <label for="center-query">Centres</label>
        <span class="group-hint">{{ search.centerIds.length }} sélectionné(s)</span>
        <button
          v-if="search.centerIds.length"
          type="button"
          class="link-button"
          @click="update({ centerIds: [] })"
        >
          Tout désélectionner
        </button>
      </div>
      <input
        id="center-query"
        v-model="centerQuery"
        type="search"
        class="text-input"
        placeholder="Filtrer par nom, ville ou code postal…"
      />
      <div class="regions">
        <div v-for="[region, regionCenters] in centersByRegion" :key="region" class="region">
          <label class="region-label">
            <input
              :checked="isRegionSelected(regionCenters)"
              type="checkbox"
              class="checkbox-input"
              @change="toggleRegion(regionCenters)"
            />
            <span>{{ region }}</span>
          </label>
          <div class="chips">
            <button
              v-for="center in regionCenters"
              :key="center.id"
              type="button"
              :class="['chip', { active: search.centerIds.includes(center.id) }]"
              :title="`${center.street}, ${center.postalCode} ${center.city}`"
              @click="toggleCenter(center.id)"
            >
              {{ center.name }}
            </button>
          </div>
        </div>
        <p v-if="centersByRegion.length === 0" class="group-hint">Aucun centre ne correspond.</p>
      </div>
    </div>

    <div class="search-row">
      <div class="search-group dates-group">
        <div class="group-header">
          <label>Jours</label>
          <span class="group-hint">{{ activeDates.length }} sélectionné(s)</span>
        </div>
        <div class="chips">
          <button
            v-for="date in upcomingDates"
            :key="date"
            type="button"
            :class="['chip', { active: search.dates.includes(date) }]"
            @click="toggleDate(date)"
          >
            {{ formatDate(date, true) }}
          </button>
        </div>
      </div>

      <div class="search-group">
        <div class="group-header">
          <label>Heure de début</label>
        </div>
        <div class="time-inputs">
          <input
            :value="search.fromTime"
            type="time"
            step="1800"
            class="time-input"
            aria-label="Début au plus tôt"
            @input="update({ fromTime: ($event.target as HTMLInputElement).value })"
          />
          <span class="time-separator">-</span>
          <input
            :value="search.toTime"
            type="time"
            step="1800"
            class="time-input"
            aria-label="Début au plus tard"
            @input="update({ toTime: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>
    </div>

    <div class="search-actions">
      <span v-if="requestCount > maxRequests" class="warning">
        {{ requestCount }} recherches (centres × jours) : maximum {{ maxRequests }}. Réduisez la
        sélection.
      </span>
      <span v-else-if="searching" class="group-hint">
        Recherche… {{ progress.done }}/{{ progress.total }}
      </span>
      <button type="submit" class="action-button" :disabled="!canSubmit">Rechercher</button>
    </div>
  </form>
</template>

<style scoped>
.search-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.search-row {
  display: flex;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
}

.search-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.dates-group {
  flex: 1;
  min-width: 250px;
}

.group-header {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-sm);
}

.group-header label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.group-hint {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.link-button {
  margin-left: auto;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  font-size: var(--font-xs);
  color: var(--color-primary);
}

.text-input {
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
}

.text-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.regions {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.region {
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
}

.region-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 200px;
  padding-top: var(--spacing-xs);
  cursor: pointer;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
}

.chip {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-secondary);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.chip:hover {
  border-color: var(--color-primary);
}

.chip.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.checkbox-input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.time-input {
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
}

.time-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.time-separator {
  color: var(--color-text-muted);
  font-size: var(--font-sm);
}

.search-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-md);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.warning {
  font-size: var(--font-sm);
  color: var(--color-error-text);
}

.action-button {
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-sm);
  font-weight: 600;
  transition: background-color var(--transition-fast);
}

.action-button:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .region {
    flex-direction: column;
    gap: var(--spacing-xs);
  }
}
</style>
