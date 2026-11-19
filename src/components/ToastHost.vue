<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const tones = {
  success: 'border-emerald-700 bg-emerald-900 text-white',
  error: 'border-rose-700 bg-rose-900 text-white',
  dark: 'border-slate-700 bg-slate-900 text-white',
}

function act(t) {
  t.onAction?.()
  dismiss(t.id)
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
    <TransitionGroup name="fade">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-bold shadow-lg"
        :class="tones[t.tone] ?? tones.dark"
      >
        <span>{{ t.message }}</span>
        <button v-if="t.actionLabel" type="button" class="shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-extrabold text-slate-900" @click="act(t)">
          {{ t.actionLabel }}
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>
