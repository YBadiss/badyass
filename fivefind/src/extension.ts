// The FiveFind Chrome extension (see extension/) marks the page with its version at document start
export const installedVersion: string | null =
  document.documentElement.dataset.fivefindExtension ?? null

// Chrome Web Store listing (unlisted). Installed copies update themselves from the store.
export const chromeStoreUrl =
  'https://chromewebstore.google.com/detail/ndpgipbibnjbjelbipceehlafmidinae'

// Chromium-based browsers (Chrome, Edge, Brave, Arc…) can install from the Chrome Web Store
export const isChromium = /Chrome\/|Chromium\//.test(navigator.userAgent)
