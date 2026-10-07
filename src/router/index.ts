import { createRouter, createWebHistory } from 'vue-router'

import Index from '@/pages/index.vue'
import MergePdfPage from '@/pages/tools/MergePdfPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Index,
    },
    {
      path: '/tools/merge-pdf',
      name: 'merge-pdf',
      component: MergePdfPage,
    },
  ],
})

export default router
