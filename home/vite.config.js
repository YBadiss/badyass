import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Plugin to generate articles index from folder structure
function indexPlugin(sectionSlug, sectionTitle) {
  const contentDir = path.resolve(__dirname, `src/content/${sectionSlug}`)

  const generateIndex = () => {
    if (!fs.existsSync(contentDir)) {
      return
    }

    // Read the content and empty the section publications
    const contentPath = path.resolve(__dirname, 'public/content.json')
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))
    const section = content.publicationSections.find((s) => s.title === sectionTitle)
    section.publications = []

    // Find all the publications
    const folders = fs.readdirSync(contentDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    for (const slug of folders) {
      const metaPath = path.join(contentDir, slug, 'meta.json')
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        // Transform relative picture path to absolute URL
        if (meta.picture && meta.picture.startsWith('./')) {
          // Path is relative to content folder, just replace ./ with /content/
          meta.picture = `/content/${meta.picture.slice(2)}`
        }
        section.publications.push({ slug: `/${sectionSlug}/${slug}`, ...meta })
      }
    }

    // Sort by date descending
    section.publications.sort((a, b) => new Date(b.date) - new Date(a.date))

    // Write the modified content back
    fs.writeFileSync(contentPath, JSON.stringify(content, null, 2))
  }

  return {
    name: `${sectionSlug}-index`,
    buildStart() {
      generateIndex()
    },
    configureServer(server) {
      // Regenerate on changes during dev
      server.watcher.on('change', (file) => {
        if (file.includes(`/content/${sectionSlug}/`) && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      server.watcher.on('add', (file) => {
        if (file.includes(`/content/${sectionSlug}/`) && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      // Generate on server start
      generateIndex()
    }
  }
}

// Plugin to copy content assets (images, etc.) to public
function copyContentAssets() {
  const srcDir = path.resolve(__dirname, 'src/content')
  const destDir = path.resolve(__dirname, 'public/content')

  const copyAssets = () => {
    if (!fs.existsSync(srcDir)) return

    // Create destination directory
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true })
    }

    // Copy all non-md and non-json files
    const copyDir = (src, dest) => {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true })
      }

      const entries = fs.readdirSync(src, { withFileTypes: true })
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name)
        const destPath = path.join(dest, entry.name)

        if (entry.isDirectory()) {
          copyDir(srcPath, destPath)
        } else if (!entry.name.endsWith('.md') && !entry.name.endsWith('.json')) {
          fs.copyFileSync(srcPath, destPath)
        }
      }
    }

    copyDir(srcDir, destDir)
  }

  return {
    name: 'copy-content-assets',
    buildStart() {
      copyAssets()
    },
    configureServer() {
      copyAssets()
    }
  }
}

export default defineConfig({
  plugins: [
    vue(),
    indexPlugin('write-ups', 'Write Ups'),
    indexPlugin('poems', 'Poems'),
    copyContentAssets()
  ],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify'
  }
})
