// Человеческие тексты ошибок Supabase/PostgREST (единая точка, AGENTS.md §36).
// Используется и в auth, и в репозиториях бронирования.

export function ruError(message: string): string {
  const m = (message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'Неверный email или пароль.'
  if (m.includes('user already registered')) return 'Этот email уже зарегистрирован. Войдите.'
  if (m.includes('email not confirmed')) return 'Email не подтверждён. Проверьте почту и перейдите по ссылке из письма.'
  if (m.includes('password should be')) return 'Пароль слишком простой — минимум 6 символов.'
  if (m.includes('unable to validate email')) return 'Похоже, такого email не существует.'
  if (m.includes('rate limit') || m.includes('over_email_send_rate_limit') || m.includes('429'))
    return 'Превышен лимит отправки писем Supabase. Подождите около часа и попробуйте снова — или выключите «Confirm email» в настройках Auth.'
  if (m.includes('duplicate key') || m.includes('already exists') || m.includes('23505'))
    return 'Такой адрес страницы уже занят. Придумайте другой slug.'
  if (m.includes('slot_taken')) return 'Это время уже заняли. Пожалуйста, выберите другое.'
  if (m.includes('no_captcha') || m.includes('bad_captcha'))
    return 'Не пройдена проверка «я не робот». Поставьте галочку и попробуйте снова.'
  if (m.includes('no_service')) return 'Эта услуга сейчас недоступна. Обновите страницу.'
  if (m.includes('bad_time') || m.includes('bad_duration') || m.includes('no_client_data'))
    return 'Проверьте заполнение формы и попробуйте снова.'
  return message || 'Что-то пошло не так. Попробуйте ещё раз.'
}

// Slug, зарезервированные под системные роуты — такие адреса студиям не выдаём.
export const RESERVED_SLUGS = [
  'login', 'register', 'onboarding', 'admin', 'masters',
  'api', 'booking', 'gallery', 'prices', 'reviews', 'contacts',
]

export function isSlugAvailablePattern(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug) && !RESERVED_SLUGS.includes(slug)
}
