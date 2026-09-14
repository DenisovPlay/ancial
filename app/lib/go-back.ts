type BackRouter = {
  back: () => void;
  push: (href: string) => void;
};

/**
 * Кнопка «назад» в шапке: настоящий шаг по истории, а если страницу открыли напрямую
 * (новая вкладка, внешняя ссылка) и возвращаться некуда — запасной маршрут.
 */
export function goBackOr(router: BackRouter, fallbackHref: string) {
  // ponytail: history.length считает и внешние записи (пришли из поисковика — back уведёт с сайта);
  // если станет проблемой — вести счётчик внутренних переходов.
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}
