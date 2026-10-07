<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Архитектура и инициализация Zypo

## 1. Локализация и переводы (lang)
- **Инициализация:** Объект словаря переводов `lang` подгружается и инициализируется глобально на клиенте из `app/locales/` через контекст авторизации `AuthContext` без сетевых запросов к бэкенду.
- **Использование:** Чтобы получить переводы в компоненте, ВСЕГДА используй хук `useAuth`:
  ```tsx
  import { useAuth } from '../context/AuthContext';
  // ...
  const { lang } = useAuth();
  ```
- **Правило именования:** НИКОГДА не называй локальные переменные состояния компонента именем `lang` (например, при выборе языка трека, языка формы и т.д.), чтобы не перекрывать словарь `lang` из `useAuth()`. Используй названия вроде `trackLang`, `selectedLang` и т.д.

## 2. Локализация (файлы переводов)
- **Запрет на инлайн-тернарники:** Категорически запрещено использовать конструкции вида `{lang?.langname === 'en' ? 'English text' : 'Русский текст'}` непосредственно в компонентах.
- **Добавление переводов:** Все новые текстовые строки добавляются в клиентские файлы локализации: `app/locales/ru.ts` и `app/locales/en.ts`. Затем на клиенте они используются через объект `lang` (например, `lang?.my_new_key`).

## 3. Toast-уведомления (нотификации)
- **Использование:** Для показа всплывающих уведомлений (Toast) используй хук `useNotification`:
  ```tsx
  import { useNotification } from '../context/NotificationContext';
  // ...
  const { showNote } = useNotification();
  // ...
  showNote({
    content: lang?.some_message || 'Сообщение',
    type: 'success', // 'success' | 'error' | 'warning' | 'info'
    time: 5 // время показа в секундах
  });
  ```

## 4. Модальные окна
- **Компонент:** В проекте используется стандартный переиспользуемый компонент `Modal` (например, `import Modal from '../components/modal'`).
- **Использование:** 
  ```tsx
  <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={lang?.title || 'Заголовок'}>
    <div>Контент модального окна</div>
  </Modal>
  ```

## 5. Дизайн-код Zypo (СТРОГИЕ ПРАВИЛА)
- **Стилизация:** Строго следуй дизайн-коду и токенам проекта при создании/редактировании интерфейсов:
  - **Закругления:** ТОЛЬКО `rounded-3xl` (для карточек, блоков, модалок) и `rounded-full` (для кнопок, пиллов, аватарок, инпутов).
    - **СТРОГО ЗАПРЕЩЕНО:** `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` и произвольные радиусы.
  - **Отступы и интервалы:**
    - **Лейаут, карточки, сетки, блоки, внешние отступы и промежутки (margin/padding/gap):** ТОЛЬКО шаг `3`: `p-3`, `p-6`, `px-3`, `py-3`, `m-3`, `mx-3`, `my-3`, `mr-3`, `ml-3`, `mt-3`, `mb-3`, `gap-3`, `space-x-3`, `space-y-3`. Любые левые шаги (`gap-1`, `gap-2`, `gap-4`, `m-1`, `m-2`, `m-4`, `mb-1`, `mb-2`, `mb-4` и т.д.) в структуре блоков запрещены.
    - **Кнопки, пиллы, чипы, инпуты и контролы:** У кнопок и элементов управления используются эргономичные паддинги компонентов (не квадратные `p-3`):
      - Основные кнопки действий (Action / Submit buttons): `px-4 py-2` или `px-4 py-2.5` (`rounded-full`).
      - Табы, фильтры, пилюли: `px-3 py-2` или `px-4 py-2` (`rounded-full`).
      - Компактные чипы, теги, статусные бейджи: `px-3 py-1.5` (`rounded-full text-xs`).
      - Круглые кнопки с иконками (Icon buttons): `p-2` / `p-1.5` или фиксированный размер `w-10 h-10` / `w-12 h-12` (`rounded-full flex items-center justify-center`).
      - Инпуты: `h-12 px-3` или `h-10 px-3` (`rounded-full`).
  - **Границы:** ТОЛЬКО `border border-zinc-600/30`.
  - **Стекло — ТОЛЬКО наше:** любой полупрозрачный/размытый элемент (кнопка, плашка, панель, меню, шапка) — через роль `glass-nav | glass-menu | glass-tooltip | glass-input | glass-panel | glass-overlay` (`app/globals.css`) + переопределения `[--glass-tint:…] [--glass-alpha:…] [--glass-blur:…] [--glass-sat:…]`, ховер — `hover:[--glass-tint:…] hover:[--glass-alpha:…]`. Тогда элемент слушается настройки «Интерфейс → Стекло». **ЗАПРЕЩЕНО:** `backdrop-blur*`, свой `backdrop-filter` и «стекло» из `bg-black/40`/`bg-zinc-900/90` + blur. Собственный CSS с `backdrop-filter` — только с множителями `--glass-<роль>-blur-k`/`-clarity-k`. Классы стекла пишутся внутрь `class`/`className`, в HTML-строках (парсер постов) — внутри атрибута `class="…"`, не текстом перед тегом.
  - **Подсказки — ТОЛЬКО наши:** всплывающая подсказка у кнопки/иконки/бейджа/стикера — атрибут `data-tip="…"` (единый слой `app/components/tooltip-layer.tsx`, один на весь сайт, работает и в HTML-строках, учитывает настройку «Анимации → Подсказки»). **ЗАПРЕЩЕНО:** нативный `title="…"` как подсказка и свои самодельные тултипы. `title` допустим только как заголовок модалки/секции (пропс компонента), не как подсказка элемента.
  - **Загрузка страницы/блока — `BrandLoader`:** `app/components/brand-loader.tsx` (логотип Zypo, по нему слева направо идёт белая полоса; стили `.brand-loader`). Один на экран (`page`/`screen` — по центру страницы/экрана, `size` sm|md|lg). Страницы со скелетонами (чаты, лента, список друзей и т.п.) оставляют скелетоны — второй индикатор поверх не ставим. **ЗАПРЕЩЕНО:** голый текст «Загрузка…», самодельные крутилки (`animate-spin` + border), пустой `fallback={null}` у Suspense страницы. Исключения: кнопки (мини-крутилка `IC-loader` внутри), загрузка поверх маленького превью/картинки, кино (`FrameBrandLoader` со своим знаком), светлый фон (логотип белый).
  - **Ошибка загрузки — `ErrorState`:** `app/components/error-state.tsx` (иллюстрация, заголовок, пояснение, «Повторить» `onRetry` и/или ссылка `actionHref`). `variant="page"` — страница целиком (по центру экрана), `block` — карточка в странице, `inline` — компактно (окна, выпадающие панели). Заголовок по умолчанию — `lang.load_failed`. **ЗАПРЕЩЕНО:** свои красные `<span>`/кнопки «ошибка» в разметке страниц. Исключения: ошибки полей форм и статусы операций (под полем/в toast), оверлей карты погоды.
  - **Интерактивность:** `cursor-pointer`, `active:scale-95`.
  - **Анимации/переходы:** `duration-300`.
  - **Концепция дизайна:** Простой, лаконичный, рабочий, строгий и красивый дизайн.
  - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:**
    - Никаких левых шагов отступов в лейауте и сетках (`gap-1`, `gap-2`, `gap-4`, `m-1`, `m-2`, `m-4` и пр.) — ТОЛЬКО шаг `3`.
    - Никаких левых скруглений (`rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`) — ТОЛЬКО `rounded-3xl` и `rounded-full`.
    - Никаких неоновых свисто-перделок, аляповатых радужных градиентов, визуального шума и синтетических эффектов.
  - **Уровень UX:** Максимальный, продуманный бизнес-уровень — чистый, удобный и надежный интерфейс без перегруза.

## 6. Офлайн-архитектура и PWA

### Service Worker
- **Единый Service Worker:** `public/firebase-messaging-sw.js` — единственный SW в проекте. При изменении SW поднимай только `SW_VERSION` — имена кэшей static/pages выводятся из него автоматически (`ancial-static-v${SW_VERSION}`), и `activate` удалит старые кэши.
- **Регистрация:** `app/components/sw-register.tsx` — регистрирует SW с `updateViaCache: 'none'` и вызывает `registration.update()` при каждом запуске для автоматического применения обновлений.
- **Обход на localhost:** В SW встроен обход кэширования для хостов `localhost` и `127.0.0.1`.

### Стратегии кэширования SW
| Тип запроса | Стратегия | Кэш |
|---|---|---|
| HTML-навигация (`mode: navigate` или `Accept: text/html`) | **Network First** → shell `/` fallback (онлайн всегда свежий HTML без мёртвых чанков) | `ancial-pages-v*` |
| RSC payloads (`_rsc=...`, заголовок `RSC: 1`, `/_next/data/`) | **Bypass** — напрямую в сеть | — |
| Hashed JS/CSS `/_next/static/` | **Cache First** + 404-eviction + фоновый revalidate (URL = content-hash) | `ancial-static-v*` |
| Прочий static (`/img/`, `/fonts/`, `/includes/`) | **Network First + 404-eviction** | `ancial-static-v*` |
| Изображения (PNG, AVIF, WEBP, SVG, ...) | **Stale-While-Revalidate** (сначала кэш, потом сеть) | `ancial-images-v1` |
| Audio (.mp3) | **Bypass** — IndexedDB плеер | — |
| `/api/V2/` PHP API (остальное) | **Bypass** — localStorage кэш | — |
| Firebase/Google | **Bypass** | — |

### Авто-обновление без кнопки
- SW: `skipWaiting()` на install + `clients.claim()` на activate + message `SKIP_WAITING`.
- Клиент (`sw-register.tsx`): `registration.update()` при старте / focus / каждые 5 мин; waiting → `SKIP_WAITING`; `controllerchange` → один hard-reload (с guard от loop).
- `ChunkLoadError` / failed dynamic import → hard-reload за новым HTML (защита от «страница ссылается на удалённые чанки после деплоя»).

### Предварительное кэширование (при установке SW)
SW при установке (`install`) кэширует shell:
- static: `/manifest.webmanifest`, `/icons.svg`, `/img/branding/pulse.svg`, `/img/zypo/logo-rounded.webp`
- pages: `/`, `/pulse`, `/pulse/my`, `/pulse/library`, `/settings/cache`

Клиент (`sw-register`) дополнительно шлёт `WARM_URLS` после online/focus, чтобы прогреть shell.
Image-кэш (`ancial-images-v1`) имеет soft-limit ~280 записей (FIFO trim).
HTML-навигация offline: page cache → preferred shells → minimal offline HTML («Переподключение...»).

### Кэширование на промежуточных прокси
HTML отдаётся с `Cache-Control: no-store` (правило `headers()` в `next.config.ts`), чтобы Nginx/aapanel не запоминал разметку старого билда со ссылками на удалённые чанки. На reverse-proxy кэш для HTML должен быть выключен (см. `DeployUbuntu/README.md`).

### Авторизация офлайн
- `AuthContext` при сетевой ошибке (`catch`) восстанавливает сессию из `localStorage`:  `user_profile` + `token`. Пользователь не "вылетает" из аккаунта.
- При восстановлении соединения (`window: online`, `focus`) вызывается `checkAuth({ silent: true })` для обновления данных.

### Данные в localStorage (через `cache.ts`)
- Плейлисты/треки: `pulse_collection_{kind}_{id}` → категория `pulse/tracks`. При офлайне `fetchTrackCollection` читает этот кэш.
- Диалоги/сообщения: `dialogs-cache`, `msg-cache:*` — чаты хранят историю офлайн.
- Виджеты главной: `home_currency`, `home_weather` — кэшируются до 00:00 текущего дня.

### Офлайн-аудио (IndexedDB)
- Треки хранятся как `Blob` в IndexedDB `ancial-offline-audio`.
- При воспроизведении генерируется `Blob Object URL`. Обязательно вызывать `URL.revokeObjectURL(url)` при смене трека.
- Аудиофайлы нельзя кэшировать через HTTP Cache (SW), так как это ломает Range-запросы (HTTP 206) на iOS/Safari.
- При сохранении трека передавать метаданные `{ title, artist }` для отображения в панели настроек.

### Менеджер кэша (`/settings/cache`)
Виртуальные ключи для IndexedDB/SW кэшей: `__indexeddb_offline_audio__`, `__sw_pwa_cache__`, `__sw_images_cache__`. Очистка через настройки сбрасывает соответствующие хранилища.

## 6.1. Приложение (Capacitor, Android)

Сборка и релизы Android/iOS (APK/IPA на GitHub, версия из package.json, `npm run release:*`) — `docs/capacitor-build.md`; iOS (sideload) — `docs/capacitor-ios.md`. Сайт и приложение собираются из одного кода; всё про приложение — за `IS_NATIVE_APP` (`app/lib/platform.ts`), на сайте эти ветки вырезаются.
- **Сборки:** `npm run build` — сайт (как раньше), `npm run build:app` — статический экспорт в `out/` для APK. Проверять обе.
- **Запросы к бэкенду:** только через `AncialAPI`/`authFetch` или `backendFetch` (`app/lib/auth-fetch.ts`); голый `fetch('/api/…')` в приложении уйдёт на `https://localhost`. Адреса бэкенда для `<img>`/`url()` — через `apiUrl()`, публичные ссылки «поделиться» — через `publicUrl()` (`app/lib/api-url.ts`).
- **Новый динамический маршрут:** строка в `APP_DYNAMIC_ROUTES` (`app/lib/app-routes.ts`) + `generateStaticParams = appShellStaticParams(…)` + `AppRouteShell` (серверный `page.tsx` с пропом id) или `useAppParams()` под `AppRouteGate` (клиентские страницы).
- **Серверное** (`searchParams`, `redirect()`, `headers()`, `force-dynamic`) в экспорте недоступно: в ветке `IS_NATIVE_APP` читать на клиенте. Вместо `export const dynamic = 'force-dynamic'` — `if (!IS_NATIVE_APP) await connection();` (литерал `dynamic` нельзя сделать условным).
- **`window.open`/внешние ссылки** в приложении открывает системный браузер (`openExternalUrl`, `app/lib/native-browser.ts`).
- **Код приложения не должен попадать в веб-бандл:** нативные модули (`@capacitor/*`, `native-*.ts`) — только динамическим `import()` внутри ветки `IS_NATIVE_APP`; обвязка монтируется через `AppRuntimeSlot` (ленивый `AppRuntime`). Статический импорт клиентского компонента в серверный `layout` тянет его в общий чанк сайта, даже если он не рендерится.
- **SW в приложении** регистрируется с `?app=1`: только офлайн-кэш картинок, без web-push и логики обновлений сайта (файлы APK на `https://localhost` он обходит).
- **Пуши:** нативный FCM (`app/lib/native-push.ts`), токен — в тот же `pushsid`; бэкенд шлёт в одном сообщении `webpush` (сайт) и `android.notification` (канал `zypo_default`, иконка `ic_stat_zypo`). Нужен `android/app/google-services.json` (проект `ancial-notification`).
- **Вход Яндекс/Telegram и привязка:** системный браузер + возврат `cc.zypo.app://oauth`, схема PKCE (`app/lib/native-oauth.ts` ↔ `modules/auth/app_oauth.php`): в ссылке возврата нет секретов, данные забираются по `app_verifier`.
- **Passkeys:** WebView с `WEB_AUTHENTICATION_SUPPORT_FOR_APP` (`ZypoWebViewPlugin`), доступность — флаг `window.__ZYPO_WEBAUTHN__`; бэкенд принимает origin `https://localhost`, право на RP ID `zypo.cc` — `get_login_creds` в `assetlinks.json`.

## 6.2. «Назад/Вперёд» возвращает на то же место, черновики, плеер вне кино

Подробный план и решения — `docs/plan-navigation-restore-and-cinema.md`.
- **Состояние по записи истории** (`app/lib/entry-nav.ts` + `entry-store.ts`): ключ — `navigation.currentEntry.key` (без Navigation API — URL), значения в `sessionStorage`, не больше ~40 записей. «Назад/Вперёд» отличаем от обычного перехода (`isRestoreNavigation()`): только при нём состояние возвращается, при `push` страница открывается сверху.
- **Прокрутка** — `app/lib/scroll-restore.ts`, подключён в `MainContent`: позиция страницы (с якорем на пост `postdiv…`) и панелей списка чатов; восстановление с повторами до ~3 с, пока страница дорастёт, прерывается действиями пользователя. Панель сообщений (`#msg-scroll`) намеренно не восстанавливается: чат открывается на последних сообщениях. Свой `scrollTo(0)` на странице ставить только вне `isRestoreNavigation()`.
- **Лента** — снимок в памяти (`app/feed/feed-snapshot.ts`, до 3 шт., не в localStorage): на «Назад» из поста поднимается со всеми подгруженными постами без запроса. Публикация, правка и удаление постов вызывают `clearFeedSnapshots()`.
- **Плашка «Новые посты»** — `use-new-posts.ts`: `Feed.php?peek=1` (id верхних постов), раз в минуту при видимой вкладке и при возврате на неё.
- **Черновики**: (1) по записи истории — форма создания/правки поста (`post-draft.ts`, `readEntryState`/`writeEntryState`), после публикации `router.replace('/feed')` и `client_token` (идемпотентность `CreatePost.php`, миграция 003); (2) серверные, между устройствами — `app/lib/drafts.ts` (`saveDraft`/`loadDraft`/`subscribeDraft`, LWW по `ts`, WS `draft:update`/`draft:clear`, API `drafts/Get|Set|Clear.php`, миграция 004): текст сообщения в чатах (`useDialogDraft`, «Черновик:» в списке диалогов) и пост (`ref` = id автора). Очистка кэша в `/settings/cache` стирает черновики везде (`clearAllDrafts`).
- **Плеер не монтируется на `/cinema*`** (`PulsePlayerBoundary`, `isPlayerDisabledPath`): нет аудио, Media Session и устройства в списке аккаунта; при размонтировании провайдер шлёт `device:bye` (`retireDevice`). Потребителям плеера вне страниц с ним — `usePulsePlayerOptional()`.

## 6.3. Уведомления (rich)

План и решения — `docs/plan-rich-notifications.md`.
- **Единая точка на бэкенде:** `php-v2-api/.../modules/notify.php` → `notify_dispatch()` — запись в `notify` + WS `notification:new` (полный rich-объект) + push из той же записи; группировка по `group_key` в окне 24 ч («Иван и ещё 12 оценили пост»), предпочтения по категориям (`notify_prefs`, безопасность не отключается). Новые события создаём только через неё, не прямыми `R::dispense('notify')`/`sendFCM`. Миграции: 005 (колонки `notify`), 006 (`ucomments.parent_id`); без них dispatcher откатывается на старую структуру.
- **Формат строки** (`notify_row_to_api`, API `/user/Notifications.php?v=2`, `app/lib/notifications/types.ts`): `kind`, `actors[]`, `object{preview,image}`, `url`, `params`, `actions`, `secret` (код входа: в списке только метаданные, значение — `action=reveal`, шифруется AES-GCM, живёт срок challenge, показ пишется в аудит).
- **Фронтенд:** реестр видов и тексты — `app/lib/notifications/kinds.ts` (+ ключи `notif_<kind>[_many]` в локалях; новый `kind` = запись в реестре + шаблоны ru/en/be на сервере и клиенте, тест `notify.test.php` проверяет шаблоны), лента — `use-notification-feed.ts` (WS-обновление, «открыли — прочитали», подсветка бывшего непрочитанным), строка — `app/notifications/notification-row.tsx` (стикеры/треки/фото в превью сообщений, кнопки действий, `SecretSpoiler`), тосты — `notification-toaster.tsx`.
- **Push:** заголовок — актёр, `icon` — аватар, `image` — превью, `tag` — группа; web (`firebase-messaging-sw.js`) и Android-каналы по категориям (`zypo_social|people|chat|wallet|security`, создаются в `native-push.ts`).
- Ответы на комментарии: `ucomments.parent_id`, `reply_to` в `Comments.php`, UI — страница поста; deeplink `/feed/post/ID?comment=CID` прокручивает и подсвечивает.

## 6.4. AMC (админ-панель)

Руководство — `docs/amc.md`. Живёт на бэкенде (`php-v2-api/backend.ru.zypo/amc`, PHP + Alpine), на сайте открывается как `zypo.cc/amc` (rewrite в `next.config.ts`; сессия остаётся на zypo.cc).
- **Новый раздел = описание ресурса** в `modules/amc/resources.php`/`resources_extra.php` (таблица, колонки, права, действия, `cascade`, `guard`), а не новая страница. Движок: `modules/amc/engine.php`, API `api/V2/admin/Resource.php`, страница `amc/resource.php`. После правки реестра — `php php-v2-api/tests/amc.test.php`.
- **Правила:** каждое изменение — через движок/действие с записью в `amc_audit_log` и причиной; удаление — через корзину (`amc_trash`); пользователей не удаляем, а блокируем; деньги — только действиями над транзакциями; **тексты личных сообщений в AMC не показываем** (колонки `message`/`attachments` скрыты в реестре); персональные данные (`pii`) модератору маскируются.
- Значения формы уходят как `v[колонка]` (колонка может называться `action`/`id`); идентификаторы SQL — только из реестра, значения — prepared-запросами.

## 7. Качество кода (ОБЯЗАТЕЛЬНО к соблюдению)

### Верификация перед завершением любой задачи
Любое изменение кода считается незавершённым, пока не прогнаны и не зелёные ВСЕ четыре проверки:
```bash
npx tsc --noEmit          # 0 ошибок типов
npm run lint:ratchet      # в пределах базы lint-ratchet.json (база = 0: ЛЮБАЯ новая eslint-ошибка ломает CI)
npm test                  # 49+ тестов, 0 падений
npm run build             # сборка успешна
```
Утверждения «должно работать» не принимаются — только вывод команд.

### Нулевой линт-долг (ratchet на нуле)
- В репозитории **0 ошибок ESLint** во всех файлах; база `lint-ratchet.json` = `maxErrors: 0`. Любая новая ошибка = красный CI.
- База уменьшается только вручную (`node scripts/lint-ratchet.mjs --update`) и только после реальных проверенных фиксов.
- Предупреждения (`no-unused-vars`, `<img>` и т.п.) не блокируют, но новые предупреждения добавлять не следует.

### Правила React-кода (за каждым — уже пройденный путь по проекту)
- **Никаких `any`.** Вместо них: `unknown` + сужение (`err instanceof Error`), интерфейсы для внешних SDK + `declare global`, дженерики на API-обёртках (`request<T>` уже разворачивает `{data}` — НЕ оборачивать T в envelope повторно).
- **`react-hooks/set-state-in-effect` запрещён.** Сеттлер состояния внутри эффекта синхронно — ошибка. Порядок действий при необходимости инициализации:
  1. Перенести функцию выше точки использования (use-before-declare).
  2. Вычислять в рендере/`useMemo`, если это производное состояние.
  3. Ставить сеттлер после `await` (асинхронная загрузка — не нарушение).
  4. Только как крайняя мера — `// eslint-disable-next-line react-hooks/set-state-in-effect` с русским комментарием-обоснованием («сеттлер здесь источник правды», «терминальное состояние», «SSR не знает localStorage»).
- **Компоненты не создаются во время рендера** (`static-components`). Внутренние кнопки/обёртки без замыканий на стейт выносите на уровень модуля; с пропами — параметризуйте готовые компоненты вместо фабрик в JSX.
- **Чистота рендера:** никакого `Math.random()`, `Date.now()`, записи в refs и DOM-мутаций в теле компонента. Всё это — в эффекты/обработчики. Инициализацию из `window/localStorage/navigator` делать лениво в `useState(() => …)` нельзя, если значение влияет на SSR-разметку (гидратация сломается) — использовать mount-эффект или client-mount флаг.
- **Мутация параметров запрещена** (`no-param-reassign`): работайте с копиями (`[...arr]`, `{...obj}`).
- **DOM напрямую** (`dangerouslySetInnerHTML`) — только через центральный санитайзер `sanitizeUserHtml()` из `app/lib/sanitize-html.ts` (whitelist DOMPurify). Инлайн-JS в пользовательском HTML запрещён: карусели постов используют `data-carousel-scroll` + делегирование в `app/components/carousel-delegation.ts`.
- **Стабильный `{__html}`:** React 19 сравнивает `dangerouslySetInnerHTML` по ссылке на объект — новый `{ __html }` на каждый рендер перезаписывает `innerHTML` (перезапуск GIF/стикеров, скелетоны, сброс каруселей). Пользовательский HTML отдавать через `useSanitizedHtml()` из `app/lib/use-sanitized-html.ts`.
- **Значения контекстов мемоизируются:** функции провайдера — через `useStableCallbacks()` (`app/lib/use-stable-callbacks.ts`), данные — `useMemo`. Пузыри чата (`MessageBubble`) — `memo` со стабильными колбэками: не передавать в них инлайн-стрелки.
- **Порядок объявлений:** функция используется после объявления либо переносится выше эффекта — `no-use-before-declare` не подавлять.
- **Прогресс кинопросмотров:** episode-scoped через positions map (`sN:eM`); duration FlixCDN брать через ref, а не state (замыкание `saveCurrentProgress`); у preroll нет длительности — сохранять только после появления duration контента.
- **Pulse-плеер:** rAF/DOM-циклы лирики — только при `mode === 'full'` и видимости (CSS-скрытие жжёт CPU; размонтировать и гейтить загрузки).
- **Прогресс Pulse без покадровых циклов:** дорожку и время двигает таймер плеера (4 раза в секунду, `VISUAL_PROGRESS_STEP_MS`) через `syncVisualProgress`, плавность — CSS-переход `--pulse-progress-ease`. rAF-цикл прогресса не возвращать.
- **Плеер и пульт:** пока устройство — пульт, индекс очереди едет за играющим, а в `<audio>` остаётся прежний `src` (`currentSongIdRef` — реально загруженный трек). Любое «играть/возобновить» здесь идёт через `resumeCurrentTrack()` (PulsePlayerContext): не совпало с показанным — грузим показанный, а не голый `audio.play()`. Системная кнопка play — через `window.play`.
- **Телефон в альбомной ориентации:** полный плеер рисует CoverFlow (`pulse-cover-flow.tsx`, запрос `LANDSCAPE_PHONE_QUERY`: landscape + `max-height: 520px` + `pointer: coarse`), на ПК его нет; текст песни в этом режиме не показывается.
- **Замена цензурных треков Яндекса:** `modules/pulse/fck_censor.php` — список FckCensorData (id → mp3 на raw.githubusercontent.com, кэш в TMPDIR на час). Если id в списке, `stream.php` проксирует этот файл (с Range) вместо моста, а `pulse_track_blockedin()` не считает трек заблокированным. `blockedin` в выдаче — только через неё, не `explode(',', $row['blockedin'])`. Тест: `php php-v2-api/tests/fck_censor.test.php`.
- **Жанры, настроения, язык треков Pulse:** единый словарь — `PULSE_GENRES`/`PULSE_MOODS`/`PULSE_TRACK_LANGUAGES` (`app/pulse/pulse-constants.ts`) и зеркало на сервере (`modules/pulse/genre.php`, `track_meta.php`; тест сверяет жанры). Внешние слаги (`rusestrada`, `foreignrap`…) приводятся при записи; язык внешнего трека определяется кодом (текст песни → письменность → жанр), «не указан» = пустая строка, а не `ru`. Новый жанр — в обоих списках сразу. Справка и готовые ГенЛисты — `docs/pulse-shelves.md`, SQL — `migrations/008_*`, `009_*`.
- **«Не интересно» (Pulse):** трек — `music_dislikes`, исполнитель — `music_artist_dislikes` (имя через `pulse_artist_key`, зеркало `normalizeArtistKey` в `app/pulse/dislikes/dislike-utils.ts`; менять только вместе). Генерируемые списки (`GetPlaylist.php?gid=…`) отмеченное не отдают (`pulse_filter_disliked`); обычные плейлисты и поиск показывают с отметкой, автоочередь пропускает (`findPlayableIndex` в `nextTrack`/`prevTrack`/старте коллекции), явный клик спрашивает «Всё равно включить». Состояние на клиенте — `usePulseDislikes()` (общее хранилище), действия с тостами — `useDislikeActions()`, диалоги рисует один `PulseDislikeHost` в `PulsePlayerProvider`. Запомненные ответы и часовой пояс — `music_user_prefs` (`Prefs.php`). События «доиграл/пропуск» — `pulse-events.ts` → `Events.php` → `music_events`. План и следующие этапы — `docs/plan-pulse-personalization.md`.
- **Рекомендации Pulse:** один движок — `modules/pulse/recommend.php` (`pulse_recommend`: SQL-пул ≤600, скор по профилю вкуса `taste.php` + семя + популярность, тиры со случайным порядком, разнообразие). На нём «Твой», радио, «Похожее», дневные подборки (`daily.php`, встроенные id -11…-13, `music_daily_mixes`, сутки по поясу пользователя) и Вейв (`wave.php`, настройки в `music_user_prefs.wave`, чистая проверка `wave_prefs.php` ↔ `wave-utils.ts`). Новый источник треков — через `pulse_recommend`, не отдельным SQL. Яндекс-«Моя волна» (`yandex_wave.php` → мост `/wave`, `/similar`) — включена по умолчанию (выключается `yandex.wave_enabled: false` в `bridge/config.json`); мост берёт станцию на каждый выбранный жанр (до 3, слаги сверяются со списком Яндекса, иначе «Моя волна») и добирает `tracks_similar`; в каждую порцию Вейва/радио подмешивается по доле (`pulse_wave_batch`/`pulse_wave_mix`: «Знакомое» 15%, «Баланс» 35%, «Открытия» 60%), яндексовские треки проходят те же фильтры (`pulse_yandex_clean`: «не интересно», мат, язык, жанр с учётом смежных); редкий жанр свои треки расширяет смежными (`PULSE_WAVE_MIN_OWN`), а любое взаимодействие с таким треком (старт/пропуск/доигрывание — `Events.php` с `external_id`, лайк и т.д. — `TrackAction`) заводит его в `music_songs`. Анимация блока Вейва — canvas только по метаданным (`wave-motion.ts`), к `<audio>`/Web Audio не подключать (ломает iOS PWA).
- **Бесконечная очередь плеера:** радио (`startRadio`) и Вейв (`startWave`) делят `fetchInfiniteBatch`/`fillRadioWave`/`prefetchInfiniteQueue` в `PulsePlayerContext` (`infiniteKindRef`); коллекции `radio_<sid>` и `wave` не восстанавливаются по id (`queueDirtyRef`). События «доиграл/пропустил» пишутся в `nextTrack`.
- **Автопривязка треков к артистам:** `modules/pulse/artist_link.php` (`pulse_match_artists_in` — чистая часть, тест `artist_link_test.php`). Чужие и яндексовские треки — только к карточкам `verify = 1` с включёнными переключателями `auto_link_external|users`; `artists_ids` только дополняется, отвязанное (`music_artist_links.mode = 3`) не возвращается.
- **Полный плеер — ленивый чанк:** `PulsePlayerFull` грузится ручным `import()` (не `next/dynamic`: Suspense придерживает показ до 300 мс) и живёт в DOM только раскрытым + 1 с после сворачивания. Статически его в провайдер не импортировать.
- **Окно рендера чата:** `useChatWindow` держит ~150 строк вокруг видимой области, дальние — пустышки с замеренной (дробной) высотой. Строки ленты — через обёртку с `ref={chatWindow.observeRow}` и `data-chat-row`; к сообщению прокручивать через `scrollToLoadedMessage` (сначала `reveal`).
- **Свечения под обложками** (`blur-xl`-копии) помечать классом `cover-glow`: в стекле «Лёгкое»/«Выкл» они не рисуются.

### Закреплённые посты, плейлисты в профиле, друзья
- **Закреплённые посты:** `user_posts.pinned_at` (миграция 012, без неё закрепление молча недоступно), до 3 на автора (`ZYPO_PINNED_POSTS_LIMIT`, `modules/posts_pin.php`), `PinPost.php` (свой пост — владелец; сообщество — право `manage_posts`). Закреплённые идут первыми только в ленте автора (`Feed.php?id=…&type=…`, первая порция), в общей ленте не поднимаются; в постах приходят `is_pinned`/`can_pin`, пункт «Закрепить» — `onPin` в `PostCard`.
- **Плейлисты пользователя:** `modules/pulse/user_playlists.php` (публичные: type 2, не пустые; «Избранное» и ГенЛисты скрыты) → блок в `GetProfile.php` (`playlists`, `playlists_total`) и страница `/pulse/user/<логин>` (`UserPlaylists.php`, сетка `PulsePlaylistGridPage`).
- **Друзья:** `/friends` — вкладки «Все / Заявки / Возможно, знакомы» (`?tab=`), на «Все» блок «Сейчас онлайн»; «Возможно, знакомы» — `Social.php?type=suggestions` (друзья друзей по числу общих).
- **Стикеры в комментариях:** `CommentStickerButton` (тот же пикер, что в постах, код `:name:` в тексте).

### Производительность
- Топ-чанк бандла ≤ ~230KB до gzip — следить, чтобы новые тяжёлые зависимости не попадали в статику без `next/dynamic`.
- Firebase — внешний compat-скрипт, грузится лениво в рантайме (не импортировать npm-пакет firebase).
- Списки постов: `PostCard` → `PostCardInner` c key=`post.id`; НЕ менять ключи карточек на производные от данных (лайк/коммент вызовет полный remount — потеря скролла и состояний).
- Аудио офлайн — только IndexedDB Blob (не HTTP-кэш: ломает Range/206 на iOS).
- `framer-motion` допустим точечно (навигация, пузыри сообщений); не тащить в тяжёлые списки.
- **Длинные списки треков** (плейлисты, «Избранное» на сотни строк) — окном `useListWindow` (`app/lib/use-list-window.ts`): дальние строки заменяются распорками той же высоты. Строки — прямые дети списка с `data-list-row`, `--cv-size` у `cv-auto` = высота содержимого без полей (иначе страница «худеет» при прокрутке).
- **Недогруженные картинки при уходе со страницы сбрасываются** (`abortImageLoadIfDetached` в `AppImage`, наблюдатель `img[data-zimg]` в `image-loading.ts`): иначе браузер дотягивает их и они занимают соединения следующей странице. Перелив скелетонов — не больше 24 одновременно на экране (`MAX_ANIMATED_SKELETONS`).
- **Бесконечные анимации у скрытого элемента не останавливаются** (`invisible`, `opacity-0`, за экраном): `animate-spin`/`animate-pulse`/перелив вешать только пока элемент виден. Скелетоны картинок за экраном ставит на паузу `watchImageSkeleton` (`app/lib/image-loading.ts`).
- **Покадровые переходы — только `transform`/`opacity`.** `width`/`left`/`top` в `transition` дают раскладку и перерисовку каждый кадр (под стеклом плеера — ещё и размытие): дорожка прогресса Pulse едет через `translateX`.
- **`body:has(…)` с широким потомком** (`div`, `*`, тег) заставляет браузер пересчитывать стили всех таких элементов при любом изменении DOM (тик таймкода — раз в секунду). Адресовать класс/id конкретного элемента (`.pulse-player-mini-host`).

### Дубли хелперов — не плодить
Общие функции брать из существующих модулей, а не копировать: `decodeHtmlEntities`/`toNumber`/`normalizeText` — `app/pulse/pulse-components.tsx` и `app/components/account-name.tsx`; `htmlToText` — `app/feed/post/[id]/post-content.tsx`; санитайзер — `app/lib/sanitize-html.ts`. Новые общие хелперы складывать в `app/lib/`.

### Обработка ошибок
- Пустые `catch {}` допустимы только для best-effort операций (парсинг кэша, localStorage) — в остальных случаях минимум `console.error` или toast пользователю.
- `catch (err)` типизировать как неизвестное: `if (err instanceof Error)` — не `catch (err: any)`.

### Дизайн-код неизменен при рефакторах
Рефакторинг/зачистка кода не имеет права менять визуальный результат и поведение: все правки механические или семантически эквивалентные. Если изменение поведения необходимо — оно согласовывается отдельно и явно.
