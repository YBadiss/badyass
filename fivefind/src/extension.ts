import manifest from '../extension/manifest.json'

// The FiveFind Chrome extension (see extension/) marks the page with its version at document start
export const installedVersion: string | null =
  document.documentElement.dataset.fivefindExtension ?? null

export const bundledVersion: string = manifest.version

// Published by .github/workflows/release-fivefind-extension.yml for each manifest version
export const extensionDownloadUrl = `https://github.com/YBadiss/badyass/releases/download/fivefind-extension-v${bundledVersion}/fivefind-extension-${bundledVersion}.zip`

const parseVersion = (version: string) => version.split('.').map(Number)

export function isOutdated(installed: string, bundled: string): boolean {
  const a = parseVersion(installed)
  const b = parseVersion(bundled)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) < (b[i] ?? 0)
  }
  return false
}

// Chromium-based browsers (Chrome, Edge, Brave, Arc…) can load the unpacked extension
export const isChromium = /Chrome\/|Chromium\//.test(navigator.userAgent)
