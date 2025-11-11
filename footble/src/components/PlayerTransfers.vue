<script setup lang="ts">
import { computed, ref } from 'vue'
import Player from '../models/Player.ts'
import { copySvgAsImage } from '../svg-utils.ts'

interface Props {
  player: Player | null
  mainUrl: string
}

const props = defineProps<Props>()

const pathContainerRef = ref<HTMLElement | null>(null)
const copyButtonText = ref('Copy')

const handleCopy = async () => {
  try {
    await copySvgAsImage(pathContainerRef.value)
    copyButtonText.value = 'Copied!'
    setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
  } catch (err) {
    console.error('Failed to copy:', err)
    copyButtonText.value = 'Failed'
    setTimeout(() => {
      copyButtonText.value = 'Copy'
    }, 2000)
  }
}

defineExpose({ pathContainerRef })

// Simple configuration
const COLUMNS = 3
const LOGO_SIZE = 200
const SPACING = LOGO_SIZE / 3
const PADDING = LOGO_SIZE / 6

// Get logos from player clubs
const clubLogos = computed(() => {
  return props.player?.clubs?.map(club => club.logoUrl)
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
  const numRows = Math.ceil((clubLogos.value?.length ?? 0) / COLUMNS)
  const height = numRows * (LOGO_SIZE + SPACING) - SPACING + 2 * PADDING
  return height
})

// Calculate watermark positions between rows
const getWatermarkPositions = () => {
  if (!clubLogos.value || clubLogos.value.length <= COLUMNS) return []

  const numRows = Math.ceil(clubLogos.value.length / COLUMNS)
  const positions = []

  // Add watermark between each row (not after the last row)
  for (let row = 0; row < numRows - 1; row++) {
    const y = PADDING + (row + 1) * (LOGO_SIZE + SPACING) - SPACING / 2
    positions.push({
      x: svgWidth.value / 2,
      y: y
    })
  }

  return positions.slice(Math.floor(positions.length / 2), Math.floor(positions.length / 2) + 1)
}
</script>

<template>
  <div class="path-container">
    <div v-if="clubLogos && clubLogos.length > 0" class="svg-container">
      <button class="copy-button" @click="handleCopy">{{ copyButtonText }}</button>
      <div ref="pathContainerRef" class="svg-wrapper">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          xmlns="http://www.w3.org/2000/svg"
          class="path-svg"
        >
          <!-- White background -->
          <rect :width="svgWidth" :height="svgHeight" fill="#ffffff" rx="8" />

          <!-- Define arrowhead marker -->
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <polygon points="0 0, 10 5, 0 10" fill="#667eea" />
            </marker>
          </defs>

          <!-- Draw arrows -->
          <g class="arrows">
            <line
              v-for="index in clubLogos.length - 1"
              :key="`arrow-${index}`"
              v-bind="getArrowPath(index - 1, index)"
              stroke="#667eea"
              stroke-width="3"
              marker-end="url(#arrowhead)"
            />
          </g>

          <!-- Draw watermarks between rows -->
          <g class="watermarks">
            <text
              v-for="(position, index) in getWatermarkPositions()"
              :key="`watermark-${index}`"
              :x="position.x"
              :y="position.y"
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#999999"
              opacity="0.4"
              font-size="24"
              font-family="Arial, sans-serif"
            >
              {{ mainUrl }}
            </text>
          </g>

          <!-- Draw logos -->
          <g class="logos">
            <image
              v-for="(logo, index) in clubLogos"
              :key="`logo-${index}`"
              :href="logo"
              :x="getLogoPosition(index).x"
              :y="getLogoPosition(index).y"
              :width="LOGO_SIZE"
              :height="LOGO_SIZE"
            />
          </g>
        </svg>
      </div>
    </div>

    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.path-container {
  width: 100%;
  max-width: 600px;
  padding: 0;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.svg-container {
  position: relative;
  width: 100%;
}

.copy-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.copy-button:hover {
  background: #764ba2;
  transform: scale(1.05);
}

.copy-button:active {
  transform: scale(0.95);
}

.svg-wrapper {
  width: 100%;
}

.path-svg {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
</style>
