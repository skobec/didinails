<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTimeSlots } from '@/composables/useTimeSlots'
import { useBookings } from '@/composables/useBookings'
import { useAdminScope } from '@/composables/useAdminScope'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseEnabled } from '@/services/supabase'
import {
  blockDay,
  unblockDay,
  copyWeekBlocks,
} from '@/services/repositories/schedule'
import { defaultTimeSlots } from '@/data/timeSlots'
import { getDayName, getMonthDay } from '@/utils/helpers'
import { useToast } from '@/composables/useToast'
import { ruError } from '@/utils/errors'

const { cloudError, blockedTimes, persistBlocked, getSlotsForDate, toggleBlocked, reload: reloadSlots, useCloudScope: slotsScope } = useTimeSlots()
const { bookings: allBookings, useCloudScope: bookingsScope } = useBookings()
const auth = useAuthStore()
const { show } = useToast()

useAdminScope([bookingsScope, slotsScope])

const businessId = computed(() => auth.business?.id ?? null)
const cloudActive = computed(() => isSupabaseEnabled() && !!businessId.value)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDaysISO(dateISO: string, n: number): string {
  const d = new Date(dateISO + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fmtDate(d)
}

// Лента на 14 дней со сдвигом по неделям — так удобно уходить на месяцы вперёд.
const weekOffset = ref(0)

const days = computed(() => {
  const out: string[] = []
  const base = new Date()
  base.setDate(base.getDate() + weekOffset.value * 7)
  for (let i = 0; i < 14; i++) {
    const d = new Date(base)
    d.setDate(d.getDate() + i)
    out.push(fmtDate(d))
  }
  return out
})

const selectedDate = ref(fmtDate(new Date()))

watch(weekOffset, () => {
  selectedDate.value = days.value[0]
})

const dayBookings = computed(() =>
  allBookings.value.filter((b) => b.date === selectedDate.value && b.status !== 'cancelled')
)

const bookedTimes = computed(() => dayBookings.value.map((b) => b.time))

const slots = computed(() => getSlotsForDate(selectedDate.value, bookedTimes.value))

async function toggle(time: string) {
  try {
    await toggleBlocked(selectedDate.value, time)
    show('Время обновлено', 'info')
  } catch {
    show(cloudError.value || 'Не получилось обновить время', 'error')
  }
}

async function blockWholeDay() {
  try {
    if (cloudActive.value && businessId.value) {
      const n = await blockDay(businessId.value, selectedDate.value)
      await reloadSlots()
      show(n > 0 ? `День заблокирован (${n} ч)` : 'День уже был заблокирован', 'success')
    } else {
      const cur = new Set(blockedTimes.value[selectedDate.value] || [])
      for (const s of defaultTimeSlots) {
        if (!cur.has(s.time)) await toggleBlocked(selectedDate.value, s.time)
      }
      show('День заблокирован', 'success')
    }
  } catch (e) {
    show(cloudError.value || ruError(e instanceof Error ? e.message : ''), 'error')
  }
}

async function unblockWholeDay() {
  try {
    if (cloudActive.value && businessId.value) {
      const n = await unblockDay(businessId.value, selectedDate.value)
      await reloadSlots()
      show(n > 0 ? `День открыт (${n} ч)` : 'День и так открыт', 'success')
    } else {
      for (const t of [...(blockedTimes.value[selectedDate.value] || [])]) {
        await toggleBlocked(selectedDate.value, t)
      }
      show('День открыт', 'success')
    }
  } catch (e) {
    show(cloudError.value || ruError(e instanceof Error ? e.message : ''), 'error')
  }
}

// Размножить блокировки видимой недели вперёд — так график составляется
// на месяцы: настроил одну неделю, скопировал на N следующих.
async function copyWeek(weeks: number) {
  try {
    const weekStart = days.value[0]
    if (cloudActive.value && businessId.value) {
      const n = await copyWeekBlocks(businessId.value, weekStart, weeks)
      await reloadSlots()
      show(n > 0 ? `Скопировано блокировок: ${n}` : 'В этой неделе нет блокировок для копирования', n > 0 ? 'success' : 'info')
    } else {
      let n = 0
      for (let k = 1; k <= weeks; k++) {
        for (let i = 0; i < 7; i++) {
          const src = addDaysISO(weekStart, i)
          const dst = addDaysISO(weekStart, i + k * 7)
          const srcBlocked = blockedTimes.value[src] || []
          if (srcBlocked.length === 0) continue
          const dstSet = new Set(blockedTimes.value[dst] || [])
          for (const t of srcBlocked) {
            if (!dstSet.has(t)) {
              dstSet.add(t)
              n++
            }
          }
          blockedTimes.value[dst] = [...dstSet]
        }
      }
      persistBlocked()
      show(n > 0 ? `Скопировано блокировок: ${n}` : 'В этой неделе нет блокировок для копирования', n > 0 ? 'success' : 'info')
    }
  } catch (e) {
    show(cloudError.value || ruError(e instanceof Error ? e.message : ''), 'error')
  }
}

function statusClass(status: string) {
  switch (status) {
    case 'pending': return 'admin-calendar__booking--pending'
    case 'confirmed': return 'admin-calendar__booking--confirmed'
    case 'cancelled': return 'admin-calendar__booking--cancelled'
    default: return ''
  }
}
</script>

<template>
  <div class="admin-calendar">
    <div class="admin-calendar__top">
      <h3>Управление временными слотами</h3>
      <div class="admin-calendar__weeknav">
        <button class="admin-calendar__weekbtn" :disabled="weekOffset <= 0" @click="weekOffset--">‹</button>
        <span class="admin-calendar__weeklabel">{{ getMonthDay(days[0]) }} — {{ getMonthDay(days[13]) }}</span>
        <button class="admin-calendar__weekbtn" @click="weekOffset++">›</button>
      </div>
    </div>

    <div class="admin-calendar__dates">
      <button
        v-for="day in days"
        :key="day"
        :class="['admin-calendar__date-btn', { 'admin-calendar__date-btn--active': selectedDate === day }]"
        @click="selectedDate = day"
      >
        <span class="admin-calendar__date-day">{{ getDayName(day) }}</span>
        <span class="admin-calendar__date-num">{{ getMonthDay(day) }}</span>
      </button>
    </div>

    <div class="admin-calendar__bulkactions">
      <div class="admin-calendar__bulkgroup">
        <span class="admin-calendar__bulklabel">{{ getMonthDay(selectedDate) }}:</span>
        <button class="admin-calendar__bulkbtn" @click="blockWholeDay">Заблокировать день</button>
        <button class="admin-calendar__bulkbtn" @click="unblockWholeDay">Открыть день</button>
      </div>
      <div class="admin-calendar__bulkgroup">
        <span class="admin-calendar__bulklabel">Неделю {{ getMonthDay(days[0]) }}–{{ getMonthDay(days[6]) }} →</span>
        <button class="admin-calendar__bulkbtn" @click="copyWeek(1)">+1 неделя</button>
        <button class="admin-calendar__bulkbtn" @click="copyWeek(4)">+4 недели</button>
      </div>
    </div>

    <div class="admin-calendar__layout">
      <div class="admin-calendar__slots">
        <p class="admin-calendar__section-title">Доступность времени</p>
        <p class="admin-calendar__section-hint">Нажмите на слот, чтобы заблокировать/разблокировать</p>
        <div class="admin-calendar__slots-grid">
          <button
            v-for="slot in slots"
            :key="slot.time"
            :class="['admin-calendar__slot', {
              'admin-calendar__slot--unavailable': !slot.available,
              'admin-calendar__slot--booked': !slot.available && bookedTimes.includes(slot.time)
            }]"
            :disabled="bookedTimes.includes(slot.time)"
            @click="toggle(slot.time)"
          >
            <span class="admin-calendar__slot-time">{{ slot.time }}</span>
            <span class="admin-calendar__slot-status">
              {{ bookedTimes.includes(slot.time) ? 'Забронировано' : (slot.available ? 'Доступно' : 'Заблокировано') }}
            </span>
          </button>
        </div>
      </div>

      <div class="admin-calendar__bookings">
        <p class="admin-calendar__section-title">
          Записи на {{ getMonthDay(selectedDate) }}
        </p>
        <div v-if="dayBookings.length === 0" class="admin-calendar__no-bookings">
          <p>Нет записей на этот день</p>
        </div>
        <div v-else class="admin-calendar__bookings-list">
          <div v-for="b in dayBookings" :key="b.id" :class="['admin-calendar__booking', statusClass(b.status)]">
            <div class="admin-calendar__booking-time">{{ b.time }}</div>
            <div class="admin-calendar__booking-info">
              <strong>{{ b.name }}</strong>
              <span>{{ b.serviceName }}</span>
              <span class="admin-calendar__booking-phone">{{ b.phone }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.admin-calendar {
  &__top {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    h3 { font-size: 16px; }
  }

  &__weeknav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__weekbtn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid $color-border;
    background: $color-surface;
    font-size: 16px;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) { border-color: $color-text; }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
  }

  &__weeklabel {
    font-size: 13px;
    font-weight: 600;
    min-width: 110px;
    text-align: center;
  }

  &__bulkactions {
    display: flex;
    gap: 16px 32px;
    flex-wrap: wrap;
    margin-bottom: 24px;
    padding: 12px 16px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
  }

  &__bulkgroup {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__bulklabel {
    font-size: 13px;
    font-weight: 600;
  }

  &__bulkbtn {
    padding: 7px 14px;
    border: 1px solid $color-border;
    border-radius: 100px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover { border-color: $color-text; }
  }

  &__dates {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 12px;
    margin-bottom: 24px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }

  &__date-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 14px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;
    &:hover { border-color: $color-text; }
    &--active { background: $color-text; border-color: $color-text; color: white; }
  }

  &__date-day { font-size: 11px; font-weight: 500; text-transform: lowercase; }
  &__date-num { font-size: 13px; font-weight: 600; }

  &__layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    @include mobile { grid-template-columns: 1fr; }
  }

  &__section-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  &__section-hint {
    font-size: 12px;
    color: $color-text-tertiary;
    margin-bottom: 16px;
  }

  &__slots-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
  }

  &__slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    cursor: pointer;
    transition: all $transition-fast;
    &:hover:not(:disabled) { border-color: $color-text; }

    &--unavailable {
      background: #FEF2F2;
      border-color: #FECACA;
      opacity: 0.7;
    }

    &--booked {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__slot-time { font-size: 14px; font-weight: 600; }
  &__slot-status { font-size: 11px; color: $color-text-secondary; }

  &__no-bookings {
    text-align: center;
    padding: 40px 0;
    color: $color-text-tertiary;
    border: 1px dashed $color-border;
    border-radius: $radius-sm;
  }

  &__bookings-list { display: flex; flex-direction: column; gap: 8px; }

  &__booking {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    border-left: 3px solid transparent;
    &--pending { border-left-color: #F59E0B; }
    &--confirmed { border-left-color: #10B981; }
    &--cancelled { border-left-color: #EF4444; opacity: 0.6; }
  }

  &__booking-time { font-size: 14px; font-weight: 700; min-width: 50px; }

  &__booking-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13px;
    strong { font-size: 14px; }
  }

  &__booking-phone { color: $color-text-secondary; font-size: 12px; }
}
</style>
