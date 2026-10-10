import type { Center, Slot } from './lefive'

// One duration offered at a given start time, with every free pitch for it
export type DurationOption = {
  duration: number
  fields: Slot[]
  minPricePerPlayer: number
  maxPricePerPlayer: number
}

// One start time at a centre (e.g. Monday 19:00), with the durations still free
export type StartTime = {
  startUtc: string
  date: string
  time: string
  options: DurationOption[]
}

export type CenterAvailability = {
  center: Center
  startTimes: StartTime[]
}

// Group flat slots into centre -> start time -> duration -> pitches.
// Every centre passed in is returned, even with no free slot, so "complet" can be shown.
export function groupSlots(slots: Slot[], centers: Center[]): CenterAvailability[] {
  const byCenter = new Map<number, Map<string, Map<number, Slot[]>>>()
  for (const slot of slots) {
    if (!byCenter.has(slot.centerId)) byCenter.set(slot.centerId, new Map())
    const byStart = byCenter.get(slot.centerId)!
    if (!byStart.has(slot.startUtc)) byStart.set(slot.startUtc, new Map())
    const byDuration = byStart.get(slot.startUtc)!
    if (!byDuration.has(slot.duration)) byDuration.set(slot.duration, [])
    byDuration.get(slot.duration)!.push(slot)
  }

  return centers.map(center => {
    const byStart = byCenter.get(center.id) ?? new Map<string, Map<number, Slot[]>>()
    const startTimes: StartTime[] = [...byStart.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([startUtc, byDuration]) => {
        const options = [...byDuration.entries()]
          .sort(([a], [b]) => a - b)
          .map(([duration, fields]) => {
            const prices = fields.map(f => f.pricePerPlayer)
            return {
              duration,
              fields: [...fields].sort((a, b) => a.pricePerPlayer - b.pricePerPlayer),
              minPricePerPlayer: Math.min(...prices),
              maxPricePerPlayer: Math.max(...prices)
            }
          })
        return {
          startUtc,
          date: options[0].fields[0].date,
          time: options[0].fields[0].time,
          options
        }
      })
    return { center, startTimes }
  })
}

// Group start times by local date, keeping order
export function byDate(startTimes: StartTime[]): [string, StartTime[]][] {
  const groups = new Map<string, StartTime[]>()
  for (const startTime of startTimes) {
    if (!groups.has(startTime.date)) groups.set(startTime.date, [])
    groups.get(startTime.date)!.push(startTime)
  }
  return [...groups.entries()]
}
