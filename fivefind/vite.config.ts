import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// LE FIVE's API only allows CORS from www.lefive.fr, so the app calls it through a proxy
// that rewrites the Origin header. In production this is done by nginx (config/nginx-config).
const lefiveHeaders = { Origin: 'https://www.lefive.fr', 'User-Agent': 'Mozilla/5.0' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/projects/fivefind/',
  server: {
    proxy: {
      '/projects/fivefind/api/centers': {
        target: 'https://www.lefive.fr',
        changeOrigin: true,
        headers: lefiveHeaders,
        rewrite: () => '/content/centers.json'
      },
      '/projects/fivefind/api/slots': {
        target: 'https://api2-front.lefive.fr',
        changeOrigin: true,
        headers: lefiveHeaders,
        rewrite: () => '/bookingrules/allFields?appId=1&isChannelWeb=true'
      }
    }
  }
})
