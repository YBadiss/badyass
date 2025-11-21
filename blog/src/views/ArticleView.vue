<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js/lib/core'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import 'highlight.js/styles/github-dark.css'

// Register languages
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('shell', bash)
hljs.registerLanguage('python', python)
hljs.registerLanguage('rust', rust)

// Configure marked with highlight.js
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return code
    }
  })
)

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true
})

const route = useRoute()
const router = useRouter()
const article = ref(null)
const content = ref('')
const loading = ref(true)
const lightboxImage = ref(null)
const currentSlug = ref('')

// Handle clicks in article content
const handleContentClick = event => {
  // Handle image clicks for lightbox
  if (event.target.tagName === 'IMG') {
    const img = event.target
    // Only open lightbox if image is displayed smaller than its natural size
    if (img.naturalWidth > img.clientWidth || img.naturalHeight > img.clientHeight) {
      lightboxImage.value = img.src
    }
  }

  // Handle anchor link clicks for smooth scrolling
  const anchor = event.target.closest('.anchor-heading a')
  if (anchor) {
    event.preventDefault()
    const href = anchor.getAttribute('href')
    const id = href.slice(1)
    const element = document.getElementById(id)
    if (element) {
      // Update URL without triggering navigation
      history.pushState(null, '', href)
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
}

const closeLightbox = () => {
  lightboxImage.value = null
}

// Close lightbox on escape key
const handleKeydown = event => {
  if (event.key === 'Escape' && lightboxImage.value) {
    closeLightbox()
  }
}

// Close lightbox on scroll
const handleScroll = () => {
  if (lightboxImage.value) {
    closeLightbox()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', handleScroll)
})

// Generate slug from heading text
const slugify = text => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const renderedContent = computed(() => {
  if (!content.value || !currentSlug.value) return ''

  // Create renderer with current slug for image paths and heading anchors
  const renderer = new marked.Renderer()

  renderer.image = ({ href, title, text }) => {
    // Transform relative paths like ./images/... to /blog/articles/{slug}/images/...
    let src = href
    if (href.startsWith('./')) {
      src = `/blog/articles/${currentSlug.value}/${href.slice(2)}`
    }

    const caption = title ? `<span class="caption">${title}</span>` : ''
    return `<img src="${src}" alt="${text}">${caption}`
  }

  // Add anchors to headings
  renderer.heading = ({ text, depth }) => {
    const id = slugify(text)
    return `<h${depth} id="${id}" class="anchor-heading"><a href="#${id}">${text}<span class="anchor-hash">#</span></a></h${depth}>`
  }

  return marked(content.value, { renderer })
})

// Check images after content renders and scroll to anchor if present
watch(renderedContent, async () => {
  await nextTick()

  // Check images for zoom capability
  const images = document.querySelectorAll('.article-content img')
  images.forEach(img => {
    const checkSize = () => {
      if (img.naturalWidth <= img.clientWidth && img.naturalHeight <= img.clientHeight) {
        img.classList.add('no-zoom')
      } else {
        img.classList.remove('no-zoom')
      }
    }
    if (img.complete) {
      checkSize()
    } else {
      img.addEventListener('load', checkSize)
    }
  })

  // Scroll to anchor if present in URL (with delay to override browser default)
  if (window.location.hash) {
    setTimeout(() => {
      const id = window.location.hash.slice(1)
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }
})

const formatDate = dateStr => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

onMounted(async () => {
  const slug = route.params.slug
  currentSlug.value = slug

  try {
    // Load article metadata from meta.json
    const metaResponse = await fetch(`/blog/articles/${slug}/meta.json`)
    if (!metaResponse.ok) {
      router.replace('/')
      return
    }
    article.value = await metaResponse.json()

    // Load article markdown content
    const contentResponse = await fetch(`/blog/articles/${slug}/article.md`)
    if (!contentResponse.ok) {
      router.replace('/')
      return
    }
    content.value = await contentResponse.text()
  } catch (err) {
    console.error('Failed to load article:', err)
    router.replace('/')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="article-view">
    <div v-if="loading" class="loading">Loading...</div>

    <article v-else-if="article" class="article">
      <header class="article-header">
        <router-link to="/" class="back-link">Back to articles</router-link>
        <h1 class="article-title">{{ article.title }}</h1>
        <div class="article-meta">
          <span class="article-date">{{ formatDate(article.date) }}</span>
          <div v-if="article.tags && article.tags.length" class="article-tags">
            <span v-for="tag in article.tags" :key="tag" class="article-tag">{{ tag }}</span>
          </div>
        </div>
      </header>

      <div class="article-content" v-html="renderedContent" @click="handleContentClick"></div>
    </article>

    <!-- Lightbox modal -->
    <div v-if="lightboxImage" class="lightbox" @click="closeLightbox">
      <img :src="lightboxImage" class="lightbox-image" @click.stop>
      <button class="lightbox-close" @click="closeLightbox">&times;</button>
    </div>
  </div>
</template>

<style scoped>
.article-view {
  width: 100%;
  max-width: 800px;
}

.loading,
.error {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem;
}

.back-link {
  display: inline-block;
  color: var(--accent);
  font-size: 0.875rem;
  margin-bottom: 2rem;
  transition: color 0.2s ease;
}

.back-link:hover {
  color: var(--text-primary);
}

.back-link::before {
  content: '← ';
}

.article-header {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border);
}

.article-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}

.article-date {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.article-tag {
  font-size: 0.75rem;
  color: var(--accent);
  background: rgba(74, 158, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid rgba(74, 158, 255, 0.2);
}

/* Article content styling - targets the v-html rendered content */
.article-content :deep(h2) {
  font-size: 1.75rem;
  font-weight: 600;
  margin-top: 2.5rem;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.article-content :deep(h3) {
  font-size: 1.375rem;
  font-weight: 600;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.article-content :deep(.anchor-heading) {
  position: relative;
  scroll-margin-top: 2rem;
}

.article-content :deep(.anchor-heading a) {
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.article-content :deep(.anchor-heading a:hover) {
  color: inherit;
  text-decoration: none;
}

.article-content :deep(.anchor-hash) {
  color: var(--text-secondary);
  text-decoration: none;
  margin-left: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
  font-weight: 400;
}

.article-content :deep(.anchor-heading:hover .anchor-hash) {
  opacity: 1;
}

.article-content :deep(p) {
  margin-bottom: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.7;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin-bottom: 1.5rem;
  padding-left: 1.5rem;
  color: var(--text-secondary);
}

.article-content :deep(li) {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.article-content :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 1.5rem;
  margin: 1.5rem 0;
  color: var(--text-secondary);
  font-style: italic;
}

.article-content :deep(pre) {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  overflow-x: auto;
  margin-bottom: 1.5rem;
}

.article-content :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.7rem;
}

/* Override highlight.js theme styles to match site */
.article-content :deep(.hljs) {
  background: transparent;
  padding: 0;
  line-height: 1.3;
}

.article-content :deep(img) {
  display: block;
  max-width: 80%;
  height: auto;
  border-radius: 8px;
  margin: 1.5rem auto 0.25rem;
  cursor: zoom-in;
  transition: opacity 0.2s ease;
}

.article-content :deep(img:hover) {
  opacity: 0.9;
}

.article-content :deep(img.no-zoom) {
  cursor: default;
}

.article-content :deep(img.no-zoom:hover) {
  opacity: 1;
}

.article-content :deep(.caption) {
  display: block;
  text-align: center;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--text-secondary);
  margin-top: 0;
  margin-bottom: 1.5rem;
}

.article-content :deep(a) {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s ease;
}

.article-content :deep(a:hover) {
  color: var(--text-primary);
  text-decoration: underline;
}

.article-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--border);
  margin: 2rem 0;
}

.article-content :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}

.article-content :deep(em) {
  font-style: italic;
}

@media (max-width: 640px) {
  .article-title {
    font-size: 1.75rem;
  }

  .article-content :deep(h2) {
    font-size: 1.5rem;
  }

  .article-content :deep(h3) {
    font-size: 1.25rem;
  }
}

/* Lightbox styles */
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  cursor: pointer;
}

.lightbox-image {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 4px;
  cursor: default;
}

.lightbox-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 2rem;
  cursor: pointer;
  padding: 0.5rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.lightbox-close:hover {
  opacity: 1;
}
</style>
