<script setup>
import ProjectCard from './ProjectCard.vue'

defineProps({
  projects: Array
})
</script>

<template>
  <section class="projects-section">
    <h2 class="section-title">Projects</h2>
    <div class="projects-grid">
      <ProjectCard
        v-for="project in projects"
        :key="project.title"
        :title="project.title"
        :description="project.description"
        :url="project.url"
        :tech="project.tech"
      />
    </div>
  </section>
</template>

<style scoped>
.projects-section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 2rem 0;
  text-align: center;
}

.projects-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .projects-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 1.5rem;
  }

  .projects-grid {
    gap: 1rem;
  }
}
</style>
