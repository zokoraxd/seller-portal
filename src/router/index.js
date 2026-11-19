import { ref } from 'vue'
import { START_LOCATION, createRouter, createWebHistory } from 'vue-router'
import { useAppStore } from '@/stores/app'

// Views are lazy-loaded so the first screen stays small (Chart.js and xlsx load on demand).
const routes = [
  { path: '/', name: 'entry', component: () => import('@/views/EntryView.vue') },

  { path: '/admin/analytics', name: 'admin-analytics', component: () => import('@/views/AdminAnalytics.vue'), meta: { role: 'admin' } },
  { path: '/admin/data', name: 'admin-data', component: () => import('@/views/DataHub.vue'), meta: { role: 'admin' } },
  { path: '/admin/calculator', name: 'admin-calculator', component: () => import('@/views/AdminCalculator.vue'), meta: { role: 'admin' } },
  { path: '/admin/radar', name: 'admin-radar', component: () => import('@/views/AdminRadar.vue'), meta: { role: 'admin' } },

  { path: '/merchant/overview', name: 'merchant-overview', component: () => import('@/views/MerchantOverview.vue'), meta: { role: 'merchant' } },
  { path: '/merchant/data', name: 'merchant-data', component: () => import('@/views/DataHub.vue'), meta: { role: 'merchant' } },
  { path: '/merchant/comms', name: 'merchant-comms', component: () => import('@/views/MerchantComms.vue'), meta: { role: 'merchant' } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFoundView.vue') },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Demo access control: a visitor must pick a role on the entry screen first.
// (There is no real authentication in this prototype.)
router.beforeEach((to) => {
  const required = to.meta.role
  if (!required) return true
  const app = useAppStore()
  return app.role === required ? true : { name: 'entry' }
})

const TITLES = {
  entry: 'الدخول',
  'admin-analytics': 'تحليلات المتاجر',
  'admin-data': 'بوابة البيانات',
  'admin-calculator': 'حاسبة الخصم المشترك',
  'admin-radar': 'رادار الرواتب',
  'merchant-overview': 'ملخص متجري',
  'merchant-data': 'رفع بيانات البيع',
  'merchant-comms': 'العروض والتواصل',
  'not-found': 'الصفحة غير موجودة',
}

// Incremented after every in-app navigation (not the first page load) so App.vue can move
// focus to the main region: screen-reader and keyboard users are told the page changed.
export const navCount = ref(0)

router.afterEach((to, from) => {
  document.title = `${TITLES[to.name] ?? 'بوابة التاجر'} — بوابة التاجر (نموذج مفاهيمي)`
  if (from !== START_LOCATION) navCount.value++
})

export const DEFAULT_ROUTE = { admin: 'admin-analytics', merchant: 'merchant-overview' }
export default router
