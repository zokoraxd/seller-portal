<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'

const props = defineProps({
  storeName: { type: String, required: true },
  viewer: { type: String, required: true }, // 'admin' | 'merchant'
})

const app = useAppStore()
const thread = computed(() => app.messages.filter((m) => m.storeName === props.storeName))
const box = ref(null)

watch(
  () => thread.value.length,
  async () => {
    await nextTick()
    if (box.value) box.value.scrollTop = box.value.scrollHeight
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <div ref="box" class="space-y-2.5 overflow-y-auto" role="log" tabindex="0" aria-label="المحادثة">
    <p v-if="thread.length === 0" class="py-8 text-center text-xs text-slate-500">لا توجد رسائل بعد. ابدأ المحادثة أدناه.</p>
    <div v-for="m in thread" :key="m.id" class="flex flex-col" :class="m.sender === viewer ? 'items-start' : 'items-end'">
      <div
        class="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed"
        :class="m.sender === viewer ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-800'"
      >
        <div class="mb-0.5 text-[10px] font-bold opacity-70">{{ m.sender === 'admin' ? 'إدارة المنصة' : storeName }} • {{ m.time }}</div>
        <div>{{ m.text }}</div>
      </div>
    </div>
  </div>
</template>
