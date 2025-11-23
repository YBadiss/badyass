<script setup>
import PublicationCard from './PublicationCard.vue'

defineProps({
  publications: Array
})
</script>

<template>
  <section class="publications-section">
    <div class="publications-grid">
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

@media (min-width: 768px) {
  .publications-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (max-width: 640px) {
  .publications-grid {
    gap: 1rem;
  }
}
</style>
