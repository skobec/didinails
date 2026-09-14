# DiDiNails — сайт для частного мастера маникюра

MVP современного сайта с онлайн-записью, админ-панелью и архитектурой, готовой к подключению Supabase.

---

## Стек

- **Vue 3** (Composition API, `<script setup>`)
- **Vite 8**
- **TypeScript**
- **Vue Router 4** (ленивая загрузка страниц)
- **Pinia** (управление состоянием)
- **SCSS** (модульная система стилей)
- Анимации, адаптив, localStorage

---

## Требования

- Node.js 22+ (LTS; CI собирает на 22 + npm 11 — см. `.nvmrc`)
- npm 11+ (`npm install -g npm@11`, если старый)

## Запуск

```bash
npm install
cp .env.example .env.local   # опционально: свои название/slug/таймзона (дефолты уже вшиты)
npm run dev       # разработка на http://localhost:5173
npm run build     # production-сборка в dist/
npm run preview   # превью собранного проекта (проверка перед деплоем)
```

Проверка готовности к запуску: `npm run build` должен завершиться без ошибок
(внутри уже сидят проверка типов `vue-tsc` и сборка Vite).

---

## Структура проекта

```
src/
├── assets/styles/         # Глобальные SCSS-стили
│   ├── _variables.scss    # Цвета, тени, шрифты, отступы
│   ├── _mixins.scss       # Миксины (кнопки, поля, адаптив)
│   ├── _reset.scss        # Сброс браузерных стилей
│   ├── _typography.scss   # Типографика
│   └── main.scss          # Главный файл (подключает всё)
│
├── components/
│   ├── ui/                # Переиспользуемые UI-компоненты
│   │   ├── AppButton.vue
│   │   ├── AppInput.vue
│   │   ├── AppSelect.vue
│   │   ├── AppModal.vue
│   │   ├── AppToast.vue
│   │   └── AppLoader.vue
│   ├── layout/            # Компоненты макета
│   │   ├── AppNavbar.vue  # Навигация (десктоп + мобильная)
│   │   ├── AppFooter.vue
│   │   └── AppLayout.vue  # Основной слой с <router-view>
│   ├── HeroSection.vue
│   ├── ServiceCard.vue
│   ├── GalleryCard.vue
│   ├── ReviewCard.vue
│   ├── PriceCard.vue
│   └── BookingForm.vue    # Форма записи в 4 шага
│
├── composables/           # Логика, общая для компонентов
│   ├── useBookings.ts     # CRUD для записей
│   ├── useServices.ts     # CRUD для услуг
│   ├── useGallery.ts      # CRUD для галереи
│   ├── useReviews.ts      # CRUD для отзывов
│   ├── useTimeSlots.ts    # Управление слотами времени (per-date)
│   └── useToast.ts        # Система уведомлений
│
├── data/                  # Моковые данные (начальное наполнение)
│   ├── services.ts
│   ├── gallery.ts
│   ├── reviews.ts
│   └── timeSlots.ts
│
├── pages/                 # Страницы приложения
│   ├── HomePage.vue       # ← главная
│   ├── GalleryPage.vue    # /gallery
│   ├── PricesPage.vue     # /prices
│   ├── ReviewsPage.vue    # /reviews
│   ├── ContactsPage.vue   # /contacts
│   ├── BookingPage.vue    # /booking
│   └── admin/
│       ├── AdminLayout.vue       # Боковая панель
│       ├── AdminDashboard.vue    # /admin
│       ├── AdminBookings.vue     # /admin/bookings
│       ├── AdminServices.vue     # /admin/services
│       ├── AdminGallery.vue      # /admin/gallery
│       ├── AdminReviews.vue      # /admin/reviews
│       └── AdminCalendar.vue     # /admin/calendar
│
├── config/
│   └── business.ts        # Single-tenant конфиг: slug/name/timezone из env (шов под multi-tenant)
├── router/index.ts        # Маршрутизация (ленивая загрузка)
├── services/storage.ts    # Абстракция над localStorage
├── stores/                # Pinia-стори
│   ├── bookingStore.ts
│   └── adminStore.ts
├── types/index.ts         # Все TypeScript-интерфейсы
│   └── helpers.ts         # Утилиты (форматирование, даты)
│
├── App.vue                # Корневой компонент
└── main.ts                # Точка входа
```

---

## Страницы

Ветки: текущая — **v1, сайт одного салона** (без публичной регистрации);
ветка **`platform`** — замороженная v2 (multi-tenant: `/masters`, `/:slug`,
регистрация мастеров). Не смешиваем порталы.

| Путь | Описание |
|------|----------|
| `/` | Главная-витрина салона (hero, услуги, работы, отзывы, CTA) |
| `/gallery` | Портфолио с фильтром по категориям |
| `/prices` | Прайс, сгруппированный по категориям |
| `/reviews` | Отзывы клиентов |
| `/contacts` | Контакты (телефон/адрес из базы) |
| `/booking` | Онлайн-запись в 4 шага (услуга → дата/время → контакты → готово) |
| `/schedule` | Публичное расписание: статусы дней, ближайшие окна, запись в 1 клик |
| `/login` | Вход **владельца** (Supabase Auth; без бэкенда — заглушка с подсказкой) |
| `/admin` | Кабинет: записи, услуги, галерея, отзывы, календарь, график работы, уведомления (guard: без сессии → `/login`) |
| `/admin/notifications` | Telegram-уведомления о записях: вкл/выкл, chat id, тест (см. `docs/notifications.md`) |

Данные салона берутся из Supabase по slug из `VITE_FEATURED_SLUG`
(твой салон); без бэкенда — демо-данные из `src/data/`.
Всё editable из `/admin`: услуги и цены, работы (загрузка фото),
отзывы, слоты календаря, статусы записей.
| `/admin/bookings` | Управление записями (подтверждение, отмена, удаление) |
| `/admin/services` | Управление услугами и ценами |
| `/admin/gallery` | Управление портфолио |
| `/admin/reviews` | Управление отзывами |
| `/admin/calendar` | Управление слотами времени по дням |

---

## Хранение данных

Все данные хранятся в **localStorage** через сервис `services/storage.ts`.

Ключи в localStorage (префикс `manik_`):
- `manik_bookings` — записи клиентов
- `manik_services` — услуги
- `manik_gallery` — галерея
- `manik_reviews` — отзывы
- `manik_blockedTimes` — заблокированные админом временные слоты по датам

Сброс демо-данных: очисти localStorage в DevTools (Application → Local Storage)
и перезагрузи страницу — моковые данные из `src/data/` подставятся заново.

---

## Environment variables

| Переменная | Дефолт | Назначение |
|---|---|---|
| `VITE_APP_NAME` | `DiDiNails` | Название в `<title>` и интерфейсе |
| `VITE_BUSINESS_SLUG` | `didinails` | Slug бизнеса, задел под `/[slug]` |
| `VITE_FEATURED_SLUG` | `didinails` | Какая студия открывается на `/` (твой салон) |
| `VITE_BUSINESS_TIMEZONE` | `Europe/Moscow` | Таймзона мастера |
| `VITE_USE_SUPABASE` | — (выкл.) | `'true'` — использовать Supabase, иначе localStorage |
| `VITE_SUPABASE_URL` | — | URL бесплатного проекта Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | — | Публичный ключ `sb_publishable_*` (secret — никогда) |

Файл `.env.local` игнорируется гитом (см. `.gitignore`: `*.local`).
Секреты никогда не коммитятся — образец без значений лежит в `.env.example`.

---

## Деплой

Проект — статическое SPA (`dist/` после `npm run build`). База путей:
локально и на своём домене — корень (`/`), для GitHub Pages CI подставляет
`/<имя-репо>/` автоматически (`PAGES_BASE`, роутер берёт `BASE_URL`).
Переименование репозитория сборку не ломает. Важно: относительный
`base: './'` роутеру отдавать нельзя — он откатывается на `/` и уводит
ссылки мимо подпути (баг уже ловили).

| Хостинг | Цена | SPA-роутинг | Комментарий |
|---|---|---|---|
| **Cloudflare Pages** (рекомендую) | $0 | из коробки (`public/_redirects`) | Быстрый CDN, без карты, custom-домен бесплатно |
| **Vercel** | $0 (Hobby) | из коробки (`vercel.json`) | `git push` → деплой; нужен импорт репозитория |
| **Netlify** | $0 | из коробки (`public/_redirects`) | Аналог Vercel |
| **GitHub Pages** | $0 | через трюк `404.html` | CI: проверка типов+сборка на каждый push/PR; CD: деплой при пуше в `master`. Включить: Settings → Pages → Source: GitHub Actions. URL: `https://<user>.github.io/<repo>/`. **Обязательно** задать Variables (иначе деплой будет в демо-режиме без базы!) — см. ниже |

Без fallback `/booking`, `/admin` дадут 404 при прямом открытии/обновлении —
это особенность `createWebHistory()`, а не баг.

`public/robots.txt` разрешает индексацию публичных страниц и закрывает `/admin/`.

### Деплой на GitHub Pages — по шагам

Vite впечатывает `VITE_*` в сборку **в момент билда**, поэтому `.env.local`
(он в gitignore) до CI не долетает. Без переменных сайт соберётся, но будет
в демо-режиме на localStorage — записи не дойдут до базы.

1. Репозиторий → Settings → Secrets and variables → Actions → **Variables** →
   создать все 7 (значения — как в твоём `.env.local`):
   `VITE_USE_SUPABASE=true`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_NAME`,
   `VITE_BUSINESS_SLUG`, `VITE_FEATURED_SLUG`, `VITE_BUSINESS_TIMEZONE`.
   Те же переменные использует keep-alive workflow — дублировать не надо.
2. Settings → Pages → Source: **GitHub Actions**.
3. `git push origin master` → Actions собирает, проверяет типы и деплоит.
   PR в `master` только проверяют сборку, без публикации.
4. Для писем восстановления пароля: Supabase → Authentication →
   URL Configuration → Redirect URLs → добавить
   `https://<user>.github.io/<repo>/**`.

### Что ещё умеет CI/CD (уже настроено)

```
push/PR → build (типы+сборка) → deploy (только master) → smoke → прод
                                                      ↳ ежедневно healthcheck
```

- **Smoke-тест после каждого деплоя**: открывает главную + `/booking`, `/login`,
  `/admin` на проде и проверяет, что Supabase-URL запечён в бандл. Именно он
  поймал бы историю с пустыми Variables автоматически.
- **Ежедневный healthcheck** (`.github/workflows/healthcheck.yml`): сайт отвечает,
  база читается, RPC занятости работает. Падение = письмо от GitHub.
- **Dependabot** (`.github/dependabot.yml`): еженедельные PR с обновлениями
  зависимостей — вливать после зелёного CI.
- Рекомендую включить защиту ветки (Settings → Branches → Add rule → `master` →
  Require status checks → `build`): сломанный код не уедет в прод.

Сознательно НЕ делаем (AGENTS.md §51, рано для v1): staging-окружения,
Docker, E2E-тесты, preview-деплой на каждый PR (на Pages их нет —
это фишка Cloudflare/Vercel, переедем туда при необходимости).

### RU-зона: что важно знать

- Все четыре варианта выше бесплатны, карты не требуют и открываются из РФ.
  RU-хостеры (Timeweb, Beget и т.п.) для статики — как правило платные от первого дня,
  бесплатного forever-тарифа под статический SPA у них нет, поэтому для MVP они не нужны.
- Домен `.ru` — платный (покупается у регистратора), любой из хостингов выше
  позволяет привязать свой домен бесплатно. На старте достаточно бесплатного
  поддомена хостинга (`*.pages.dev`, `*.vercel.app`, `*.github.io`).
- Бэкенд Supabase Free: регистрация без карты; регион проекта выбирай
  ближайший к клиентам (`West EU` / `Central EU`). Нюанс тарифа: проект засыпает
  после недели без активности — будится одной кнопкой в Dashboard.

---

## Бэкенд: бесплатный Supabase (multi-tenant по AGENTS.md)

Готово уже сейчас, без переписывания фронтенда:

- `src/services/supabase.ts` — клиент, `null` пока нет ключей (фолбэк localStorage);
- `supabase/migrations/0001_init.sql` — схема: `businesses`, `services`,
  `clients`, `appointments`, `working_hours`, `blocked_periods`, `reviews`,
  `media` + серверный триггер против двойной записи + RLS + бакеты Storage;
- **`docs/supabase-setup.md` — пошаговая инструкция**: аккаунт → проект Free →
  SQL-миграция → бизнес+владелец → `.env.local` → деплой-переменные,
  плюс чек-лист задач Phase B (репозитории, Auth UI, загрузка фото, тест RLS).

Принцип сохраняется: composables ходят в данные только через `services/`,
компоненты — только через composables, поэтому подключение бэкенда
не требует переписывания UI.

---

## Дизайн

Стиль: минимализм, Apple/Linear/Vercel.

- Светлая тема, большие отступы, плавные анимации
- Адаптив: мобильные, планшеты, десктоп
- Цветовая схема: `_variables.scss`
- Основной цвет акцента: `#E88D7A` (тёплый коралловый)

---

## Команды

```bash
npm run dev       # Запуск dev-сервера
npm run build     # Проверка типов + сборка в dist/
npm run preview   # Просмотр собранного проекта
```
