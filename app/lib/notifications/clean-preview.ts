/**
 * Превью поста/комментария в уведомлении — только текст. Зеркало notify_clean_preview() на бэкенде:
 * старые записи (до серверной чистки) приходят с BBCode каруселей и адресами картинок.
 */
export function cleanNotificationPreview(value?: string | null): string | null {
  if (!value) return null;
  const text = value
    .replace(/\[(carousel|collage)\][\s\S]*?\[\/\1\]/gi, ' ')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\[[^\]|]+\|([^\]]+)\]/g, '$1')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/(?:https?:\/\/\S+|\/)?image\.php\?\S*|\S+\.(?:png|jpe?g|webp|gif|avif)(?:\?\S*)?/gi, ' ')
    .replace(/\|\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text || null;
}
