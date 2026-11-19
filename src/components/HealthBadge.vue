<script setup>
import { computed } from 'vue'
import { getHealthBadge } from '@/core/stores'

const props = defineProps({
  score: { type: Number, required: true },
  compact: { type: Boolean, default: false },
})
const badge = computed(() => getHealthBadge(props.score))
</script>

<template>
  <span class="rounded-lg border px-2 py-0.5 text-xs font-extrabold tabular-nums" :class="badge.cls">
    {{ score }}<template v-if="compact"> / 100</template><template v-else> • {{ badge.label }}</template>
  </span>
</template>
