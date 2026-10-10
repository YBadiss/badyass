// Client for LE FIVE's unofficial public API (no login needed).
// Both endpoints are reached through a same-origin proxy (vite dev server / nginx)
// because the API only sends CORS headers for https://www.lefive.fr.

const API_BASE = `${import.meta.env.BASE_URL}api`

// The API only accepts 10 players (5v5) for football; other values return an error object.
const CAPACITY = 10
const DURATIONS = [60, 90, 120]
const CACHE_TTL_MS = 2 * 60 * 1000

export type Center = {
  id: number
  name: string // "Paris 18"
  street: string
  postalCode: string
  city: string
  region: string // "Île-de-France"
  lat: number
  lng: number
  timeZone: string
}

export type Slot = {
  centerId: number
  startUtc: string // real UTC ISO timestamp
  date: string // YYYY-MM-DD in the centre's time zone
  time: string // HH:MM in the centre's time zone
  duration: number // minutes
  fieldId: number
  fieldName: string
  fieldType: string // Intérieur, Extérieur, Semi-indoor, Panoramique
  price: number // whole booking, online price, EUR
  pricePerPlayer: number
  isFilmed: boolean
}

export type SearchRequest = {
  center: Center
  date: string // YYYY-MM-DD
  fromTime: string // HH:MM, local to the centre
  toTime: string // HH:MM, local to the centre (last start time wanted)
}

// Raw API shapes (only the fields we read)
type RawCenter = {
  id: number
  name: string
  isActive: boolean
  bookingWebAvailable: boolean
  timeZone: string
  latitude: number
  longitude: number
  address: { street?: string; number?: string; postalCode?: string; city?: string }
  regionWeb?: { name: string }
  center_sportTypes: { sportType: { id: number } }[]
}

type RawField = {
  id: number
  name: string
  fieldType?: { name: string }
  webPrice: number
  participationWebPrice: number
  isFilmed: boolean
  canBookOnline: boolean
}

type RawSlot = {
  startingDateZuluTime: string // real UTC (unlike startingDate, which is local time labelled +00:00)
  duration: number
  fields: RawField[]
}

export const bookingUrl = (centerId: number) =>
  `https://www.lefive.fr/reservations/slots?center=${centerId}`

export const googleMapsUrl = (center: Center) =>
  `https://maps.google.com/maps?t=m&ll=${center.lat},${center.lng}&q=${center.lat},${center.lng}`

export async function fetchCenters(): Promise<Center[]> {
  const response = await fetch(`${API_BASE}/centers`)
  if (!response.ok) throw new Error(`Impossible de charger les centres (${response.status})`)
  const { centers } = (await response.json()) as { centers: RawCenter[] }

  return centers
    .filter(c => c.isActive && c.bookingWebAvailable)
    .filter(c => c.center_sportTypes.some(s => s.sportType.id === 1))
    .map(c => ({
      id: c.id,
      name: c.name,
      street: [c.address.number, c.address.street].filter(Boolean).join(' '),
      postalCode: c.address.postalCode ?? '',
      city: c.address.city ?? '',
      region: c.regionWeb?.name ?? 'Autre',
      lat: c.latitude,
      lng: c.longitude,
      timeZone: c.timeZone || 'Europe/Paris'
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

const cache = new Map<string, { at: number; slots: Slot[] }>()

export async function fetchSlots({
  center,
  date,
  fromTime,
  toTime
}: SearchRequest): Promise<Slot[]> {
  const key = `${center.id}|${date}|${fromTime}|${toTime}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.slots

  const start = zonedTimeToUtc(date, fromTime, center.timeZone)
  let end = zonedTimeToUtc(date, toTime, center.timeZone)
  // An end time at or before the start time means "past midnight"
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  // Include the last start time itself
  end = new Date(end.getTime() + 60 * 1000)

  const response = await fetch(`${API_BASE}/slots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startingDateZuluTime: start.toISOString(),
      endingDateZuluTime: end.toISOString(),
      durations: DURATIONS.join(','),
      capacity: CAPACITY,
      center_id: center.id,
      bookingType_id: '1',
      sportType_id: '1',
      isChannelWeb: true,
      computePriceWithDefaultCapaIfNoCapa: true
    })
  })
  if (!response.ok) throw new Error(`${center.name}: erreur ${response.status}`)
  const body = await response.json()
  if (!Array.isArray(body)) {
    throw new Error(`${center.name}: ${body?.message ?? 'réponse inattendue'}`)
  }

  const now = Date.now()
  const slots: Slot[] = []
  for (const raw of body as RawSlot[]) {
    const startUtc = new Date(raw.startingDateZuluTime)
    if (startUtc.getTime() < now) continue
    const local = formatInZone(startUtc, center.timeZone)
    for (const field of raw.fields) {
      if (field.canBookOnline === false) continue
      slots.push({
        centerId: center.id,
        startUtc: startUtc.toISOString(),
        date: local.date,
        time: local.time,
        duration: raw.duration,
        fieldId: field.id,
        fieldName: field.name,
        fieldType: field.fieldType?.name ?? '',
        price: field.webPrice,
        pricePerPlayer: field.participationWebPrice,
        isFilmed: field.isFilmed
      })
    }
  }

  cache.set(key, { at: Date.now(), slots })
  return slots
}

// Run async tasks with a concurrency limit, reporting progress. Failures are collected, not thrown.
export async function runPool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
  onProgress: (done: number) => void
): Promise<{ results: T[]; errors: string[] }> {
  const results: T[] = []
  const errors: string[] = []
  let next = 0
  let done = 0

  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next++]
      try {
        results.push(await task())
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e))
      }
      onProgress(++done)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker))
  return { results, errors }
}

// --- Time zone helpers (centres are in Europe/Paris, except La Réunion) ---

function zoneParts(utc: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(utc)
  const get = (type: string) => parts.find(p => p.type === type)!.value
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second')
  }
}

function zoneOffsetMs(utc: Date, timeZone: string): number {
  const p = zoneParts(utc, timeZone)
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return asUtc - Math.floor(utc.getTime() / 1000) * 1000
}

// Convert a wall-clock date + time in `timeZone` to the matching UTC instant
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, min)
  const offset = zoneOffsetMs(new Date(guess), timeZone)
  const utc = guess - offset
  // Re-check once in case the guess fell on the other side of a DST change
  const offset2 = zoneOffsetMs(new Date(utc), timeZone)
  return new Date(offset2 === offset ? utc : guess - offset2)
}

export function formatInZone(utc: Date, timeZone: string): { date: string; time: string } {
  const p = zoneParts(utc, timeZone)
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` }
}

// --- Display helpers ---

const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
const monthNames = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre'
]

// "2026-10-12" -> "Lundi 12 octobre" (or "Lun 12" when short)
export function formatDate(date: string, short = false): string {
  const [y, m, d] = date.split('-').map(Number)
  const weekday = dayNames[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const day = d === 1 ? '1er' : String(d)
  return short ? `${weekday.slice(0, 3)} ${day}` : `${weekday} ${day} ${monthNames[m - 1]}`
}

// "19:30" -> "19h30"
export const formatTime = (time: string) => time.replace(':', 'h')

// 90 -> "1h30"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

export const formatPrice = (price: number) =>
  `${Number.isInteger(price) ? price : price.toFixed(2).replace('.', ',')}€`

export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  )
}
