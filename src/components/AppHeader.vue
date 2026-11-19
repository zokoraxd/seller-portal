<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { DEFAULT_ROUTE } from '@/router'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { show } = useToast()

const chip = computed(() => {
  if (app.dataMode === 'remote') {
    return {
      text: 'متصل بالخادم',
      title: 'بياناتك محفوظة في مساحة عمل خاصة بك على الخادم، ومعزولة عن بقية الزوار.',
      cls: 'border-emerald-200 bg-emerald-50 text-emerald-800',
      dot: 'bg-emerald-600',
    }
  }
  const unreachable = app.localReason === 'unreachable'
  return {
    text: unreachable ? 'وضع محلي (الخادم غير متاح)' : 'وضع محلي',
    title: unreachable
      ? 'تعذّر الاتصال بالخادم، فالتطبيق يعمل ببيانات محفوظة في متصفحك فقط.'
      : 'لم يُضبط خادم: البيانات تُحفظ في متصفحك فقط.',
    cls: 'border-slate-200 bg-slate-50 text-slate-700',
    dot: 'bg-slate-500',
  }
})

function switchRole(role) {
  if (app.role === role) return
  app.enterAs(role)
  router.push({ name: DEFAULT_ROUTE[role] })
}

function signOut() {
  app.signOut()
  router.push({ name: 'entry' })
}

function reset() {
  if (!window.confirm('سيتم حذف كل البيانات التي أضفتها واستعادة البيانات التجريبية. هل تريد المتابعة؟')) return
  app.resetDemo()
  router.push({ name: DEFAULT_ROUTE[app.role] })
  show('تمت إعادة ضبط البيانات التجريبية')
}
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div class="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
      <div class="flex min-w-0 items-center gap-2.5">
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-lg font-extrabold text-white" aria-hidden="true">س</div>
        <div class="min-w-0 leading-tight">
          <div class="truncate text-sm font-extrabold">بوابة التاجر وإدارة المنصة</div>
          <div class="hidden text-[11px] text-slate-500 sm:block">نموذج مفاهيمي — بيانات تجريبية</div>
        </div>
      </div>

      <div class="ms-auto flex flex-wrap items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold" :class="chip.cls" :title="chip.title">
          <span class="h-1.5 w-1.5 rounded-full" :class="chip.dot" aria-hidden="true" />
          {{ chip.text }}
        </span>

        <div class="flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="تبديل الدور">
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-extrabold"
            :class="app.role === 'admin' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            :aria-pressed="app.role === 'admin'"
            @click="switchRole('admin')"
          >
            إدارة المنصة
          </button>
          <button
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-extrabold"
            :class="app.role === 'merchant' ? 'bg-brand text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'"
            :aria-pressed="app.role === 'merchant'"
            @click="switchRole('merchant')"
          >
            بوابة التاجر
          </button>
        </div>

        <select
          v-if="app.role === 'merchant'"
          class="field !w-auto max-w-[11rem] !py-1.5 text-xs font-bold"
          :value="app.activeMerchantName"
          aria-label="المتجر"
          @change="app.selectMerchant($event.target.value)"
        >
          <option v-for="s in app.stores" :key="s.name" :value="s.name">{{ s.name }}</option>
        </select>

        <button type="button" class="btn-ghost relative" @click="app.openHub()">
          {{ app.role === 'admin' ? 'التواصل والمهام' : 'الرسائل' }}
          <span v-if="app.unreadCount" class="min-w-[1.25rem] rounded-full bg-brand px-1.5 text-center text-[10px] font-extrabold text-white tabular-nums">{{ app.unreadCount }}</span>
        </button>

        <button type="button" class="btn-ghost" title="استعادة البيانات التجريبية" @click="reset">إعادة ضبط</button>
        <button type="button" class="btn-ghost" @click="signOut">خروج</button>
      </div>
    </div>
    <p v-if="app.syncFailed" role="alert" class="bg-rose-50 px-4 py-1 text-center text-[11px] font-bold text-rose-800">
      تعذّر حفظ بعض التغييرات على الخادم. أعد تحميل الصفحة؛ قد لا تظهر آخر تغييراتك.
    </p>
    <p v-if="app.persistFailed" class="bg-amber-50 px-4 py-1 text-center text-[11px] font-bold text-amber-800">
      تعذّر الحفظ في المتصفح (التخزين ممتلئ). التغييرات ستضيع عند إعادة تحميل الصفحة.
    </p>
  </header>
</template>
