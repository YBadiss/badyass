// Builds the Chrome Web Store zip of the extension: extension-dist/fivefind-extension-<version>.zip
// The store build drops the http://localhost match, which only exists for local development
// (load extension/ unpacked to use it against the dev server).
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(readFileSync(join(root, 'extension/manifest.json'), 'utf8'))

for (const script of manifest.content_scripts) {
  script.matches = script.matches.filter(match => !match.startsWith('http://localhost'))
}

const staging = mkdtempSync(join(tmpdir(), 'fivefind-extension-'))
cpSync(join(root, 'extension'), staging, {
  recursive: true,
  filter: src => !src.split('/').pop().startsWith('.')
})
writeFileSync(join(staging, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')

const outDir = join(root, 'extension-dist')
mkdirSync(outDir, { recursive: true })
const zipPath = join(outDir, `fivefind-extension-${manifest.version}.zip`)
rmSync(zipPath, { force: true })
execFileSync('zip', ['-qr', '-X', zipPath, '.'], { cwd: staging })
rmSync(staging, { recursive: true, force: true })

console.log(zipPath)
