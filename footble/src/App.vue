<script setup lang="ts">
import { ref, computed } from 'vue'
import AppHeader from './components/AppHeader.vue'
import FootbleView from './components/FootbleView.vue'

const footbleViewRef = ref<InstanceType<typeof FootbleView> | null>(null)

const showTutorial = () => {
  footbleViewRef.value?.tutorialPopupRef?.showTutorial()
}

const allPlayers = computed(() => {
  return footbleViewRef.value?.getAllPlayers() || null
})

const allClubs = computed(() => {
  return footbleViewRef.value?.getAllClubs() || null
})

const customClub = computed(() => {
  return footbleViewRef.value?.getCustomClub() || null
})

const clubMapping = computed(() => {
  return (
    allClubs.value?.reduce(
      (acc, club) => {
        acc[club.name] = club.id
        return acc
      },
      {} as Record<string, string>
    ) || null
  )
})

const playerMapping = computed(() => {
  return (
    allPlayers.value?.reduce(
      (acc, player) => {
        acc[player.name] = player.id
        return acc
      },
      {} as Record<string, string>
    ) || null
  )
})
</script>

<template>
  <div id="app">
    <AppHeader
      :club="customClub"
      :club-mapping="clubMapping"
      :player-mapping="playerMapping"
      @show-tutorial="showTutorial"
    >
    </AppHeader>
    <FootbleView ref="footbleViewRef" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #0a0a0a;
  color: #ffffff;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 1rem;
  gap: 0.5rem;
}
</style>
