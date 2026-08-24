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
  - **Закругления:** ТОЛЬКО `rounded-3xl` (для карточек, блоков, модалок) и `rounded-full` (для кнопок, пиллов, аватарок).
  - **Отступы и интервалы:** ТОЛЬКО `p-3`, `pr-3`, `pl-3`, `pt-3`, `pb-3`, `mx-3`, `mr-3`, `ml-3`, `mt-3`, `mb-3`, `gap-3`, `space-3`.
  - **Границы:** ТОЛЬКО `border border-zinc-600/30`.
  - **Интерактивность:** `cursor-pointer`, `active:scale-95`.
  - **Анимации/переходы:** `duration-300`.
  - **Концепция дизайна:** Простой, лаконичный, рабочий, строгий и красивый дизайн.
  - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:** Никаких неоновых свисто-перделок, аляповатых радужных градиентов, визуального шума и синтетических эффектов.
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
- **Порядок объявлений:** функция используется после объявления либо переносится выше эффекта — `no-use-before-declare` не подавлять.
- **Прогресс кинопросмотров:** episode-scoped через positions map (`sN:eM`); duration FlixCDN брать через ref, а не state (замыкание `saveCurrentProgress`); у preroll нет длительности — сохранять только после появления duration контента.
- **Pulse-плеер:** rAF/DOM-циклы лирики — только при `mode === 'full'` и видимости (CSS-скрытие жжёт CPU; размонтировать и гейтить загрузки).

### Производительность
- Топ-чанк бандла ≤ ~230KB до gzip — следить, чтобы новые тяжёлые зависимости не попадали в статику без `next/dynamic`.
- Firebase — внешний compat-скрипт, грузится лениво в рантайме (не импортировать npm-пакет firebase).
- Списки постов: `PostCard` → `PostCardInner` c key=`post.id`; НЕ менять ключи карточек на производные от данных (лайк/коммент вызовет полный remount — потеря скролла и состояний).
- Аудио офлайн — только IndexedDB Blob (не HTTP-кэш: ломает Range/206 на iOS).
- `framer-motion` допустим точечно (навигация, пузыри сообщений); не тащить в тяжёлые списки.

### Дубли хелперов — не плодить
Общие функции брать из существующих модулей, а не копировать: `decodeHtmlEntities`/`toNumber`/`normalizeText` — `app/pulse/pulse-components.tsx` и `app/components/account-name.tsx`; `htmlToText` — `app/feed/post/[id]/post-content.tsx`; санитайзер — `app/lib/sanitize-html.ts`. Новые общие хелперы складывать в `app/lib/`.

### Обработка ошибок
- Пустые `catch {}` допустимы только для best-effort операций (парсинг кэша, localStorage) — в остальных случаях минимум `console.error` или toast пользователю.
- `catch (err)` типизировать как неизвестное: `if (err instanceof Error)` — не `catch (err: any)`.

### Дизайн-код неизменен при рефакторах
Рефакторинг/зачистка кода не имеет права менять визуальный результат и поведение: все правки механические или семантически эквивалентные. Если изменение поведения необходимо — оно согласовывается отдельно и явно.
