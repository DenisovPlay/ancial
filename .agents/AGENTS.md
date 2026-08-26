<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Архитектура и инициализация Zypo

## 1. Локализация и переводы (lang)
- **Инициализация:** Объект словаря переводов `lang` подгружается и инициализируется глобально через контекст авторизации.
- **Использование:** Чтобы получить переводы в компоненте, ВСЕГДА используй хук `useAuth`:
  ```tsx
  import { useAuth } from '../context/AuthContext';
  // ...
  const { lang } = useAuth();
  ```
- **Правило именования:** НИКОГДА не называй локальные переменные состояния компонента именем `lang` (например, при выборе языка трека, языка формы и т.д.), чтобы не перекрывать словарь `lang` из `useAuth()`. Используй названия вроде `trackLang`, `selectedLang` и т.д.

## 2. Локализация (файлы переводов)
- **Запрет на инлайн-тернарники:** Категорически запрещено использовать конструкции вида `{lang?.langname === 'en' ? 'English text' : 'Русский текст'}` непосредственно в компонентах.
- **Добавление переводов:** Все новые текстовые строки должны добавляться в файлы локализации бэкенда: `php-v2-api/lang/ru.php` и `php-v2-api/lang/en.php`. Затем на клиенте они используются через объект `lang` (например, `lang?.my_new_key`).

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
  - **Отступы и интервалы:** ТОЛЬКО шаг `3`: `p-3`, `px-3`, `py-3`, `pr-3`, `pl-3`, `pt-3`, `pb-3`, `m-3`, `mx-3`, `my-3`, `mr-3`, `ml-3`, `mt-3`, `mb-3`, `gap-3`, `space-x-3`, `space-y-3`.
    - **СТРОГО ЗАПРЕЩЕНО:** Любые другие шаги отступов: `gap-1`, `gap-1.5`, `gap-2`, `gap-4`, `gap-6`, `p-1`, `p-2`, `p-4`, `px-2`, `px-4`, `py-1`, `py-2`, `py-2.5`, `py-4`, `pt-1`, `pt-2`, `pt-6`, `pb-1`, `pb-2`, `pb-6`, `mt-1`, `mt-2`, `mt-4`, `mb-1`, `mb-2`, `mb-4`, `m-1`, `m-2`, `m-4` и т.д. ВЕСЬ интерфейс строится исключительно на кратности `3`!
  - **Границы:** ТОЛЬКО `border border-zinc-600/30`.
  - **Интерактивность:** `cursor-pointer`, `active:scale-95`.
  - **Анимации/переходы:** `duration-300`.
  - **Концепция дизайна:** Простой, лаконичный, рабочий, строгий и красивый дизайн.
  - **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО:**
    - Никаких левых шагов отступов (`gap-1`, `gap-2`, `gap-4`, `px-4`, `py-2.5` и пр.) — ТОЛЬКО `3`.
    - Никаких левых скруглений (`rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`) — ТОЛЬКО `rounded-3xl` и `rounded-full`.
    - Никаких неоновых свисто-перделок, аляповатых радужных градиентов, визуального шума и синтетических эффектов.
  - **Уровень UX:** Максимальный, продуманный бизнес-уровень — чистый, удобный и надежный интерфейс без перегруза.

## 6. Офлайн-архитектура и PWA

### Service Worker
- **Единый Service Worker:** `public/firebase-messaging-sw.js` — единственный SW в проекте. Текущая версия: `2.0`. При изменении SW всегда поднимай `SW_VERSION` и имена кэшей (например `ancial-static-v3`), чтобы `activate` удалил старые кэши.
- **Регистрация:** `app/components/sw-register.tsx` — регистрирует SW с `updateViaCache: 'none'` и вызывает `registration.update()` при каждом запуске для автоматического применения обновлений.
- **Обход на localhost:** В SW встроен обход кэширования для хостов `localhost` и `127.0.0.1`.

### Стратегии кэширования SW
| Тип запроса | Стратегия | Кэш |
|---|---|---|
| HTML-навигация (`mode: navigate`) | **Network First** → shell `/` fallback | `ancial-pages-v2` |
| RSC payloads (`_rsc=...`, заголовок `RSC: 1`) | **Network First** | `ancial-pages-v2` |
| `/_next/data/` payloads | **Network First** | `ancial-pages-v2` |
| JS/CSS/шрифты `/_next/static/` | **Cache First** | `ancial-static-v2` |
| Изображения (PNG, AVIF, WEBP, SVG, ...) | **Stale-While-Revalidate** | `ancial-images-v1` |
| Audio (.mp3) | **Bypass** — IndexedDB плеер | — |
| `/api/V2/` PHP API | **Bypass** — localStorage кэш | — |
| Firebase/Google | **Bypass** | — |

### Предварительное кэширование (при установке SW)
SW при установке (`install`) кэширует shell (`/`, манифест, иконки) и ключевые страницы: `/pulse`, `/messages`, `/apps`, `/feed`, `/friends`, `/notifications`, `/settings`, `/wallet`.

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
