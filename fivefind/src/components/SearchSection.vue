<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatDate, formatInZone, formatTime, type Center } from '../lefive'
import { normalize, selectedCenterIds, type SearchParams } from '../search'
import DatePicker from './DatePicker.vue'

interface Props {
  centers: Center[]
  search: SearchParams
  searching: boolean
  progress: { done: number; total: number }
  maxRequests: number
}

interface Emits {
  (e: 'update:search', value: SearchParams): void
}

type Suggestion =
  | { kind: 'region'; key: string; region: string; count: number }
  | { kind: 'center'; key: string; center: Center }

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const placeQuery = ref('')
const suggestionsOpen = ref(false)
const highlighted = ref(0)
const today = formatInZone(new Date(), 'Europe/Paris').date

const update = (patch: Partial<SearchParams>) =>
  emit('update:search', { ...props.search, ...patch })

const regionCounts = computed(() => {
  const counts = new Map<string, number>()
  for (const center of props.centers) {
    counts.set(center.region, (counts.get(center.region) ?? 0) + 1)
  }
  return counts
})

// Regions and centres matching the query that aren't already in the search.
// Centres also match on their city, postcode and region.
const suggestions = computed<Suggestion[]>(() => {
  const query = normalize(placeQuery.value.trim())
  const regions: Suggestion[] = [...regionCounts.value.entries()]
    .filter(([region]) => !props.search.regions.includes(region))
    .filter(([region]) => normalize(region).includes(query))
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([region, count]) => ({ kind: 'region', key: `r:${region}`, region, count }))
  const centers: Suggestion[] = props.centers
    .filter(c => !props.search.centerIds.includes(c.id))
    .filter(c => !props.search.regions.includes(c.region))
    .filter(c => normalize(`${c.name} ${c.city} ${c.postalCode} ${c.region}`).includes(query))
    .map(center => ({ kind: 'center', key: `c:${center.id}`, center }))
  return [...regions, ...centers]
})

const openSuggestions = () => {
  suggestionsOpen.value = true
  highlighted.value = 0
}

const select = (suggestion: Suggestion) => {
  if (suggestion.kind === 'region') {
    // A region replaces the individual centres it contains
    const inRegion = new Set(
      props.centers.filter(c => c.region === suggestion.region).map(c => c.id)
    )
    update({
      regions: [...props.search.regions, suggestion.region],
      centerIds: props.search.centerIds.filter(id => !inRegion.has(id))
    })
  } else {
    update({ centerIds: [...props.search.centerIds, suggestion.center.id] })
  }
  placeQuery.value = ''
  highlighted.value = 0
  // Close the list so it doesn't cover the chips; typing, clicking or ↓ reopens it
  suggestionsOpen.value = false
}

const removeRegion = (region: string) =>
  update({ regions: props.search.regions.filter(r => r !== region) })

const removeCenter = (id: number) =>
  update({ centerIds: props.search.centerIds.filter(c => c !== id) })

const clearPlaces = () => update({ regions: [], centerIds: [] })

const onPlaceKeydown = (event: KeyboardEvent) => {
  const count = suggestions.value.length
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    suggestionsOpen.value = true
    highlighted.value = count ? (highlighted.value + 1) % count : 0
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value = count ? (highlighted.value - 1 + count) % count : 0
  } else if (event.key === 'Enter') {
    // Enter picks a suggestion instead of submitting the form
    if (suggestionsOpen.value && count) {
      event.preventDefault()
      select(suggestions.value[Math.min(highlighted.value, count - 1)])
    }
  } else if (event.key === 'Escape') {
    // A search input clears itself on Escape and fires `input`, which would reopen the list
    event.preventDefault()
    suggestionsOpen.value = false
  } else if (event.key === 'Backspace' && placeQuery.value === '') {
    // Backspace on an empty box removes the last chip
    if (props.search.centerIds.length) {
      removeCenter(props.search.centerIds[props.search.centerIds.length - 1])
    } else if (props.search.regions.length) {
      removeRegion(props.search.regions[props.search.regions.length - 1])
    }
  }
}

const selectedCenters = computed(() =>
  props.search.centerIds
    .map(id => props.centers.find(c => c.id === id))
    .filter((c): c is Center => !!c)
)

const centerCount = computed(() => selectedCenterIds(props.search, props.centers).length)

// LE FIVE start times are on a 30-minute grid
const timeOptions = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
)

const removeDate = (date: string) => update({ dates: props.search.dates.filter(d => d !== date) })

// Only count dates that are still upcoming (saved searches may hold past dates)
const activeDates = computed(() => props.search.dates.filter(d => d >= today))

const requestCount = computed(() => centerCount.value * activeDates.value.length)
</script>

<template>
  <!-- No submit button: the parent re-runs the search whenever these values change -->
  <form class="search-container" @submit.prevent>
    <div class="search-group">
      <div class="group-header">
        <label for="place-query">Centres</label>
        <span class="group-hint">{{ centerCount }} centre(s)</span>
        <button
          v-if="search.regions.length || search.centerIds.length"
          type="button"
          class="link-button"
          @click="clearPlaces"
        >
          Tout retirer
        </button>
      </div>

      <div class="place-picker">
        <input
          id="place-query"
          v-model="placeQuery"
          type="search"
          class="text-input"
          placeholder="Ajouter une région ou un centre…"
          autocomplete="off"
          role="combobox"
          aria-controls="place-suggestions"
          :aria-expanded="suggestionsOpen"
          @focus="openSuggestions"
          @click="openSuggestions"
          @input="openSuggestions"
          @blur="suggestionsOpen = false"
          @keydown="onPlaceKeydown"
        />
        <ul v-if="suggestionsOpen" id="place-suggestions" class="suggestions" role="listbox">
          <!-- mousedown.prevent keeps focus in the input so the list stays open -->
          <li
            v-for="(suggestion, index) in suggestions"
            :key="suggestion.key"
            role="option"
            :aria-selected="index === highlighted"
            :class="['suggestion', { highlighted: index === highlighted }]"
            @mousedown.prevent="select(suggestion)"
            @mouseenter="highlighted = index"
          >
            <template v-if="suggestion.kind === 'region'">
              <span class="suggestion-name">{{ suggestion.region }}</span>
              <span class="suggestion-meta">Région · {{ suggestion.count }} centres</span>
            </template>
            <template v-else>
              <span class="suggestion-name">{{ suggestion.center.name }}</span>
              <span class="suggestion-meta">
                {{ suggestion.center.postalCode }} {{ suggestion.center.city }} ·
                {{ suggestion.center.region }}
              </span>
            </template>
          </li>
          <li v-if="suggestions.length === 0" class="suggestion empty">Aucun résultat</li>
        </ul>
      </div>

      <div class="chips">
        <span v-for="region in search.regions" :key="region" class="chip active removable">
          {{ region }} ({{ regionCounts.get(region) ?? 0 }})
          <button
            type="button"
            class="remove-button"
            :aria-label="`Retirer ${region}`"
            @click="removeRegion(region)"
          >
            ×
          </button>
        </span>
        <span
          v-for="center in selectedCenters"
          :key="center.id"
          class="chip active removable"
          :title="`${center.street}, ${center.postalCode} ${center.city}`"
        >
          {{ center.name }}
          <button
            type="button"
            class="remove-button"
            :aria-label="`Retirer ${center.name}`"
            @click="removeCenter(center.id)"
          >
            ×
          </button>
        </span>
        <span v-if="centerCount === 0" class="group-hint">
          Recherchez une région ou un centre ci-dessus.
        </span>
      </div>
    </div>

    <div class="search-group">
      <div class="group-header">
        <label>Jours</label>
        <span class="group-hint">{{ activeDates.length }} sélectionné(s)</span>
      </div>
      <div class="dates-row">
        <DatePicker
          :model-value="activeDates"
          :min="today"
          @update:model-value="update({ dates: $event })"
        />
        <div class="chips">
          <span v-for="date in activeDates" :key="date" class="chip active removable">
            {{ formatDate(date) }}
            <button
              type="button"
              class="remove-button"
              :aria-label="`Retirer ${formatDate(date)}`"
              @click="removeDate(date)"
            >
              ×
            </button>
          </span>
          <span v-if="activeDates.length === 0" class="group-hint">
            Choisissez un ou plusieurs jours dans le calendrier.
          </span>
        </div>
      </div>
    </div>

    <div class="search-group">
      <div class="group-header">
        <label for="from-time">Heure de début</label>
      </div>
      <div class="time-inputs">
        <span class="time-label">entre</span>
        <select
          id="from-time"
          :value="search.fromTime"
          class="time-input"
          aria-label="Début au plus tôt"
          @change="update({ fromTime: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="time in timeOptions" :key="time" :value="time">
            {{ formatTime(time) }}
          </option>
        </select>
        <span class="time-label">et</span>
        <select
          :value="search.toTime"
          class="time-input"
          aria-label="Début au plus tard"
          @change="update({ toTime: ($event.target as HTMLSelectElement).value })"
        >
          <option v-for="time in timeOptions" :key="time" :value="time">
            {{ formatTime(time) }}
          </option>
        </select>
      </div>
    </div>

    <div v-if="requestCount > maxRequests || searching" class="search-actions">
      <span v-if="requestCount > maxRequests" class="warning">
        {{ requestCount }} recherches (centres × jours) : maximum {{ maxRequests }}. Réduisez la
        sélection.
      </span>
      <span v-else-if="searching" class="group-hint">
        Recherche… {{ progress.done }}/{{ progress.total }}
      </span>
    </div>
  </form>
</template>

<style scoped>
.search-container {
  /* Keep native controls (select menus, search clear button) light, matching the panel */
  color-scheme: light;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.search-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
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

.place-picker {
  position: relative;
}

.place-picker .text-input {
  width: 100%;
}

.suggestions {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  max-height: 300px;
  overflow-y: auto;
  margin: 0;
  padding: var(--spacing-xs) 0;
  list-style: none;
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}

.suggestion {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--spacing-md);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  font-size: var(--font-sm);
}

.suggestion.highlighted {
  background-color: var(--color-bg-light);
}

.suggestion.empty {
  cursor: default;
  color: var(--color-text-muted);
}

.suggestion-name {
  color: var(--color-text-primary);
  font-weight: 500;
}

.suggestion-meta {
  color: var(--color-text-muted);
  font-size: var(--font-xs);
  text-align: right;
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

.dates-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-sm);
}

.chip.removable {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
  cursor: default;
}

.remove-button {
  padding: 0 2px;
  background: none;
  border: none;
  color: inherit;
  font-size: var(--font-base);
  line-height: 1;
  cursor: pointer;
  opacity: 0.8;
}

.remove-button:hover {
  opacity: 1;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.time-label {
  color: var(--color-text-muted);
  font-size: var(--font-sm);
}

.time-input {
  cursor: pointer;
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

.search-actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: var(--spacing-sm);
}

.warning {
  font-size: var(--font-sm);
  color: var(--color-error-text);
}
</style>
