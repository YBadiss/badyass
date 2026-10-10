import type { Center } from './lefive'

export interface SearchParams {
  regions: string[] // whole regions, e.g. "Île-de-France"
  centerIds: number[] // individual centres
  dates: string[] // YYYY-MM-DD
  fromTime: string // HH:MM
  toTime: string // HH:MM
}

// Centres covered by the search: picked one by one, or through their region
export function selectedCenterIds(search: SearchParams, centers: Center[]): number[] {
  return centers
    .filter(c => search.centerIds.includes(c.id) || search.regions.includes(c.region))
    .map(c => c.id)
}

// Lowercase and strip accents so "creteil" matches "Créteil"
export const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
