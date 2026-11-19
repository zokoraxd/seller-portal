<script setup>
import { computed } from 'vue'
import ImportPanel from '@/components/ImportPanel.vue'
import LedgerTable from '@/components/LedgerTable.vue'
import ManualEntryForm from '@/components/ManualEntryForm.vue'
import { useToast } from '@/composables/useToast'
import { formatNumber } from '@/core/format'
import { downloadXlsx } from '@/lib/files'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const { show } = useToast()

const isMerchant = computed(() => app.role === 'merchant')
const visible = computed(() => (isMerchant.value ? app.ledger.filter((t) => t.store_name === app.activeMerchantName) : app.ledger))

async function exportLedger() {
  await downloadXlsx(visible.value, 'processed-ledger.xlsx', 'Ledger')
  show('تم تنزيل السجل المعالَج', { tone: 'success' })
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-xl font-extrabold">
          {{ isMerchant ? `رفع وإدخال بيانات البيع — ${app.activeMerchantName}` : 'بوابة إدخال ومعالجة بيانات البيع والشراء' }}
        </h1>
        <p class="text-xs text-slate-500">ارفع ملفاً (Excel / CSV / JSON) أو الصق جدولاً. تُراجَع كل الصفوف قبل اعتمادها.</p>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold tabular-nums text-slate-600">{{ formatNumber(visible.length) }} سجل معالَج</span>
        <button type="button" class="btn-ghost" @click="exportLedger">تصدير السجل (Excel)</button>
      </div>
    </header>

    <ImportPanel />
    <ManualEntryForm />
    <LedgerTable :rows="visible" />
  </div>
</template>
