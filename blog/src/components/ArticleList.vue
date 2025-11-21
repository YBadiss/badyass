<script setup>
import ArticleCard from './ArticleCard.vue'

defineProps({
  articles: Array
})
</script>

<template>
  <section class="articles-section">
    <div class="articles-grid">
      <ArticleCard
        v-for="article in articles"
        :key="article.slug"
        :slug="article.slug"
        :title="article.title"
        :description="article.description"
        :date="article.date"
        :tags="article.tags"
      />
    </div>
  </section>
</template>

<style scoped>
.articles-section {
  margin-bottom: 2rem;
}

.articles-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (max-width: 640px) {
  .articles-grid {
    gap: 1rem;
  }
}
</style>
