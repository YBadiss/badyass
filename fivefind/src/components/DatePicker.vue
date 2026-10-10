<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Multi-date calendar: clicking a day toggles it in the selection; the popover stays open
// so several days can be picked in a row. Dates are YYYY-MM-DD strings.

interface Props {
  modelValue: string[]
  min: string // earliest selectable date, YYYY-MM-DD
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

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
const weekdayNames = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

const isOpen = ref(false)
const root = ref<HTMLDivElement | null>(null)
const [minYear, minMonth] = props.min.split('-').map(Number)
// Month being displayed, as year + 0-based month
const view = ref({ year: minYear, month: minMonth - 1 })

const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`

const canGoBack = computed(
  () =>
    view.value.year > minYear || (view.value.year === minYear && view.value.month > minMonth - 1)
)

const shiftMonth = (delta: number) => {
  const date = new Date(Date.UTC(view.value.year, view.value.month + delta, 1))
  view.value = { year: date.getUTCFullYear(), month: date.getUTCMonth() }
}

// Calendar cells for the displayed month, Monday first; null cells pad the first week
const cells = computed(() => {
  const { year, month } = view.value
  const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const result: ({ day: number; iso: string } | null)[] = Array(firstWeekday).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    result.push({ day, iso: toIso(year, month, day) })
  }
  return result
})

const toggleDate = (iso: string) => {
  if (iso < props.min) return
  const dates = props.modelValue.includes(iso)
    ? props.modelValue.filter(d => d !== iso)
    : [...props.modelValue, iso].sort()
  emit('update:modelValue', dates)
}

// Close when clicking outside or pressing Escape
const onDocumentMousedown = (event: MouseEvent) => {
  if (isOpen.value && root.value && !root.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}
const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') isOpen.value = false
}

onMounted(() => document.addEventListener('mousedown', onDocumentMousedown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentMousedown))
</script>

<template>
  <div ref="root" class="date-picker" @keydown="onKeydown">
    <button
      type="button"
      class="picker-button"
      :aria-expanded="isOpen"
      aria-haspopup="dialog"
      @click="isOpen = !isOpen"
    >
      <svg class="calendar-icon" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
        <path d="M3 10h18M8 3v4M16 3v4"></path>
      </svg>
      <span>Ajouter des jours</span>
    </button>

    <div v-if="isOpen" class="calendar" role="dialog" aria-label="Choisir des jours">
      <div class="calendar-header">
        <button
          type="button"
          class="nav-button"
          :disabled="!canGoBack"
          aria-label="Mois précédent"
          @click="shiftMonth(-1)"
        >
          ‹
        </button>
        <span class="month-label">{{ monthNames[view.month] }} {{ view.year }}</span>
        <button type="button" class="nav-button" aria-label="Mois suivant" @click="shiftMonth(1)">
          ›
        </button>
      </div>

      <div class="calendar-grid">
        <span v-for="(name, index) in weekdayNames" :key="`w${index}`" class="weekday">
          {{ name }}
        </span>
        <template v-for="(cell, index) in cells" :key="cell?.iso ?? `pad${index}`">
          <button
            v-if="cell"
            type="button"
            :class="['day', { selected: modelValue.includes(cell.iso), today: cell.iso === min }]"
            :disabled="cell.iso < min"
            :aria-pressed="modelValue.includes(cell.iso)"
            @click="toggleDate(cell.iso)"
          >
            {{ cell.day }}
          </button>
          <span v-else></span>
        </template>
      </div>

      <div class="calendar-footer">
        <button type="button" class="done-button" @click="isOpen = false">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-picker {
  position: relative;
}

.picker-button {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  font-size: var(--font-sm);
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.picker-button:hover,
.picker-button[aria-expanded='true'] {
  border-color: var(--color-primary);
}

.calendar-icon {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.calendar {
  position: absolute;
  z-index: 1000;
  top: calc(100% + 4px);
  left: 0;
  width: 280px;
  padding: var(--spacing-md);
  background-color: var(--color-bg-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.month-label {
  font-weight: 600;
  font-size: var(--font-sm);
  color: var(--color-text-primary);
}

.nav-button {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-primary);
  font-size: var(--font-lg);
  line-height: 1;
  cursor: pointer;
}

.nav-button:hover:not(:disabled) {
  background-color: var(--color-bg-light);
}

.nav-button:disabled {
  color: var(--color-border);
  cursor: default;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.weekday {
  text-align: center;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
  padding-bottom: var(--spacing-xs);
}

.day {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--color-text-primary);
  font-size: var(--font-sm);
  cursor: pointer;
}

.day:hover:not(:disabled) {
  background-color: var(--color-bg-light);
}

.day.today {
  font-weight: 700;
  box-shadow: inset 0 0 0 1px var(--color-border);
}

.day.selected,
.day.selected:hover {
  background-color: var(--color-primary);
  color: white;
}

.day:disabled {
  color: var(--color-border);
  cursor: default;
}

.calendar-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--spacing-sm);
}

.done-button {
  padding: var(--spacing-xs) var(--spacing-md);
  border: none;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: white;
  font-size: var(--font-sm);
  font-weight: 600;
  cursor: pointer;
}

.done-button:hover {
  background-color: var(--color-primary-hover);
}
</style>
