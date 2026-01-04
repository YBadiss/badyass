<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

type Activity = {
  name: string
  icon: string
}

type GymClass = {
  timestamp: string
  location: string
  activity: Activity
  teacher: string
  status: string
  link: string
}

type GPSCoordinates = {
  lon: number
  lat: number
}

type Location = {
  name: string
  address: string
  gpsCoordinates: GPSCoordinates
}

interface Props {
  classes: GymClass[]
  locationMap: Map<string, Location>
}

const props = defineProps<Props>()

const mapContainer = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null

const groupedByLocation = computed(() => {
  const groups = new Map<string, GymClass[]>()

  props.classes.forEach(gymClass => {
    const location = gymClass.location
    if (!groups.has(location)) {
      groups.set(location, [])
    }
    groups.get(location)!.push(gymClass)
  })

  return groups
})

const initMap = () => {
  if (!mapContainer.value) return

  // Fix default icon paths for bundlers (Vite/Webpack/etc.)
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl,
    iconUrl,
    shadowUrl,
  });

  // Create map centered on Paris
  map = L.map(mapContainer.value).setView([48.8566, 2.3522], 12)

  // Add OpenStreetMap tiles
  L.tileLayer('https://api.maptiler.com/maps/streets-v4/{z}/{x}/{y}.png?key=PL2jHQqSB8xZ7Bp6aXpF', {
    attribution:
      '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map)

  updateMarkers()
}

const formatClassTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
  const dayName = dayNames[date.getDay()]
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${dayName} ${day}, ${hours}h${minutes}`
}

const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'AVAILABLE':
      return '#d4edda'
    case 'FULL':
      return '#fff3cd'
    case 'PASSED':
      return '#e2e3e5'
    case 'CANCELLED':
      return '#f8d7da'
    default:
      return '#f9f9f9'
  }
}

const updateMarkers = () => {
  if (!map) return

  // Clear existing markers
  map.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      map!.removeLayer(layer)
    }
  })

  // Add markers for each location with classes
  groupedByLocation.value.forEach((locationClasses, locationName) => {
    const location = props.locationMap.get(locationName)
    if (!location || !location.gpsCoordinates) return

    const { lat, lon } = location.gpsCoordinates
    const marker = L.marker([lat, lon]).addTo(map!)

    // Create popup content with class list
    const classListHtml = locationClasses
      .map(
        gymClass => `
        <a href="${gymClass.link}" target="_blank" rel="noopener noreferrer" style="
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          margin-bottom: 6px;
          border-left: 3px solid ${getStatusColor(gymClass.status)};
          background-color: #f9f9f9;
          font-size: 0.85em;
          line-height: 1.2;
          text-decoration: none;
          color: inherit;
          transition: background-color 0.2s;
        " onmouseover="this.style.backgroundColor='#e9e9e9'" onmouseout="this.style.backgroundColor='#f9f9f9'">
          <span style="font-weight: 600; min-width: 100px;">
            ${gymClass.activity.name}
          </span>
          <span style="color: #666; min-width: 80px;">
            ${formatClassTime(gymClass.timestamp)}
          </span>
          <span style="color: #666;">
            ${gymClass.teacher}
          </span>
        </a>
      `
      )
      .join('')

    const popupContent = `
      <div style="min-width: 300px; max-width: 450px;">
        <h3 style="margin: 0 0 8px 0; font-size: 1.1em; padding-bottom: 6px; border-bottom: 2px solid #ddd;">
          ${locationName}
        </h3>
        <p style="margin: 0 0 8px 0; color: #666; font-size: 0.9em;">
          ${locationClasses.length} cours
        </p>
        <div style="
          max-height: 105px;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #888 #f1f1f1;
        ">
          ${classListHtml}
        </div>
      </div>
    `

    marker.bindPopup(popupContent, {
      maxWidth: 400,
      maxHeight: 450
    })
  })

  // Fit bounds to show all markers
  const bounds: L.LatLngBoundsExpression = []
  groupedByLocation.value.forEach((_, locationName) => {
    const location = props.locationMap.get(locationName)
    if (location && location.gpsCoordinates) {
      bounds.push([location.gpsCoordinates.lat, location.gpsCoordinates.lon])
    }
  })

  if (bounds.length > 0) {
    map.fitBounds(bounds, { padding: [50, 50] })
  }
}

onMounted(() => {
  initMap()
})

watch(() => props.classes, updateMarkers, { deep: true })
</script>

<template>
  <div>
    <p class="results-count">{{ classes.length }} cours trouvés</p>
    <div ref="mapContainer" class="map-container"></div>
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
  height: 600px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}
</style>
