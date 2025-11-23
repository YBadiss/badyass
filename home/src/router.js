import { createRouter, createWebHistory } from 'vue-router'
import ArticleView from './components/ArticleView.vue'

const routes = [
  { path: '/', redirect: '/projects' },
  { path: '/projects', name: 'projects' },
  { path: '/write-ups', name: 'write-ups' },
  {
    path: '/write-ups/:slug',
    name: 'write-up',
    component: ArticleView
  },
  { path: '/poems', name: 'poems' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
