/**
 * Единая утилита загрузки изображений через PHP V2 API.
 * Все вызовы загрузки аватарок, постов, треков и обложек используют этот эндпоинт.
 */

export const UPLOAD_IMAGE_ENDPOINT = '/api/V2/upload/Image.php';

export interface UploadImageResponse {
  success?: boolean;
  status?: string;
  url?: string;
  data?: {
    url?: string;
    display_url?: string;
    delete_url?: string;
  };
  error?: string;
}

export async function uploadImage(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append('image', file);
  } else {
    formData.append('image', file, filename || 'image.jpg');
  }

  const response = await fetch(UPLOAD_IMAGE_ENDPOINT, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки изображения (статус ${response.status})`);
  }

  const result = (await response.json()) as UploadImageResponse;
  const finalUrl = result.url || result.data?.url;

  if (!finalUrl) {
    throw new Error(result.error || 'Не удалось получить URL загруженного изображения');
  }

  return finalUrl;
}
