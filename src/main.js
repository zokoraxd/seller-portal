import { createPinia } from 'pinia'
import { createApp } from 'vue'
import '@fontsource/cairo/arabic-400.css'
import '@fontsource/cairo/arabic-600.css'
import '@fontsource/cairo/arabic-700.css'
import '@fontsource/cairo/arabic-800.css'
import '@fontsource/cairo/latin-400.css'
import '@fontsource/cairo/latin-600.css'
import '@fontsource/cairo/latin-700.css'
import '@fontsource/cairo/latin-800.css'
import './assets/main.css'

import App from './App.vue'
import { reloadOnceForNewDeployment } from './lib/staleChunk'
import router from './router'
import { useAppStore } from './stores/app'

async function boot() {
  const pinia = createPinia()
  const app = createApp(App).use(pinia).use(router)
  await useAppStore(pinia).init() // connect to Supabase, or fall back to local mode (never throws)
  await router.isReady()
  app.mount('#app')
}

// Vite fires this when a lazily loaded file is gone, i.e. the tab is running an old deployment.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadOnceForNewDeployment(location.href)) event.preventDefault()
})

boot()
