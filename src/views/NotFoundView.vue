<script setup>
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { DEFAULT_ROUTE } from '@/router'

const app = useAppStore()
const router = useRouter()
const home = () => router.push({ name: app.role ? DEFAULT_ROUTE[app.role] : 'entry' })
</script>

<template>
  <section class="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-3 text-center">
    <p class="text-5xl font-extrabold tabular-nums text-brand" aria-hidden="true">404</p>
    <h1 class="text-xl font-extrabold">الصفحة غير موجودة</h1>
    <p class="text-sm text-slate-600">الرابط الذي فتحته غير صحيح أو لم يعد متاحاً.</p>
    <button type="button" class="btn-primary mt-2" @click="home">العودة إلى الرئيسية</button>
  </section>
</template>
