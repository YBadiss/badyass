<script setup lang="ts">
import { ref } from 'vue'

type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface DayTimeRange {
  enabled: boolean
  startTime: string
  endTime: string
}

interface Props {
  days: Map<DayOfWeek, DayTimeRange>
  status: string[]
  activities: string[]
  availableActivities: string[]
}

interface Emits {
  (e: 'update:days', value: Map<DayOfWeek, DayTimeRange>): void
  (e: 'update:status', value: string[]): void
  (e: 'update:activities', value: string[]): void
  (e: 'save'): void
  (e: 'restore'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const isExpanded = ref(false)
const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const updateDayEnabled = (day: DayOfWeek, enabled: boolean) => {
  const newDays = new Map(props.days)
  const dayRange = newDays.get(day)
  if (dayRange) {
    newDays.set(day, { ...dayRange, enabled })
  }
  emit('update:days', newDays)
}

const updateDayStartTime = (day: DayOfWeek, startTime: string) => {
  const newDays = new Map(props.days)
  const dayRange = newDays.get(day)
  if (dayRange) {
    newDays.set(day, { ...dayRange, startTime })
  }
  emit('update:days', newDays)
}

const updateDayEndTime = (day: DayOfWeek, endTime: string) => {
  const newDays = new Map(props.days)
  const dayRange = newDays.get(day)
  if (dayRange) {
    newDays.set(day, { ...dayRange, endTime })
  }
  emit('update:days', newDays)
}

const updateStatus = (event: Event) => {
  const target = event.target as HTMLInputElement
  const currentStatus = [...props.status]

  if (target.checked) {
    if (!currentStatus.includes(target.value)) {
      currentStatus.push(target.value)
    }
  } else {
    const index = currentStatus.indexOf(target.value)
    if (index > -1) {
      currentStatus.splice(index, 1)
    }
  }

  emit('update:status', currentStatus)
}

const updateActivities = (event: Event) => {
  const target = event.target as HTMLInputElement
  const currentActivities = [...props.activities]

  if (target.checked) {
    if (!currentActivities.includes(target.value)) {
      currentActivities.push(target.value)
    }
  } else {
    const index = currentActivities.indexOf(target.value)
    if (index > -1) {
      currentActivities.splice(index, 1)
    }
  }

  emit('update:activities', currentActivities)
}
</script>

<template>
  <div class="filter-container">
    <button class="filter-toggle" @click="isExpanded = !isExpanded">
      <span>Filtres</span>
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
    </button>

    <div v-if="isExpanded" class="filters">
      <div class="filter-group days-filter">
        <label>Jours & Horaires:</label>
        <div class="day-filters">
          <div v-for="day in [0, 1, 2, 3, 4, 5, 6]" :key="day" class="day-row">
            <label class="day-checkbox-label">
              <input
                :checked="days.get(day as DayOfWeek)?.enabled"
                type="checkbox"
                class="checkbox-input"
                @change="
                  e => updateDayEnabled(day as DayOfWeek, (e.target as HTMLInputElement).checked)
                "
              />
              <span class="day-name">{{ dayNames[day] }}</span>
            </label>
            <div class="time-inputs">
              <input
                :value="days.get(day as DayOfWeek)?.startTime"
                :disabled="!days.get(day as DayOfWeek)?.enabled"
                type="time"
                class="time-input"
                @input="
                  e => updateDayStartTime(day as DayOfWeek, (e.target as HTMLInputElement).value)
                "
              />
              <span class="time-separator">-</span>
              <input
                :value="days.get(day as DayOfWeek)?.endTime"
                :disabled="!days.get(day as DayOfWeek)?.enabled"
                type="time"
                class="time-input"
                @input="
                  e => updateDayEndTime(day as DayOfWeek, (e.target as HTMLInputElement).value)
                "
              />
            </div>
          </div>
        </div>
      </div>

      <div class="filter-group status-filter">
        <label>Statut:</label>
        <div class="status-checkboxes">
          <label class="checkbox-label">
            <input
              :checked="status.includes('AVAILABLE')"
              type="checkbox"
              value="AVAILABLE"
              class="checkbox-input"
              @change="updateStatus"
            />
            <span>Disponible</span>
          </label>
          <label class="checkbox-label">
            <input
              :checked="status.includes('FULL')"
              type="checkbox"
              value="FULL"
              class="checkbox-input"
              @change="updateStatus"
            />
            <span>Complet</span>
          </label>
          <label class="checkbox-label">
            <input
              :checked="status.includes('PASSED')"
              type="checkbox"
              value="PASSED"
              class="checkbox-input"
              @change="updateStatus"
            />
            <span>Passé</span>
          </label>
          <label class="checkbox-label">
            <input
              :checked="status.includes('CANCELLED')"
              type="checkbox"
              value="CANCELLED"
              class="checkbox-input"
              @change="updateStatus"
            />
            <span>Annulé</span>
          </label>
        </div>
      </div>

      <div class="filter-group activities-filter">
        <label>Activités:</label>
        <div class="activities-checkboxes">
          <label v-for="activity in availableActivities" :key="activity" class="checkbox-label">
            <input
              :checked="activities.includes(activity)"
              type="checkbox"
              :value="activity"
              class="checkbox-input"
              @change="updateActivities"
            />
            <span>{{ activity }}</span>
          </label>
        </div>
      </div>

      <div class="filter-actions">
        <button class="action-button" @click="emit('save')">Sauvegarder</button>
        <button class="action-button" @click="emit('restore')">Restaurer</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-container {
  margin-bottom: var(--spacing-lg);
}

.filter-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-base);
  font-weight: 600;
  color: var(--color-text-primary);
  transition: background-color var(--transition-fast);
}

.filter-toggle:hover {
  background-color: #f0f0f0;
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-lg);
  margin-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

.action-button {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--font-sm);
  font-weight: 600;
  transition: background-color var(--transition-fast);
}

.action-button:hover {
  background-color: var(--color-primary-hover);
}

.toggle-icon {
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.filters {
  display: flex;
  gap: var(--spacing-lg);
  padding: var(--spacing-lg);
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-top: none;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  flex-wrap: wrap;
  align-items: flex-start;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.filter-group > label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.days-filter {
  flex: 1;
  min-width: 300px;
}

.day-filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.day-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.day-checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  min-width: 100px;
}

.day-name {
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
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
  transition: border-color var(--transition-fast);
}

.time-input:disabled {
  background-color: var(--color-bg-light);
  color: var(--color-text-muted);
  cursor: not-allowed;
}

.time-input:focus:not(:disabled) {
  outline: none;
  border-color: var(--color-primary);
}

.time-separator {
  color: var(--color-text-muted);
  font-size: var(--font-sm);
}

.status-filter {
  flex: 1;
  min-width: 250px;
}

.status-checkboxes {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.activities-filter {
  flex: 1;
  min-width: 250px;
}

.activities-checkboxes {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
}

.checkbox-input {
  cursor: pointer;
  width: 16px;
  height: 16px;
}
</style>
