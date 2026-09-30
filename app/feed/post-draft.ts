import type { DraftImage } from './editor-shared';

/** Пространство имён черновика поста в состоянии записи истории (см. app/lib/entry-nav). */
export const POST_DRAFT_NS = 'post-draft';

export interface PostDraftImage {
  id: string;
  url: string;
}

/** Черновик поста: то, что можно сериализовать. Картинки — только уже загруженные на сервер. */
export interface PostDraft {
  activeTab: 'preview' | 'write';
  authorId: string;
  content: string;
  images: PostDraftImage[];
  title: string;
  /** Токен формы: повторная отправка с ним не создаёт второй пост (CreatePost.php). */
  token: string;
  topic: string;
  widgets: unknown[];
}

export function newSubmitToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** Пустым считаем черновик без текста, заголовка, картинок и виджетов (одни лишь автор/тема — не в счёт). */
export function isPostDraftEmpty(draft: Pick<PostDraft, 'content' | 'images' | 'title' | 'widgets'>): boolean {
  return draft.title.trim() === '' && draft.content.trim() === '' && draft.images.length === 0 && draft.widgets.length === 0;
}

export function parsePostDraft(raw: unknown): PostDraft | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.token !== 'string' || value.token === '') return null;
  const images = Array.isArray(value.images)
    ? value.images.filter(
        (image): image is PostDraftImage =>
          typeof image === 'object' && image !== null
          && typeof (image as PostDraftImage).id === 'string'
          && typeof (image as PostDraftImage).url === 'string',
      )
    : [];
  const widgets = Array.isArray(value.widgets)
    ? value.widgets.filter(
        (widget) => typeof widget === 'object' && widget !== null
          && ((widget as { type?: unknown }).type === 'poll' || (widget as { type?: unknown }).type === 'music'),
      )
    : [];
  return {
    activeTab: value.activeTab === 'preview' ? 'preview' : 'write',
    authorId: typeof value.authorId === 'string' ? value.authorId : '0',
    content: typeof value.content === 'string' ? value.content : '',
    images,
    title: typeof value.title === 'string' ? value.title : '',
    token: value.token,
    topic: typeof value.topic === 'string' ? value.topic : '',
    widgets,
  };
}

/** Только загруженные картинки: blob-превью после ухода со страницы не живут. */
export function draftImagesFromState(images: readonly DraftImage[]): PostDraftImage[] {
  return images
    .filter((image) => image.status === 'uploaded' && image.uploadedUrl)
    .map((image) => ({ id: image.id, url: image.uploadedUrl as string }));
}

export function draftImagesToState(images: readonly PostDraftImage[]): DraftImage[] {
  return images.map((image) => ({ id: image.id, previewUrl: image.url, status: 'uploaded', uploadedUrl: image.url }));
}

/** Что уходит на сервер для синхронизации между устройствами (без токена формы и вкладки редактора). */
export type PostDraftPayload = Pick<PostDraft, 'content' | 'images' | 'title' | 'topic' | 'widgets'>;

/** Пустая строка — черновика нет (на сервере это удаление). */
export function serializePostDraftPayload(draft: PostDraftPayload): string {
  if (isPostDraftEmpty(draft)) return '';
  return JSON.stringify({ content: draft.content, images: draft.images, title: draft.title, topic: draft.topic, widgets: draft.widgets });
}

export function parsePostDraftPayload(payload: string): PostDraftPayload | null {
  if (payload === '') return null;
  try {
    const parsed = parsePostDraft({ ...(JSON.parse(payload) as Record<string, unknown>), token: 'remote' });
    if (!parsed) return null;
    return { content: parsed.content, images: parsed.images, title: parsed.title, topic: parsed.topic, widgets: parsed.widgets };
  } catch {
    return null;
  }
}
