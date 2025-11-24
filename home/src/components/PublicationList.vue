<script setup>
import { computed } from 'vue'
import PublicationCard from './PublicationCard.vue'

const props = defineProps({
  publications: Array,
  columns: {
    type: Number,
    default: 2
  }
})

const gridStyle = computed(() => {
  if (props.columns === 1) {
    return { gridTemplateColumns: '1fr' }
  }
  return {
    gridTemplateColumns: `repeat(${props.columns}, 1fr)`
  }
})

// Group publications by year
const groupedPublications = computed(() => {
  const groups = []
  let currentYear = null

  props.publications.forEach(pub => {
    if (!pub.date) {
      // If no date, add to "Undated" group
      let undatedGroup = groups.find(g => g.label === 'Undated')
      if (!undatedGroup) {
        undatedGroup = { label: 'Undated', publications: [] }
        groups.push(undatedGroup)
      }
      undatedGroup.publications.push(pub)
      return
    }

    const date = new Date(pub.date)
    const year = date.getFullYear().toString()

    if (year !== currentYear) {
      currentYear = year
      groups.push({ label: year, publications: [pub] })
    } else {
      groups[groups.length - 1].publications.push(pub)
    }
  })

  return groups
})
</script>

<template>
  <section class="publications-section">
    <div v-for="group in groupedPublications" :key="group.label" class="month-group">
      <h3 class="month-label">{{ group.label }}</h3>
      <div class="publications-grid" :style="gridStyle">
        <PublicationCard
          v-for="publication in group.publications"
          :key="publication.title"
          :title="publication.title"
          :date="publication.date"
          :description="publication.description"
          :picture="publication.picture"
          :url="publication.url"
          :slug="publication.slug"
          :tags="publication.tags"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.publications-section {
  margin-bottom: 2rem;
}

.month-group {
  margin-bottom: 2rem;
}

.month-group:last-child {
  margin-bottom: 0;
}

.month-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid var(--border);
  opacity: 0.6;
}

.publications-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (max-width: 640px) {
  .publications-grid {
    grid-template-columns: 1fr !important;
    gap: 1rem;
  }

  .month-label {
    font-size: 1.125rem;
  }
}
</style>
