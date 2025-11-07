<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ClubPath from './ClubPath.vue'

// Define the path sequence
const pathSequence = ref<string[] | null>(null)

onMounted(async () => {
  try {
    const response = await fetch('/path.json')
    pathSequence.value = await response.json() as string[]
  } catch (error) {
    console.error('Failed to load path sequence:', error)
  }
})

</script>

<template>
  <ClubPath :path-sequence="pathSequence" />
</template>

<style scoped>
/* Styles are now in child components */
</style>
