<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useBookingWatcher } from '@/composables/useBookingWatcher'
import { business } from '@/config/business'
import logoUrl from '@/assets/logo.svg'

// Живой вотчер: пока открыта админка — тост и бейдж вкладки о новых записях.
useBookingWatcher()

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebarOpen = ref(false)

async function logout() {
  await auth.signOut()
  router.push('/login')
}

// Диагностика связки «админка → сайт»: если бэкенд включён, но сессии
// владельца со студией нет — разделы пишут в локальные демо-данные,
// а сайт показывает базу. Баннер сразу показывает причину.
const scopeWarning = computed(() => {
  if (!auth.backendEnabled || !auth.initialized) return ''
  if (!auth.user) return 'Вы не вошли. Админка работает с локальными демо-данными — сайт их не увидит. Войдите через /login.'
  if (!auth.business)
    return 'К аккаунту не привязана студия. Админка пишет локально, сайт берёт данные из базы. Создайте студию или войдите под владельцем.'
  return ''
})

const links = [
  { to: '/admin', label: 'Главная', icon: 'dashboard' },
  { to: '/admin/bookings', label: 'Записи', icon: 'bookings' },
  { to: '/admin/services', label: 'Услуги', icon: 'services' },
  { to: '/admin/gallery', label: 'Галерея', icon: 'gallery' },
  { to: '/admin/reviews', label: 'Отзывы', icon: 'reviews' },
  { to: '/admin/calendar', label: 'Календарь', icon: 'calendar' },
  { to: '/admin/schedule', label: 'График работы', icon: 'clock' },
  { to: '/admin/notifications', label: 'Уведомления', icon: 'bell' },
  { to: '/admin/profile', label: 'Профиль', icon: 'user' },
]

function icon(name: string) {
  switch (name) {
    case 'dashboard':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>'
    case 'bookings':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
    case 'services':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    case 'gallery':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
    case 'reviews':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>'
    case 'calendar':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/><line x1="8" y1="18" x2="8" y2="18.01"/><line x1="12" y1="18" x2="12" y2="18.01"/><line x1="16" y1="18" x2="16" y2="18.01"/></svg>'
    case 'bell':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'
    case 'user':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    case 'clock':
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'
  }
}
</script>

<template>
  <div class="admin-layout">
    <aside :class="['admin-sidebar', { 'admin-sidebar--open': sidebarOpen }]">
      <div class="admin-sidebar__header">
        <router-link to="/admin" class="admin-sidebar__logo">
          <img :src="logoUrl" :alt="business.name" class="admin-sidebar__logo-img" />
          {{ business.name }}
        </router-link>
      </div>
      <nav class="admin-sidebar__nav">
        <router-link
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="admin-sidebar__link"
          :class="{ 'admin-sidebar__link--active': route.path === link.to }"
          @click="sidebarOpen = false"
        >
          <span class="admin-sidebar__link-icon" v-html="icon(link.icon)" />
          {{ link.label }}
        </router-link>
      </nav>
      <div class="admin-sidebar__footer">
        <div v-if="auth.backendEnabled && auth.user" class="admin-sidebar__user">
          <span class="admin-sidebar__email" :title="auth.user.email">{{ auth.user.email }}</span>
          <button class="admin-sidebar__logout" @click="logout">Выйти</button>
        </div>
        <router-link to="/" class="admin-sidebar__back">На сайт</router-link>
      </div>
    </aside>
    <div class="admin-main">
      <div class="admin-main__header">
        <button class="admin-main__burger" @click="sidebarOpen = !sidebarOpen">
          <span /><span /><span />
        </button>
        <h2 class="admin-main__title">
          <template v-if="route.path === '/admin'">Главная</template>
          <template v-else-if="route.path === '/admin/bookings'">Записи</template>
          <template v-else-if="route.path === '/admin/services'">Услуги</template>
          <template v-else-if="route.path === '/admin/gallery'">Галерея</template>
          <template v-else-if="route.path === '/admin/reviews'">Отзывы</template>
          <template v-else-if="route.path === '/admin/calendar'">Календарь</template>
          <template v-else-if="route.path === '/admin/schedule'">График работы</template>
          <template v-else-if="route.path === '/admin/notifications'">Уведомления</template>
          <template v-else-if="route.path === '/admin/profile'">Профиль</template>
        </h2>
      </div>
      <div v-if="scopeWarning" class="admin-main__warn">
        {{ scopeWarning }}
      </div>
      <div class="admin-main__content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.admin-layout {
  display: flex;
  min-height: calc(100vh - $nav-height);
  margin-top: $nav-height;
}

.admin-sidebar {
  width: 240px;
  background: $color-surface;
  border-right: 1px solid $color-border;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @include tablet {
    position: fixed;
    left: -240px;
    top: $nav-height;
    bottom: 0;
    z-index: 50;
    transition: left $transition-base;
    box-shadow: $shadow-lg;

    &--open {
      left: 0;
    }
  }

  &__header {
    padding: 24px;
    border-bottom: 1px solid $color-border;
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 18px;
    font-weight: 700;
    text-decoration: none;
    color: $color-text;
  }

  &__logo-img {
    width: 26px;
    height: 26px;
    border-radius: 7px;
  }

  &__nav {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: $radius-sm;
    font-size: 14px;
    font-weight: 500;
    color: $color-text-secondary;
    text-decoration: none;
    transition: all $transition-fast;

    &:hover {
      background: $color-bg;
      color: $color-text;
    }

    &--active {
      background: $color-bg;
      color: $color-text;
    }
  }

  &__link-icon {
    display: flex;
    align-items: center;
  }

  &__footer {
    padding: 12px;
    border-top: 1px solid $color-border;
  }

  &__back {
    display: block;
    padding: 10px 12px;
    font-size: 14px;
    color: $color-text-secondary;
    text-decoration: none;
    border-radius: $radius-sm;
    &:hover { background: $color-bg; color: $color-text; }
  }

  &__user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    margin-bottom: 4px;
    background: $color-bg;
    border-radius: $radius-sm;
  }

  &__email {
    font-size: 13px;
    color: $color-text-secondary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__logout {
    flex-shrink: 0;
    border: none;
    background: transparent;
    font-size: 13px;
    font-weight: 500;
    color: $color-error;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    &:hover { text-decoration: underline; }
  }
}

.admin-main {
  flex: 1;
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 24px 32px;
    border-bottom: 1px solid $color-border;
    background: $color-surface;
  }

  &__burger {
    display: none;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border: none;
    background: transparent;
    cursor: pointer;

    @include tablet { display: flex; }

    span {
      display: block;
      width: 18px;
      height: 2px;
      background: $color-text;
      border-radius: 2px;
    }
  }

  &__title {
    font-size: 18px;
  }

  &__warn {
    margin: 16px 32px 0;
    padding: 12px 16px;
    font-size: 13px;
    color: #92400e;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: $radius-sm;
  }

  &__content {
    padding: 32px;
  }
}
</style>
