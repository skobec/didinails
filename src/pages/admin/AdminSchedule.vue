<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppLoader from '@/components/ui/AppLoader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseEnabled } from '@/services/supabase'
import {
  getWorkingHours,
  saveWorkingHours,
  STANDARD_SCHEDULE,
  type WorkingHoursRow,
  type WorkingHoursInput,
} from '@/services/repositories/schedule'
import { ruError } from '@/utils/errors'

const auth = useAuthStore()
const { show } = useToast()

const WEEKDAYS = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
]

interface DayRow extends WorkingHoursInput {
  open: string
  close: string
}

const loading = ref(true)
const saving = ref(false)
const rows = ref<DayRow[]>([])

function blankRows(): DayRow[] {
  return WEEKDAYS.map((d) => ({
    weekday: d.value,
    open_time: null,
    close_time: null,
    is_day_off: d.value === 0,
    open: d.value === 0 ? '' : '10:00',
    close: d.value === 0 ? '' : '19:00',
  }))
}

function toRow(r: WorkingHoursRow): DayRow {
  return {
    weekday: r.weekday,
    open_time: r.open_time,
    close_time: r.close_time,
    is_day_off: r.is_day_off,
    open: r.open_time ? r.open_time.slice(0, 5) : '',
    close: r.close_time ? r.close_time.slice(0, 5) : '',
  }
}

onMounted(async () => {
  if (!isSupabaseEnabled() || !auth.business) {
    rows.value = blankRows()
    loading.value = false
    return
  }
  try {
    const saved = await getWorkingHours(auth.business.id)
    const map = new Map(saved.map((r) => [r.weekday, r]))
    rows.value = WEEKDAYS.map((d) => {
      const found = map.get(d.value)
      return found ? toRow(found) : blankRows().find((r) => r.weekday === d.value) as DayRow
    })
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
    rows.value = blankRows()
  } finally {
    loading.value = false
  }
})

function fillStandard() {
  const std = new Map(STANDARD_SCHEDULE.map((r) => [r.weekday, r]))
  rows.value = WEEKDAYS.map((d) => {
    const s = std.get(d.value)
    return {
      weekday: d.value,
      open_time: s?.open_time ?? null,
      close_time: s?.close_time ?? null,
      is_day_off: s?.is_day_off ?? true,
      open: s && !s.is_day_off ? (s.open_time as string).slice(0, 5) : '',
      close: s && !s.is_day_off ? (s.close_time as string).slice(0, 5) : '',
    }
  })
  show('Подставлен стандартный график — не забудьте сохранить', 'info')
}

function dayLabel(weekday: number): string {
  return WEEKDAYS.find((d) => d.value === weekday)?.label ?? ''
}

async function save() {
  if (!isSupabaseEnabled() || !auth.business) {
    show('График хранится в Supabase — подключите бэкенд', 'error')
    return
  }
  for (const r of rows.value) {
    if (!r.is_day_off && (!r.open || !r.close)) {
      show(`Укажите часы для: ${dayLabel(r.weekday)} — или отметьте выходным`, 'error')
      return
    }
    if (!r.is_day_off && r.open >= r.close) {
      show(`Время закрытия раньше открытия: ${dayLabel(r.weekday)}`, 'error')
      return
    }
  }
  saving.value = true
  try {
    await saveWorkingHours(
      auth.business.id,
      rows.value.map((r) => ({
        weekday: r.weekday,
        open_time: r.is_day_off ? null : r.open,
        close_time: r.is_day_off ? null : r.close,
        is_day_off: r.is_day_off,
      })),
    )
    show('График сохранён — сайт и запись обновятся сразу', 'success')
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-schedule">
    <div v-if="loading" class="admin-schedule__loading">
      <AppLoader />
    </div>
    <template v-else>
      <p class="admin-schedule__desc">
        Часы, в которые клиенты видят свободные окна. Выходные дни не показывают слоты вообще.
      </p>
      <div class="admin-schedule__list">
        <div v-for="row in rows" :key="row.weekday" class="admin-schedule__row" :class="{ 'admin-schedule__row--off': row.is_day_off }">
          <span class="admin-schedule__day">{{ dayLabel(row.weekday) }}</span>
          <label class="admin-schedule__off">
            <input v-model="row.is_day_off" type="checkbox" />
            <span>Выходной</span>
          </label>
          <div class="admin-schedule__times">
            <AppInput v-model="row.open" type="time" :disabled="row.is_day_off" />
            <span class="admin-schedule__dash">—</span>
            <AppInput v-model="row.close" type="time" :disabled="row.is_day_off" />
          </div>
        </div>
      </div>
      <div class="admin-schedule__actions">
        <AppButton variant="secondary" @click="fillStandard">Стандартный график</AppButton>
        <AppButton :loading="saving" @click="save">Сохранить</AppButton>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.admin-schedule {
  max-width: 640px;

  &__loading {
    padding: 40px 0;
    @include flex-center;
  }

  &__desc {
    font-size: 14px;
    margin-bottom: 20px;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 24px;
  }

  &__row {
    display: grid;
    grid-template-columns: 130px 120px 1fr;
    gap: 12px;
    align-items: center;
    padding: 12px 16px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-sm;

    &--off {
      opacity: 0.6;
    }

    @include mobile {
      grid-template-columns: 1fr;
      gap: 8px;
    }
  }

  &__day {
    font-size: 14px;
    font-weight: 600;
  }

  &__off {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: $color-text-secondary;
    cursor: pointer;

    input {
      width: 16px;
      height: 16px;
      accent-color: $color-text;
    }
  }

  &__times {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__dash {
    color: $color-text-tertiary;
  }

  &__actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}
</style>
