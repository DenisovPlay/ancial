# SEO-документация проекта Ancial

## Обзор

Проект использует встроенные возможности Next.js 16 для SEO-оптимизации через Metadata API.

## Архитектура

### Разделение на серверные и клиентские компоненты

В Next.js **metadata работает только в серверных компонентах**. Для клиентских страниц используется паттерн с обёртками:

```
app/
├── settings/
│   ├── page.tsx              # Серверная обёртка с metadata
│   └── settings-content.tsx  # Клиентский компонент ("use client")
```

**Серверная обёртка** (`page.tsx`):
- Экспортирует `metadata`
- Импортирует и рендерит клиентский компонент
- Не содержит `"use client"`

**Клиентский компонент** (`*-content.tsx`):
- Содержит `"use client"`
- Использует хуки (useState, useEffect, etc.)
- Не экспортирует metadata

## Структура

### `app/seo.ts`

Централизованный файл с SEO-конфигурацией:

- **`SITE_CONFIG`** — базовые настройки сайта (название, описание, URL)
- **`DEFAULT_SEO`** — метаданные по умолчанию для всех страниц
- **`createPageMetadata()`** — хелпер для создания метаданных страниц

## Как добавить метаданные для новой страницы

### Для серверных компонентов

```tsx
import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Название страницы',
  description: 'Описание страницы',
  keywords: ['ключевое', 'слово', '1'],
  canonical: '/url-страницы',
});

export default function Page() {
  return <div>Содержимое</div>;
}
```

### Для клиентских компонентов (с обёрткой)

**Шаг 1:** Переименуйте `page.tsx` → `*-content.tsx`:

```tsx
// app/example/example-content.tsx
"use client";

import { useState } from 'react';

export default function ExampleContent() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

**Шаг 2:** Создайте серверную обёртку `page.tsx`:

```tsx
// app/example/page.tsx
import type { Metadata } from 'next';
import { createPageMetadata } from '@/app/seo';
import ExampleContent from './example-content';

export const metadata: Metadata = createPageMetadata({
  title: 'Пример',
  description: 'Пример страницы с клиентским компонентом',
  canonical: '/example',
});

export default function ExamplePage() {
  return <ExampleContent />;
}
```

### Для динамических страниц (с параметрами)

```tsx
import type { Metadata } from 'next';
import { SITE_CONFIG } from '@/app/seo';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await fetchData(id);
  
  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      images: data.image ? [data.image] : undefined,
      type: 'article',
      url: `${SITE_CONFIG.url}/page/${id}`,
      siteName: SITE_CONFIG.title,
    },
  };
}

export default function Page({ params }: PageProps) {
  return <div>Содержимое</div>;
}
```

## Конфигурация

```typescript
{
  title: 'Ancial',
  tagline: 'Больше, чем социальная сеть',
  description: 'Социальная сеть с лентой новостей, сообщениями, звонками...',
  url: 'https://ancial.ru',
  locale: 'ru_RU',
  twitter: '@ancialru',
}
```

### Метаданные по умолчанию (`DEFAULT_SEO`)

Включают:
- **title** с шаблоном (`%s | Ancial`)
- **description**
- **keywords**
- **authors**
- **openGraph** (изображения, тип, locale)
- **twitter** (card, creator)
- **robots** (индексация для поисковиков)

## Open Graph

Для социальных сетей (VK, Telegram, Facebook) настроены Open Graph теги:

```typescript
openGraph: {
  type: 'website', // или 'article', 'profile'
  locale: 'ru_RU',
  url: 'https://ancial.ru/...',
  siteName: 'Ancial',
  title: '...',
  description: '...',
  images: [{ url: '...', width: 1200, height: 630 }],
}
```

## Twitter Cards

Для Twitter настроены карточки:

```typescript
twitter: {
  card: 'summary_large_image', // или 'summary'
  title: '...',
  description: '...',
  creator: '@ancialru',
  images: ['...'],
}
```

## Canonical URLs

Для каждой страницы указан canonical URL:

```typescript
alternates: {
  canonical: 'https://ancial.ru/url-страницы',
}
```

## Robots.txt

Настройки индексации:

```typescript
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    'max-video-preview': -1,
    'max-image-preview': 'large',
    'max-snippet': -1,
  },
}
```

## Рекомендации

1. **Уникальные title** — каждая страница должна иметь уникальное название
2. **Описание 150-160 символов** — оптимальная длина для сниппетов
3. **Open Graph изображения** — 1200×630px для лучшего отображения
4. **Canonical URLs** — указывайте для избежания дублирования
5. **Ключевые слова** — 5-10 релевантных тегов

## Проверка

Для проверки SEO используйте:

- [Google Search Console](https://search.google.com/search-console)
- [Yandex Webmaster](https://webmaster.yandex.ru)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [Open Graph Debugger](https://developers.facebook.com/tools/debug/)

## Обновление OG-изображений

Замените файл `/public/img/og/og-image.jpg` на актуальное изображение (1200×630px).
