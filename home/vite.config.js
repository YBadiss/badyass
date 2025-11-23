import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

// Plugin to generate articles index from folder structure
function writeUpsIndexPlugin() {
  const articlesDir = path.resolve(__dirname, 'public/write-ups')

  const generateIndex = () => {
    if (!fs.existsSync(articlesDir)) {
      return
    }

    const articles = []
    const folders = fs.readdirSync(articlesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)

    for (const slug of folders) {
      const metaPath = path.join(articlesDir, slug, 'meta.json')
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        articles.push({ slug, ...meta })
      }
    }

    // Sort by date descending
    articles.sort((a, b) => new Date(b.date) - new Date(a.date))

    const indexPath = path.join(articlesDir, 'index.json')
    fs.writeFileSync(indexPath, JSON.stringify({ articles }, null, 2))
  }

  return {
    name: 'articles-index',
    buildStart() {
      generateIndex()
    },
    configureServer(server) {
      // Regenerate on changes during dev
      server.watcher.on('change', (file) => {
        if (file.includes('/write-ups/') && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      server.watcher.on('add', (file) => {
        if (file.includes('write-ups/') && file.endsWith('meta.json')) {
          generateIndex()
        }
      })
      // Generate on server start
      generateIndex()
    }
  }
}

export default defineConfig({
  plugins: [vue(), writeUpsIndexPlugin()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
