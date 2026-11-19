<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppNav from '@/components/AppNav.vue'
import HubDrawer from '@/components/HubDrawer.vue'
import ToastHost from '@/components/ToastHost.vue'
import { navCount } from '@/router'

const route = useRoute()
const showShell = computed(() => Boolean(route.meta.role))
const main = ref(null)

// After an in-app navigation, move focus to the main region so keyboard and screen-reader
// users land on the new page instead of being left on the old link.
watch(navCount, async () => {
  await nextTick()
  main.value?.focus({ preventScroll: true })
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-[80] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      @click.prevent="main?.focus()"
    >
      تخطي إلى المحتوى
    </a>

    <template v-if="showShell">
      <AppHeader />
      <AppNav />
    </template>

    <main id="main" ref="main" tabindex="-1" class="mx-auto w-full max-w-7xl flex-1 px-4 py-5 focus:outline-none sm:px-6">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <footer class="border-t border-slate-200 bg-white px-4 py-3 text-center text-[11px] text-slate-600">
      نموذج مفاهيمي غير رسمي — ليس مرتبطاً بأي شركة حقيقية. جميع المتاجر والأرقام والمحادثات تجريبية ومتخيَّلة.
    </footer>

    <HubDrawer v-if="showShell" />
    <ToastHost />
  </div>
</template>
