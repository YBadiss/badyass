<script setup>
import { ref, onMounted } from 'vue'
import Header from './components/Header.vue'
import SocialLinks from './components/SocialLinks.vue'
import ProjectList from './components/ProjectList.vue'
import WritingList from './components/WritingList.vue'

const content = ref(null)

onMounted(async () => {
  try {
    const response = await fetch('/content.json')
    content.value = await response.json()
  } catch (error) {
    console.error('Failed to load content:', error)
  }
})
</script>

<template>
  <div class="app-container">
    <main v-if="content">
      <Header
        :name="content.personal.name"
        :tagline="content.personal.tagline"
        :description="content.personal.description"
      />
      <SocialLinks :social="content.social" />
      <ProjectList :projects="content.projects" />
      <WritingList :writings="content.writings" />
    </main>
    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

main {
  width: 100%;
  max-width: 800px;
}

.loading {
  color: var(--text-secondary);
  text-align: center;
}
</style>
