<script setup>
import { computed, ref, shallowRef } from 'vue'
import { useToast } from '@/composables/useToast'
import { formatIQD, formatNumber } from '@/core/format'
import { analyzeHeaders } from '@/core/headers'
import { STATUS_LABEL, applyFix, commitRows, markDuplicates, summarize, validateRows } from '@/core/ledger'
import { messyRows, templateRows } from '@/core/samples'
import { parseDelimited } from '@/core/tabular'
import { ACCEPTED, downloadCsv, downloadXlsx, readRowsFromFile } from '@/lib/files'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const { show } = useToast()

const FIELD_LABEL = {
  store_name: 'المتجر',
  category: 'القطاع',
  city: 'المحافظة',
  order_date: 'التاريخ',
  units_sold: 'الكمية',
  buy_cost_iqd: 'كلفة الشراء',
  sell_price_iqd: 'سعر البيع',
  status: 'الحالة',
  delivery_hours: 'مدة التوصيل',
  customer_segment: 'الشريحة',
  payment_method: 'طريقة الدفع',
}
const SAMPLE_STORE = 'معرض النور للأجهزة'

const staged = shallowRef([]) // reviewed rows waiting for approval
const headerInfo = ref(null)
const source = ref('')
const pasted = ref('')
const mode = ref('append')
const skipDuplicates = ref(true)
const view = ref('problems') // 'problems' | 'all'
const limit = ref(50)
const dragging = ref(false)
const busy = ref(false)
const error = ref('')

const isAdmin = computed(() => app.role === 'admin')
const forcedStore = computed(() => (app.role === 'merchant' ? app.activeMerchantName : null))
const summary = computed(() => summarize(staged.value))
const hasDuplicate = (r) => r.issues.some((i) => i.code === 'duplicate')
const commitCount = computed(() => staged.value.filter((r) => !r.blocked && !(skipDuplicates.value && hasDuplicate(r))).length)

const shown = computed(() => {
  const all = staged.value.map((row, index) => ({ row, index }))
  const list = view.value === 'problems' ? all.filter(({ row }) => row.issues.length > 0) : all
  return list.slice(0, limit.value)
})
const hiddenCount = computed(() => (view.value === 'problems' ? staged.value.filter((r) => r.issues.length).length : staged.value.length) - shown.value.length)

function stage(rawRows, label) {
  error.value = ''
  if (!rawRows.length) {
    error.value = 'لا توجد صفوف بيانات. تأكد من وجود سطر العناوين وصف واحد على الأقل.'
    return
  }
  try {
    const { rows } = validateRows(rawRows, { forcedStore: forcedStore.value, existing: app.ledger })
    staged.value = rows
    headerInfo.value = analyzeHeaders(rawRows, { forcedStore: Boolean(forcedStore.value) })
    source.value = label
    limit.value = 50
    view.value = rows.some((r) => r.issues.length) ? 'problems' : 'all'
  } catch (e) {
    error.value = e.message
  }
}

async function handleFile(file) {
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    stage(await readRowsFromFile(file), file.name)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}

const onPick = (e) => {
  handleFile(e.target.files[0])
  e.target.value = ''
}
const onDrop = (e) => {
  dragging.value = false
  handleFile(e.dataTransfer.files[0])
}

const parsePasted = () => (pasted.value.trim() ? stage(parseDelimited(pasted.value), 'بيانات ملصقة') : (error.value = 'الصق البيانات أولاً.'))
const loadMessy = () => stage(messyRows(forcedStore.value ?? SAMPLE_STORE), 'عينة غير مرتبة (تجريبية)')

// A fixed row may now duplicate another one, so duplicates are re-checked after each fix.
function fix(index, field, value) {
  const next = staged.value.map((r, i) => (i === index ? applyFix(r, field, value) : r))
  staged.value = markDuplicates(next, app.ledger)
}
const label = (field, opt) => (field === 'status' ? STATUS_LABEL[opt] : opt)

function clear() {
  staged.value = []
  headerInfo.value = null
  pasted.value = ''
  error.value = ''
}

function commit() {
  const rows = commitRows(staged.value, { skipDuplicates: skipDuplicates.value })
  if (!rows.length) return
  if (mode.value === 'replace' && isAdmin.value && !window.confirm('سيتم استبدال كل السجلات الحالية بالسجلات الجديدة. هل أنت متأكد؟')) return
  const n = app.commitRows(rows, mode.value)
  const skipped = staged.value.length - n
  clear()
  show(`تم اعتماد ${formatNumber(n)} سجل وتحديث كل التحليلات${skipped ? ` • استُبعد ${formatNumber(skipped)}` : ''}`, { tone: 'success' })
}

const templateStore = computed(() => forcedStore.value ?? SAMPLE_STORE)
const getTemplateXlsx = () => downloadXlsx(templateRows(templateStore.value), 'sales-template.xlsx', 'Template')
const getTemplateCsv = () => downloadCsv(templateRows(templateStore.value), 'sales-template.csv')
</script>

<template>
  <section class="card p-4 sm:p-5" aria-labelledby="h-import">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id="h-import" class="text-sm font-extrabold">استيراد ومراجعة البيانات</h2>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn-ghost" @click="getTemplateXlsx">قالب Excel</button>
        <button type="button" class="btn-ghost" @click="getTemplateCsv">قالب CSV</button>
        <button type="button" class="btn-ghost !border-brand-border !bg-brand-soft !text-brand-ink" @click="loadMessy">جرّب عينة غير مرتبة</button>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-2">
      <label
        class="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed p-6 text-center focus-within:border-brand"
        :class="dragging ? 'border-brand bg-brand-soft/40' : 'border-slate-300 hover:border-slate-400'"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop.prevent="onDrop"
      >
        <input type="file" class="sr-only" :accept="ACCEPTED" @change="onPick" />
        <span class="text-sm font-extrabold">{{ busy ? 'جارٍ القراءة…' : 'اسحب ملفاً هنا أو اضغط للاختيار' }}</span>
        <span class="text-[11px] text-slate-500">.xlsx .xls .csv .json — حتى 5 ميغابايت، 20 ألف صف</span>
        <span class="text-[11px] font-bold text-amber-800">عرض تجريبي: لا ترفع بيانات حقيقية لعملاء أو شركات.</span>
      </label>

      <div class="flex flex-col gap-2">
        <label class="label !mb-0" for="paste-area">أو الصق جدولاً (من Excel أو CSV)</label>
        <textarea id="paste-area" v-model="pasted" rows="4" class="field font-mono text-xs" dir="auto" placeholder="اسم المتجر,الكمية,سعر الشراء,سعر البيع,التاريخ…" />
        <button type="button" class="btn-dark self-start" @click="parsePasted">فحص البيانات الملصقة</button>
      </div>
    </div>

    <p v-if="error" class="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800" role="alert">{{ error }}</p>

    <!-- Review -->
    <div v-if="staged.length" class="mt-5 space-y-4">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="font-extrabold">{{ source }}</span>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 font-bold tabular-nums">{{ formatNumber(summary.total) }} صف</span>
        <span class="rounded-full bg-emerald-50 px-2.5 py-1 font-bold tabular-nums text-emerald-700">{{ formatNumber(summary.ready) }} جاهز</span>
        <span v-if="summary.needsFix" class="rounded-full bg-amber-50 px-2.5 py-1 font-bold tabular-nums text-amber-800">{{ summary.needsFix }} يحتاج اختيارك</span>
        <span v-if="summary.errors" class="rounded-full bg-rose-50 px-2.5 py-1 font-bold tabular-nums text-rose-700">{{ summary.errors }} خطأ (سيُستبعد)</span>
        <span v-if="summary.warnings" class="rounded-full bg-slate-100 px-2.5 py-1 font-bold tabular-nums text-slate-600">{{ summary.warnings }} تنبيه</span>
        <span v-if="summary.duplicates" class="rounded-full bg-slate-100 px-2.5 py-1 font-bold tabular-nums text-slate-600">{{ summary.duplicates }} مكرر</span>
      </div>

      <div v-if="headerInfo" class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <div class="mb-1.5 font-extrabold">كيف فُهمت الأعمدة</div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="m in headerInfo.mapped" :key="m.raw" class="rounded-lg bg-white px-2 py-1 font-bold ring-1 ring-slate-200">
            {{ m.raw }} <span class="text-slate-500">←</span> <span class="text-brand-ink">{{ FIELD_LABEL[m.canonical] }}</span>
          </span>
        </div>
        <p v-if="headerInfo.unmapped.length" class="mt-2 text-slate-500">أعمدة تم تجاهلها: {{ headerInfo.unmapped.join('، ') }}</p>
        <p v-if="headerInfo.missingRequired.length" class="mt-2 font-bold text-rose-700" role="alert">
          أعمدة مطلوبة غير موجودة: {{ headerInfo.missingRequired.map((f) => FIELD_LABEL[f]).join('، ') }} — ستُرفض الصفوف التي تحتاجها.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex rounded-xl bg-slate-100 p-0.5 text-xs" role="group" aria-label="عرض الصفوف">
          <button type="button" class="rounded-lg px-3 py-1 font-bold" :class="view === 'problems' ? 'bg-white shadow-sm' : 'text-slate-600'" @click="view = 'problems'">المشاكل فقط</button>
          <button type="button" class="rounded-lg px-3 py-1 font-bold" :class="view === 'all' ? 'bg-white shadow-sm' : 'text-slate-600'" @click="view = 'all'">كل الصفوف</button>
        </div>
      </div>

      <p v-if="shown.length === 0" class="rounded-xl bg-emerald-50 p-4 text-center text-sm font-bold text-emerald-800">لا توجد مشاكل في الصفوف 🎉</p>
      <div v-else class="overflow-x-auto rounded-xl border border-slate-200" tabindex="0" role="region" aria-label="صفوف الملف للمراجعة">
        <table class="w-full min-w-[56rem] text-xs">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">#</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">المتجر</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">القطاع</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">التاريخ</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">الكمية</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">الشراء</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">البيع</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">الحالة</th>
              <th scope="col" class="px-2.5 py-2 text-start font-bold">الملاحظات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="{ row, index } in shown" :key="index" :class="row.blocked ? 'bg-rose-50/40' : ''">
              <td class="px-2.5 py-2 tabular-nums text-slate-500">{{ row.rowNum }}</td>
              <td class="px-2.5 py-2 font-bold">{{ row.values.store_name || '—' }}</td>
              <td class="px-2.5 py-2">{{ row.values.category ?? '—' }}</td>
              <td class="px-2.5 py-2 tabular-nums" dir="ltr">{{ row.values.order_date ?? '—' }}</td>
              <td class="px-2.5 py-2 tabular-nums">{{ row.values.units_sold ?? '—' }}</td>
              <td class="px-2.5 py-2 tabular-nums">{{ row.values.buy_cost_iqd === null ? '—' : formatIQD(row.values.buy_cost_iqd) }}</td>
              <td class="px-2.5 py-2 tabular-nums">{{ row.values.sell_price_iqd === null ? '—' : formatIQD(row.values.sell_price_iqd) }}</td>
              <td class="px-2.5 py-2">{{ row.values.status ? STATUS_LABEL[row.values.status] : '—' }}</td>
              <td class="px-2.5 py-2">
                <ul class="space-y-1">
                  <li v-for="issue in row.issues" :key="issue.code + issue.field" class="flex flex-wrap items-center gap-1.5">
                    <span
                      class="rounded px-1.5 py-0.5 font-bold"
                      :class="issue.severity === 'error' ? 'bg-rose-100 text-rose-800' : issue.severity === 'fix' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'"
                    >
                      {{ issue.message }}
                    </span>
                    <select
                      v-if="issue.severity === 'fix'"
                      class="rounded-lg border border-amber-300 bg-white px-1.5 py-0.5 font-bold"
                      :aria-label="`اختر قيمة: ${issue.message}`"
                      @change="fix(index, issue.field, $event.target.value)"
                    >
                      <option value="" selected disabled>اختر…</option>
                      <option v-for="opt in issue.options" :key="opt" :value="opt">{{ label(issue.field, opt) }}</option>
                    </select>
                  </li>
                </ul>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <button v-if="hiddenCount > 0" type="button" class="btn-ghost" @click="limit += 100">عرض المزيد ({{ formatNumber(hiddenCount) }})</button>

      <div class="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <label v-if="isAdmin" class="flex items-center gap-2 text-xs font-bold">
          الوضع
          <select v-model="mode" class="field !w-auto !py-1.5 text-xs">
            <option value="append">إضافة إلى السجل الحالي</option>
            <option value="replace">استبدال كل السجل</option>
          </select>
        </label>
        <label class="flex items-center gap-2 text-xs font-bold">
          <input v-model="skipDuplicates" type="checkbox" class="h-4 w-4 accent-[rgb(var(--brand-primary))]" />
          تخطي المكرر
        </label>
        <div class="ms-auto flex gap-2">
          <button type="button" class="btn-ghost" @click="clear">إلغاء</button>
          <button type="button" class="btn-primary" :disabled="commitCount === 0" @click="commit">اعتماد {{ formatNumber(commitCount) }} سجل</button>
        </div>
      </div>
    </div>
  </section>
</template>
