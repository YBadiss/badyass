<script setup lang="ts">
import { bookingUrl, formatDuration, formatPrice, formatTime } from '../lefive'
import type { StartTime } from '../slots'
import { installedVersion } from '../extension'

interface Props {
  startTime: StartTime
  centerId: number
}

defineProps<Props>()

const priceRange = (min: number, max: number) =>
  min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`
</script>

<template>
  <div class="slot-card">
    <div class="slot-header">
      <h3>{{ formatTime(startTime.time) }}</h3>
      <a
        :href="bookingUrl(centerId, startTime.date, startTime.startUtc)"
        target="_blank"
        rel="noopener noreferrer"
        class="book-link"
        :title="
          installedVersion
            ? 'Ouvre ce créneau sur lefive.fr (extension FiveFind)'
            : 'Ouvre la page du centre sur lefive.fr ; installez l’extension FiveFind pour arriver directement sur ce créneau'
        "
      >
        {{ installedVersion ? 'Ouvrir le créneau' : 'Réserver' }}
      </a>
    </div>

    <details v-for="option in startTime.options" :key="option.duration" class="option">
      <summary>
        <span class="duration">{{ formatDuration(option.duration) }}</span>
        <span class="fields-count">
          {{ option.fields.length }} terrain{{ option.fields.length > 1 ? 's' : '' }}
        </span>
        <span class="price">
          {{ priceRange(option.minPricePerPlayer, option.maxPricePerPlayer) }}/joueur
        </span>
      </summary>
      <ul class="fields">
        <li v-for="field in option.fields" :key="field.fieldId">
          <span class="field-name">{{ field.fieldName }}</span>
          <span class="field-type">{{ field.fieldType }}</span>
          <span v-if="field.isFilmed" class="field-filmed" title="Terrain filmé">🎥</span>
          <span class="field-price">{{ formatPrice(field.price) }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>

<style scoped>
.slot-card {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-white);
  color: var(--color-text-primary);
  transition: box-shadow var(--transition-fast);
}

.slot-card:hover {
  box-shadow: var(--shadow-card);
}

.slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-sm);
}

.slot-header h3 {
  margin: 0;
  color: var(--color-primary);
  font-size: var(--font-lg);
}

.book-link {
  padding: var(--spacing-xs) 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--font-xs);
  font-weight: bold;
  text-transform: uppercase;
  background-color: var(--color-status-available-bg);
  color: var(--color-status-available-text);
}

.book-link:hover {
  color: var(--color-status-available-text);
  filter: brightness(0.95);
}

.option summary {
  display: flex;
  gap: var(--spacing-sm);
  align-items: baseline;
  padding: var(--spacing-xs) 0;
  cursor: pointer;
  font-size: var(--font-sm);
  color: var(--color-text-secondary);
  list-style: none;
}

.option summary::-webkit-details-marker {
  display: none;
}

.option summary::before {
  content: '▶';
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.option[open] summary::before {
  content: '▼';
}

.duration {
  font-weight: 600;
  color: var(--color-text-primary);
  min-width: 2.5rem;
}

.fields-count {
  flex: 1;
}

.price {
  color: var(--color-text-muted);
}

.fields {
  margin: 0 0 var(--spacing-sm) 0;
  padding: 0 0 0 var(--spacing-lg);
  list-style: none;
  font-size: var(--font-xs);
  color: var(--color-text-muted);
}

.fields li {
  display: flex;
  gap: var(--spacing-sm);
  padding: 2px 0;
}

.field-name {
  flex: 1;
  color: var(--color-text-secondary);
}
</style>
