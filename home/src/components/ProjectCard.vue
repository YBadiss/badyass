<script setup>
defineProps({
  title: String,
  description: String,
  url: String,
  tech: Array
})
</script>

<template>
  <article class="project-card">
    <a :href="url" class="project-link" rel="noopener noreferrer">
      <h3 class="title">{{ title }}</h3>
      <p class="description">{{ description }}</p>
      <div v-if="tech && tech.length" class="tech-tags">
        <span v-for="tag in tech" :key="tag" class="tag">{{ tag }}</span>
      </div>
    </a>
  </article>
</template>

<style scoped>
.project-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.project-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.1);
}

.project-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  transition: color 0.2s ease;
}

.project-card:hover .title {
  color: var(--accent);
}

.description {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  font-size: 0.875rem;
  color: var(--accent);
  background: rgba(74, 158, 255, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  border: 1px solid rgba(74, 158, 255, 0.2);
}

@media (max-width: 640px) {
  .project-card {
    padding: 1.25rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .description {
    font-size: 0.9375rem;
  }
}
</style>
