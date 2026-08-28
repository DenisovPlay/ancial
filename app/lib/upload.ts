/**
 * Единая утилита загрузки изображений через PHP V2 API (S3 / WebP).
 * Все вызовы загрузки аватарок, постов, треков, обложек и чатов используют этот эндпоинт.
 */

import { getStoredAuthToken } from './auth-fetch';

export const UPLOAD_IMAGE_ENDPOINT = '/api/V2/upload/Image.php';

export interface UploadImageOptions {
  filename?: string;
  type?: 'avatar' | 'cover' | 'post' | 'chat' | 'track_cover' | 'album_cover' | 'playlist_cover' | 'other';
  targetType?: string;
  targetId?: string | number;
  isPrivate?: boolean;
}

export interface UploadImageResponse {
  success?: boolean;
  status?: string;
  url?: string;
  media_id?: number;
  data?: {
    url?: string;
    display_url?: string;
    media_id?: number;
    file_hash?: string;
    width?: number;
    height?: number;
    size?: number;
    mime?: string;
  };
  error?: string;
}

/**
 * Результат загрузки изображения.
 * Содержит публичный URL и числовой media_id для хранения в attachments сообщения.
 */
export interface UploadResult {
  url: string;
  media_id: number;
  display_url?: string;
  file_hash?: string;
  width?: number;
  height?: number;
}

export async function uploadImageDetailed(
  file: File | Blob,
  filenameOrOptions?: string | UploadImageOptions
): Promise<UploadResult> {
  const options: UploadImageOptions =
    typeof filenameOrOptions === 'string'
      ? { filename: filenameOrOptions }
      : (filenameOrOptions || {});

  const formData = new FormData();
  if (file instanceof File) {
    formData.append('image', file);
  } else {
    formData.append('image', file, options.filename || 'image.jpg');
  }

  if (options.type) {
    formData.append('type', options.type);
  }
  if (options.targetType) {
    formData.append('target_type', options.targetType);
  }
  if (options.targetId !== undefined && options.targetId !== null) {
    formData.append('target_id', String(options.targetId));
  }
  if (options.isPrivate !== undefined) {
    formData.append('is_private', options.isPrivate ? '1' : '0');
  }

  const token = getStoredAuthToken();
  const headers: Record<string, string> = {};
  let targetUrl = UPLOAD_IMAGE_ENDPOINT;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    formData.append('token', token);
    const separator = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${separator}token=${encodeURIComponent(token)}`;
  }

  const response = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки изображения (статус ${response.status})`);
  }

  const result = (await response.json()) as UploadImageResponse;
  const finalUrl = result.url || result.data?.url;
  const finalMediaId = result.media_id ?? result.data?.media_id ?? 0;

  if (!finalUrl || result.success === false) {
    throw new Error(result.error || 'Не удалось получить URL загруженного изображения');
  }

  return {
    url: finalUrl,
    media_id: finalMediaId,
    display_url: result.data?.display_url || finalUrl,
    file_hash: result.data?.file_hash,
    width: result.data?.width,
    height: result.data?.height,
  };
}

/**
 * Стандартная загрузка изображения (для обратной совместимости).
 * Возвращает только публичный URL.
 */
export async function uploadImage(
  file: File | Blob,
  filenameOrOptions?: string | UploadImageOptions
): Promise<string> {
  const result = await uploadImageDetailed(file, filenameOrOptions);
  return result.url;
}
