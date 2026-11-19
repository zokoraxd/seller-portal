<script setup>
import { computed } from 'vue'
import { formatCompactIQD, formatIQD, formatNumber } from '@/core/format'
import { STATUS_LABEL } from '@/core/ledger'
import { CYCLE_LABEL, getCycleFromDate } from '@/core/radar'

const props = defineProps({ rows: { type: Array, required: true } })
const recent = computed(() => props.rows.slice(-20).reverse())
const profit = (t) => (t.status === 'returned' ? 0 : t.units_sold * (t.sell_price_iqd - t.buy_cost_iqd))
</script>

<template>
  <section class="card overflow-hidden" aria-labelledby="h-ledger">
    <div class="border-b border-slate-100 p-4">
      <h2 id="h-ledger" class="text-sm font-extrabold">آخر السجلات المعالَجة</h2>
    </div>
    <p v-if="recent.length === 0" class="p-8 text-center text-sm text-slate-500">لا توجد سجلات بعد. ارفع ملفاً أو أضف سجلاً يدوياً.</p>
    <div v-else class="overflow-x-auto" tabindex="0" role="region" aria-label="جدول السجلات (قابل للتمرير)">
      <table class="w-full min-w-[44rem] text-xs">
        <thead class="bg-slate-50 text-slate-500">
          <tr>
            <th scope="col" class="px-4 py-2 text-start font-bold">المتجر</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">التاريخ</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">الكمية</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">الشراء</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">البيع</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">الربح</th>
            <th scope="col" class="px-3 py-2 text-start font-bold">الشريحة • الدفع</th>
            <th scope="col" class="px-4 py-2 text-start font-bold">الحالة</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="t in recent" :key="t.id" class="hover:bg-slate-50/70">
            <td class="px-4 py-2 font-bold">{{ t.store_name }}</td>
            <td class="px-3 py-2">
              <span class="font-semibold tabular-nums" dir="ltr">{{ t.order_date }}</span>
              <span class="ms-1 text-[10px] text-slate-500">({{ CYCLE_LABEL[getCycleFromDate(t.order_date)] }})</span>
            </td>
            <td class="px-3 py-2 font-bold tabular-nums">{{ formatNumber(t.units_sold) }}</td>
            <td class="px-3 py-2 tabular-nums">{{ formatIQD(t.buy_cost_iqd) }}</td>
            <td class="px-3 py-2 tabular-nums">{{ formatIQD(t.sell_price_iqd) }}</td>
            <td class="px-3 py-2 font-extrabold tabular-nums" :class="profit(t) > 0 ? 'text-emerald-700' : 'text-slate-500'">{{ formatCompactIQD(profit(t)) }}</td>
            <td class="px-3 py-2 text-[11px] text-slate-600">{{ t.customer_segment }} • {{ t.payment_method }}</td>
            <td class="px-4 py-2">
              <span class="rounded px-2 py-0.5 text-[10px] font-extrabold" :class="t.status === 'returned' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'">{{ STATUS_LABEL[t.status] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
