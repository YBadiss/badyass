<script setup>
defineProps({
  slug: String,
  title: String,
  description: String,
  date: String,
  tags: Array
})

const formatDate = dateStr => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<template>
  <article class="article-card">
    <router-link :to="`/${slug}`" class="article-link">
      <div class="content">
        <h3 class="title">{{ title }}</h3>
        <p class="description">{{ description }}</p>
        <div class="meta">
          <span class="date">{{ formatDate(date) }}</span>
          <div v-if="tags && tags.length" class="tags">
            <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
          </div>
        </div>
      </div>
    </router-link>
  </article>
</template>

<style scoped>
.article-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.article-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.1);
}

.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  transition: color 0.2s ease;
}

.article-card:hover .title {
  color: var(--accent);
}

.description {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-top: 0.5rem;
}

.date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  font-size: 0.75rem;
  color: var(--accent);
  background: rgba(74, 158, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(74, 158, 255, 0.2);
}

@media (max-width: 640px) {
  .article-card {
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
