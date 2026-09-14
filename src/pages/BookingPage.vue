<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import BookingForm, { type BookingContext } from '@/components/BookingForm.vue'
import AppLoader from '@/components/ui/AppLoader.vue'
import { business } from '@/config/business'
import { isSupabaseEnabled } from '@/services/supabase'
import type { Business } from '@/types'

const route = useRoute()

const cloud = isSupabaseEnabled()
const loading = ref(false)
const biz = ref<Business | null>(null)

const context = computed<BookingContext | null>(() => {
  if (!cloud || !biz.value) return null
  return {
    businessId: biz.value.id,
    businessName: biz.value.name,
    timezone: biz.value.timezone || 'Europe/Moscow',
  }
})

// Диплинк со страницы расписания: ?service=&date=YYYY-MM-DD&time=HH:MM
const initial = computed(() => {
  const q = route.query
  const pick = (v: unknown) => (typeof v === 'string' ? v : '')
  const date = pick(q.date)
  const time = pick(q.time)
  const serviceId = pick(q.service)
  if (!date && !time && !serviceId) return null
  return {
    serviceId: serviceId || undefined,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
    time: /^\d{2}:\d{2}$/.test(time) ? time : undefined,
  }
})

const phone = computed(() => (cloud ? (biz.value?.phone ?? '') : '+7 937 216 2460'))
const address = computed(() => {
  if (!cloud) return 'г. Москва, ул. Тверская, д. 15'
  const parts = [biz.value?.city, biz.value?.address].filter(Boolean)
  return parts.join(', ')
})
const instagram = computed(() =>
  cloud ? (biz.value?.instagram ?? '') : 'https://www.instagram.com/di.dii.nails_',
)
const telegram = computed(() => (cloud ? (biz.value?.telegram ?? '') : 'https://t.me/nailwinx'))
const phoneNote = computed(() =>
  cloud
    ? (biz.value?.phone_note ?? '')
    : 'Пожалуйста, пишите СМС либо в мессенджеры — на звонки могу не ответить. Или запишитесь через электронную запись.',
)

function telHref(value: string): string {
  return `tel:${value.replace(/[^+\d]/g, '')}`
}

onMounted(async () => {
  if (!cloud) return
  loading.value = true
  try {
    const { getBusinessBySlug } = await import('@/services/repositories/businesses')
    biz.value = await getBusinessBySlug(business.featuredSlug)
  } catch {
    // Форма откроется в local-режиме.
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="booking-page">
    <div class="booking-page__inner">
      <div v-if="cloud && loading" class="booking-page__loading">
        <AppLoader size="lg" />
      </div>
      <div v-else class="booking-page__layout">
        <div class="booking-page__form">
          <BookingForm :context="context" :initial="initial" />
        </div>
        <aside class="booking-page__side">
          <h3>Контакты для записи</h3>
          <p v-if="phone" class="booking-page__contact">
            <span class="booking-page__label">Телефон</span>
            <a :href="telHref(phone)">{{ phone }}</a>
          </p>
          <p v-if="phoneNote" class="booking-page__note">{{ phoneNote }}</p>
          <div v-if="instagram || telegram" class="booking-page__socials">
            <a v-if="instagram" :href="instagram" target="_blank" rel="noopener" class="booking-page__social">Instagram</a>
            <a v-if="telegram" :href="telegram" target="_blank" rel="noopener" class="booking-page__social">Telegram</a>
          </div>
          <p v-if="address" class="booking-page__contact">
            <span class="booking-page__label">Адрес</span>
            {{ address }}
          </p>
          <p class="booking-page__note">Не дозвонились? Оставьте заявку в форме — перезвоним и подтвердим время.</p>
          <router-link to="/schedule" class="booking-page__schedule-link">Смотреть всё расписание →</router-link>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.booking-page {
  @include section;
  min-height: calc(100vh - $nav-height - 200px);

  &__inner {
    @include container;
  }

  &__layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 32px;
    align-items: start;

    // Без этого grid-ребёнок не ужимается уже min-content широкой ленты дат:
    // вместо скролла ленты ехала вся страница — календарь казался «застрявшим».
    > * {
      min-width: 0;
    }

    @include tablet {
      grid-template-columns: 1fr;
    }
  }

  &__side {
    @include card;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    position: sticky;
    top: calc($nav-height + 24px);

    h3 { font-size: 18px; }

    @include tablet {
      position: static;
    }
  }

  &__contact {
    font-size: 15px;
    display: flex;
    flex-direction: column;
    gap: 2px;

    a {
      color: $color-primary;
      font-weight: 600;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }
  }

  &__label {
    font-size: 12px;
    color: $color-text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__note {
    font-size: 13px;
  }

  &__socials {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__social {
    padding: 8px 16px;
    border: 1px solid $color-border;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    color: $color-text;
    text-decoration: none;
    transition: all $transition-fast;

    &:hover {
      border-color: $color-text;
    }
  }

  &__schedule-link {
    font-size: 14px;
    font-weight: 500;
    color: $color-primary;
    text-decoration: none;
    &:hover { text-decoration: underline; }
  }

  &__loading {
    min-height: 50vh;
    @include flex-center;
  }
}
</style>
