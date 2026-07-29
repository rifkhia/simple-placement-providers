import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import PlacementsView from './views/PlacementsView.vue'
import ProvidersView from './views/ProvidersView.vue'
import './assets/main.css'

const routes = [
  { path: '/', redirect: '/placements' },
  { path: '/placements', component: PlacementsView, meta: { title: 'Placements' } },
  { path: '/providers', component: ProvidersView, meta: { title: 'Providers' } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

createApp(App).use(router).mount('#app')
