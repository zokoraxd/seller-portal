<script setup>
import { computed } from 'vue'
import BarChart from '@/components/BarChart.vue'
import HealthBadge from '@/components/HealthBadge.vue'
import KpiCard from '@/components/KpiCard.vue'
import { formatCompactIQD, formatNumber, toMillions } from '@/core/format'
import { HEALTH_PART_LABEL, HEALTH_PART_MAX, computeHealth } from '@/core/stores'
import { BRAND, INK, SLATE, barOptions } from '@/lib/charts'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const s = computed(() => app.activeStore)
const pendingOffers = computed(() => app.offers.filter((o) => o.storeName === s.value?.name && o.status === 'pending').length)

const chart = computed(() => ({
  labels: ['إجمالي المبيعات', 'إجمالي كلفة الشراء', 'صافي الربح الإجمالي'],
  datasets: [
    {
      label: 'مليون دينار عراقي',
      data: [toMillions(s.value.totalGmv), toMillions(s.value.totalBuyCost), toMillions(s.value.totalGrossProfit)],
      backgroundColor: [INK, SLATE, BRAND],
      borderRadius: 8,
      maxBarThickness: 50,
    },
  ],
}))

const chartLabel = computed(
  () => `المبيعات ${formatCompactIQD(s.value.totalGmv)}، كلفة الشراء ${formatCompactIQD(s.value.totalBuyCost)}، صافي الربح ${formatCompactIQD(s.value.totalGrossProfit)}`,
)

const parts = computed(() =>
  Object.keys(HEALTH_PART_MAX).map((k) => ({
    key: k,
    label: HEALTH_PART_LABEL[k],
    points: s.value.healthParts[k],
    max: HEALTH_PART_MAX[k],
  })),
)

// Tips use what-if numbers from the same scoring formula, not made-up promises.
const tips = computed(() => {
  const st = s.value
  const gain = (patch) => computeHealth({ ...st, ...patch }).score - st.healthScore
  const list = []

  if (st.returnRate > 6) {
    list.push(`نسبة الإرجاع (${st.returnRate}%) تخفض نقاطك. لو نزلت إلى 5% سترتفع نقاط صحتك بنحو +${gain({ returnRate: 5 })}. تحديث وصف المنتجات والمقاسات يساعد.`)
  } else {
    list.push(`نسبة الإرجاع لديك منخفضة (${st.returnRate}%) — نقطة قوة في تقييمك.`)
  }
  if (st.avgDeliveryHours > 24) {
    list.push(`متوسط التوصيل ${st.avgDeliveryHours} ساعة. لو وصل إلى 18 ساعة سترتفع نقاطك بنحو +${gain({ avgDeliveryHours: 18 })}.`)
  } else {
    list.push(`سرعة التوصيل (${st.avgDeliveryHours} ساعة) ضمن أفضل نطاق في نظام التقييم.`)
  }
  if (st.installmentShare < 25) {
    list.push(`حصة الدفع بالتقسيط في مبيعاتك ${st.installmentShare}% فقط. تفعيله لعملائك قد يرفع قيمة السلة، لكن هذه فرضية تحتاج قياساً.`)
  }
  return list
})
</script>

<template>
  <div v-if="s" class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-xl font-extrabold">{{ s.name }}</h1>
        <p class="text-xs text-slate-500">{{ s.category }} • {{ s.city }}</p>
      </div>
      <HealthBadge :score="s.healthScore" />
    </header>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard label="إجمالي مبيعات متجري" :value="formatCompactIQD(s.totalGmv)" :sub="`${formatNumber(s.deliveredUnits)} قطعة مباعة`" />
      <KpiCard label="صافي ربح البيع والشراء" :value="formatCompactIQD(s.totalGrossProfit)" :sub="`هامش حقيقي: ${s.marginPct}%`" tone="good" />
      <KpiCard label="الإرجاع وسرعة التوصيل" :value="`${s.returnRate}% • ${s.avgDeliveryHours}س`" :sub="s.returnRate <= 5 ? 'معدل ممتاز' : 'يوصى بتقليل الإرجاع'" />
      <KpiCard label="عروض بانتظار ردك" :value="`${pendingOffers} عرض`" highlight tone="brand">
      </KpiCard>
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <section class="card p-4 lg:col-span-2" aria-labelledby="h-fin">
        <h2 id="h-fin" class="mb-3 text-sm font-extrabold">تحليل المبيعات مقابل كلفة الشراء وصافي الربح</h2>
        <BarChart :data="chart" :options="barOptions({ legendOn: false })" :label="chartLabel" />
      </section>

      <section class="card p-4" aria-labelledby="h-why">
        <h2 id="h-why" class="mb-3 text-sm font-extrabold">لماذا {{ s.healthScore }} من 100؟</h2>
        <ul class="space-y-2.5">
          <li v-for="p in parts" :key="p.key">
            <div class="mb-1 flex justify-between text-[11px] font-bold">
              <span>{{ p.label }}</span>
              <span class="tabular-nums text-slate-500">{{ p.points.toFixed(1) }} / {{ p.max }}</span>
            </div>
            <div class="h-1.5 overflow-hidden rounded-full bg-slate-100" role="presentation">
              <div class="h-full rounded-full bg-brand" :style="{ width: `${Math.min(100, (p.points / p.max) * 100)}%` }" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <section class="card p-4" aria-labelledby="h-tips">
      <h2 id="h-tips" class="mb-3 text-sm font-extrabold">توصيات لتحسين نقاط متجرك</h2>
      <div class="space-y-2 text-xs">
        <p v-for="t in tips" :key="t" class="rounded-xl border border-slate-200/80 bg-slate-50 p-3 leading-relaxed text-slate-700">{{ t }}</p>
      </div>
    </section>

    <RouterLink v-if="pendingOffers" :to="{ name: 'merchant-comms' }" class="btn-primary">لديك {{ pendingOffers }} عرض بانتظار الرد — افتح العروض</RouterLink>
  </div>
  <p v-else class="card p-8 text-center text-sm text-slate-500">لا توجد بيانات لهذا المتجر بعد.</p>
</template>
