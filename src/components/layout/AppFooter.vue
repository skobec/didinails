<script setup lang="ts">
import { business } from '@/config/business'
import logoUrl from '@/assets/logo.svg'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <div class="footer__grid">
        <div class="footer__col">
          <h4 class="footer__title footer__brand">
            <img :src="logoUrl" :alt="business.name" class="footer__logo-img" />
            {{ business.name }}
          </h4>
          <p class="footer__text">Профессиональный маникюр и педикюр. Работаем с душой и любим своё дело.</p>
        </div>
        <div class="footer__col">
          <h4 class="footer__title">Навигация</h4>
          <router-link to="/" class="footer__link">Главная</router-link>
          <router-link to="/gallery" class="footer__link">Работы</router-link>
          <router-link to="/prices" class="footer__link">Цены</router-link>
          <router-link to="/reviews" class="footer__link">Отзывы</router-link>
          <router-link to="/schedule" class="footer__link">Расписание</router-link>
          <router-link to="/contacts" class="footer__link">Контакты</router-link>
        </div>
        <div class="footer__col">
          <h4 class="footer__title">Контакты</h4>
          <a href="tel:+79372162460" class="footer__link">+7 937 216 2460</a>
          <a href="https://www.instagram.com/di.dii.nails_" target="_blank" rel="noopener" class="footer__link">Instagram</a>
          <a href="https://t.me/nailwinx" target="_blank" rel="noopener" class="footer__link">Telegram</a>
        </div>
      </div>
      <div class="footer__bottom">
        <p class="footer__copyright">&copy; {{ year }} {{ business.name }}. Все права защищены.</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.footer {
  border-top: 1px solid $color-border;
  background: $color-surface;
  margin-top: auto;

  &__inner {
    @include container;
    padding-top: 60px;
    padding-bottom: 32px;
  }

  &__grid {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 48px;

    @include mobile {
      grid-template-columns: 1fr;
      gap: 32px;
    }
  }

  &__col {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__title {
    font-size: 16px;
    margin-bottom: 4px;
  }

  &__brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__logo-img {
    width: 22px;
    height: 22px;
    border-radius: 6px;
  }

  &__text {
    font-size: 14px;
    color: $color-text-secondary;
    line-height: 1.6;
  }

  &__link {
    font-size: 14px;
    color: $color-text-secondary;
    text-decoration: none;
    transition: color $transition-fast;
    width: fit-content;

    &:hover {
      color: $color-text;
    }
  }

  &__bottom {
    margin-top: 48px;
    padding-top: 24px;
    border-top: 1px solid $color-border;
  }

  &__copyright {
    font-size: 13px;
    color: $color-text-tertiary;
  }
}
</style>
