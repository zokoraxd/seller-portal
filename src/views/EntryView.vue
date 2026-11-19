<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { DEFAULT_ROUTE } from '@/router'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const router = useRouter()
const { show } = useToast()
const merchant = ref(app.activeMerchantName)

function enter(role) {
  app.enterAs(role, role === 'merchant' ? merchant.value : undefined)
  router.push({ name: DEFAULT_ROUTE[role] })
  show(role === 'admin' ? 'تم الدخول إلى لوحة إدارة المنصة' : `أهلاً بك في بوابة متجر: ${app.activeMerchantName}`, { tone: 'success' })
}
</script>

<template>
  <div class="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center gap-6 py-6">
    <div class="text-center">
      <div class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl font-extrabold text-white" aria-hidden="true">س</div>
      <h1 class="text-balance text-2xl font-extrabold">بوابة التاجر وإدارة المنصة</h1>
      <p class="mx-auto mt-2 max-w-xl text-pretty text-sm text-slate-600">
        نموذج مفاهيمي يحوّل جداول المبيعات الفوضوية إلى بيانات نظيفة، ويحسب إن كانت حملة الخصم المشترك تربّح التاجر والمنصة معاً.
      </p>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      <section class="card flex flex-col gap-3 p-5" aria-labelledby="admin-h">
        <h2 id="admin-h" class="text-base font-extrabold">دخول مشرف المنصة</h2>
        <p class="text-xs leading-relaxed text-slate-600">تحليلات كل المتاجر، معالجة البيانات، حاسبة الخصم المشترك ورادار الرواتب.</p>
        <button type="button" class="btn-dark mt-auto !py-2.5" @click="enter('admin')">الدخول كمشرف</button>
      </section>

      <section class="card flex flex-col gap-3 p-5" aria-labelledby="merchant-h">
        <h2 id="merchant-h" class="text-base font-extrabold">دخول صاحب المتجر</h2>
        <div>
          <label class="label" for="entry-store">اختر المتجر</label>
          <select id="entry-store" v-model="merchant" class="field">
            <option v-for="s in app.stores" :key="s.name" :value="s.name">{{ s.name }}</option>
          </select>
        </div>
        <button type="button" class="btn-primary mt-auto !py-2.5" @click="enter('merchant')">الدخول كتاجر</button>
      </section>
    </div>

    <p class="text-center text-[11px] text-slate-500">دخول تجريبي بلا كلمة مرور: لا توجد مصادقة حقيقية في هذا النموذج، والبيانات تُحفظ في متصفحك فقط.</p>
  </div>
</template>
