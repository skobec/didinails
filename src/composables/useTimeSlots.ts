import { ref } from 'vue'
import type { TimeSlot } from '@/types'
import { storage } from '@/services/storage'
import { defaultTimeSlots } from '@/data/timeSlots'
import { isSupabaseEnabled } from '@/services/supabase'
import {
  getWorkingHours,
  getBlockedPeriods,
  buildTemplate,
  blockedTimesForDate,
  blockHour,
  unblockHour,
  type WorkingHoursRow,
  type BlockedPeriodRow,
} from '@/services/repositories/schedule'
import { ruError } from '@/utils/errors'

// Local-режим: один глобальный шаблон + per-date блокировки в localStorage.
const slots = ref<TimeSlot[]>([])
const blockedTimes = ref<Record<string, string[]>>({})

// Cloud-режим: шаблон из working_hours бизнеса + blocked_periods.
const cloudBusinessId = ref<string | null>(null)
const hours = ref<WorkingHoursRow[]>([])
const periods = ref<BlockedPeriodRow[]>([])
const cloudError = ref('')
const loading = ref(false)

function load() {
  const saved = storage.getAll<TimeSlot>('timeSlots')
  slots.value = saved.length > 0 ? saved : defaultTimeSlots
  if (saved.length === 0) {
    storage.set('timeSlots', slots.value)
  }
  const savedBlocked = storage.get<Record<string, string[]>>('blockedTimes')
  blockedTimes.value = savedBlocked || {}
}

load()

function isCloud(): boolean {
  return cloudBusinessId.value !== null && isSupabaseEnabled()
}

export function useTimeSlots() {
  async function useCloudScope(businessId: string) {
    cloudBusinessId.value = businessId
    hours.value = []
    periods.value = []
    loading.value = true
    try {
      await reload()
    } finally {
      loading.value = false
    }
  }

  function useLocalScope() {
    cloudBusinessId.value = null
  }

  async function reload() {
    if (!isCloud()) return
    cloudError.value = ''
    try {
      const id = cloudBusinessId.value as string
      hours.value = await getWorkingHours(id)
      periods.value = await getBlockedPeriods(id)
    } catch (e) {
      cloudError.value = ruError(e instanceof Error ? e.message : '')
    }
  }

  // Единая точка: слоты даты с учётом блокировок и уже занятых времён.
  function getSlotsForDate(date: string, bookedTimes: string[] = []): TimeSlot[] {
    if (isCloud()) {
      const template = buildTemplate(hours.value, date)
      const blocked = blockedTimesForDate(periods.value, date)
      return template.map((s) => ({
        ...s,
        available: !blocked.includes(s.time) && !bookedTimes.includes(s.time),
      }))
    }
    const dateBlocked = blockedTimes.value[date] || []
    return slots.value.map((s) => ({
      ...s,
      available: s.available && !dateBlocked.includes(s.time) && !bookedTimes.includes(s.time),
    }))
  }

  // Переключить блокировку часа на дату. Занятые бронированием часы
  // компонентам следует дизейблить (bookedTimes), сюда не передавать.
  async function toggleBlocked(date: string, time: string) {
    if (isCloud()) {
      cloudError.value = ''
      try {
        const blocked = blockedTimesForDate(periods.value, date)
        if (blocked.includes(time)) {
          await unblockHour(cloudBusinessId.value as string, date, time)
        } else {
          await blockHour(cloudBusinessId.value as string, date, time)
        }
        periods.value = await getBlockedPeriods(cloudBusinessId.value as string)
      } catch (e) {
        cloudError.value = ruError(e instanceof Error ? e.message : '')
        throw e
      }
      return
    }
    if (!blockedTimes.value[date]) blockedTimes.value[date] = []
    const idx = blockedTimes.value[date].indexOf(time)
    if (idx === -1) blockedTimes.value[date].push(time)
    else blockedTimes.value[date].splice(idx, 1)
    storage.set('blockedTimes', blockedTimes.value)
  }

  // --- Legacy local API (шаблон для всех дат сразу) ---
  function toggleAvailability(time: string) {
    const slot = slots.value.find((s) => s.time === time)
    if (slot) {
      slot.available = !slot.available
      storage.set('timeSlots', slots.value)
    }
  }

  function updateSlots(newSlots: TimeSlot[]) {
    slots.value = newSlots
    storage.set('timeSlots', slots.value)
  }

  function getAvailable() {
    return slots.value.filter((s) => s.available)
  }

  // Сохранить ручные правки blockedTimes (массовые операции админки).
  function persistBlocked() {
    storage.set('blockedTimes', blockedTimes.value)
  }

  return {
    slots,
    blockedTimes,
    persistBlocked,
    loading,
    cloudError,
    getSlotsForDate,
    toggleBlocked,
    toggleAvailability,
    updateSlots,
    getAvailable,
    load,
    useCloudScope,
    useLocalScope,
    reload,
  }
}
