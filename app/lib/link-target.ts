/** Обычный адрес почты: без пути и схемы (`user@host.tld`). Ссылка вида `t.me/@name` — не почта. */
export function isPlainEmail(value: string): boolean {
  return /^[^\s@/:]+@[^\s@/:]+\.[a-z]{2,}$/i.test(value.trim());
}

export type LinkTarget =
  | { type: 'mail'; email: string }
  | { type: 'web'; url: string };

/**
 * Куда ведёт ссылка из текста поста ([адрес|текст] или голый адрес).
 * `mailto:` остаётся почтой только у настоящего адреса; «испорченные» ссылки вида `mailto:t.me/@name`
 * (автоссылка редактора раньше принимала любой адрес с `@` за почту) чинятся в обычные веб-ссылки.
 */
export function resolveLinkTarget(raw: string): LinkTarget {
  let value = raw.trim();
  const mail = value.match(/^mailto:(.*)$/i);
  if (mail) {
    if (isPlainEmail(mail[1])) return { type: 'mail', email: mail[1].trim() };
    value = mail[1].trim();
  }
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return { type: 'web', url: value };
}
