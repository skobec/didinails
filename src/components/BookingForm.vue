<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppPhoneInput from '@/components/ui/AppPhoneInput.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import AvailabilityCalendar from '@/components/AvailabilityCalendar.vue'
import { isValidRuPhone, checkBookingRateLimit, recordBookingAttempt } from '@/utils/phone'
import ServiceCard from '@/components/ServiceCard.vue'
import { useServices } from '@/composables/useServices'
import { useBookings } from '@/composables/useBookings'
import { useTimeSlots } from '@/composables/useTimeSlots'
import { useAvailability } from '@/composables/useAvailability'
import { useToast } from '@/composables/useToast'
import { isSupabaseEnabled } from '@/services/supabase'
import { listServices } from '@/services/repositories/services'
import { getDayTimes, createBookingGuest, type DayTimes } from '@/services/repositories/bookings'
import { getWorkingHours, buildTemplate, type WorkingHoursRow } from '@/services/repositories/schedule'
import { ruError } from '@/utils/errors'
import type { Service } from '@/types'
import type { TimeSlot } from '@/types'

export interface BookingContext {
  businessId: string
  businessName: string
  timezone: string
}

const props = defineProps<{
  context?: BookingContext | null
  initial?: { serviceId?: string; date?: string; time?: string } | null
}>()

const cloud = computed(() => !!props.context && isSupabaseEnabled())

const { activeServices, categories } = useServices()
const { create, getByDate } = useBookings()
const timeSlots = useTimeSlots()
const avail = useAvailability()
const { show } = useToast()

const step = ref<'service' | 'datetime' | 'info' | 'done'>('service')
const selectedServiceId = ref('')
const selectedDate = ref('')
const selectedTime = ref('')
const name = ref('')
const phone = ref('')
const comment = ref('')

const cloudServices = ref<Service[]>([])
const cloudLoading = ref(false)
const submitError = ref('')
const phoneError = ref('')

// Cloud-данные занятости: шаблон из working_hours + занятые/заблокированные
// часы даты через RPC (гостю таблицы напрямую недоступны — приватность).
const hoursCache = ref<WorkingHoursRow[] | null>(null)
const dayTimes = ref<DayTimes | null>(null)
const dayLoading = ref(false)

// --- Антиспам ---
// honeypot: человек поле не видит и не заполняет, бот — заполняет.
// time-trap: живой человек не заполняет форму быстрее ~2.5 сек.
// Ботов «успешно» провожаем молча, не раскрывая защиту.
const formStartedAt = ref(Date.now())
const honeypot = ref('')

async function loadCloud() {
  if (!cloud.value || !props.context) return
  cloudLoading.value = true
  try {
    const [s, h] = await Promise.all([
      listServices(props.context.businessId),
      getWorkingHours(props.context.businessId),
    ])
    cloudServices.value = s
    hoursCache.value = h
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
  } finally {
    cloudLoading.value = false
  }
}

async function loadDayTimes(date: string) {
  dayTimes.value = null
  selectedTime.value = ''
  if (!cloud.value || !props.context || !date) return
  dayLoading.value = true
  try {
    dayTimes.value = await getDayTimes(props.context.businessId, date, props.context.timezone)
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
  } finally {
    dayLoading.value = false
  }
}

onMounted(() => {
  loadCloud()
  applyInitial()
})
watch(
  () => props.context?.businessId,
  () => {
    selectedServiceId.value = ''
    selectedDate.value = ''
    selectedTime.value = ''
    hoursCache.value = null
    dayTimes.value = null
    loadCloud()
  },
)
watch(selectedDate, (d) => loadDayTimes(d))

const serviceList = computed(() =>
  cloud.value ? cloudServices.value.filter((s) => s.active) : activeServices.value,
)

const allCategories = computed(() => {
  const cats = new Set(serviceList.value.map((s) => s.category))
  return Array.from(cats)
})

const selectedService = computed(() => serviceList.value.find((s) => s.id === selectedServiceId.value))

const availableSlots = computed<TimeSlot[]>(() => {
  if (!selectedDate.value) return []
  if (cloud.value) {
    const template = buildTemplate(hoursCache.value ?? [], selectedDate.value)
    const unavailable = new Set([
      ...(dayTimes.value?.booked ?? []),
      ...(dayTimes.value?.blocked ?? []),
    ])
    return template.map((s) => ({ ...s, available: !unavailable.has(s.time) }))
  }
  const booked = getByDate(selectedDate.value)
    .filter((b) => b.status !== 'cancelled')
    .map((b) => b.time)
  return timeSlots.getSlotsForDate(selectedDate.value, booked)
})

// Применяем диплинк, когда список услуг готов (cloud грузится асинхронно).
watch(serviceList, () => applyInitial())
// Если предвыбранное время оказалось занято — сбрасываем его.
watch(dayTimes, () => {
  if (
    selectedTime.value &&
    !availableSlots.value.some((s) => s.time === selectedTime.value && s.available)
  ) {
    selectedTime.value = ''
  }
})

function selectService(id: string) {
  selectedServiceId.value = id
  step.value = 'datetime'
  const ctx = props.context
  avail.load(
    cloud.value && ctx ? ctx.businessId : null,
    cloud.value && ctx ? ctx.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
  )
}

function applyInitial() {
  const init = props.initial
  if (!init) return
  if (
    init.serviceId &&
    serviceList.value.some((s) => s.id === init.serviceId)
  ) {
    selectedServiceId.value = init.serviceId
    if (step.value === 'service') {
      step.value = 'datetime'
      const ctx = props.context
      avail.load(
        cloud.value && ctx ? ctx.businessId : null,
        cloud.value && ctx ? ctx.timezone : Intl.DateTimeFormat().resolvedOptions().timeZone,
      )
    }
  }
  if (init.date && /^\d{4}-\d{2}-\d{2}$/.test(init.date)) selectedDate.value = init.date
  if (init.time && /^\d{2}:\d{2}$/.test(init.time)) selectedTime.value = init.time
}

function selectDateTime() {
  if (!selectedDate.value || !selectedTime.value) return
  step.value = 'info'
}

async function submit() {
  submitError.value = ''
  phoneError.value = ''
  if (!name.value || !selectedService.value) return
  if (honeypot.value || Date.now() - formStartedAt.value < 2500) {
    step.value = 'done'
    return
  }
  if (!isValidRuPhone(phone.value)) {
    phoneError.value = 'Введите номер полностью: +7 (___) ___-__-__'
    return
  }
  if (!checkBookingRateLimit()) {
    submitError.value = 'Слишком много заявок с этого устройства. Попробуйте позже.'
    show(submitError.value, 'error')
    return
  }
  const svc = selectedService.value
  if (cloud.value && props.context) {
    try {
      await createBookingGuest(props.context.businessId, {
        serviceId: svc.id,
        date: selectedDate.value,
        time: selectedTime.value,
        durationMinutes: svc.duration,
        timezone: props.context.timezone,
        name: name.value,
        phone: phone.value,
        comment: comment.value,
      })
      // Мгновенно гасим слот в UI, не дожидаясь перезапроса.
      if (dayTimes.value) {
        dayTimes.value = {
          ...dayTimes.value,
          booked: [...dayTimes.value.booked, selectedTime.value],
        }
      }
    } catch (e) {
      submitError.value = ruError(e instanceof Error ? e.message : '')
      show(submitError.value, 'error')
      return
    }
  } else {
    create({
      serviceId: svc.id,
      serviceName: svc.name,
      date: selectedDate.value,
      time: selectedTime.value,
      name: name.value,
      phone: phone.value,
      comment: comment.value,
    })
  }
  recordBookingAttempt()
  step.value = 'done'
  show('Заявка отправлена! Мы свяжемся с вами в ближайшее время.', 'success')
}

function reset() {
  step.value = 'service'
  selectedServiceId.value = ''
  selectedDate.value = ''
  selectedTime.value = ''
  name.value = ''
  phone.value = ''
  comment.value = ''
  submitError.value = ''
}

const activeCategory = ref('')

const filteredServices = computed(() => {
  if (!activeCategory.value) return serviceList.value
  return serviceList.value.filter((s) => s.category === activeCategory.value)
})

// В local-режиме категории берём из composable (тот же источник, что serviceList).
const localCategories = categories
const shownCategories = computed(() => (cloud.value ? allCategories.value : localCategories.value))
</script>

<template>
  <div class="booking-form">
    <p v-if="cloud && props.context" class="booking-form__studio">{{ props.context.businessName }}</p>
    <Transition name="slide" mode="out-in">
      <!-- Step 1: Service Selection -->
      <div v-if="step === 'service'" key="service" class="booking-form__step">
        <div class="booking-form__header">
          <h2>Выберите услугу</h2>
          <p>Нажмите на нужную услугу, чтобы продолжить</p>
        </div>
        <div v-if="cloudLoading" class="booking-form__services">
          <AppSkeleton v-for="i in 3" :key="i" height="110px" radius="16px" />
        </div>
        <template v-else>
          <div class="booking-form__categories">
            <button
              :class="['booking-form__cat-btn', { 'booking-form__cat-btn--active': !activeCategory }]"
              @click="activeCategory = ''"
            >
              Все
            </button>
            <button
              v-for="cat in shownCategories"
              :key="cat"
              :class="['booking-form__cat-btn', { 'booking-form__cat-btn--active': activeCategory === cat }]"
              @click="activeCategory = cat"
            >
              {{ cat }}
            </button>
          </div>
          <div class="booking-form__services">
            <ServiceCard
              v-for="s in filteredServices"
              :key="s.id"
              :service="s"
              :selected="selectedServiceId === s.id"
              @select="selectService"
            />
          </div>
          <p v-if="filteredServices.length === 0" class="booking-form__empty">
            Услуги пока не добавлены. Загляните позже.
          </p>
        </template>
      </div>

      <!-- Step 2: Date & Time -->
      <div v-else-if="step === 'datetime'" key="datetime" class="booking-form__step">
        <div class="booking-form__header">
          <h2>Выберите дату и время</h2>
          <p>{{ selectedService?.name }}</p>
        </div>
        <div v-if="avail.loading.value && avail.days.value.length === 0" class="booking-form__dates">
          <AppSkeleton v-for="i in 7" :key="i" height="86px" width="68px" radius="8px" />
        </div>
        <AvailabilityCalendar
          v-else
          :days="avail.days.value"
          :selected-date="selectedDate"
          @select="selectedDate = $event"
        />
        <div v-if="selectedDate" class="booking-form__times">
          <p class="booking-form__times-label">Доступное время</p>
          <div class="booking-form__times-grid">
            <template v-if="dayLoading">
              <AppSkeleton v-for="i in 8" :key="i" height="42px" radius="8px" />
            </template>
            <template v-else>
              <button
                v-for="slot in availableSlots"
                :key="slot.time"
                :class="['booking-form__time-btn', { 'booking-form__time-btn--active': selectedTime === slot.time }]"
                :disabled="!slot.available"
                @click="selectedTime = slot.time"
              >
                {{ slot.time }}
              </button>
            </template>
          </div>
        </div>
        <div class="booking-form__nav">
          <AppButton variant="ghost" @click="step = 'service'">Назад</AppButton>
          <AppButton :disabled="!selectedDate || !selectedTime" @click="selectDateTime">Далее</AppButton>
        </div>
      </div>

      <!-- Step 3: Contact Info -->
      <div v-else-if="step === 'info'" key="info" class="booking-form__step">
        <div class="booking-form__header">
          <h2>Оставьте контакты</h2>
          <p>{{ selectedService?.name }} — {{ selectedDate }} в {{ selectedTime }}</p>
        </div>
        <div class="booking-form__fields">
          <AppInput v-model="name" label="Имя" placeholder="Как к вам обращаться?" />
          <AppPhoneInput v-model="phone" label="Телефон" :error="phoneError" />
          <AppInput v-model="comment" label="Комментарий" placeholder="Пожелания к записи (необязательно)" multiline />
          <input
            v-model="honeypot"
            type="text"
            name="website"
            tabindex="-1"
            autocomplete="off"
            aria-hidden="true"
            class="booking-form__honeypot"
          />
        </div>
        <p v-if="submitError" class="booking-form__submit-error">{{ submitError }}</p>
        <div class="booking-form__nav">
          <AppButton variant="ghost" @click="step = 'datetime'">Назад</AppButton>
          <AppButton :disabled="!name || !phone" @click="submit">Отправить</AppButton>
        </div>
      </div>

      <!-- Step 4: Done -->
      <div v-else-if="step === 'done'" key="done" class="booking-form__step booking-form__step--done">
        <div class="booking-form__success">
          <div class="booking-form__success-icon">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="24" fill="#10B981" opacity="0.1"/>
              <path d="M16 24L22 30L32 18" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h2>Спасибо за заявку!</h2>
          <p>Мы свяжемся с вами для подтверждения записи в ближайшее время.</p>
          <AppButton @click="reset">Записаться ещё</AppButton>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.booking-form {
  max-width: 640px;
  margin: 0 auto;

  &__studio {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: $color-text-tertiary;
    margin-bottom: 16px;
  }

  &__step {
    display: flex;
    flex-direction: column;
    gap: 24px;

    &--done {
      align-items: center;
      text-align: center;
      padding: 60px 0;
    }
  }

  &__header {
    h2 {
      margin-bottom: 8px;
    }
    p {
      color: $color-text-secondary;
      font-size: 15px;
    }
  }

  &__loading,
  &__empty {
    padding: 40px 0;
    text-align: center;
    color: $color-text-tertiary;
  }

  &__categories {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  &__cat-btn {
    padding: 8px 16px;
    border: 1px solid $color-border;
    border-radius: 100px;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: $color-text-secondary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-text;
      color: $color-text;
    }

    &--active {
      background: $color-text;
      border-color: $color-text;
      color: white;
    }
  }

  &__services {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__dates {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }

  &__date-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 16px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    cursor: pointer;
    transition: all $transition-fast;
    min-width: 64px;

    &:hover {
      border-color: $color-text;
    }

    &--active {
      background: $color-text;
      border-color: $color-text;
      color: white;
    }
  }

  &__date-day {
    font-size: 12px;
    font-weight: 500;
    text-transform: lowercase;
  }

  &__date-num {
    font-size: 14px;
    font-weight: 600;
  }

  &__times {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__times-label {
    font-size: 14px;
    font-weight: 600;
    color: $color-text;
  }

  &__times-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
    gap: 8px;
  }

  &__time-btn {
    padding: 10px;
    border: 1px solid $color-border;
    border-radius: $radius-sm;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: $color-text;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      border-color: $color-text;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    &--active {
      background: $color-text;
      border-color: $color-text;
      color: white;
    }
  }

  &__nav {
    display: flex;
    gap: 12px;
    justify-content: space-between;
    margin-top: 8px;
  }

  &__fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  // Ловушка для ботов: поле вне экрана (display:none не используем —
  // боты его детектят). Человек его никогда не заполняет.
  &__honeypot {
    position: absolute;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
  }

  &__submit-error {
    font-size: 14px;
    color: $color-error;
  }

  &__success {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  &__success-icon {
    margin-bottom: 8px;
  }
}
</style>
