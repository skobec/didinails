<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
    __turnstileLoading?: Promise<void> | null
  }
}

const props = defineProps<{
  sitekey: string
}>()

const emit = defineEmits<{
  verified: [token: string]
}>()

const box = ref<HTMLElement | null>(null)
const failed = ref(false)
let widgetId: string | null = null

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (window.__turnstileLoading) return window.__turnstileLoading
  window.__turnstileLoading = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('script'))
    document.head.appendChild(s)
    // Блокировщики режут скрипт молча: не висим дольше 6 секунд.
    setTimeout(() => reject(new Error('timeout')), 6000)
  }).catch(() => {
    // Виджет недоступен (офлайн/блокировщик) — форма остаётся рабочей,
    // сервер решит сам: без секрета пустит, с секретом попросит галочку.
    failed.value = true
  })
  return window.__turnstileLoading
}

onMounted(async () => {
  try {
    await loadScript()
  } catch {
    return
  }
  if (!box.value || !window.turnstile) {
    failed.value = true
    return
  }
  try {
    widgetId = window.turnstile.render(box.value, {
      sitekey: props.sitekey,
      theme: 'light',
      size: 'compact',
      callback: (token: string) => emit('verified', token),
      'expired-callback': () => emit('verified', ''),
      'error-callback': () => emit('verified', ''),
    })
  } catch {
    failed.value = true
  }
})

onUnmounted(() => {
  try {
    if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
  } catch {
    // ignore
  }
})
</script>

<template>
  <div class="turnstile">
    <div ref="box" class="turnstile__box" />
    <p v-if="failed" class="turnstile__hint">
      Проверка не загрузилась (возможно, блокировщик рекламы). Заявку всё равно
      можно отправить — просто она пройдёт дополнительную проверку.
    </p>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.turnstile {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__box {
    min-height: 65px;
  }

  &__hint {
    font-size: 12px;
    color: $color-text-tertiary;
  }
}
</style>
