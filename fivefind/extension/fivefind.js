// Runs on FiveFind pages at document start: tells the page the extension is installed, and which version.
const markInstalled = () => {
  document.documentElement.dataset.fivefindExtension = chrome.runtime.getManifest().version
}
if (document.documentElement) markInstalled()
else document.addEventListener('readystatechange', markInstalled, { once: true })
