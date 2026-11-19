<script setup>
import { Doughnut } from 'vue-chartjs'
import '@/lib/charts'

defineProps({
  data: { type: Object, required: true },
  options: { type: Object, required: true },
  label: { type: String, required: true },
  heightClass: { type: String, default: 'h-64' },
})
</script>

<template>
  <div class="relative w-full" :class="heightClass" role="img" :aria-label="label">
    <Doughnut :data="data" :options="options" role="presentation" aria-hidden="true" />
  </div>
</template>
