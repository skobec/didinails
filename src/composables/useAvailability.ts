import { ref } from 'vue'
import { isSupabaseEnabled } from '@/services/supabase'
import {
  getWorkingHours,
  buildTemplate,
} from '@/services/repositories/schedule'
import { getDayTimes } from '@/services/repositories/bookings'
import { useBookings } from '@/composables/useBookings'
import { useTimeSlots } from '@/composables/useTimeSlots'
import { getDaysAround } from '@/utils/helpers'
import { ruError } from '@/utils/errors'

export type DayStatus = 'free' | 'limited' | 'full' | 'off'

export interface DayAvailability {
  date: string
  total: number
  free: number
  status: DayStatus
  freeTimes: string[]
}

export interface FreeWindow {
  date: string
  time: string
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Текущие дата/время в таймзоне бизнеса — чтобы не предлагать прошедшие часы.
function nowInZone(timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00'
  const hour = get('hour') === '24' ? '00' : get('hour')
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` }
}

export function statusLabel(status: DayStatus): string {
  switch (status) {
    case 'free': return 'Много мест'
    case 'limited': return 'Мало мест'
    case 'full': return 'Всё занято'
    case 'off': return 'Выходной'
  }
}

// Сводная доступность на N дней вперёд для публичных мест
// (календарь записи, страница расписания).
// Cloud: шаблон из working_hours + занятость через RPC (гостям таблицы закрыты).
// Local: шаблон и блокировки из localStorage.
export function useAvailability() {
  const loading = ref(false)
  const error = ref('')
  const days = ref<DayAvailability[]>([])
  const nextFree = ref<FreeWindow[]>([])

  async function load(
    businessId: string | null,
    timezone: string,
    count = 14,
    maxWindows = 5,
  ): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const dates = getDaysAround(count)
      const now = nowInZone(timezone)

      if (businessId && isSupabaseEnabled()) {
        const hours = await getWorkingHours(businessId)
        const results = await Promise.all(
          dates.map((d) => getDayTimes(businessId, d, timezone)),
        )
        days.value = dates.map((date, i) => {
          const template = buildTemplate(hours, date).map((s) => s.time)
          const taken = new Set([...results[i].booked, ...results[i].blocked])
          let freeTimes = template.filter((t) => !taken.has(t))
          if (date === now.date) freeTimes = freeTimes.filter((t) => t > now.time)
          return toDay(date, template.length, freeTimes)
        })
      } else {
        // Local-режим: те же данные, что видит форма записи.
        const { getByDate } = useBookings()
        const slotsApi = useTimeSlots()
        days.value = dates.map((date) => {
          const booked = getByDate(date)
            .filter((b) => b.status !== 'cancelled')
            .map((b) => b.time)
          const all = slotsApi.getSlotsForDate(date, booked)
          const freeTimes = all.filter((s) => s.available).map((s) => s.time)
          return toDay(date, all.length, date === now.date
            ? freeTimes.filter((t) => t > now.time)
            : freeTimes)
        })
      }

      const windows: FreeWindow[] = []
      for (const d of days.value) {
        for (const t of d.freeTimes) {
          windows.push({ date: d.date, time: t })
          if (windows.length >= maxWindows) break
        }
        if (windows.length >= maxWindows) break
      }
      nextFree.value = windows
    } catch (e) {
      error.value = ruError(e instanceof Error ? e.message : '')
    } finally {
      loading.value = false
    }
  }

  function toDay(date: string, total: number, freeTimes: string[]): DayAvailability {
    const free = freeTimes.length
    const status: DayStatus =
      total === 0 ? 'off' : free === 0 ? 'full' : free / total >= 0.5 ? 'free' : 'limited'
    return { date, total, free, status, freeTimes }
  }

  return { loading, error, days, nextFree, load, statusLabel, nowInZone, pad }
}
