<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppLoader from '@/components/ui/AppLoader.vue'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/authStore'
import { isSupabaseEnabled } from '@/services/supabase'
import { getOwnBusiness, updateBusiness } from '@/services/repositories/businesses'
import { ruError } from '@/utils/errors'

const auth = useAuthStore()
const { show } = useToast()

const loading = ref(true)
const saving = ref(false)
const businessId = ref('')

const form = ref({
  name: '',
  description: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  timezone: 'Europe/Moscow',
  instagram: '',
  telegram: '',
  phone_note: '',
})

const timezoneOptions = [
  { value: 'Europe/Moscow', label: 'Москва (UTC+3)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
  { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
  { value: 'Asia/Novosibirsk', label: 'Новосибирск (UTC+7)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
  { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
  { value: 'Asia/Almaty', label: 'Алматы (UTC+6)' },
  { value: 'Europe/Amsterdam', label: 'Амстердам (UTC+1)' },
]

onMounted(async () => {
  if (!isSupabaseEnabled() || !auth.user) {
    loading.value = false
    return
  }
  try {
    const b = await getOwnBusiness(auth.user.id)
    if (b) {
      businessId.value = b.id
      form.value = {
        name: b.name ?? '',
        description: b.description ?? '',
        phone: b.phone ?? '',
        email: b.email ?? '',
        city: b.city ?? '',
        address: b.address ?? '',
        timezone: b.timezone || 'Europe/Moscow',
        instagram: b.instagram ?? '',
        telegram: b.telegram ?? '',
        phone_note: b.phone_note ?? '',
      }
    }
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
  } finally {
    loading.value = false
  }
})

async function save() {
  if (!form.value.name.trim()) {
    show('Введите название студии', 'error')
    return
  }
  if (!businessId.value) {
    show('Студия не найдена. Перезайдите в админку.', 'error')
    return
  }
  saving.value = true
  try {
    await updateBusiness(businessId.value, {
      name: form.value.name.trim(),
      description: form.value.description.trim(),
      phone: form.value.phone.trim(),
      email: form.value.email.trim(),
      city: form.value.city.trim(),
      address: form.value.address.trim(),
      timezone: form.value.timezone,
      instagram: form.value.instagram.trim(),
      telegram: form.value.telegram.trim(),
      phone_note: form.value.phone_note.trim(),
    })
    show('Профиль сохранён — сайт обновится сразу', 'success')
  } catch (e) {
    show(ruError(e instanceof Error ? e.message : ''), 'error')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="admin-profile">
    <div v-if="loading" class="admin-profile__loading">
      <AppLoader />
    </div>
    <div v-else-if="!isSupabaseEnabled()" class="admin-profile__warn">
      Профиль хранится в Supabase. Подключите бэкенд (docs/supabase-setup.md) —
      в local-демо контакты зашиты в код страниц.
    </div>
    <div v-else class="admin-profile__card">
      <h3>Профиль студии</h3>
      <p class="admin-profile__desc">Название, контакты и город сразу появятся на сайте.</p>
      <div class="admin-profile__form">
        <AppInput v-model="form.name" label="Название студии" placeholder="DiDiNails" />
        <AppInput v-model="form.description" label="Описание" placeholder="Пара слов о студии" multiline />
        <div class="admin-profile__row">
          <AppInput v-model="form.phone" label="Телефон" placeholder="+7 (___) ___-__-__" />
          <AppInput v-model="form.email" label="Email" placeholder="hello@example.com" />
        </div>
        <AppInput v-model="form.phone_note" label="Пометка про телефон" placeholder="Например: пишите в мессенджеры, на звонки могу не ответить" multiline />
        <div class="admin-profile__row">
          <AppInput v-model="form.instagram" label="Instagram (ссылка)" placeholder="https://www.instagram.com/..." />
          <AppInput v-model="form.telegram" label="Telegram (ссылка)" placeholder="https://t.me/..." />
        </div>
        <div class="admin-profile__row">
          <AppInput v-model="form.city" label="Город" placeholder="Москва" />
          <AppInput v-model="form.address" label="Адрес" placeholder="ул. Тверская, д. 15" />
        </div>
        <AppSelect v-model="form.timezone" label="Часовой пояс" :options="timezoneOptions" />
        <div>
          <AppButton :loading="saving" @click="save">Сохранить</AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.admin-profile {
  max-width: 640px;

  &__loading {
    padding: 40px 0;
    @include flex-center;
  }

  &__warn {
    font-size: 13px;
    color: #b45309;
    background: #fef3c7;
    border-radius: $radius-sm;
    padding: 12px 16px;
  }

  &__card {
    @include card;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    h3 { font-size: 18px; }
  }

  &__desc {
    font-size: 14px;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 8px;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    @include mobile { grid-template-columns: 1fr; }
  }
}
</style>
