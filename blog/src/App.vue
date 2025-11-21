<script setup>
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 4rem 1rem;
}

@media (max-width: 640px) {
  .app-container {
    padding: 2rem 1rem;
  }
}
</style>
