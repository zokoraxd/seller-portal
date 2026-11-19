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
import router from './router'

createApp(App).use(createPinia()).use(router).mount('#app')
