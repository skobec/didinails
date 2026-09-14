<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AvailabilityCalendar from '@/components/AvailabilityCalendar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { business } from '@/config/business'
import { isSupabaseEnabled } from '@/services/supabase'
import { getBusinessBySlug } from '@/services/repositories/businesses'
import { useAvailability } from '@/composables/useAvailability'
import { getMonthDay, getDayName } from '@/utils/helpers'

const router = useRouter()
const cloud = isSupabaseEnabled()

const { loading, days, nextFree, load } = useAvailability()
const selectedDate = ref('')
const businessId = ref<string | null>(null)

onMounted(async () => {
  if (!cloud) {
    await load(null, 'Europe/Moscow')
    return
  }
  try {
    const found = await getBusinessBySlug(business.featuredSlug)
    if (!found) return
    businessId.value = found.id
    await load(found.id, found.timezone || 'Europe/Moscow')
  } catch {
    await load(null, 'Europe/Moscow')
  }
})

const selectedDay = computed(() => days.value.find((d) => d.date === selectedDate.value))

function pickWindow(date: string, time: string) {
  router.push({ path: '/booking', query: { date, time } })
}
</script>

<template>
  <div class="schedule-page">
    <div class="schedule-page__inner">
      <div class="schedule-page__header">
        <span class="schedule-page__badge">Расписание</span>
        <h1>Когда можно записаться</h1>
        <p>Зелёные дни — свободно, жёлтые — осталось мало мест. Выберите дату — покажем время.</p>
      </div>

      <div v-if="cloud && loading" class="schedule-page__loading">
        <AppSkeleton v-for="i in 7" :key="i" height="86px" radius="8px" />
      </div>
      <template v-else>
        <div v-if="nextFree.length > 0" class="schedule-page__next">
          <p class="schedule-page__next-title">Ближайшие свободные окна</p>
          <div class="schedule-page__next-list">
            <button
              v-for="w in nextFree"
              :key="`${w.date}-${w.time}`"
              class="schedule-page__next-btn"
              @click="pickWindow(w.date, w.time)"
            >
              {{ getDayName(w.date) }}, {{ getMonthDay(w.date) }} · {{ w.time }}
            </button>
          </div>
        </div>
        <div v-else class="schedule-page__empty">
          <p>На ближайшие 2 недели свободных окон нет. Позвоните нам — что-нибудь придумаем.</p>
        </div>

        <AvailabilityCalendar
          :days="days"
          :selected-date="selectedDate"
          @select="selectedDate = $event"
        />

        <div v-if="selectedDay" class="schedule-page__day">
          <p class="schedule-page__day-title">
            {{ getDayName(selectedDay.date) }}, {{ getMonthDay(selectedDay.date) }} — свободно: {{ selectedDay.free }}
          </p>
          <div v-if="selectedDay.freeTimes.length > 0" class="schedule-page__times">
            <button
              v-for="t in selectedDay.freeTimes"
              :key="t"
              class="schedule-page__time"
              @click="pickWindow(selectedDay.date, t)"
            >
              {{ t }}
            </button>
          </div>
          <p v-else class="schedule-page__day-empty">В этот день мест нет — выберите другой.</p>
        </div>

        <div class="schedule-page__cta">
          <AppButton size="lg" @click="router.push('/booking')">Записаться онлайн</AppButton>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.schedule-page {
  @include section;

  &__inner {
    @include container;
    max-width: 720px;
  }

  &__header {
    text-align: center;
    margin-bottom: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    p { max-width: 480px; }
  }

  &__badge {
    display: inline-flex;
    padding: 6px 14px;
    background: $color-primary-light;
    color: $color-primary;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 600;
  }

  &__loading {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    margin-bottom: 24px;
  }

  &__next {
    margin-bottom: 28px;
  }

  &__next-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  &__next-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__next-btn {
    padding: 10px 16px;
    border: 1px solid $color-text;
    border-radius: 100px;
    background: $color-text;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-md;
    }
  }

  &__empty {
    text-align: center;
    padding: 24px;
    margin-bottom: 28px;
    background: $color-surface;
    border: 1px solid $color-border;
    border-radius: $radius-lg;
  }

  &__day {
    margin-top: 24px;
  }

  &__day-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  &__times {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  &__time {
    padding: 10px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: $color-surface;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-text;
    }
  }

  &__day-empty {
    font-size: 14px;
    color: $color-text-tertiary;
  }

  &__cta {
    display: flex;
    justify-content: center;
    margin-top: 40px;
  }
}
</style>
