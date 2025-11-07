<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  pathSequence: string[] | null
}

const props = defineProps<Props>()

// Simple configuration
const COLUMNS = 3
const LOGO_SIZE = 500
const SPACING = LOGO_SIZE * 0.5
const PADDING = 50

// Get logos from path sequence
const pathLogos = computed(() => {
  return props.pathSequence?.map(key => `/${key}.png`)
})

// Calculate position for a logo in the grid
const getLogoPosition = (index: number) => {
  const row = Math.floor(index / COLUMNS)
  const col = index % COLUMNS

  // Snake pattern: reverse column order on odd rows
  const actualCol = row % 2 === 0 ? col : COLUMNS - 1 - col

  const x = actualCol * (LOGO_SIZE + SPACING) + PADDING
  const y = row * (LOGO_SIZE + SPACING) + PADDING

  return { x, y }
}

// Calculate arrow between two consecutive logos
const getArrowPath = (fromIndex: number, toIndex: number) => {
  const from = getLogoPosition(fromIndex)
  const to = getLogoPosition(toIndex)

  if (to.x > from.x) {
    // right arrow
    return {
      x1: from.x + LOGO_SIZE,
      y1: from.y + LOGO_SIZE / 2,
      x2: to.x,
      y2: to.y + LOGO_SIZE / 2
    }
  } else if (to.x < from.x) {
    // left arrow
    return {
      x1: from.x,
      y1: from.y + LOGO_SIZE / 2,
      x2: to.x + LOGO_SIZE,
      y2: to.y + LOGO_SIZE / 2
    }
  } else if (to.y > from.y) {
    // down arrow
    return {
      x1: from.x + LOGO_SIZE / 2,
      y1: from.y + LOGO_SIZE,
      x2: to.x + LOGO_SIZE / 2,
      y2: to.y
    }
  } else {
    // up arrow
    return {
      x1: from.x + LOGO_SIZE,
      y1: from.y + LOGO_SIZE / 2,
      x2: to.x,
      y2: to.y + LOGO_SIZE / 2
    }
  }
}

// Calculate SVG viewBox dimensions
const svgWidth = computed(() => COLUMNS * (LOGO_SIZE + SPACING) - SPACING + 2 * PADDING)
const svgHeight = computed(() => {
  const numRows = Math.ceil(pathLogos.value?.length ?? 0 / COLUMNS)
  return numRows * (LOGO_SIZE + SPACING) - SPACING + 2 * PADDING
})
</script>

<template>
  <div class="path-container">
    <svg
      v-if="pathSequence && pathLogos && pathLogos.length > 0"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      xmlns="http://www.w3.org/2000/svg"
      class="path-svg"
    >
      <!-- Define arrowhead marker -->
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <polygon points="0 0, 10 5, 0 10" fill="#667eea" />
        </marker>
      </defs>

      <!-- Draw arrows -->
      <g class="arrows">
        <line
          v-for="index in pathLogos.length - 1"
          :key="`arrow-${index}`"
          v-bind="getArrowPath(index - 1, index)"
          stroke="#667eea"
          stroke-width="10"
          marker-end="url(#arrowhead)"
        />
      </g>

      <!-- Draw logos -->
      <g class="logos">
        <image
          v-for="(logo, index) in pathLogos"
          :key="`logo-${index}`"
          :href="logo"
          :x="getLogoPosition(index).x"
          :y="getLogoPosition(index).y"
          :width="LOGO_SIZE"
          :height="LOGO_SIZE"
        />
      </g>
    </svg>

    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.path-container {
  width: 500px;
  padding: 2rem;
  /* center the container */
  margin: 0 auto;
}

.path-svg {
  width: 100%;
  height: auto;
}
</style>
