<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Header from './components/Header.vue'
import SocialLinks from './components/SocialLinks.vue'
import PublicationList from './components/PublicationList.vue'

const route = useRoute()
const router = useRouter()
const content = ref(null)

// Map route names to tab titles
const routeToTab = {
  projects: 'Projects',
  'write-ups': 'Write Ups',
  poems: 'Poems'
}

const tabToRoute = {
  Projects: 'projects',
  'Write Ups': 'write-ups',
  Poems: 'poems'
}

const activeTab = computed(() => routeToTab[route.name] || 'Projects')

// Check if current route has a component (like ArticleView)
const hasRouteComponent = computed(() => {
  return route.matched.some(record => record.components?.default)
})

const navigateToTab = title => {
  const routeName = tabToRoute[title]
  if (routeName) {
    router.push({ name: routeName })
  }
}

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
    <!-- Route with component (e.g., ArticleView) -->
    <router-view v-if="hasRouteComponent" />

    <!-- Main content for tab routes -->
    <main v-else-if="content">
      <Header
        :name="content.personal.name"
        :tagline="content.personal.tagline"
        :description="content.personal.description"
        :picture="content.personal.picture"
      />
      <SocialLinks :social="content.social" />

      <!-- Tabs -->
      <nav class="tabs">
        <button
          v-for="publicationSection in content.publicationSections"
          :key="publicationSection.title"
          class="tab"
          :class="{ active: activeTab === publicationSection.title }"
          @click="navigateToTab(publicationSection.title)"
        >
          {{ publicationSection.title }}
        </button>
      </nav>

      <!-- Publication sections content -->
      <PublicationList
        :publications="
          content.publicationSections.find(
            publicationSection => publicationSection.title === activeTab
          )?.publications || []
        "
        :columns="
          content.publicationSections.find(
            publicationSection => publicationSection.title === activeTab
          )?.columns
        "
      />
    </main>
    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
}

main {
  width: 100%;
  max-width: 800px;
}

.tabs {
  display: flex;
  justify-content: center;
  gap: 3rem;
  margin-bottom: 3rem;
  border-bottom: 1px solid var(--border);
}

.tab {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.25rem;
  font-weight: 500;
  padding: 0.75rem 0;
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
}

.tab:hover {
  color: var(--text-primary);
}

.tab.active {
  color: var(--text-primary);
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--accent);
}

.loading {
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 640px) {
  .tabs {
    gap: 2rem;
  }

  .tab {
    font-size: 1.125rem;
  }
}
</style>
