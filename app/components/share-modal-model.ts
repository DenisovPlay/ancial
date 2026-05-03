export type ShareService = 'tg' | 'vk' | 'x';

export function getShareServiceUrl(shareUrl: string, service: ShareService) {
  const encodedUrl = encodeURIComponent(shareUrl);

  if (service === 'vk') {
    return `https://vk.com/share.php?url=${encodedUrl}`;
  }

  if (service === 'tg') {
    return `https://telegram.me/share/url?url=${encodedUrl}`;
  }

  return `http://twitter.com/share?url=${encodedUrl}`;
}
