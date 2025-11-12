import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import App from './App.vue'
import 'flag-icons/css/flag-icons.min.css'

const app = createApp(App)
app.use(PrimeVue)
app.mount('#app')
