// Runs on www.lefive.fr, in the page's own context so it can reach the Nuxt app (window.$nuxt).
//
// FiveFind links look like:
//   https://www.lefive.fr/reservations/slots?center=69&date=12-10-2026#fivefind?center=69&start=2026-10-12T17:00:00.000Z
// lefive.fr already opens the right centre and day from `center` and `date`. This script reads the
// `#fivefind` part and narrows the slot list to that exact start time, so the slot is right there.
// The target is kept in sessionStorage because the login redirect loses the URL hash.
;(() => {
  const KEY = 'fivefind-target'
  const TTL_MS = 30 * 60 * 1000
  const SLOTS_PATH = '/reservations/slots'

  const readTarget = () => {
    try {
      const target = JSON.parse(sessionStorage.getItem(KEY))
      return target && Date.now() - target.savedAt < TTL_MS ? target : null
    } catch {
      return null
    }
  }
  const saveTarget = target => sessionStorage.setItem(KEY, JSON.stringify(target))
  const clearTarget = () => sessionStorage.removeItem(KEY)

  // 1. Capture the target from the URL hash, then drop the hash
  const hash = location.hash.match(/^#fivefind\?(.*)$/)
  if (hash) {
    const params = new URLSearchParams(hash[1])
    const center = Number(params.get('center'))
    const start = new Date(params.get('start'))
    if (center && !isNaN(start)) {
      saveTarget({ center, start: start.toISOString(), savedAt: Date.now(), reloaded: false })
    }
    history.replaceState(history.state, '', location.pathname + location.search)
  }

  const paris = start => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('fr-FR', {
        timeZone: 'Europe/Paris',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      })
        .formatToParts(new Date(start))
        .map(p => [p.type, p.value])
    )
    // Paris midnight of that day, from the start time's wall-clock hour and minute
    const minutesSinceMidnight = Number(parts.hour) * 60 + Number(parts.minute)
    const dayStart = new Date(new Date(start).getTime() - minutesSinceMidnight * 60 * 1000)
    return {
      queryDate: `${parts.day}-${parts.month}-${parts.year}`, // lefive.fr's ?date= format
      wholeDay: {
        startingDate: dayStart.toISOString(),
        endingDate: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000).toISOString()
      },
      label: `${parts.weekday} ${Number(parts.day)}/${parts.month} à ${parts.hour}h${parts.minute}`
    }
  }

  // The Nuxt page component of the slots page, once it's mounted and done loading
  const slotsPage = () => {
    const nuxt = window.$nuxt
    const route = nuxt && nuxt.$route
    if (!route || route.path !== SLOTS_PATH) return null
    const page = route.matched[0] && route.matched[0].instances.default
    return page && typeof page.getSlotsMobile === 'function' && page.initialized ? page : null
  }

  const showBanner = (text, action) => {
    document.getElementById('fivefind-banner')?.remove()
    const banner = document.createElement('div')
    banner.id = 'fivefind-banner'
    banner.style.cssText =
      'position:fixed;z-index:99999;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:12px;align-items:center;' +
      'padding:10px 14px;border-radius:8px;background:#646cff;color:#fff;font:600 14px system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.25);max-width:calc(100vw - 32px)'
    banner.append(text)
    for (const [label, onClick] of [action, ['×', () => banner.remove()]].filter(Boolean)) {
      const button = document.createElement('button')
      button.textContent = label
      button.style.cssText =
        'border:1px solid rgba(255,255,255,.6);background:none;color:#fff;border-radius:4px;padding:2px 8px;cursor:pointer;font:inherit'
      button.onclick = onClick
      banner.append(button)
    }
    document.body.append(banner)
  }

  const apply = async (page, target) => {
    const store = window.$nuxt.$store
    const { queryDate, wholeDay, label } = paris(target.start)

    // Wrong centre or day (e.g. the login flow dropped the query): reload the slots page once with it
    const route = window.$nuxt.$route
    if (String(route.query.center) !== String(target.center) || route.query.date !== queryDate) {
      if (target.reloaded) return clearTarget()
      saveTarget({ ...target, reloaded: true })
      location.replace(`${SLOTS_PATH}?center=${target.center}&date=${queryDate}`)
      return
    }
    clearTarget()

    // Only show slots starting at the target time (the window end is exclusive of the next slot)
    const start = new Date(target.start)
    await store.dispatch('sessionStorage/setTimeRange', {
      startingDate: start.toISOString(),
      endingDate: new Date(start.getTime() + 60 * 1000).toISOString()
    })
    await page.getSlotsMobile()

    showBanner(`FiveFind : créneau du ${label}`, [
      'Voir toute la journée',
      async () => {
        document.getElementById('fivefind-banner')?.remove()
        await store.dispatch('sessionStorage/setTimeRange', wholeDay)
        await page.getSlotsMobile()
      }
    ])
  }

  // 2. Wait until we're on the slots page (possibly after logging in, via client-side navigation)
  let busy = false
  const timer = setInterval(async () => {
    const target = readTarget()
    if (!target) return clearInterval(timer)
    const page = slotsPage()
    if (!page || busy || page.isLoading) return
    busy = true
    // Let the page's own date/time widgets finish setting their defaults first
    await new Promise(resolve => setTimeout(resolve, 800))
    try {
      await apply(page, target)
    } catch (e) {
      console.error('[FiveFind]', e)
      clearTarget()
    }
    busy = false
  }, 500)
})()
