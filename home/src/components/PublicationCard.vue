<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: String,
  date: String,
  description: String,
  picture: String,
  url: String,
  slug: String,
  tags: Array
})


const href = computed(() => {
  return props.slug ? `/write-ups/${props.slug}` : props.url;
})
</script>

<template>
  <article class="publication-card">
    <a :href="href" class="publication-link">
      <div class="content">
        <h3 class="title">{{ title }}</h3>
        <p class="description">{{ description }}</p>
        <div v-if="tags && tags.length" class="tech-tags">
          <span v-for="tag in tags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
      <img v-if="picture" :src="picture" :alt="title" class="picture" />
    </a>
  </article>
</template>

<style scoped>
.publication-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.2s ease;
}

.publication-card:hover {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(74, 158, 255, 0.1);
}

.publication-link {
  text-decoration: none;
  color: inherit;
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
}

.content {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 0.75rem 0;
  transition: color 0.2s ease;
}

.publication-card:hover .title {
  color: var(--accent);
}

.description {
  font-size: 1rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.picture {
  max-width: 200px;
  max-height: 100px;
  min-width: 50px;
  border-radius: 6px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
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
  .publication-card {
    padding: 1.25rem;
  }

  .publication-link {
    gap: 1rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .description {
    font-size: 0.9375rem;
  }

  .picture {
    width: 80px;
    height: 80px;
    min-width: 80px;
    border-radius: 4px;
  }
}
</style>
