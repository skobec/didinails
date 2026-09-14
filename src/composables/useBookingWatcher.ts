import { ref, onMounted, onUnmounted } from 'vue'
import { useBookings } from './useBookings'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseEnabled } from '@/services/supabase'
import { useToast } from './useToast'

// Живой вотчер новых записей для админки — работает без настроек
// (в отличие от Telegram, которому нужен бот).
// Пока открыта админка: раз в 30 сек перечитывает записи, при росте числа
// новых — тост + счётчик в заголовке вкладки.
export function useBookingWatcher(intervalMs = 30000) {
  const { bookings, useCloudScope, reload } = useBookings()
  const auth = useAuthStore()
  const { show } = useToast()

  const baseTitle = ref(document.title)
  let timer: ReturnType<typeof setInterval> | null = null
  let lastPending = -1

  function paintBadge() {
    const n = bookings.value.filter((b) => b.status === 'pending').length
    document.title = n > 0 ? `(${n}) ${baseTitle.value}` : baseTitle.value
  }

  let scoped = false

  async function tick(initial: boolean) {
    try {
      if (!isSupabaseEnabled() || !auth.business) return
      if (!scoped) {
        // Один раз: включает cloud-scope (со сбросом), дальше — тихие опросы.
        await useCloudScope(auth.business.id)
        scoped = true
      } else {
        await reload()
      }
      const pendings = bookings.value.filter((b) => b.status === 'pending')
      if (!initial && lastPending >= 0 && pendings.length > lastPending) {
        const fresh = [...pendings].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0]
        show(`Новая запись: ${fresh.name} — ${fresh.serviceName}, ${fresh.date} в ${fresh.time}`, 'success')
      }
      lastPending = pendings.length
      paintBadge()
    } catch {
      // Тихий фоновый опрос — ошибки не шумим, следующий тик повторит.
    }
  }

  onMounted(async () => {
    baseTitle.value = document.title
    await tick(true)
    timer = setInterval(() => tick(false), intervalMs)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
    document.title = baseTitle.value
  })
}
