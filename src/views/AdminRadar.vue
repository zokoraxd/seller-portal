<script setup>
import { computed, ref } from 'vue'
import BarChart from '@/components/BarChart.vue'
import DoughnutChart from '@/components/DoughnutChart.vue'
import { formatCompactIQD, formatDecimal, formatNumber } from '@/core/format'
import { CATEGORIES, SEGMENTS } from '@/core/ledger'
import { CYCLE_LABEL, cycleBreakdown, radarInsights } from '@/core/radar'
import { BRAND, INK, TEAL, barOptions, doughnutOptions } from '@/lib/charts'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const timing = ref('salary_days')

const breakdown = computed(() => cycleBreakdown(app.ledger, timing.value))
const insights = computed(() => radarInsights(breakdown.value, app.stores))
const colors = [INK, BRAND, TEAL]
const millions = (v) => Number((v / 1_000_000).toFixed(1))
const segLabel = computed(
  () => `حصة الإنفاق حسب الشريحة: ${SEGMENTS.map((s, i) => `${s} ${millions(breakdown.value.segTotals[i])} مليون`).join('، ')}`,
)
const barsLabel = computed(() => `مبيعات القطاعات حسب شريحة المشتري بالمليون د.ع، الإجمالي ${formatCompactIQD(breakdown.value.total)}`)

const doughnut = computed(() => ({
  labels: SEGMENTS,
  datasets: [{ data: breakdown.value.segTotals.map(millions), backgroundColor: colors, borderWidth: 2, borderColor: '#FFFFFF' }],
}))
const bars = computed(() => ({
  labels: CATEGORIES,
  datasets: SEGMENTS.map((seg, i) => ({
    label: seg,
    backgroundColor: colors[i],
    borderRadius: 5,
    maxBarThickness: 22,
    data: breakdown.value.bySegmentCategory[i].map(millions),
  })),
}))
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-xl font-extrabold">رادار دورة الرواتب</h1>
        <p class="text-xs text-slate-500">
          محسوب مباشرة من {{ formatNumber(breakdown.count) }} سجل بيع ({{ formatCompactIQD(breakdown.total) }}) خلال: {{ CYCLE_LABEL[timing] }}
        </p>
      </div>
      <div class="flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="فترة الشهر">
        <button
          v-for="(label, key) in CYCLE_LABEL"
          :key="key"
          type="button"
          class="rounded-lg px-3.5 py-2 text-xs"
          :class="timing === key ? 'bg-white font-extrabold text-brand shadow-sm' : 'font-bold text-slate-600 hover:text-slate-900'"
          :aria-pressed="timing === key"
          @click="timing = key"
        >
          {{ label }} <span class="text-[10px] text-slate-600">{{ key === 'salary_days' ? '(1–10)' : '(11+)' }}</span>
        </button>
      </div>
    </header>

    <p v-if="breakdown.count === 0" class="card p-8 text-center text-sm text-slate-500">لا توجد مبيعات في هذه الفترة. ارفع بيانات تحتوي تواريخ ضمن هذه الأيام.</p>

    <template v-else>
      <div class="grid gap-4 lg:grid-cols-5">
        <section class="card p-4 lg:col-span-2" aria-labelledby="h-seg">
          <h2 id="h-seg" class="mb-3 text-sm font-extrabold">حصة الإنفاق حسب الشريحة</h2>
          <DoughnutChart :data="doughnut" :options="doughnutOptions({ cutout: '62%', format: (v) => `${formatDecimal(v)} مليون د.ع` })" :label="segLabel" />
        </section>
        <section class="card p-4 lg:col-span-3" aria-labelledby="h-segcat">
          <h2 id="h-segcat" class="mb-3 text-sm font-extrabold">مبيعات القطاعات حسب شريحة المشتري (مليون د.ع)</h2>
          <BarChart :data="bars" :options="barOptions()" :label="barsLabel" />
        </section>
      </div>

      <section class="card p-4" aria-labelledby="h-ins">
        <h2 id="h-ins" class="mb-3 text-sm font-extrabold">توصيات مبنية على البيانات الحالية</h2>
        <div class="grid gap-3 md:grid-cols-3">
          <div v-for="(ins, i) in insights" :key="ins.title" class="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <div class="text-xs font-extrabold text-brand">{{ i + 1 }}. {{ ins.title }}</div>
            <p class="text-xs leading-relaxed text-slate-600">{{ ins.body }}</p>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
