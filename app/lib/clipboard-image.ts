/**
 * Надежное извлечение изображений из буфера обмена (Ctrl+V / Cmd+V).
 *
 * Проблема: ClipboardItem.getAsFile() и clipboardData.files возвращают
 * «живые» ссылки на данные буфера. В Chromium на macOS эти ссылки
 * становятся невалидными сразу после завершения обработчика paste-события
 * (NotReadableError / ERR_ACCESS_DENIED).
 *
 * Решение: немедленно читаем каждый файл в ArrayBuffer и создаём
 * полноценный File-объект из данных — он живёт независимо от буфера обмена.
 */

/**
 * Клонирует File/Blob, читая его содержимое в ArrayBuffer.
 * Возвращает новый File с теми же именем и MIME-типом.
 */
async function cloneFile(src: File | Blob, name?: string, mime?: string): Promise<File | null> {
  try {
    const buf = await src.arrayBuffer();
    if (!buf.byteLength) return null;
    const finalMime = mime || (src instanceof File ? src.type : 'image/png');
    const finalName = name || (src instanceof File ? src.name : `pasted_${Date.now()}.png`);
    return new File([buf], finalName, { type: finalMime });
  } catch {
    return null;
  }
}

export async function extractImagesFromClipboard(
  event: React.ClipboardEvent | ClipboardEvent
): Promise<File[]> {
  const clipboardData = event.clipboardData;
  const imageFiles: File[] = [];

  // 1. Пробуем clipboardData.items — наиболее надёжный путь в Chromium
  if (clipboardData?.items && clipboardData.items.length > 0) {
    const clonePromises: Promise<File | null>[] = [];

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        const rawFile = item.getAsFile();
        if (rawFile) {
          // Немедленно ставим в очередь клонирование — пока буфер ещё жив
          clonePromises.push(cloneFile(rawFile, rawFile.name || `pasted_${Date.now()}.png`, item.type));
        }
      }
    }

    if (clonePromises.length > 0) {
      const cloned = await Promise.all(clonePromises);
      for (const f of cloned) {
        if (f) imageFiles.push(f);
      }
    }
  }

  // 2. Fallback: clipboardData.files (используется в некоторых браузерах)
  if (imageFiles.length === 0 && clipboardData?.files && clipboardData.files.length > 0) {
    const clonePromises: Promise<File | null>[] = [];
    for (let i = 0; i < clipboardData.files.length; i++) {
      const file = clipboardData.files[i];
      if (file && file.type.startsWith('image/')) {
        clonePromises.push(cloneFile(file));
      }
    }
    const cloned = await Promise.all(clonePromises);
    for (const f of cloned) {
      if (f) imageFiles.push(f);
    }
  }

  // 3. Если синхронный путь не дал результата — Async Clipboard API
  //    (скриншоты macOS, PNG из Excel и т.п.)
  if (imageFiles.length === 0) {
    if (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof navigator.clipboard.read === 'function'
    ) {
      try {
        const items = await navigator.clipboard.read();
        for (const clipItem of items) {
          for (const type of clipItem.types) {
            if (type.startsWith('image/')) {
              try {
                const blob = await clipItem.getType(type);
                const ext = type.split('/')[1] || 'png';
                const file = new File([blob], `pasted_${Date.now()}.${ext}`, { type });
                imageFiles.push(file);
              } catch {
                // Конкретный тип недоступен — пропускаем
              }
            }
          }
        }
      } catch {
        // Пользователь не дал разрешение или браузер не поддерживает
      }
    }
  }

  return imageFiles;
}
