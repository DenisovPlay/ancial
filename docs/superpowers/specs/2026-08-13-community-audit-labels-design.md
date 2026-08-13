# Локализованные названия событий журнала сообщества

Дата: 2026-08-13

## Цель

Не показывать пользователю технические коды вроде `channel.delete` в журнале сообщества.

## Решение

- Все события, которые записывают текущие PHP endpoints сообщества, получают ключи `community_audit_action_<namespace>_<action>` в `app/locales/ru.ts` и `app/locales/en.ts`.
- Чистая функция `communityAuditActionLabel(action, dictionary)` преобразует точки и другие разделители в канонический ключ словаря и возвращает перевод.
- Для неизвестного будущего события используется читаемый fallback: разделители заменяются пробелами, слова нормализуются, первая буква становится заглавной.
- JSX журнала использует formatter; raw action напрямую не рендерится.
- Тест проверяет известные коды действий, русский и английский словари, неизвестный fallback и подключение formatter к модалке.

## Известные события

- `community.update`
- `category.create`, `category.update`, `category.delete`, `category.reorder`
- `channel.create`, `channel.update`, `channel.delete`, `channel.reorder`
- `channel_permissions.set`, `channel_permissions.delete`
- `role.create`, `role.update`, `role.delete`, `role.reorder`
- `member_role.assign`, `member_role.remove`
- `link_request.create`, `link_request.approve`, `link_request.reject`
- `moderation.delete_message`, `moderation.mute`, `moderation.unmute`, `moderation.kick`, `moderation.ban`, `moderation.unban`, `moderation.disconnect_voice`

## Проверка

- Технические коды не отображаются для всех известных событий.
- Неизвестный код не ломает журнал и отображается читаемо.
- Обе локали содержат одинаковый набор ключей.
