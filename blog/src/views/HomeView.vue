<script setup>
import { ref, onMounted } from 'vue'
import ArticleList from '../components/ArticleList.vue'

const articles = ref(null)

onMounted(async () => {
  try {
    const response = await fetch('/blog/articles/index.json')
    const data = await response.json()
    articles.value = data.articles
  } catch (error) {
    console.error('Failed to load articles:', error)
  }
})
</script>

<template>
  <div class="home-view">
    <main v-if="articles">
      <header class="blog-header">
        <h1 class="blog-title">Yass' Blog</h1>
        <p class="blog-subtitle">Tech, poems, and thoughts</p>
      </header>

      <ArticleList :articles="articles" />
    </main>
    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.home-view {
  width: 100%;
  max-width: 800px;
}

.blog-header {
  text-align: center;
  margin-bottom: 3rem;
}

.blog-title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.blog-subtitle {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0;
}

.loading {
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 640px) {
  .blog-title {
    font-size: 2rem;
  }

  .blog-subtitle {
    font-size: 1rem;
  }
}
</style>
