import * as cheerio from 'cheerio'
import { writeFileSync } from 'fs'
import { join } from 'path'

type Activity = {
  name: string // Circuit,Dance,Standard,Pilates,Pilates Fusion,Soft,Intensif,Flex,Yoga,...
  icon: string // URL to the activity icon
}

type GymClass = {
  timestamp: Date
  location: string
  activity: Activity
  teacher: string
  status: string // CANCELLED,PASSED,FULL,AVAILABLE
  link: string
}

interface CrawledClasses {
  timestamp: Date
  classes: GymClass[]
}

function getUrl(page: number): string {
  return `https://www.swedishfit.fr/cours/list?cs_rec=1&cs_r=53&cs_d=-3&cs_l=-1&cs_a=-2&browsefirst=${page}`
}

/**
 * Parse time text like "DIM 10:00" or "LUN 18:30" into a Date object
 * This assumes the class is in the current or upcoming week
 */
function parseTimeText(timeText: string): Date {
  // Map French day abbreviations to day numbers (0 = Sunday, 6 = Saturday)
  const dayMap: Record<string, number> = {
    DIM: 0,
    LUN: 1,
    MAR: 2,
    MER: 3,
    JEU: 4,
    VEN: 5,
    SAM: 6
  }

  // Extract day and time (e.g., "DIM 10:00" -> ["DIM", "10:00"])
  const parts = timeText.split(' ')
  if (parts.length < 2) {
    return new Date() // Fallback to current date
  }

  const dayAbbr = parts[0]
  const timePart = parts[1]
  const [hours, minutes] = timePart.split(':').map(Number)

  const targetDay = dayMap[dayAbbr]
  if (targetDay === undefined) {
    return new Date() // Fallback if day not recognized
  }

  // Get current date and calculate the date for the target day
  const now = new Date()
  const currentDay = now.getDay()
  let daysToAdd = targetDay - currentDay

  // If the target day is in the past this week, assume it's next week
  if (daysToAdd < 0) {
    daysToAdd += 7
  }

  const targetDate = new Date(now)
  targetDate.setDate(now.getDate() + daysToAdd)
  targetDate.setHours(hours, minutes, 0, 0)

  return targetDate
}

function parsePage(html: string): GymClass[] {
  // Load HTML with cheerio
  const $ = cheerio.load(html)

  const classes: GymClass[] = []
  /**
   * Example of the gym class table
   * <div class="SF202403_Schedule">
   *  <div class="row dim"><div class="time"><a href="https://www.swedishfit.fr/cours/detail/726602" title="En détail" class="detail">DIM 10:00</a></div><div class="place"><span>Paris  9 Bergère</span></div><div class="activity"><img width="22" height="22" src="https://design.swedishfit.com/ae9c6474c3d9faf93d7365e6c20ab2b6af153446/user/classlevel/icon_20_soft.svg" alt="Soft" title="Soft"/>Soft - 50'</div><div class="teacher">Elsa O</div><div class="rates"><span>inclus avec TOPP</span><span>+2<sup>&euro;</sup> avec EKO</span><small>12<sup>&euro;</sup> la session</small></div><div class="action"><small class="past">COURS PASS&Eacute;</small></div></div>
   *  <div class="row dim"><div class="time"><a href="https://www.swedishfit.fr/cours/detail/738044" title="En détail" class="detail">DIM 10:00</a></div><div class="place"><span>Paris 10 Chaudron</span> <small>Stora</small></div><div class="activity"><img width="22" height="22" src="https://design.swedishfit.com/ae9c6474c3d9faf93d7365e6c20ab2b6af153446/user/classlevel/icon_30_standard.svg" alt="Standard" title="Standard"/>Standard - 50'</div><div class="teacher">Benjamin Z</div><div class="rates"><span>inclus avec TOPP</span><span>+2<sup>&euro;</sup> avec EKO</span><small>12<sup>&euro;</sup> la session</small></div><div class="action"><small class="past">COURS PASS&Eacute;</small></div></div>
   * </div>
   */

  // Parse each gym class row
  $('.SF202403_Schedule .row').each((_index, element) => {
    const $row = $(element)

    // Extract the link of the class
    const link = $row.find('.time a').attr('href')!.trim()

    // Extract time from the <a> tag inside .time
    const timeText = $row.find('.time a.detail').text().trim()

    // Extract location from .place span
    const location = $row.find('.place span').first().text().trim()

    // Extract activity info
    const activityName = $row.find('.activity img').attr('alt') || ''
    const activityIcon = $row.find('.activity img').attr('src') || ''

    // Extract teacher name
    const teacher = $row.find('.teacher').text().trim()

    // Determine status from .action
    let status = 'AVAILABLE'
    const actionText = $row.find('.action').text().trim()
    if (actionText.includes('PASSÉ')) {
      status = 'PASSED'
    } else if (actionText.includes('COMPLET')) {
      status = 'FULL'
    } else if (actionText.includes('ANNULÉ')) {
      status = 'CANCELLED'
    }

    // Parse timestamp from time text (e.g., "DIM 10:00")
    // This will need proper date parsing logic based on the current week
    const timestamp = parseTimeText(timeText)

    classes.push({
      timestamp,
      location,
      activity: {
        name: activityName,
        icon: activityIcon
      },
      teacher,
      status,
      link
    })
  })

  return classes
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function crawl() {
  console.warn('Starting classes crawler...')

  try {
    const classes = []
    let pageNumber = 1

    while (true) {
      console.warn(`Fetching page ${pageNumber}`)
      const url = getUrl(pageNumber)
      const response = await fetch(url)
      const html = await response.text()
      const pageClasses = parsePage(html)
      console.warn(`Found ${pageClasses.length} classes in page ${pageNumber}`)
      classes.push(...pageClasses)
      if (pageClasses.length < 15) {
        break
      }
      pageNumber += 1
      await sleep(1000)
    }

    const data: CrawledClasses = {
      timestamp: new Date(),
      classes
    }

    // Save to public directory so Vue app can access it
    const outputPath = join(process.cwd(), 'public', 'classes.json')
    writeFileSync(outputPath, JSON.stringify(data, null, 2))

    console.warn(`Crawl complete. Saved ${classes.length} items to ${outputPath}`)
  } catch (error) {
    console.error('Error during crawl:', error)
    process.exit(1)
  }
}

crawl()
