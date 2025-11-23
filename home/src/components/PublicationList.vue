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
</script>

<template>
  <section class="publications-section">
    <div class="publications-grid" :style="gridStyle">
      <PublicationCard
        v-for="publication in publications"
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
  </section>
</template>

<style scoped>
.publications-section {
  margin-bottom: 2rem;
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
}
</style>
