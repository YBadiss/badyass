import { ViteSSG } from 'vite-ssg'
import './style.css'
import App from './App.vue'
import { routes } from './router'

export const createApp = ViteSSG(App, { routes }, () => {
  // Additional setup can go here
})
