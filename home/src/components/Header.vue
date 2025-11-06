<script setup>
defineProps({
  name: String,
  tagline: String,
  description: String,
  picture: String
})
</script>

<template>
  <header class="header">
    <h1 class="name">{{ name }}</h1>
    <p class="tagline">{{ tagline }}</p>
    <p class="description" v-html="description.split('\n').join('<br>')"></p>
  </header>
</template>

<style scoped>
.header {
  text-align: center;
  margin-bottom: 3rem;
}

.name {
  font-size: 3rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.tagline {
  font-size: 1.25rem;
  color: var(--accent);
  margin: 0 0 1.5rem 0;
  font-weight: 500;
}

.description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 640px) {
  .name {
    font-size: 2rem;
  }

  .tagline {
    font-size: 1rem;
  }

  .description {
    font-size: 1rem;
  }

  .picture {
    max-width: 100%;
    border-radius: 6px;
  }
}
</style>
