<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ChatThread from '@/components/ChatThread.vue'
import { useToast } from '@/composables/useToast'
import { FUNDING_LABEL } from '@/core/deal'
import { formatCompactIQD, formatNumber } from '@/core/format'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { show } = useToast()
const draft = ref('')

const name = computed(() => app.activeMerchantName)
const myOffers = computed(() => app.offers.filter((o) => o.storeName === name.value))

const status = {
  accepted: { text: 'تم قبول العرض ✓', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  countered: { text: 'طُلب تعديل النسبة', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  pending: { text: 'بانتظار ردك', cls: 'bg-brand-soft text-brand-ink border-brand-border' },
}

onMounted(() => app.markRead(name.value))

function respond(offer, response) {
  app.respondToOffer(offer.id, response)
  show(response === 'accepted' ? 'تم قبول العرض وإشعار إدارة المنصة فوراً' : 'تم إرسال طلب التعديل إلى إدارة المنصة', {
    tone: 'success',
    actionLabel: 'عرض رد الإدارة',
    onAction: () => {
      const store = offer.storeName
      app.enterAs('admin')
      router.push({ name: 'admin-analytics' })
      app.openHub('messages', store)
    },
  })
}

function send() {
  const text = draft.value.trim()
  if (!text) return
  app.pushMessage({ storeName: name.value, sender: 'merchant', text })
  draft.value = ''
  show('تم إرسال رسالتك إلى إدارة المنصة', { tone: 'success' })
}
</script>

<template>
  <div class="space-y-5">
    <header>
      <h1 class="text-xl font-extrabold">العروض والتواصل مع إدارة المنصة</h1>
      <p class="text-xs text-slate-500">{{ name }}</p>
    </header>

    <div class="grid gap-4 lg:grid-cols-5">
      <section class="space-y-3 lg:col-span-3" aria-labelledby="h-offers">
        <h2 id="h-offers" class="text-sm font-extrabold">العروض الترويجية المشتركة الواردة</h2>
        <p v-if="myOffers.length === 0" class="card p-6 text-center text-xs text-slate-500">لا توجد عروض خصم مشترك مرسلة لمتجرك حالياً. يمكنك طلب حملة من خلال المحادثة المباشرة.</p>

        <article v-for="o in myOffers" :key="o.id" class="card space-y-3 p-4">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-extrabold">عرض خصم مشترك {{ o.totalDiscountPct }}%</span>
            <span class="rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold" :class="status[o.status].cls">{{ status[o.status].text }}</span>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="rounded-xl bg-slate-50 p-2"><div class="text-[10px] text-slate-500">حصتك</div><strong class="tabular-nums">{{ o.merchantSharePct }}%</strong></div>
            <div class="rounded-xl bg-brand-soft p-2"><div class="text-[10px] text-brand-ink">دعم المنصة</div><strong class="tabular-nums text-brand">{{ o.platformSharePct }}%</strong></div>
            <div class="rounded-xl bg-emerald-50 p-2">
              <div class="text-[10px] text-emerald-700">تغير الربح المتوقع</div>
              <strong class="tabular-nums" :class="o.projectedMerchantProfitDelta >= 0 ? 'text-emerald-800' : 'text-rose-700'">
                {{ o.projectedMerchantProfitDelta >= 0 ? '+' : '' }}{{ formatCompactIQD(o.projectedMerchantProfitDelta) }}
              </strong>
            </div>
          </div>
          <div class="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
            <strong>آلية الدعم:</strong> {{ FUNDING_LABEL[o.fundingSource] ?? o.fundingSource }} • <strong>الطلبات الإضافية:</strong> +{{ formatNumber(o.projectedExtraUnits ?? 0) }} طلب
            <div v-if="o.note" class="mt-1 text-slate-700">"{{ o.note }}"</div>
          </div>
          <div v-if="o.status === 'pending'" class="grid grid-cols-2 gap-2 pt-1">
            <button type="button" class="rounded-xl bg-emerald-600 py-2 text-xs font-extrabold text-white hover:bg-emerald-700" @click="respond(o, 'accepted')">قبول العرض وتفعيله</button>
            <button type="button" class="rounded-xl border border-slate-300 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50" @click="respond(o, 'countered')">طلب تعديل النسبة</button>
          </div>
        </article>
      </section>

      <section class="card flex min-h-[24rem] flex-col p-4 lg:col-span-2" aria-labelledby="h-chat">
        <h2 id="h-chat" class="mb-3 text-sm font-extrabold">المحادثة المباشرة مع إدارة المنصة</h2>
        <ChatThread class="min-h-0 flex-1 rounded-xl bg-slate-50 p-3" :store-name="name" viewer="merchant" />
        <form class="mt-3 flex gap-2" @submit.prevent="send">
          <input v-model="draft" class="field" placeholder="اكتب رسالة…" aria-label="الرسالة" maxlength="500" />
          <button type="submit" class="btn-primary shrink-0">إرسال</button>
        </form>
      </section>
    </div>
  </div>
</template>
