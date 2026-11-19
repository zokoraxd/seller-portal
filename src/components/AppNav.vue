<script setup>
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const app = useAppStore()

const tabs = computed(() =>
  app.role === 'admin'
    ? [
        { name: 'admin-analytics', label: 'تحليلات المتاجر' },
        { name: 'admin-data', label: 'بوابة البيانات' },
        { name: 'admin-calculator', label: 'حاسبة الخصم المشترك' },
        { name: 'admin-radar', label: 'رادار الرواتب' },
      ]
    : [
        { name: 'merchant-overview', label: 'ملخص متجري' },
        { name: 'merchant-data', label: 'رفع بيانات البيع' },
        { name: 'merchant-comms', label: 'العروض والتواصل' },
      ],
)
</script>

<template>
  <nav class="border-b border-slate-200 bg-white" aria-label="التنقل الرئيسي">
    <div class="no-scrollbar mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
      <RouterLink
        v-for="t in tabs"
        :key="t.name"
        :to="{ name: t.name }"
        class="shrink-0 rounded-lg px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:text-sm"
        active-class="!bg-brand-soft !text-brand-ink !font-extrabold"
      >
        {{ t.label }}
      </RouterLink>
    </div>
  </nav>
</template>
