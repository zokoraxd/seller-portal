<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import ChatThread from './ChatThread.vue'

const app = useAppStore()
const draft = ref('')
const taskTitle = ref('')
const taskStore = ref('')
const taskPrio = ref('urgent')
const closeBtn = ref(null)
const drawer = ref(null)
let opener = null // element that opened the drawer; focus returns here on close

const isAdmin = computed(() => app.role === 'admin')
const storeOffers = computed(() => app.offers.filter((o) => o.storeName === app.hub.storeName).slice(0, 2))
const visibleTasks = computed(() => (isAdmin.value ? app.tasks : app.tasks.filter((t) => t.storeName === app.activeMerchantName)))

const offerStatus = {
  accepted: { text: 'مقبول ✓', cls: 'bg-emerald-100 text-emerald-800' },
  countered: { text: 'طلب تعديل', cls: 'bg-amber-100 text-amber-800' },
  pending: { text: 'بانتظار رد التاجر', cls: 'bg-brand-soft text-brand-ink' },
}

watch(
  () => app.hub.open,
  async (open) => {
    document.getElementById('app')?.toggleAttribute('inert', open) // page behind is not reachable
    if (!open) {
      opener?.focus?.()
      opener = null
      return
    }
    opener = document.activeElement
    taskStore.value ||= app.stores[0]?.name ?? ''
    app.markRead(app.hub.storeName)
    await nextTick()
    closeBtn.value?.focus()
  },
)
watch(() => app.hub.storeName, (name) => app.hub.open && app.markRead(name))

function send() {
  const text = draft.value.trim()
  if (!text) return
  app.pushMessage({ storeName: app.hub.storeName, sender: app.role, text })
  draft.value = ''
}

function addTask() {
  const title = taskTitle.value.trim()
  if (!title) return
  app.pushTask({ title, storeName: taskStore.value || app.stores[0]?.name, priority: taskPrio.value })
  taskTitle.value = ''
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function onKey(e) {
  if (!app.hub.open) return
  if (e.key === 'Escape') return app.closeHub()
  if (e.key !== 'Tab' || !drawer.value) return
  const items = [...drawer.value.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const inside = drawer.value.contains(document.activeElement)
  if (e.shiftKey && (document.activeElement === first || !inside)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
    e.preventDefault()
    first.focus()
  }
}
onMounted(() => document.addEventListener('keydown', onKey))
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  document.getElementById('app')?.removeAttribute('inert')
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="app.hub.open" class="fixed inset-0 z-40 bg-slate-900/40" @click="app.closeHub()" />
    </Transition>
    <Transition name="drawer">
      <div
        v-if="app.hub.open"
        ref="drawer"
        class="fixed inset-y-0 start-0 z-50 flex w-full max-w-md flex-col bg-white shadow-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="مركز التواصل والمهام"
      >
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 class="text-sm font-extrabold">{{ isAdmin ? 'التواصل مع التجار والمهام' : 'التواصل مع إدارة المنصة' }}</h2>
          <button ref="closeBtn" type="button" class="btn-ghost !px-2.5" aria-label="إغلاق" @click="app.closeHub()">✕</button>
        </div>

        <div class="grid grid-cols-2 gap-1 bg-slate-100 p-1 mx-4 mt-3 rounded-xl text-xs">
          <button type="button" class="rounded-lg py-1.5 font-extrabold" :class="app.hub.tab === 'messages' ? 'bg-white text-brand shadow-sm' : 'text-slate-600'" @click="app.hub.tab = 'messages'">المحادثات</button>
          <button type="button" class="rounded-lg py-1.5 font-extrabold" :class="app.hub.tab === 'tasks' ? 'bg-white text-brand shadow-sm' : 'text-slate-600'" @click="app.hub.tab = 'tasks'">المهام</button>
        </div>

        <!-- Messages -->
        <div v-if="app.hub.tab === 'messages'" class="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <div>
            <label class="label" for="hub-store">المتجر</label>
            <select id="hub-store" class="field" :disabled="!isAdmin" :value="app.hub.storeName" @change="app.hub.storeName = $event.target.value">
              <option v-for="s in app.stores" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
          <div v-if="storeOffers.length" class="space-y-1.5">
            <div v-for="o in storeOffers" :key="o.id" class="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px]">
              <span class="font-bold text-slate-700">عرض خصم {{ o.totalDiscountPct }}% ({{ o.merchantSharePct }}/{{ o.platformSharePct }})</span>
              <span class="rounded px-2 py-0.5 font-extrabold" :class="offerStatus[o.status].cls">{{ offerStatus[o.status].text }}</span>
            </div>
          </div>
          <ChatThread class="min-h-0 flex-1 rounded-xl bg-slate-50 p-3" :store-name="app.hub.storeName" :viewer="app.role" />
          <form class="flex gap-2" @submit.prevent="send">
            <input v-model="draft" class="field" placeholder="اكتب رسالة…" aria-label="الرسالة" maxlength="500" />
            <button type="submit" class="btn-primary shrink-0">إرسال</button>
          </form>
        </div>

        <!-- Tasks -->
        <div v-else class="flex min-h-0 flex-1 flex-col gap-3 p-4">
          <form v-if="isAdmin" class="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" @submit.prevent="addTask">
            <input v-model="taskTitle" class="field" placeholder="مهمة متابعة جديدة…" aria-label="عنوان المهمة" maxlength="140" />
            <div class="flex gap-2">
              <select v-model="taskStore" class="field" aria-label="المتجر">
                <option v-for="s in app.stores" :key="s.name" :value="s.name">{{ s.name }}</option>
              </select>
              <select v-model="taskPrio" class="field !w-28" aria-label="الأولوية">
                <option value="urgent">عاجل</option>
                <option value="normal">عادي</option>
              </select>
              <button type="submit" class="btn-dark shrink-0">إضافة</button>
            </div>
          </form>
          <div class="min-h-0 flex-1 space-y-2 overflow-y-auto" tabindex="0" role="region" aria-label="قائمة المهام">
            <p v-if="visibleTasks.length === 0" class="py-8 text-center text-xs text-slate-500">لا توجد مهام متابعة حالياً.</p>
            <div
              v-for="t in visibleTasks"
              :key="t.id"
              class="flex items-start gap-2.5 rounded-xl border p-3"
              :class="t.done ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-slate-200 bg-white'"
            >
              <button
                type="button"
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border"
                :class="t.done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'"
                :aria-label="t.done ? 'إلغاء الإنجاز' : 'تم الإنجاز'"
                :aria-pressed="t.done"
                @click="app.toggleTask(t.id)"
              >
                <span v-if="t.done">✓</span>
              </button>
              <div class="min-w-0 flex-1">
                <div class="text-xs font-extrabold" :class="t.done ? 'text-slate-500 line-through' : 'text-slate-900'">{{ t.title }}</div>
                <div class="mt-1.5 flex items-center gap-1.5">
                  <span class="rounded px-1.5 py-0.5 text-[10px] font-bold" :class="t.priority === 'urgent' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'">{{ t.priority === 'urgent' ? 'عاجل' : 'عادي' }}</span>
                  <span class="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand-ink">{{ t.storeName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
