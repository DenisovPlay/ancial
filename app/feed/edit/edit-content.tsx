'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { PostAuthor, PostData, PostImage } from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import PostWidgetPollModal, { type PollWidgetDraft } from '../../components/post-widget-poll-modal';
import PostWidgetMusicModal, { type MusicWidgetDraft } from '../../components/post-widget-music-modal';
import { FeedEditorUI } from '../editor-ui';

import {
  type DraftImage,
  MAX_IMAGES,
  SvgIcon,
  decodeHtmlEntities,
  decodeHtmlToTextareaValue,
  makeId,
  safeRevokeObjectUrl,
  uploadImageToImgbb,
} from '../editor-shared';


type EditErrorState = 'error' | 'not_found' | 'permission_denied' | null;

type EditablePostData = PostData & {
  author: PostAuthor;
  can_edit?: boolean | number | string | null;
  images?: PostImage[] | null;
  original_content?: string | null;
};

type GetPostResponse = {
  data?: EditablePostData;
  success?: boolean;
};

type EditPostContentProps = {
  postId: string | null;
};

function flag(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function normalizePost(post: EditablePostData): EditablePostData {
  return {
    ...post,
    title: decodeHtmlEntities(post.title ?? ''),
    tags: decodeHtmlEntities(post.tags ?? ''),
    author: {
      ...post.author,
      name: decodeHtmlEntities(post.author.name),
    },
    images: Array.isArray(post.images) ? post.images : [],
  };
}

function toDraftImages(images: PostImage[] | null | undefined): DraftImage[] {
  return (images ?? []).map((image, index) => ({
    id: `existing-${index}-${image.url}`,
    previewUrl: image.url,
    status: 'uploaded',
    uploadedUrl: image.url,
  }));
}

export default function EditPostContent({ postId }: EditPostContentProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, lang } = useAuth();
  const { showNote } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<DraftImage[]>([]);

  const [activeTab, setActiveTab] = useState<'preview' | 'write'>('write');
  const [content, setContent] = useState('');
  const [error, setError] = useState<EditErrorState>(null);
  const [images, setImages] = useState<DraftImage[]>([]);
  const [isPostLoading, setIsPostLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [post, setPost] = useState<EditablePostData | null>(null);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [title, setTitle] = useState('');

  // Виджеты
  const [widgets, setWidgets] = useState<any[]>([]);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);


  const strings = useMemo(() => {
    const fb = {
      choisetopic: 'Выберите тему',
      edit: 'Редактировать',
      errorDescription: 'Попробуйте обновить страницу чуть позже.',
      films: 'Фильмы',
      food: 'Еда',
      games: 'Игры',
      humor: 'Юмор',
      investment: 'Инвестиции',
      it: 'IT',
      loading: 'Загрузка...',
      max3photos: 'Можно загрузить не больше 3 фотографий',
      music: 'Музыка',
      news: 'Новости',
      nopost: 'Запись не найдена',
      nopostdesc: 'Возможно, она была удалена или ссылка неверна.',
      notyourpost: 'Не ваша запись!',
      notyourpostdesc: 'Чужие записи нельзя изменять.',
      nowTyping: 'Печатается сейчас!',
      photo: 'Фото',
      placeholderAuthor: 'Автор',
      placeholderContent: 'Текст поста',
      placeholderTag: 'Тема',
      placeholderTitle: 'Заголовок',
      poll: 'Опрос',
      post: 'Пост',
      postcontent: 'Содержимое поста',
      preview: 'Предпросмотр',
      save: 'Сохранить',
      saved: 'Изменения сохранены',
      science: 'Наука',
      somethingwrong: 'Что-то пошло не так',
      sport: 'Спорт',
      title: 'Заголовок',
      tourism: 'Туризм',
      uploadedcompl: 'Фотография загружена',
      uploading: 'Загружается...',
      video: 'Видео',
      waituntillphotouploaded: 'Подождите, пока фотография загрузится',
      reply_to_post: 'Ответ на запись',
    };
    return {
      choisetopic: lang?.choisetopic || fb.choisetopic,
      edit: lang?.edit || fb.edit,
      errorDescription: lang?.errordescription || fb.errorDescription,
      films: lang?.films || fb.films,
      food: lang?.food || fb.food,
      games: lang?.games || fb.games,
      humor: lang?.humor || fb.humor,
      investment: lang?.investment || fb.investment,
      it: lang?.it || fb.it,
      loading: lang?.['loading...'] || fb.loading,
      max3photos: lang?.max3photos || fb.max3photos,
      music: lang?.music || fb.music,
      news: lang?.news || fb.news,
      nopost: lang?.post_not_found || fb.nopost,
      nopostdesc: lang?.post_not_found_desc || fb.nopostdesc,
      notyourpost: lang?.not_your_post || fb.notyourpost,
      notyourpostdesc: lang?.not_your_post_desc || fb.notyourpostdesc,
      nowTyping: lang?.nowtyping || fb.nowTyping,
      photo: lang?.photo || fb.photo,
      placeholderAuthor: lang?.placeholderauthor || fb.placeholderAuthor,
      placeholderContent: lang?.placeholdercontent || fb.placeholderContent,
      placeholderTag: lang?.placeholdertag || fb.placeholderTag,
      placeholderTitle: lang?.placeholdertitle || fb.placeholderTitle,
      poll: lang?.poll || fb.poll,
      post: lang?.post || fb.post,
      postcontent: lang?.postcontent || fb.postcontent,
      preview: lang?.preview || fb.preview,
      save: lang?.save || fb.save,
      saved: lang?.saved || fb.saved,
      science: lang?.science || fb.science,
      somethingwrong: lang?.somethingwrong || fb.somethingwrong,
      sport: lang?.sport || fb.sport,
      title: lang?.title || fb.title,
      tourism: lang?.tourism || fb.tourism,
      uploadedcompl: lang?.uploadedcompl || fb.uploadedcompl,
      uploading: lang?.uploading || fb.uploading,
      video: lang?.video || fb.video,
      waituntillphotouploaded: lang?.waituntillphotouploaded || fb.waituntillphotouploaded,
      reply_to_post: lang?.reply_to_post || fb.reply_to_post,
    };
  }, [lang]);

  const topicOptions = useMemo(
    () => [
      strings.it,
      strings.investment,
      strings.games,
      strings.news,
      strings.photo,
      strings.music,
      strings.films,
      strings.humor,
      strings.science,
      strings.tourism,
      strings.sport,
      strings.food,
    ],
    [strings],
  );

  const hasUploadingImages = images.some((image) => image.status === 'uploading');
  const previewAuthorName = post?.author.name || strings.placeholderAuthor;
  const previewAuthorImage = post?.author.img || null;

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      imagesRef.current.forEach((image) => {
        safeRevokeObjectUrl(image.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    const backUrl = postId ? `/feed/edit?id=${postId}` : '/feed/edit';
    router.replace(`/login?backurl=${backUrl}`);
  }, [isAuthenticated, isLoading, postId, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    if (!postId) {
      setPost(null);
      setError('not_found');
      setIsPostLoading(false);
      return;
    }

    const controller = new AbortController();

    const loadPost = async () => {
      setIsPostLoading(true);
      setError(null);

      try {
        const nextPost = await AncialAPI.getPost<EditablePostData>(postId, {
          signal: controller.signal,
        });

        if (!nextPost) {
          setPost(null);
          setError('not_found');
          return;
        }

        const normalizedPost = normalizePost(nextPost);
        setPost(normalizedPost);

        if (!flag(normalizedPost.can_edit)) {
          setError('permission_denied');
          return;
        }

        setTitle(normalizedPost.title ?? '');
        setContent(
          decodeHtmlToTextareaValue(normalizedPost.original_content ?? normalizedPost.content ?? ''),
        );
        setSelectedTopic(normalizedPost.tags === 'null' ? '' : (normalizedPost.tags ?? ''));
        setImages(toDraftImages(normalizedPost.images));

        // Enrich widgets
        if (normalizedPost.widgets && Array.isArray(normalizedPost.widgets)) {
          const enrichedWidgets = await Promise.all(
            normalizedPost.widgets.map(async (widget) => {
              const wAny = widget as any;
              if (widget.type === 'music' && (!wAny.track_name || !wAny.artist_name)) {
                try {
                  const res = await AncialAPI.getTrack<{ track?: any }>(wAny.track_id);
                  const trackData = res?.track;
                  if (trackData) {
                    return {
                      ...widget,
                      track_name: trackData.title || trackData.name || '',
                      artist_name: trackData.artist || '',
                      track_img: trackData.artwork?.[0]?.src || trackData.img || '',
                    };
                  }
                } catch (e) {
                  console.error('Failed to enrich widget track', wAny.track_id, e);
                }
              }
              return widget;
            })
          );
          setWidgets(enrichedWidgets);
        }

      } catch (nextError) {
        if (controller.signal.aborted) return;
        console.error('Failed to load post for editing', nextError);
        setPost(null);
        setError('error');
      } finally {
        if (!controller.signal.aborted) {
          setIsPostLoading(false);
        }
      }
    };

    void loadPost();

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, isLoading, postId]);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteImage = (imageId: string) => {
    const image = images.find((currentImage) => currentImage.id === imageId);
    if (!image) return;

    if (image.status === 'uploading') {
      showNote({
        content: strings.waituntillphotouploaded,
        type: 'info',
        time: 5,
      });
      return;
    }

    safeRevokeObjectUrl(image.previewUrl);
    setImages((currentImages) =>
      currentImages.filter((currentImage) => currentImage.id !== imageId),
    );
  };

  const handleAddMusicWidget = (draft: MusicWidgetDraft) => {
    setWidgets(prev => [...prev.filter(w => w.type !== 'music'), draft]);
  };

  const handleAddPollWidget = (draft: PollWidgetDraft) => {
    setWidgets(prev => [...prev.filter(w => w.type !== 'poll'), draft]);
  };

  const handleRemoveWidget = (index: number) => {
    setWidgets(prev => prev.filter((_, i) => i !== index));
  };


  const handleStickerSelect = (stickerCode: string) => {
    setContent((currentContent) => `${currentContent}${stickerCode}`);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (images.length >= MAX_IMAGES) {
      showNote({
        content: strings.max3photos,
        type: 'info',
        time: 8,
      });
      event.target.value = '';
      return;
    }

    const draftId = makeId();
    const previewUrl = URL.createObjectURL(file);

    setImages((currentImages) => [
      ...currentImages,
      {
        id: draftId,
        previewUrl,
        status: 'uploading',
      },
    ]);

    showNote({
      content: strings.loading,
      type: 'info',
      time: 5,
    });

    try {
      const uploadedUrl = await uploadImageToImgbb(file);

      setImages((currentImages) =>
        currentImages.map((currentImage) =>
          currentImage.id === draftId
            ? { ...currentImage, status: 'uploaded', uploadedUrl }
            : currentImage,
        ),
      );

      showNote({
        content: strings.uploadedcompl,
        type: 'success',
        time: 5,
      });
    } catch (nextError) {
      console.error('Image upload failed during edit', nextError);

      setImages((currentImages) =>
        currentImages.map((currentImage) =>
          currentImage.id === draftId
            ? { ...currentImage, status: 'error' }
            : currentImage,
        ),
      );

      showNote({
        content: strings.somethingwrong,
        type: 'error',
        time: 5,
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!postId || isSubmitting || hasUploadingImages || !post || error) return;

    setIsSubmitting(true);

    try {
      const photos = images
        .filter((image) => image.status === 'uploaded')
        .map((image) => image.uploadedUrl ?? image.previewUrl)
        .join(',');

      // Сериализуем виджеты
      const serializedWidgets = JSON.stringify(
        widgets.map((w: any) => {
          if (w.type === 'poll') return { type: 'poll', question: w.question, options: w.options.filter((o: string) => o.trim()) };
          if (w.type === 'music') return { type: 'music', track_id: w.track_id };
          return w;
        })
      );

      const response = await AncialAPI.editPost<{ message?: string }>({
        data: content,
        id: postId,
        photos,
        tags: selectedTopic || 'null',
        title,
        widgets: serializedWidgets,
      });


      showNote({
        content: response?.message?.trim() || strings.saved,
        html: true,
        type: 'success',
        time: 5,
      });
    } catch (nextError) {
      console.error('Edit post failed', nextError);
      showNote({
        content:
          nextError instanceof Error && nextError.message
            ? nextError.message
            : strings.somethingwrong,
        html: true,
        type: 'error',
        time: 10,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <use href="#IC-loader"></use>
        </svg>
      </div>
    );
  }

  let loadingOrErrorComponent: React.ReactNode | undefined;
  if (isPostLoading) {
    loadingOrErrorComponent = (
      <div className="w-full flex flex-col gap-3 max-w-3xl px-3 lg:px-0 animate-pulse mt-3">
        {/* Скелет вкладок и кнопок */}
        <div className="flex gap-3 w-full">
          <div className="h-8 w-24 bg-zinc-800 rounded-3xl" />
          <div className="h-8 w-32 bg-zinc-800 rounded-3xl" />
          <div className="flex-grow" />
          <div className="h-8 w-32 bg-zinc-800 rounded-3xl" />
        </div>
        {/* Скелет поля ввода */}
        <div className="w-full h-96 bg-zinc-800 rounded-3xl" />
      </div>
    );
  } else if (error === 'not_found') {
    loadingOrErrorComponent = (
      <div className="w-full max-w-3xl px-3 lg:px-0">
        <div className="border border-zinc-600/30 text-center w-full flex flex-col gap-1 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6">
          <span className="text-base text-zinc-200 w-full text-center font-black">
            {strings.nopost}
          </span>
          <span className="text-sm text-zinc-400 w-full text-center font-medium">
            {strings.nopostdesc}
          </span>
        </div>
      </div>
    );
  } else if (error === 'permission_denied') {
    loadingOrErrorComponent = (
      <div className="w-full max-w-3xl px-3 lg:px-0">
        <div className="border border-zinc-600/30 text-center w-full flex flex-col gap-3 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6">
          <div className="rounded-2xl bg-red-500/25 shadow h-16 w-16 flex items-center justify-center duration-300">
            <SvgIcon className="w-8 h-8 inline fill-white" id="IC-times" />
          </div>
          <span className="text-base text-zinc-200 w-full text-center font-black">
            {strings.notyourpost}
          </span>
          <span className="text-sm text-zinc-400 w-full text-center font-medium">
            {strings.notyourpostdesc}
          </span>
        </div>
      </div>
    );
  } else if (error === 'error') {
    loadingOrErrorComponent = (
      <div className="w-full max-w-3xl px-3 lg:px-0">
        <div className="border border-zinc-600/30 text-center w-full flex flex-col gap-1 justify-center items-center bg-zinc-900 text-zinc-100 rounded-3xl p-6">
          <span className="text-base text-zinc-200 w-full text-center font-black">
            {strings.somethingwrong}
          </span>
          <span className="text-sm text-zinc-400 w-full text-center font-medium">
            {strings.errorDescription}
          </span>
        </div>
      </div>
    );
  }

  return (
    <FeedEditorUI
      mode="edit"
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      title={title}
      setTitle={setTitle}
      content={content}
      setContent={setContent}
      images={images}
      handleDeleteImage={handleDeleteImage}
      widgets={widgets}
      handleRemoveWidget={handleRemoveWidget}
      topicOptions={topicOptions}
      selectedTopic={selectedTopic}
      setSelectedTopic={setSelectedTopic}
      authorName={post?.author?.name}
      strings={strings}
      isSubmitting={isSubmitting}
      hasUploadingImages={hasUploadingImages}
      handleSubmit={handleSubmit}
      handleOpenFilePicker={handleOpenFilePicker}
      setIsPollModalOpen={setIsPollModalOpen}
      setIsMusicModalOpen={setIsMusicModalOpen}
      handleStickerSelect={handleStickerSelect}
      previewAuthorName={previewAuthorName}
      previewAuthorImage={previewAuthorImage}
      onBack={() => router.back()}
      loadingOrErrorComponent={loadingOrErrorComponent}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {isPollModalOpen && (
        <PostWidgetPollModal
          isOpen={isPollModalOpen}
          onClose={() => setIsPollModalOpen(false)}
          onAdd={(poll) => {
            handleAddPollWidget(poll);
            setIsPollModalOpen(false);
          }}
        />
      )}

      {isMusicModalOpen && (
        <PostWidgetMusicModal
          isOpen={isMusicModalOpen}
          onClose={() => setIsMusicModalOpen(false)}
          onAdd={(music) => {
            handleAddMusicWidget(music);
            setIsMusicModalOpen(false);
          }}
        />
      )}
    </FeedEditorUI>
  );
}
