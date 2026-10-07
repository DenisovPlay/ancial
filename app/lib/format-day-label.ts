/** Подпись дня: «Сегодня», «Вчера» или «5 октября 2026» (разделители дат в чатах и истории Pulse). */
function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatDayLabel(date: Date, lang: Record<string, string> | null) {
  const months = [
    lang?.january || 'января',
    lang?.february || 'февраля',
    lang?.march || 'марта',
    lang?.april || 'апреля',
    lang?.may || 'мая',
    lang?.june || 'июня',
    lang?.july || 'июля',
    lang?.august || 'августа',
    lang?.september || 'сентября',
    lang?.october || 'октября',
    lang?.november || 'ноября',
    lang?.december || 'декабря',
  ];

  const today = startOfLocalDay(new Date());
  const current = startOfLocalDay(date);
  const diffDays = Math.round((today.getTime() - current.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return lang?.today || 'Сегодня';
  }

  if (diffDays === 1) {
    return lang?.yesterday || 'Вчера';
  }

  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
