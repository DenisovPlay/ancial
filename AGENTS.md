<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Архитектура и инициализация Ancial

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

## 5. Дизайн-код Ancial
- **Стилизация:** Строго следуй дизайн-коду и токенам проекта при создании/редактировании интерфейсов:
  - Закругления: `rounded-3xl`
  - Интерактивность: `cursor-pointer`, `active:scale-95`
  - Отступы и интервалы: `p-3`, `m-3`, `gap-3`
  - Анимации/переходы: `duration-300`

