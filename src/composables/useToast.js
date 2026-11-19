import { ref } from 'vue'

// Module-level state, so every component shares one toast list.
const toasts = ref([])
let nextId = 1

export function useToast() {
  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  /** @param {string} message @param {{tone?: 'dark'|'success'|'error', actionLabel?: string, onAction?: Function}} opts */
  function show(message, { tone = 'dark', actionLabel = null, onAction = null } = {}) {
    const id = nextId++
    toasts.value.push({ id, message, tone, actionLabel, onAction })
    setTimeout(() => dismiss(id), actionLabel ? 5500 : 3200)
  }

  return { toasts, show, dismiss }
}
