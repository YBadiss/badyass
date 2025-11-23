import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/projects' },
  { path: '/projects', name: 'projects' },
  { path: '/write-ups', name: 'write-ups' },
  { path: '/poems', name: 'poems' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
