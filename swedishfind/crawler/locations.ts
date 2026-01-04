import * as cheerio from 'cheerio'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type GPSCoordinates = {
  lon: number
  lat: number
}

type Location = {
  name: string
  address: string
  gpsCoordinates: GPSCoordinates
}

interface CrawledLocations {
  timestamp: Date
  locations: Location[]
}

function parsePage(html: string): Location {
  // Load HTML with cheerio
  const $ = cheerio.load(html)

  // Parse the location data from the page
  // Name is in the h1 inside .site
  const name = $('.site h1').text().trim()

  // Address is in .address a (the link contains the full address with line breaks)
  const addressElement = $('.site .address a')
  const addressHtml = addressElement.html() || ''
  // Replace <br> tags with spaces and clean up
  const address = addressHtml
    .replace(/<br\s*\/?>/gi, ', ')
    .replace(/<[^>]*>/g, '')
    .trim()

  // GPS coordinates are in the Google Maps link
  const mapsLink = addressElement.attr('href') || ''
  let lat = 0
  let lon = 0

  // Extract coordinates from URL like: https://maps.google.com/maps?t=m&ll=48.90829,2.276152&q=48.90829,2.276152
  const coordMatch = mapsLink.match(/ll=([\d.]+),([\d.]+)/)
  if (coordMatch) {
    lat = parseFloat(coordMatch[1])
    lon = parseFloat(coordMatch[2])
  }

  const location: Location = {
    name,
    address,
    gpsCoordinates: {
      lat,
      lon
    }
  }

  return location
}

function getLocationUrls(html: string): string[] {
  // Load HTML with cheerio
  const $ = cheerio.load(html)

  // Retrieve the list of location page urls from the JavaScript dataset
  // The locations are embedded in a script tag as: const map_dataset_location = [...]
  const urls: string[] = []

  // Find the script tag containing map_dataset_location
  $('script').each((_index, script) => {
    const scriptContent = $(script).html()
    if (scriptContent && scriptContent.includes('map_dataset_location')) {
      // Extract the JSON array from the JavaScript variable
      const match = scriptContent.match(/const map_dataset_location = (\[.*?\]);/)
      if (match && match[1]) {
        try {
          const locations = JSON.parse(match[1])
          // Build URLs from location IDs
          locations.forEach((location: { location_id: number }) => {
            urls.push(`https://www.swedishfit.fr/loc/dt/${location.location_id}`)
          })
        } catch (e) {
          console.error('Error parsing location data:', e)
        }
      }
    }
  })

  return urls
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function crawl() {
  console.warn('Starting locations crawler...')

  const parisLocationsHtml = readFileSync('./crawler/parisLocations.html', 'utf8')
  const urls = getLocationUrls(parisLocationsHtml)

  try {
    const locations = await Promise.all(
      urls.map(async url => {
        console.warn(`Fetching url ${url}`)
        const response = await fetch(url)
        const html = await response.text()
        const location = parsePage(html)
        await sleep(1000)
        return location
      })
    )

    const data: CrawledLocations = {
      timestamp: new Date(),
      locations
    }

    // Save to public directory so Vue app can access it
    const outputPath = join(process.cwd(), 'public', 'locations.json')
    writeFileSync(outputPath, JSON.stringify(data, null, 2))

    console.warn(`Crawl complete. Saved ${locations.length} items to ${outputPath}`)
  } catch (error) {
    console.error('Error during crawl:', error)
    process.exit(1)
  }
}

crawl()
