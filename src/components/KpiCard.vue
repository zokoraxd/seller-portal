<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  sub: { type: String, default: '' },
  tone: { type: String, default: 'default' }, // default | good | brand | bad
  highlight: { type: Boolean, default: false },
})

const toneClass = { default: 'text-slate-900', good: 'text-emerald-700', brand: 'text-brand', bad: 'text-rose-700' }
</script>

<template>
  <div class="card p-4" :class="highlight ? 'border-brand-border/70 bg-brand-soft/30' : ''">
    <div class="text-xs font-bold" :class="highlight ? 'text-brand-ink' : 'text-slate-500'">{{ label }}</div>
    <div class="mt-1 text-lg font-extrabold tabular-nums sm:text-xl" :class="toneClass[tone]">{{ value }}</div>
    <div v-if="sub" class="mt-0.5 text-[11px] tabular-nums text-slate-500">{{ sub }}</div>
  </div>
</template>
