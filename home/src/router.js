import ArticleView from './components/ArticleView.vue'

// Import all meta.json files to generate routes
const writeUpMetas = import.meta.glob('./content/write-ups/*/meta.json', { eager: true })
const poemMetas = import.meta.glob('./content/poems/*/meta.json', { eager: true })

// Generate dynamic routes from content
const writeUpRoutes = Object.keys(writeUpMetas).map(path => {
  const slug = path.split('/')[3] // ./content/write-ups/{slug}/meta.json
  return {
    path: `/write-ups/${slug}`,
    name: `write-up-${slug}`,
    component: ArticleView,
    meta: { type: 'write-ups', slug }
  }
})

const poemRoutes = Object.keys(poemMetas).map(path => {
  const slug = path.split('/')[3] // ./content/poems/{slug}/meta.json
  return {
    path: `/poems/${slug}`,
    name: `poem-${slug}`,
    component: ArticleView,
    meta: { type: 'poems', slug }
  }
})

export const routes = [
  { path: '/', redirect: '/projects' },
  { path: '/projects', name: 'projects' },
  { path: '/write-ups', name: 'write-ups' },
  ...writeUpRoutes,
  { path: '/poems', name: 'poems' },
  ...poemRoutes
]
