<script setup>
import WritingCard from './WritingCard.vue'

defineProps({
  writings: Array
})
</script>

<template>
  <section class="writings-section">
    <h2 class="section-title">Writings</h2>
    <div class="writings-grid">
      <WritingCard
        v-for="writing in writings"
        :key="writing.title"
        :title="writing.title"
        :description="writing.description"
        :url="writing.url"
      />
    </div>
  </section>
</template>

<style scoped>
.writings-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2rem 0;
  text-align: center;
}

.writings-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .writings-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 1.5rem;
  }

  .writings-grid {
    gap: 1rem;
  }
}
</style>
