<script setup>
defineProps({
  social: Object
})
</script>

<template>
  <nav class="social-links">
    <a
      v-if="social.resume"
      :href="social.resume"
      target="_blank"
      rel="noopener noreferrer"
      class="link"
    >
      Resume
    </a>
    <a
      v-if="social.github"
      :href="social.github"
      target="_blank"
      rel="noopener noreferrer"
      class="link"
    >
      GitHub
    </a>
    <a
      v-if="social.linkedin"
      :href="social.linkedin"
      target="_blank"
      rel="noopener noreferrer"
      class="link"
    >
      LinkedIn
    </a>
  </nav>
</template>

<style scoped>
.social-links {
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 4rem;
  flex-wrap: wrap;
}

.link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.link:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

@media (max-width: 640px) {
  .social-links {
    gap: 1.5rem;
  }
}
</style>
