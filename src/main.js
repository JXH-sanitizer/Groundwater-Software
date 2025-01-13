import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import App from './App.vue'
import axios from 'axios'

import 'element-plus/dist/index.css'
import 'mapbox-gl/dist/mapbox-gl.css'

const app = createApp(App)

app.use(createPinia())
app.use(ElementPlus)
app.config.globalProperties.$axios = axios;

app.mount('#app')