import { createRouter, createWebHistory } from 'vue-router'
import { business } from '@/config/business'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseEnabled } from '@/services/supabase'

const DEFAULT_TITLE = `${business.name} — маникюр на каждый день`

const router = createRouter({
  // BASE_URL подхватывает base из vite.config.ts — роутер корректно
  // работает и в корне домена, и в подпути GitHub Pages.
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior() {
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      component: () => import('@/components/layout/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('@/pages/HomePage.vue'),
          meta: { title: 'Главная' },
        },
        {
          path: 'gallery',
          name: 'gallery',
          component: () => import('@/pages/GalleryPage.vue'),
          meta: { title: 'Работы' },
        },
        {
          path: 'prices',
          name: 'prices',
          component: () => import('@/pages/PricesPage.vue'),
          meta: { title: 'Цены' },
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: () => import('@/pages/ReviewsPage.vue'),
          meta: { title: 'Отзывы' },
        },
        {
          path: 'contacts',
          name: 'contacts',
          component: () => import('@/pages/ContactsPage.vue'),
          meta: { title: 'Контакты' },
        },
        {
          path: 'booking',
          name: 'booking',
          component: () => import('@/pages/BookingPage.vue'),
          meta: { title: 'Запись онлайн' },
        },
        {
          path: 'schedule',
          name: 'schedule',
          component: () => import('@/pages/SchedulePage.vue'),
          meta: { title: 'Расписание' },
        },
        // Вход только для владельца. Публичной регистрации и ссылок на неё
        // в меню нет; /register — скрытая одноразовая настройка владельца.
        {
          path: 'login',
          name: 'login',
          component: () => import('@/pages/LoginPage.vue'),
          meta: { title: 'Вход' },
        },
        {
          path: 'register',
          name: 'register',
          component: () => import('@/pages/RegisterPage.vue'),
          meta: { title: 'Регистрация' },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/pages/ForgotPasswordPage.vue'),
          meta: { title: 'Сброс пароля' },
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('@/pages/ResetPasswordPage.vue'),
          meta: { title: 'Новый пароль' },
        },
        {
          path: 'onboarding',
          name: 'onboarding',
          component: () => import('@/pages/OnboardingPage.vue'),
          meta: { title: 'Создание студии' },
        },
        {
          path: ':pathMatch(.*)*',
          name: 'not-found',
          component: () => import('@/pages/NotFoundPage.vue'),
          meta: { title: 'Страница не найдена' },
        },
      ],
    },
    {
      path: '/admin',
      component: () => import('@/pages/admin/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin',
          component: () => import('@/pages/admin/AdminDashboard.vue'),
          meta: { title: 'Админ-панель' },
        },
        {
          path: 'bookings',
          name: 'admin-bookings',
          component: () => import('@/pages/admin/AdminBookings.vue'),
          meta: { title: 'Записи' },
        },
        {
          path: 'services',
          name: 'admin-services',
          component: () => import('@/pages/admin/AdminServices.vue'),
          meta: { title: 'Услуги' },
        },
        {
          path: 'gallery',
          name: 'admin-gallery',
          component: () => import('@/pages/admin/AdminGallery.vue'),
          meta: { title: 'Галерея' },
        },
        {
          path: 'reviews',
          name: 'admin-reviews',
          component: () => import('@/pages/admin/AdminReviews.vue'),
          meta: { title: 'Отзывы' },
        },
        {
          path: 'calendar',
          name: 'admin-calendar',
          component: () => import('@/pages/admin/AdminCalendar.vue'),
          meta: { title: 'Календарь' },
        },
        {
          path: 'schedule',
          name: 'admin-schedule',
          component: () => import('@/pages/admin/AdminSchedule.vue'),
          meta: { title: 'График работы' },
        },
        {
          path: 'notifications',
          name: 'admin-notifications',
          component: () => import('@/pages/admin/AdminNotifications.vue'),
          meta: { title: 'Уведомления' },
        },
        {
          path: 'profile',
          name: 'admin-profile',
          component: () => import('@/pages/admin/AdminProfile.vue'),
          meta: { title: 'Профиль' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const needsAuth = to.matched.some((r) => r.meta.requiresAuth)
  const isOnboarding = to.path === '/onboarding'
  if (!needsAuth && !isOnboarding) return true
  // Local-режим без бэкенда: админка открыта как раньше.
  if (!isSupabaseEnabled()) return true
  const auth = useAuthStore()
  if (!auth.initialized) await auth.init()
  if (!auth.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (isOnboarding && auth.business) return { path: '/admin' }
  return true
})

router.afterEach((to) => {
  const title = to.meta?.title
    ? `${to.meta.title} | ${business.name}`
    : DEFAULT_TITLE
  document.title = title

  let description = 'Профессиональный маникюр и педикюр. Запись онлайн.'
  if (to.meta?.description) {
    description = to.meta.description as string
  }
  const metaDesc = document.querySelector('meta[name="description"]')
  if (metaDesc) {
    metaDesc.setAttribute('content', description)
  }
})

export default router
