<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BarChart from '@/components/BarChart.vue'
import DoughnutChart from '@/components/DoughnutChart.vue'
import HealthBadge from '@/components/HealthBadge.vue'
import KpiCard from '@/components/KpiCard.vue'
import { useToast } from '@/composables/useToast'
import { formatCompactIQD, formatDecimal, formatIQD, formatNumber } from '@/core/format'
import { CATEGORIES } from '@/core/ledger'
import { BRAND, INK, PALETTE, barOptions, doughnutOptions } from '@/lib/charts'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { show } = useToast()

const category = ref('الكل')
const query = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return app.stores.filter((s) => (category.value === 'الكل' || s.category === category.value) && (!q || s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)))
})

const totals = computed(() => {
  const list = filtered.value
  const gmv = list.reduce((a, s) => a + s.totalGmv, 0)
  const profit = list.reduce((a, s) => a + s.totalGrossProfit, 0)
  return {
    gmv,
    profit,
    delivered: list.reduce((a, s) => a + s.deliveredUnits, 0),
    margin: gmv > 0 ? (profit / gmv) * 100 : 0,
    health: list.length ? Math.round(list.reduce((a, s) => a + s.healthScore, 0) / list.length) : 0,
  }
})

const acceptedOffers = computed(() => app.offers.filter((o) => o.status === 'accepted').length)

// Bars are sorted by value, highest first, so the ranking reads at a glance.
const byHealth = computed(() => [...filtered.value].sort((a, b) => b.healthScore - a.healthScore))
const healthData = computed(() => ({
  labels: byHealth.value.map((s) => (s.name.length > 16 ? `${s.name.slice(0, 15)}…` : s.name)),
  datasets: [
    { label: 'صحة المتجر (0–100)', data: byHealth.value.map((s) => s.healthScore), backgroundColor: BRAND, borderRadius: 6, maxBarThickness: 28 },
    { label: 'هامش البيع/الشراء (%)', data: byHealth.value.map((s) => s.marginPct), backgroundColor: INK, borderRadius: 6, maxBarThickness: 28 },
  ],
}))
const healthLabel = computed(() => (byHealth.value.length ? `أعلى المتاجر صحة: ${byHealth.value[0].name} بدرجة ${byHealth.value[0].healthScore} من 100` : 'لا توجد متاجر'))

const catData = computed(() => ({
  labels: CATEGORIES,
  datasets: [
    {
      data: CATEGORIES.map((c) => Number(app.stores.filter((s) => s.category === c).reduce((sum, s) => sum + s.totalGmv / 1_000_000, 0).toFixed(1))),
      backgroundColor: PALETTE,
      borderWidth: 2,
      borderColor: '#FFFFFF',
    },
  ],
}))
const catLabel = computed(() => `حجم المبيعات حسب القطاع: ${CATEGORIES.map((c, i) => `${c} ${catData.value.datasets[0].data[i]} مليون`).join('، ')}`)

function act(kind, name) {
  if (kind === 'offer') {
    app.loadStoreIntoCalc(name)
    router.push({ name: 'admin-calculator' })
  } else if (kind === 'chat') {
    app.openHub('messages', name)
  } else {
    app.enterAs('merchant', name)
    router.push({ name: 'merchant-overview' })
    show(`تم الانتقال لمعاينة بوابة التاجر: ${name}`)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-balance text-xl font-extrabold">تحليلات المتاجر</h1>
        <p class="text-xs text-slate-500">كل رقم محسوب مباشرة من سجل البيع والشراء.</p>
      </div>
      <span class="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold tabular-nums text-brand-ink">{{ formatCompactIQD(totals.gmv) }}</span>
    </div>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="إجمالي المبيعات" :value="formatCompactIQD(totals.gmv)" :sub="`${formatNumber(totals.delivered)} طلب مكتمل`" />
      <KpiCard label="صافي هامش البيع والشراء" :value="`${formatDecimal(totals.margin)}%`" :sub="`ربح إجمالي: ${formatCompactIQD(totals.profit)}`" tone="good" />
      <KpiCard label="متوسط صحة المتاجر" :value="`${totals.health} / 100`" :sub="`عبر ${filtered.length} متاجر`" />
      <KpiCard label="عروض مشتركة" :value="`${app.offers.length} عروض`" :sub="`${acceptedOffers} مقبولة من التجار`" tone="brand" />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card p-4 lg:col-span-2" aria-labelledby="health-h">
        <h2 id="health-h" class="mb-2 text-sm font-extrabold">صحة المتاجر وهامش الربح</h2>
        <BarChart :data="healthData" :options="barOptions({ max: 100 })" :label="healthLabel" />
      </section>
      <section class="card p-4" aria-labelledby="cat-h">
        <h2 id="cat-h" class="mb-2 text-sm font-extrabold">المبيعات حسب القطاع</h2>
        <DoughnutChart :data="catData" :options="doughnutOptions({ format: (v) => `${formatDecimal(v)} مليون د.ع` })" :label="catLabel" />
      </section>
    </div>

    <section class="card overflow-hidden" aria-labelledby="stores-h">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
        <h2 id="stores-h" class="text-sm font-extrabold">المتاجر</h2>
        <div class="no-scrollbar flex gap-1.5 overflow-x-auto" role="group" aria-label="تصفية حسب القطاع">
          <button
            v-for="c in ['الكل', ...CATEGORIES]"
            :key="c"
            type="button"
            class="shrink-0 rounded-xl border px-3 py-1 text-xs font-bold"
            :class="category === c ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
            :aria-pressed="category === c"
            @click="category = c"
          >
            {{ c }}
          </button>
        </div>
        <input v-model="query" type="search" class="field ms-auto !w-48" placeholder="بحث باسم المتجر أو المدينة" aria-label="بحث" maxlength="60" autocomplete="off" />
      </div>

      <p v-if="filtered.length === 0" class="p-8 text-center text-sm text-slate-500">لا توجد متاجر مطابقة.</p>

      <!-- Desktop table -->
      <div v-else class="hidden overflow-x-auto md:block" tabindex="0" role="region" aria-label="جدول المتاجر">
        <table class="w-full text-sm">
          <caption class="sr-only">قائمة المتاجر مع مؤشراتها</caption>
          <thead class="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th scope="col" class="px-4 py-2.5 text-start font-bold">المتجر</th>
              <th scope="col" class="px-3 py-2.5 text-start font-bold">المبيعات (قطعة)</th>
              <th scope="col" class="px-3 py-2.5 text-start font-bold">إجمالي المبيعات</th>
              <th scope="col" class="px-3 py-2.5 text-start font-bold">الهامش</th>
              <th scope="col" class="px-3 py-2.5 text-start font-bold">الإرجاع والتوصيل</th>
              <th scope="col" class="px-3 py-2.5 text-start font-bold">الصحة</th>
              <th scope="col" class="px-4 py-2.5 text-end font-bold">إجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="s in filtered" :key="s.name" class="hover:bg-slate-50/70">
              <td class="px-4 py-3">
                <div class="font-extrabold">{{ s.name }}</div>
                <div class="text-[11px] text-slate-500">{{ s.category }} • {{ s.city }}</div>
              </td>
              <td class="px-3 py-3 font-bold tabular-nums">{{ formatNumber(s.deliveredUnits) }}</td>
              <td class="px-3 py-3 font-extrabold tabular-nums">{{ formatCompactIQD(s.totalGmv) }}</td>
              <td class="px-3 py-3">
                <span class="font-extrabold tabular-nums text-emerald-700">{{ s.marginPct }}%</span>
                <div class="text-[11px] tabular-nums text-slate-500">سلة {{ formatIQD(s.aov) }}</div>
              </td>
              <td class="px-3 py-3 text-xs tabular-nums">
                <div class="font-bold" :class="s.returnRate > 8 ? 'text-rose-700' : 'text-slate-700'">إرجاع {{ s.returnRate }}%</div>
                <div class="text-slate-500">{{ s.avgDeliveryHours }} ساعة</div>
              </td>
              <td class="px-3 py-3"><HealthBadge :score="s.healthScore" /></td>
              <td class="px-4 py-3 text-end">
                <div class="inline-flex gap-1.5">
                  <button type="button" class="btn bg-brand-soft !px-2.5 !py-1.5 text-[11px] text-brand-ink hover:bg-brand hover:text-white" @click="act('offer', s.name)">إرسال عرض</button>
                  <button type="button" class="btn bg-slate-100 !px-2.5 !py-1.5 text-[11px] text-slate-700 hover:bg-slate-200" @click="act('chat', s.name)">تواصل</button>
                  <button type="button" class="btn-ghost !px-2.5 !py-1.5 text-[11px]" @click="act('view', s.name)">عرض كتاجر</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile cards -->
      <ul v-if="filtered.length" class="space-y-3 p-4 md:hidden">
        <li v-for="s in filtered" :key="s.name" class="space-y-3 rounded-2xl border border-slate-200 p-4">
          <div class="flex items-start justify-between gap-2">
            <div>
              <div class="text-sm font-extrabold">{{ s.name }}</div>
              <div class="text-xs text-slate-500">{{ s.category }} • {{ s.city }}</div>
            </div>
            <HealthBadge :score="s.healthScore" compact />
          </div>
          <div class="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
            <div><div class="text-[10px] text-slate-500">المبيعات</div><strong class="tabular-nums">{{ formatCompactIQD(s.totalGmv) }}</strong></div>
            <div><div class="text-[10px] text-slate-500">الهامش</div><strong class="tabular-nums text-emerald-700">{{ s.marginPct }}%</strong></div>
            <div><div class="text-[10px] text-slate-500">الإرجاع</div><strong class="tabular-nums" :class="s.returnRate > 8 ? 'text-rose-700' : ''">{{ s.returnRate }}%</strong></div>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="btn bg-brand-soft !py-2.5 text-brand-ink" @click="act('offer', s.name)">إرسال عرض مشترك</button>
            <button type="button" class="btn bg-slate-100 !py-2.5 text-slate-800" @click="act('view', s.name)">عرض كتاجر</button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
