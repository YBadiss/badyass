<script setup lang="ts">
import { formatDuration } from '../lefive'

export interface Filters {
  durations: number[]
  fieldTypes: string[] // empty = all
  maxPricePerPlayer: number | null
  filmedOnly: boolean
}

interface Props {
  filters: Filters
  availableFieldTypes: string[]
}

interface Emits {
  (e: 'update:filters', value: Filters): void
  (e: 'reset'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const allDurations = [60, 90, 120]

const update = (patch: Partial<Filters>) => emit('update:filters', { ...props.filters, ...patch })

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter(v => v !== value) : [...list, value]

const updateMaxPrice = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  update({ maxPricePerPlayer: value === '' ? null : Number(value) })
}
</script>

<template>
  <div class="filter-container">
    <div class="filters">
      <h2 class="panel-title">Préférences</h2>
      <div class="filter-group">
        <label>Durée:</label>
        <div class="checkboxes">
          <label v-for="duration in allDurations" :key="duration" class="checkbox-label">
            <input
              :checked="filters.durations.includes(duration)"
              type="checkbox"
              class="checkbox-input"
              @change="update({ durations: toggle(filters.durations, duration) })"
            />
            <span>{{ formatDuration(duration) }}</span>
          </label>
        </div>
      </div>

      <div class="filter-group">
        <label>Terrain:</label>
        <div class="checkboxes">
          <label v-for="fieldType in availableFieldTypes" :key="fieldType" class="checkbox-label">
            <input
              :checked="filters.fieldTypes.includes(fieldType)"
              type="checkbox"
              class="checkbox-input"
              @change="update({ fieldTypes: toggle(filters.fieldTypes, fieldType) })"
            />
            <span>{{ fieldType }}</span>
          </label>
          <span v-if="availableFieldTypes.length === 0" class="hint">
            Lancez une recherche pour voir les types de terrain
          </span>
        </div>
      </div>

      <div class="filter-group">
        <label for="max-price">Prix max par joueur:</label>
        <div class="price-input-wrapper">
          <input
            id="max-price"
            :value="filters.maxPricePerPlayer ?? ''"
            type="number"
            min="0"
            step="1"
            placeholder="—"
            class="price-input"
            @input="updateMaxPrice"
          />
          <span class="hint">€</span>
        </div>
      </div>

      <div class="filter-group">
        <label>Options:</label>
        <label class="checkbox-label">
          <input
            :checked="filters.filmedOnly"
            type="checkbox"
            class="checkbox-input"
            @change="update({ filmedOnly: !filters.filmedOnly })"
          />
          <span>Terrains filmés uniquement</span>
        </label>
      </div>

      <div class="filter-actions">
        <!-- Search and filters are saved automatically; this goes back to the defaults -->
        <button type="button" class="reset-button" @click="emit('reset')">
          Réinitialiser la recherche et les préférences
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-container {
  margin-bottom: var(--spacing-md);
}

.filters {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-bg-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.panel-title {
  margin: 0;
  font-size: var(--font-base);
  color: var(--color-text-primary);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.filter-group > label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.checkboxes {
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

.hint {
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.price-input-wrapper {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.price-input {
  width: 80px;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--font-sm);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
}

.price-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.reset-button {
  padding: 0;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: var(--font-xs);
  cursor: pointer;
}

.reset-button:hover {
  text-decoration: underline;
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
  padding-top: var(--spacing-md);
  border-top: 1px solid var(--color-border);
}
</style>
