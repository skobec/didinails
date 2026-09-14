<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import HeroSection from '@/components/HeroSection.vue'
import ServiceCard from '@/components/ServiceCard.vue'
import GalleryCard from '@/components/GalleryCard.vue'
import ReviewCard from '@/components/ReviewCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppSkeleton from '@/components/ui/AppSkeleton.vue'
import { useFeatured } from '@/composables/useFeatured'

const router = useRouter()
const { cloud, loading, services, works, reviews, ensureLoaded } = useFeatured()

onMounted(ensureLoaded)

function goStudio() {
  router.push('/prices')
}

function goBooking() {
  router.push('/booking')
}

function goGallery() {
  router.push('/gallery')
}

function goReviews() {
  router.push('/reviews')
}
</script>

<template>
  <div class="home">
    <HeroSection />

    <section v-if="cloud && loading" class="home__section">
      <div class="home__container">
        <div class="home__services-grid">
          <AppSkeleton v-for="i in 4" :key="i" height="120px" radius="16px" />
        </div>
      </div>
    </section>
    <template v-else>
    <!-- Services Preview -->
    <section v-if="services.length > 0" class="home__section">
      <div class="home__container">
        <div class="home__section-header">
          <span class="home__badge">Услуги</span>
          <h2>Что мы предлагаем</h2>
          <p>Широкий спектр услуг маникюра и педикюра на любой вкус</p>
        </div>
        <div class="home__services-grid">
          <ServiceCard
            v-for="s in services.slice(0, 4)"
            :key="s.id"
            :service="s"
            @select="goBooking"
          />
        </div>
        <div class="home__section-action">
          <AppButton variant="secondary" @click="goStudio">Все услуги и цены</AppButton>
        </div>
      </div>
    </section>

    <!-- Gallery Preview -->
    <section v-if="works.length > 0" class="home__section home__section--alt">
      <div class="home__container">
        <div class="home__section-header">
          <span class="home__badge">Портфолио</span>
          <h2>Наши работы</h2>
          <p>Примеры дизайнов и покрытий</p>
        </div>
        <div class="home__gallery-grid">
          <GalleryCard v-for="item in works.slice(0, 4)" :key="item.id" :item="item" />
        </div>
        <div class="home__section-action">
          <AppButton variant="secondary" @click="goGallery">Вся галерея</AppButton>
        </div>
      </div>
    </section>

    <!-- Reviews Preview -->
    <section v-if="reviews.length > 0" class="home__section">
      <div class="home__container">
        <div class="home__section-header">
          <span class="home__badge">Отзывы</span>
          <h2>Что говорят клиенты</h2>
        </div>
        <div class="home__reviews-grid">
          <ReviewCard v-for="r in reviews.slice(0, 3)" :key="r.id" :review="r" />
        </div>
        <div class="home__section-action">
          <AppButton variant="secondary" @click="goReviews">Все отзывы</AppButton>
        </div>
      </div>
    </section>
    </template>

    <!-- CTA -->
    <section class="home__section home__section--cta">
      <div class="home__container">
        <div class="home__cta">
          <h2>Запишитесь прямо сейчас</h2>
          <p>Оставьте заявку и мы подберём удобное время</p>
          <div class="home__cta-actions">
            <AppButton size="lg" @click="goBooking">Записаться онлайн</AppButton>
            <AppButton size="lg" variant="secondary" @click="router.push('/schedule')">Смотреть расписание</AppButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;
@use '@/assets/styles/mixins' as *;

.home {
  &__section {
    @include section;

    &--alt {
      background: $color-surface;
    }

    &--cta {
      background: $color-surface;
    }
  }

  &__container {
    @include container;
  }

  &__section-header {
    text-align: center;
    margin-bottom: 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    p {
      max-width: 480px;
    }
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

  &__services-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  &__gallery-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    @include tablet {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  &__reviews-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    @include tablet {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mobile {
      grid-template-columns: 1fr;
    }
  }

  &__section-action {
    display: flex;
    justify-content: center;
    margin-top: 32px;
  }

  &__cta {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 60px 0;

    p {
      max-width: 400px;
    }
  }

  &__cta-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
