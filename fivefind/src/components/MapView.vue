<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  bookingUrl,
  escapeHtml,
  formatDate,
  formatDuration,
  formatTime,
  googleMapsUrl,
  type Center
} from '../lefive'
import { byDate, type CenterAvailability } from '../slots'

interface Props {
  centers: Center[]
  selectedIds: number[]
  availability: CenterAvailability[] // searched centres only
  slotCount: number
}

const props = defineProps<Props>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let markers: L.LayerGroup | null = null

const initMap = () => {
  if (!mapContainer.value) return

  // Centred on Paris, where most centres are
  map = L.map(mapContainer.value).setView([48.8566, 2.3522], 10)

  L.tileLayer('https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=PL2jHQqSB8xZ7Bp6aXpF', {
    attribution:
      '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  markers = L.layerGroup().addTo(map)
  updateMarkers()
}

const popupHtml = (center: Center, availability?: CenterAvailability): string => {
  const header = `
    <h3 style="margin: 0 0 4px 0; font-size: 1.1em;">${escapeHtml(center.name)}</h3>
    <a href="${googleMapsUrl(center)}" target="_blank" rel="noopener noreferrer"
       style="display: block; margin-bottom: 8px; color: #666; font-size: 0.85em; font-weight: normal;">
      ${escapeHtml(`${center.street}, ${center.postalCode} ${center.city}`)}
    </a>`

  if (!availability) {
    const hint = props.selectedIds.includes(center.id)
      ? 'Sélectionné : lancez la recherche.'
      : 'Pas dans la recherche.'
    return `<div style="min-width: 220px;">${header}<p style="margin: 0; color: #666;">${hint}</p></div>`
  }

  if (availability.startTimes.length === 0) {
    return `<div style="min-width: 220px;">${header}<p style="margin: 0; color: #dc3545; font-weight: 600;">Complet</p></div>`
  }

  const days = byDate(availability.startTimes)
    .map(([date, startTimes]) => {
      const chips = startTimes
        .map(startTime => {
          const durations = startTime.options.map(o => formatDuration(o.duration)).join(', ')
          return `<a href="${bookingUrl(center.id, startTime.date, startTime.startUtc)}"
            target="_blank" rel="noopener noreferrer" title="${durations}" style="
            display: inline-block;
            text-decoration: none;
            padding: 2px 6px;
            margin: 0 4px 4px 0;
            border-radius: 4px;
            background-color: #d4edda;
            color: #155724;
            font-size: 0.85em;
          ">${formatTime(startTime.time)}</a>`
        })
        .join('')
      return `
        <div style="margin-bottom: 6px;">
          <div style="font-weight: 600; font-size: 0.85em; margin-bottom: 2px;">${formatDate(date)}</div>
          <div>${chips}</div>
        </div>`
    })
    .join('')

  return `
    <div style="min-width: 260px; max-width: 360px;">
      ${header}
      <div style="max-height: 200px; overflow-y: auto; scrollbar-width: thin;">${days}</div>
      <p style="margin: 6px 0 0; color: #666; font-size: 0.8em;">
        Cliquez sur un horaire pour l'ouvrir sur lefive.fr.
      </p>
    </div>`
}

const markerIcon = (state: string, label: string) =>
  L.divIcon({
    className: '',
    html: `<div class="center-marker ${state}">${label}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  })

const updateMarkers = () => {
  if (!map || !markers) return
  markers.clearLayers()

  const searched = new Map(props.availability.map(a => [a.center.id, a]))

  for (const center of props.centers) {
    const availability = searched.get(center.id)
    let state = ''
    let label = ''
    if (availability) {
      state = availability.startTimes.length ? 'available' : 'full'
      label = String(availability.startTimes.length)
    } else if (props.selectedIds.includes(center.id)) {
      state = 'selected'
    }

    L.marker([center.lat, center.lng], {
      icon: markerIcon(state, label),
      title: center.name,
      // Draw searched centres on top of the others
      zIndexOffset: availability ? 1000 : 0
    })
      .bindPopup(popupHtml(center, availability), { maxWidth: 380 })
      .addTo(markers)
  }
}

// Zoom to the searched centres, or to the selection before any search
const fitToCenters = () => {
  if (!map) return
  const focus = props.availability.length
    ? props.availability.map(a => a.center)
    : props.centers.filter(c => props.selectedIds.includes(c.id))
  if (focus.length === 0) return
  map.fitBounds(
    focus.map(c => [c.lat, c.lng] as [number, number]),
    { padding: [50, 50], maxZoom: 13 }
  )
}

onMounted(() => {
  initMap()
  fitToCenters()
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

watch(() => [props.availability, props.selectedIds, props.centers], updateMarkers)
// Only re-zoom when a new search lands, not on every filter change
watch(() => props.availability.map(a => a.center.id).join(','), fitToCenters)
</script>

<template>
  <div>
    <p class="results-count">
      <template v-if="availability.length"
        >{{ slotCount }} créneau{{ slotCount > 1 ? 'x' : '' }} libre{{
          slotCount > 1 ? 's' : ''
        }}</template
      >
      <template v-else>{{ centers.length }} centres LE FIVE</template>
    </p>
    <div ref="mapContainer" class="map-container"></div>
    <div class="legend">
      <span><i class="center-marker available"></i> Créneaux libres</span>
      <span><i class="center-marker full"></i> Complet</span>
      <span><i class="center-marker selected"></i> Sélectionné</span>
      <span><i class="center-marker"></i> Autre centre</span>
    </div>
  </div>
</template>

<style scoped>
.results-count {
  color: var(--color-text-muted);
  font-size: var(--font-base);
  margin-bottom: var(--spacing-md);
  font-weight: 500;
}

.map-container {
  width: 100%;
  /* Fill the screen next to the sidebar */
  height: calc(100vh - 260px);
  min-height: 450px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-lg);
  margin-top: var(--spacing-sm);
  font-size: var(--font-sm);
  color: var(--color-text-muted);
}

.legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.legend .center-marker {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-width: 1px;
  box-shadow: none;
}
</style>
