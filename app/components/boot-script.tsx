'use client';

/**
 * Инлайн-скрипт для <head>, который должен выполниться до гидратации (настройки внешнего вида, маршруты приложения).
 * React 19 в dev ругается на <script> в дереве, которое отрисовывается на клиенте. На сервере тег обычный (и выполняется
 * браузером при разборе HTML), а на клиенте помечается неисполняемым типом — предупреждения нет, выполненный скрипт уже стоит в DOM.
 */
export default function BootScript({ code }: { code: string }) {
  return (
    <script
      suppressHydrationWarning
      type={typeof window === 'undefined' ? undefined : 'application/json'}
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}
