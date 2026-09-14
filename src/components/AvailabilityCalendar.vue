<script setup lang="ts">
import { ref } from 'vue'
import { getDayName, getMonthDay } from '@/utils/helpers'
import { statusLabel, type DayAvailability, type DayStatus } from '@/composables/useAvailability'

const stripRef = ref<HTMLElement | null>(null)

function scrollStrip(dir: 1 | -1) {
  stripRef.value?.scrollBy({ left: dir * 240, behavior: 'smooth' })
}

defineProps<{
  days: DayAvailability[]
  selectedDate: string
  loading?: boolean
}>()

const emit = defineEmits<{
  select: [date: string]
}>()

function dotClass(status: DayStatus): string {
  switch (status) {
    case 'free': return 'avail-cal__dot--free'
    case 'limited': return 'avail-cal__dot--limited'
    case 'full': return 'avail-cal__dot--full'
    case 'off': return 'avail-cal__dot--off'
  }
}
</script>

<template>
  <div class="avail-cal">
    <div class="avail-cal__scroller">
      <button class="avail-cal__arrow avail-cal__arrow--left" aria-label="Даты назад" @click="scrollStrip(-1)">‹</button>
      <div ref="stripRef" class="avail-cal__dates">
        <button
          v-for="day in days"
          :key="day.date"
          :class="['avail-cal__date-btn', { 'avail-cal__date-btn--active': selectedDate === day.date }]"
          :disabled="day.status === 'off' || day.status === 'full'"
          :title="statusLabel(day.status)"
          @click="emit('select', day.date)"
        >
          <span class="avail-cal__date-day">{{ getDayName(day.date) }}</span>
          <span class="avail-cal__date-num">{{ getMonthDay(day.date) }}</span>
          <span :class="['avail-cal__dot', dotClass(day.status)]" />
          <span class="avail-cal__free">{{ day.status === 'off' ? '—' : day.free }}</span>
        </button>
      </div>
      <button class="avail-cal__arrow avail-cal__arrow--right" aria-label="Даты вперёд" @click="scrollStrip(1)">›</button>
    </div>
    <div class="avail-cal__legend">
      <span class="avail-cal__legend-item"><span class="avail-cal__dot avail-cal__dot--free" /> свободно</span>
      <span class="avail-cal__legend-item"><span class="avail-cal__dot avail-cal__dot--limited" /> мало мест</span>
      <span class="avail-cal__legend-item"><span class="avail-cal__dot avail-cal__dot--full" /> занято</span>
      <span class="avail-cal__legend-item"><span class="avail-cal__dot avail-cal__dot--off" /> выходной</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.avail-cal {
  &__scroller {
    position: relative;
  }

  &__arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: $color-surface;
    border: 1px solid $color-border;
    box-shadow: $shadow-md;
    cursor: pointer;
    display: none;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    line-height: 1;
    color: $color-text;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-text;
    }

    // Стрелки — только там, где нет тачскрина (на мобиле работает свайп).
    @media (hover: hover) {
      display: flex;
    }

    &--left { left: -14px; }
    &--right { right: -14px; }
  }

  &__dates {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    scrollbar-width: none;
    scroll-snap-type: x proximity;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-x pan-y;
    &::-webkit-scrollbar { display: none; }
  }

  &__date-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 10px 14px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    cursor: pointer;
    transition: all $transition-fast;
    min-width: 68px;
    flex-shrink: 0;
    scroll-snap-align: start;

    &:hover:not(:disabled) {
      border-color: $color-text;
    }

    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    &--active {
      background: $color-text;
      border-color: $color-text;
      color: white;

      .avail-cal__date-day,
      .avail-cal__free {
        color: rgba(255, 255, 255, 0.8);
      }
    }
  }

  &__date-day {
    font-size: 12px;
    font-weight: 500;
    text-transform: lowercase;
    color: $color-text-secondary;
  }

  &__date-num {
    font-size: 14px;
    font-weight: 600;
  }

  &__dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-top: 2px;

    &--free { background: #10B981; }
    &--limited { background: #F59E0B; }
    &--full { background: #EF4444; }
    &--off { background: $color-border-hover; }
  }

  &__free {
    font-size: 11px;
    color: $color-text-tertiary;
  }

  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    margin-top: 12px;
  }

  &__legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $color-text-secondary;

    .avail-cal__dot {
      margin-top: 0;
    }
  }
}
</style>
