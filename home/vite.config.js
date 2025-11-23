import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Plugin to generate articles index from folder structure
function indexPlugin(sectionSlug, sectionTitle) {
  const writeUpsDir = path.resolve(__dirname, `public/${sectionSlug}`)

  const generateIndex = () => {
    if (!fs.existsSync(writeUpsDir)) {
      return
    }

    // Read the content and empty the write up publications
    const contentPath = path.resolve(__dirname, 'public/content.json')
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))
    const writeUpsSection = content.publicationSections.find((section) => section.title === sectionTitle)
    writeUpsSection.publications = []

    // Find all the publications
    const folders = fs.readdirSync(writeUpsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    for (const slug of folders) {
      const metaPath = path.join(writeUpsDir, slug, 'meta.json')
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        writeUpsSection.publications.push({ slug: `/${sectionSlug}/${slug}`, ...meta })
      }
    }

    // Sort by date descending
    writeUpsSection.publications.sort((a, b) => new Date(b.date) - new Date(a.date))
    
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
        if (file.includes(`/${sectionSlug}/`) && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      server.watcher.on('add', (file) => {
        if (file.includes(`/${sectionSlug}/`) && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      // Generate on server start
      generateIndex()
    }
  }
}

export default defineConfig({
  plugins: [vue(), indexPlugin('write-ups', 'Write Ups'), indexPlugin('projects', 'Projects')],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
