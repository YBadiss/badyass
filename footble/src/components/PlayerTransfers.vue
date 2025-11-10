<script setup lang="ts">
import { computed, ref } from 'vue'
import html2canvas from 'html2canvas'
import Player from '../models/Player.ts'

interface Props {
  player: Player | null
}

const props = defineProps<Props>()

const pathContainerRef = ref<HTMLElement | null>(null)

const loadImageAsDataURL = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

const copyPathAsImage = async () => {
  if (!pathContainerRef.value) return

  try {
    // Find all image elements and convert to data URLs
    const svgElement = pathContainerRef.value.querySelector('svg')
    if (!svgElement) {
      throw new Error('SVG not found')
    }

    const imageElements = svgElement.querySelectorAll('image')
    const originalHrefs: string[] = []

    // Pre-load all images as data URLs to avoid CORS issues
    for (let i = 0; i < imageElements.length; i++) {
      const imgEl = imageElements[i]
      const href = imgEl.getAttribute('href') || ''
      originalHrefs.push(href)

      try {
        // Try to load as data URL, fallback to original if it fails
        const dataURL = await loadImageAsDataURL(href)
        imgEl.setAttribute('href', dataURL)
      } catch (err) {
        console.warn('Failed to load image as data URL:', href, err)
        // Keep original href
      }
    }

    // Now capture with html2canvas
    const canvas = await html2canvas(pathContainerRef.value, {
      backgroundColor: '#000000',
      scale: 2
    })

    // Restore original hrefs
    imageElements.forEach((imgEl, i) => {
      imgEl.setAttribute('href', originalHrefs[i])
    })

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        return
      }

      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob
          })
        ])
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }, 'image/png')
  } catch (error) {
    console.error('Failed to capture image:', error)
  }
}

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
</script>

<template>
  <div class="path-container">
    <div v-if="clubLogos && clubLogos.length > 0" ref="pathContainerRef" class="svg-wrapper">
      <svg
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        xmlns="http://www.w3.org/2000/svg"
        class="path-svg"
      >
      <!-- White background -->
      <rect :width="svgWidth" :height="svgHeight" fill="#ffffff" rx="8" />

      <!-- Define arrowhead marker -->
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
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

    <button
      v-if="clubLogos && clubLogos.length > 0"
      @click="copyPathAsImage"
      class="copy-image-button"
    >
      Copy To Clipboard
    </button>

    <div v-else class="loading">Loading...</div>
  </div>
</template>

<style scoped>
.path-container {
  width: 100%;
  max-width: 600px;
  padding: 1rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.svg-wrapper {
  width: 100%;
}

.path-svg {
  width: 100%;
  height: auto;
  border-radius: 8px;
}

.copy-image-button {
  padding: 0.5rem 1rem;
  background: #667eea;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: center;
}

.copy-image-button:hover {
  background: #764ba2;
}

.copy-image-button:active {
  transform: scale(0.98);
}
</style>
