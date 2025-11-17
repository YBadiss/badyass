import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import 'flag-icons/css/flag-icons.min.css'

// Global error handlers
window.addEventListener('error', event => {
  console.error('🚨 Global Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  })
})

window.addEventListener('unhandledrejection', event => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise,
    stack: event.reason?.stack
  })
})

const app = createApp(App)

// Vue-specific error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('🚨 Vue Error:', {
    error: err,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    componentName: instance?.$options?.name || instance?.$options?.__name,
    info
  })
}

// Vue warning handler (development only)
if (import.meta.env.DEV) {
  app.config.warnHandler = (msg, instance, trace) => {
    console.warn('⚠️ Vue Warning:', {
      message: msg,
      componentName: instance?.$options?.name || instance?.$options?.__name,
      trace
    })
  }
}

app.use(PrimeVue)
app.mount('#app')
