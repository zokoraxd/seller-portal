<script setup>
import { computed, reactive, ref } from 'vue'
import { useToast } from '@/composables/useToast'
import { formatDecimal } from '@/core/format'
import { CATEGORIES, SEGMENTS, STATUS_LABEL, commitRows, validateRows } from '@/core/ledger'
import { useAppStore } from '@/stores/app'

const CITIES = ['بغداد', 'البصرة', 'أربيل', 'الموصل', 'النجف', 'كربلاء', 'السليمانية', 'دهوك', 'كركوك']
const PAYMENTS = ['تقسيط', 'بطاقة مصرفية', 'دفع عند الاستلام']

const app = useAppStore()
const { show } = useToast()
const forcedStore = computed(() => (app.role === 'merchant' ? app.activeMerchantName : null))

const blank = () => ({
  store_name: forcedStore.value ?? '',
  category: CATEGORIES[0],
  city: CITIES[0],
  order_date: new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD in local time
  units_sold: 1,
  buy_cost_iqd: '',
  sell_price_iqd: '',
  status: 'delivered',
  delivery_hours: 24,
  customer_segment: SEGMENTS[0],
  payment_method: PAYMENTS[1],
})
const form = reactive(blank())
const problem = ref('')

const marginPct = computed(() => {
  const buy = Number(form.buy_cost_iqd) || 0
  const sell = Number(form.sell_price_iqd) || 0
  return sell > 0 ? ((sell - buy) / sell) * 100 : 0
})

function submit() {
  problem.value = ''
  const [row] = validateRows([{ ...form }], { forcedStore: forcedStore.value, existing: app.ledger }).rows
  const blocking = row.issues.find((i) => i.severity === 'error' || i.severity === 'fix')
  if (blocking) return (problem.value = blocking.message)
  if (row.issues.some((i) => i.code === 'duplicate')) return (problem.value = 'هذا السجل مكرر: موجود مسبقاً بنفس المتجر والتاريخ والكمية والسعر.')

  app.addLedgerRow(commitRows([row], { idPrefix: 'tx-man' })[0])
  show(`تمت إضافة السجل لـ "${row.values.store_name}" وإعادة حساب التحليلات`, { tone: 'success' })
  Object.assign(form, { ...blank(), store_name: row.values.store_name, order_date: form.order_date })
}
</script>

<template>
  <section class="card p-4 sm:p-5" aria-labelledby="h-manual">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h2 id="h-manual" class="text-sm font-extrabold">إدخال سجل يدوي</h2>
      <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold tabular-nums" :class="marginPct < 0 ? 'text-rose-700' : 'text-emerald-700'">هامش {{ formatDecimal(marginPct) }}%</span>
    </div>

    <form class="grid grid-cols-2 gap-3 md:grid-cols-4" @submit.prevent="submit">
      <div class="col-span-2">
        <label class="label" for="m-store">اسم المتجر</label>
        <input id="m-store" v-model="form.store_name" class="field" list="m-stores" :readonly="Boolean(forcedStore)" required maxlength="120" />
        <datalist id="m-stores"><option v-for="s in app.stores" :key="s.name" :value="s.name" /></datalist>
      </div>
      <div>
        <label class="label" for="m-cat">القطاع</label>
        <select id="m-cat" v-model="form.category" class="field"><option v-for="c in CATEGORIES" :key="c">{{ c }}</option></select>
      </div>
      <div>
        <label class="label" for="m-city">المحافظة</label>
        <input id="m-city" v-model="form.city" class="field" list="m-cities" maxlength="60" />
        <datalist id="m-cities"><option v-for="c in CITIES" :key="c" :value="c" /></datalist>
      </div>
      <div>
        <label class="label" for="m-date">التاريخ</label>
        <input id="m-date" v-model="form.order_date" type="date" class="field" required />
      </div>
      <div>
        <label class="label" for="m-units">الكمية</label>
        <input id="m-units" v-model.number="form.units_sold" type="number" min="1" class="field" required />
      </div>
      <div>
        <label class="label" for="m-buy">كلفة الشراء (د.ع)</label>
        <input id="m-buy" v-model="form.buy_cost_iqd" type="number" min="0" class="field" required />
      </div>
      <div>
        <label class="label" for="m-sell">سعر البيع (د.ع)</label>
        <input id="m-sell" v-model="form.sell_price_iqd" type="number" min="1" class="field" required />
      </div>
      <div>
        <label class="label" for="m-status">الحالة</label>
        <select id="m-status" v-model="form.status" class="field"><option v-for="(l, k) in STATUS_LABEL" :key="k" :value="k">{{ l }}</option></select>
      </div>
      <div>
        <label class="label" for="m-del">مدة التوصيل (ساعة)</label>
        <input id="m-del" v-model.number="form.delivery_hours" type="number" min="1" class="field" />
      </div>
      <div>
        <label class="label" for="m-seg">شريحة المشتري</label>
        <select id="m-seg" v-model="form.customer_segment" class="field"><option v-for="s in SEGMENTS" :key="s">{{ s }}</option></select>
      </div>
      <div>
        <label class="label" for="m-pay">طريقة الدفع</label>
        <select id="m-pay" v-model="form.payment_method" class="field"><option v-for="p in PAYMENTS" :key="p">{{ p }}</option></select>
      </div>
      <div class="col-span-2 flex items-end justify-end gap-3 md:col-span-4">
        <p v-if="problem" class="me-auto text-xs font-bold text-rose-700" role="alert">{{ problem }}</p>
        <button type="submit" class="btn-primary">إضافة السجل</button>
      </div>
    </form>
  </section>
</template>
