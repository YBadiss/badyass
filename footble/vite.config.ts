import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/footble/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
