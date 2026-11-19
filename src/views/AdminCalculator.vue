<script setup>
import { computed, ref } from 'vue'
import BarChart from '@/components/BarChart.vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { FUNDING_LABEL, evaluateDeal, optimizeSplit } from '@/core/deal'
import { formatCompactIQD, formatIQD, formatNumber, toMillions } from '@/core/format'
import { BRAND, INK, barOptions } from '@/lib/charts'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { show } = useToast()

const c = app.calc
const note = ref('')
const r = computed(() => evaluateDeal(c))

// If the selected store is gone (e.g. after a data replace), fall back to the first store.
if (!app.stores.some((s) => s.name === c.storeName)) app.loadStoreIntoCalc(app.stores[0]?.name)

const num = (key, min, max, int = false) => (e) => {
  const v = Number(e.target.value)
  if (!Number.isFinite(v)) return
  app.calc[key] = Math.min(max, Math.max(min, int ? Math.round(v) : v))
}
const on = {
  orders: num('orders', 1, 10_000_000, true),
  aov: num('aov', 1000, 100_000_000, true),
  marginPct: num('marginPct', 5, 80),
  commissionPct: num('commissionPct', 0, 50),
  deliveryMargin: num('deliveryMargin', 0, 1_000_000, true),
  totalDiscountPct: num('totalDiscountPct', 0, 40),
  merchantSharePct: num('merchantSharePct', 10, 90),
  multiplier: num('multiplier', 1, 3),
  bnplSubsidyFactor: (e) => (app.calc.bnplSubsidyFactor = Number(e.target.value) / 100),
}

const chartData = computed(() => ({
  labels: ['صافي ربح التاجر', 'صافي إيراد المنصة'],
  datasets: [
    { label: 'قبل الحملة', data: [toMillions(r.value.mBefore), toMillions(r.value.pBefore)], backgroundColor: '#CBD5E1', borderRadius: 8, maxBarThickness: 44 },
    { label: 'بعد الخصم المشترك', data: [toMillions(r.value.mAfter), toMillions(r.value.pAfter)], backgroundColor: [INK, BRAND], borderRadius: 8, maxBarThickness: 44 },
  ],
}))

const chartLabel = computed(
  () => `ربح التاجر من ${formatCompactIQD(r.value.mBefore)} إلى ${formatCompactIQD(r.value.mAfter)}، وإيراد المنصة من ${formatCompactIQD(r.value.pBefore)} إلى ${formatCompactIQD(r.value.pAfter)}`,
)
const signed = (v) => `${v >= 0 ? '+' : ''}${formatCompactIQD(v)}`
const deltaCls = (v) => (v >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')

function autoBalance() {
  const { share, found } = optimizeSplit(app.calc)
  if (!found) return show('لا توجد نسبة تربح بها الجهتان بهذه المعطيات. جرّب خفض الخصم أو رفع الطلبات الإضافية.')
  app.calc.merchantSharePct = share
  show(`تم ضبط التوازن الأمثل (${share}% التاجر / ${100 - share}% المنصة)`, { tone: 'success' })
}

function send() {
  const store = c.storeName
  app.sendOffer({ ...c }, r.value, note.value.trim())
  note.value = ''
  show(`تم إرسال العرض إلى بوابة "${store}"`, {
    tone: 'success',
    actionLabel: 'معاينة كبوابة التاجر',
    onAction: () => {
      app.enterAs('merchant', store)
      router.push({ name: 'merchant-comms' })
    },
  })
}
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-xl font-extrabold">حاسبة الخصم المشترك</h1>
      <p class="text-xs text-slate-500">هل تربح المنصة والتاجر معاً من الحملة؟ عدّل المعطيات وشاهد النتيجة فوراً.</p>
    </header>

    <div class="grid gap-4 lg:grid-cols-5">
      <!-- inputs -->
      <section class="card space-y-4 p-4 lg:col-span-2" aria-labelledby="h-in">
        <h2 id="h-in" class="text-sm font-extrabold">المعطيات</h2>

        <div>
          <label class="label" for="c-store">المتجر</label>
          <select id="c-store" class="field" :value="c.storeName" @change="app.loadStoreIntoCalc($event.target.value)">
            <option v-for="s in app.stores" :key="s.name" :value="s.name">{{ s.name }} (هامش {{ s.marginPct }}%)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div><label class="label" for="c-orders">الطلبات الشهرية</label><input id="c-orders" class="field" type="number" min="1" :value="c.orders" @input="on.orders" /></div>
          <div><label class="label" for="c-aov">متوسط السلة (د.ع)</label><input id="c-aov" class="field" type="number" min="1000" :value="c.aov" @input="on.aov" /></div>
          <div><label class="label" for="c-margin">هامش التاجر %</label><input id="c-margin" class="field" type="number" min="5" max="80" :value="c.marginPct" @input="on.marginPct" /></div>
          <div><label class="label" for="c-comm">عمولة المنصة %</label><input id="c-comm" class="field" type="number" min="0" max="50" step="0.5" :value="c.commissionPct" @input="on.commissionPct" /></div>
          <div class="col-span-2"><label class="label" for="c-del">هامش التوصيل للمنصة (د.ع/طلب)</label><input id="c-del" class="field" type="number" min="0" :value="c.deliveryMargin" @input="on.deliveryMargin" /></div>
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-bold">
            <label for="c-disc">نسبة الخصم الكلية</label>
            <span class="tabular-nums text-brand">{{ c.totalDiscountPct }}% • {{ formatIQD(r.discPerOrder) }} للطلب</span>
          </div>
          <input id="c-disc" class="brand-slider" type="range" min="0" max="40" step="1" :value="c.totalDiscountPct" @input="on.totalDiscountPct" />
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-bold">
            <label for="c-share">حصة التاجر من الخصم</label>
            <span class="tabular-nums">{{ c.merchantSharePct }}% تاجر / {{ r.platformSharePct }}% منصة</span>
          </div>
          <input id="c-share" class="brand-slider" type="range" min="10" max="90" step="5" :value="c.merchantSharePct" @input="on.merchantSharePct" />
          <div class="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div class="bg-slate-900" :style="{ width: `${c.merchantSharePct}%` }" />
            <div class="bg-brand" :style="{ width: `${r.platformSharePct}%` }" />
          </div>
        </div>

        <div>
          <div class="mb-1 flex items-center justify-between text-xs font-bold">
            <label for="c-mult">زيادة الطلبات المتوقعة</label>
            <span class="tabular-nums">{{ c.multiplier.toFixed(1) }}x • من {{ formatNumber(c.orders) }} إلى {{ formatNumber(r.newOrders) }}</span>
          </div>
          <input id="c-mult" class="brand-slider" type="range" min="1" max="3" step="0.1" :value="c.multiplier" @input="on.multiplier" />
        </div>

        <fieldset>
          <legend class="label">مصدر دعم المنصة</legend>
          <div class="grid grid-cols-3 gap-1.5">
            <button
              v-for="(text, key) in FUNDING_LABEL"
              :key="key"
              type="button"
              class="rounded-lg border px-2 py-1.5 text-[11px] font-bold"
              :class="c.fundingSource === key ? 'border-brand bg-brand text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'"
              :aria-pressed="c.fundingSource === key"
              @click="app.calc.fundingSource = key"
            >
              {{ text }}
            </button>
          </div>
        </fieldset>

        <div v-if="c.fundingSource === 'bnpl'" class="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div class="mb-1 flex items-center justify-between text-xs font-bold text-amber-900">
            <label for="c-factor">افتراض: الجزء الذي تتحمله المنصة فعلياً</label>
            <span class="tabular-nums">{{ Math.round(c.bnplSubsidyFactor * 100) }}%</span>
          </div>
          <input id="c-factor" class="brand-slider" type="range" min="30" max="100" step="5" :value="Math.round(c.bnplSubsidyFactor * 100)" @input="on.bnplSubsidyFactor" />
          <p class="mt-1.5 text-[11px] text-amber-900">رقم افتراضي وليس مقيساً: عند التمويل بالتقسيط نفترض أن المنصة تدفع هذه النسبة فقط من دعمها. عدّله حسب شروط التمويل الفعلية.</p>
        </div>
      </section>

      <!-- results -->
      <section class="space-y-4 lg:col-span-3" aria-live="polite">
        <div class="space-y-2 rounded-2xl border p-4 sm:p-5" :class="r.isWinWin ? 'border-emerald-200 bg-emerald-50/80' : 'border-amber-300 bg-amber-50/80'">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="rounded-full px-3 py-1 text-xs font-extrabold text-white" :class="r.isWinWin ? 'bg-emerald-600' : 'bg-amber-600'">
              {{ r.isWinWin ? 'صفقة رابحة للطرفين' : 'تحتاج تعديل النسبة' }}
            </span>
            <span class="rounded-full bg-white px-3 py-1 text-xs font-extrabold tabular-nums">+{{ formatNumber(r.extraUnits) }} طلب إضافي</span>
          </div>
          <p class="text-sm font-bold text-slate-800">
            <template v-if="r.isWinWin">التاجر يربح {{ formatCompactIQD(r.mDelta) }} إضافية، والمنصة تحقق نمواً صافياً قدره {{ formatCompactIQD(r.pDelta) }}.</template>
            <template v-else-if="r.mDelta <= 0">صافي ربح التاجر يتراجع بهذه النسبة — اضغط "توازن تلقائي" أو خفّض حصة التاجر.</template>
            <template v-else>دعم المنصة مرتفع — فعّل التقسيط أو ارفع حصة التاجر قليلاً.</template>
          </p>
          <button type="button" class="btn-dark" @click="autoBalance">توازن تلقائي</button>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="card p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-500">ربح التاجر</span>
              <span class="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums" :class="deltaCls(r.mDelta)">{{ signed(r.mDelta) }}</span>
            </div>
            <div class="mt-2 text-[11px] text-slate-500">قبل: <strong class="tabular-nums">{{ formatCompactIQD(r.mBefore) }}</strong></div>
            <div class="text-lg font-extrabold tabular-nums">{{ formatCompactIQD(r.mAfter) }}</div>
          </div>
          <div class="card p-4">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-bold text-slate-500">إيراد المنصة</span>
              <span class="rounded-md px-2 py-0.5 text-xs font-extrabold tabular-nums" :class="deltaCls(r.pDelta)">{{ signed(r.pDelta) }}</span>
            </div>
            <div class="mt-2 text-[11px] text-slate-500">قبل: <strong class="tabular-nums">{{ formatCompactIQD(r.pBefore) }}</strong></div>
            <div class="text-lg font-extrabold tabular-nums">{{ formatCompactIQD(r.pAfter) }}</div>
          </div>
        </div>

        <div class="card p-4">
          <h2 class="mb-3 text-sm font-extrabold">مقارنة قبل الحملة وبعدها (مليون د.ع)</h2>
          <BarChart :data="chartData" :options="barOptions()" :label="chartLabel" height-class="h-60" />
        </div>

        <div class="card space-y-2 p-4">
          <h2 class="text-sm font-extrabold">إرسال العرض إلى التاجر</h2>
          <p v-if="!r.isWinWin" class="text-[11px] font-bold text-amber-800">تنبيه: هذه الصفقة لا تربح بها الجهتان معاً.</p>
          <label class="label" for="c-note">ملاحظة اختيارية للتاجر</label>
          <input id="c-note" v-model="note" class="field" maxlength="200" placeholder="مثال: حملة نزول رواتب المتقاعدين" />
          <button type="button" class="btn-primary" @click="send">إرسال العرض إلى {{ c.storeName }}</button>
        </div>
      </section>
    </div>
  </div>
</template>
