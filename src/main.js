import '@/assets/main.css'
import 'primeicons/primeicons.css'
import 'element-plus/theme-chalk/el-loading.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from '@/store/store'

import { Spin } from 'ant-design-vue'

import PrimeVue from 'primevue/config'
import Noir from './presets/Noir.js'
import ConfirmationService from 'primevue/confirmationservice'

import * as ElementPlusIconsVue from '@element-plus/icons-vue'

import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

const app = createApp(App)

app.use(store)
app.use(router)

app.use(Spin)

app.use(PrimeVue, {
  theme: {
    preset: Noir,
    options: {
      prefix: 'p',
    },
  },
})
app.use(ConfirmationService)

// 注册 Element Plus 图标组件
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(Toast, {
  transition: 'Vue-Toastification__bounce',
  maxToasts: 5,
  newestOnTop: true,
})

app.mount('#app')
