<script setup lang="ts">
import { ref } from 'vue'
import ClubPath from './ClubPath.vue'

interface Logo {
  name: string
  src: string
  alt: string
}

const logoDatabase: Record<string, Logo> = {
  psg: {
    name: 'PSG',
    src: '/psg.png',
    alt: 'Paris Saint-Germain'
  },
  arsenal: {
    name: 'Arsenal',
    src: '/arsenal.png',
    alt: 'Arsenal FC'
  },
  real_madrid: {
    name: 'Real Madrid',
    src: '/real_madrid.png',
    alt: 'Real Madrid CF'
  }
}

// Define the path sequence
const pathSequence = ref<string[]>([
  'psg',
  'arsenal',
  'real_madrid',
  'psg',
  'real_madrid',
  'psg',
  'arsenal'
])
</script>

<template>
  <ClubPath :logo-database="logoDatabase" :path-sequence="pathSequence" />
</template>

<style scoped>
/* Styles are now in child components */
</style>
