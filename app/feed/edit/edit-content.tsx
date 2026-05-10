'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dropdown } from '../../components/navigation';
import type { PostAuthor, PostData, PostImage } from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { authFetch } from '../../lib/auth-fetch';
import {
  type DraftImage,
  MAX_IMAGES,
  STICKERS,
  StickersIcon,
  PollIcon,
  SvgIcon,
  cn,
  decodeHtmlEntities,
  decodeHtmlToTextareaValue,
  makeId,
  safeRevokeObjectUrl,
  uploadImageToImgbb,
} from '../editor-shared';
import CreatePostPreview from '../create/create-post-preview';

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
    };
    return {
      choisetopic: lang?.choisetopic || fb.choisetopic,
      edit: lang?.edit || fb.edit,
      errorDescription: fb.errorDescription,
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
      nopost: fb.nopost,
      nopostdesc: fb.nopostdesc,
      notyourpost: fb.notyourpost,
      notyourpostdesc: fb.notyourpostdesc,
      nowTyping: fb.nowTyping,
      photo: lang?.photo || fb.photo,
      placeholderAuthor: fb.placeholderAuthor,
      placeholderContent: fb.placeholderContent,
      placeholderTag: fb.placeholderTag,
      placeholderTitle: fb.placeholderTitle,
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
      uploading: fb.uploading,
      video: lang?.video || fb.video,
      waituntillphotouploaded: lang?.waituntillphotouploaded || fb.waituntillphotouploaded,
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
        const response = await authFetch(`/api/posts/get_post.php?id=${encodeURIComponent(postId)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as GetPostResponse;

        if (!data.success || !data.data) {
          setPost(null);
          setError('not_found');
          return;
        }

        const nextPost = normalizePost(data.data);
        setPost(nextPost);

        if (!flag(nextPost.can_edit)) {
          setError('permission_denied');
          return;
        }

        setTitle(nextPost.title ?? '');
        setContent(
          decodeHtmlToTextareaValue(nextPost.original_content ?? nextPost.content ?? ''),
        );
        setSelectedTopic(nextPost.tags ?? '');
        setImages(toDraftImages(nextPost.images));
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

      const body = new URLSearchParams({
        data: content,
        id: postId,
        photos,
        tags: selectedTopic,
        title,
      });

      const response = await authFetch('/api/posts/edit.php', {
        body: body.toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || `Request failed with status ${response.status}`);
      }

      showNote({
        content: responseText.trim() || strings.saved,
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

  return (
    <div className="flex flex-col jusitify-center items-center gap-3 py-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="w-full max-w-3xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 px-3 lg:px-0 cursor-pointer"
        >
          <SvgIcon className="w-8 h-8 fill-white inline" id="IC-chevron-left" />
          <span>{strings.edit}</span>
          <span className="lowercase">{strings.post}</span>
        </button>
      </div>

      {isPostLoading && (
        <div className="flex justify-center items-center w-full py-10">
          <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <use href="#IC-loader"></use>
          </svg>
        </div>
      )}

      {!isPostLoading && !error && post && (
        <>
          <div className="flex gap-3 w-full px-3 lg:px-0 max-w-3xl">
            <button
              type="button"
              onClick={() => setActiveTab('write')}
              className={cn(
                'border border-zinc-600/30 hover:bg-zinc-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 cursor-pointer',
                activeTab === 'write' && 'bg-zinc-700 hover:bg-zinc-600',
              )}
            >
              {strings.post}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={cn(
                'border border-zinc-600/30 hover:bg-zinc-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 cursor-pointer',
                activeTab === 'preview' && 'bg-zinc-700 hover:bg-zinc-600',
              )}
            >
              {strings.preview}
            </button>
            <div className="flex-grow"></div>
            <button
              id="publicpost"
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || hasUploadingImages}
              className="border border-zinc-600/30 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 text-sm cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <svg className="fill-white w-6 h-6 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <use href="#IC-send"></use>
              </svg>
              <span>{strings.save}</span>
            </button>
          </div>

          <div className={cn('flex flex-col w-full max-w-3xl', activeTab !== 'write' && 'hidden')}>
            <form
              onSubmit={(event) => {
                event.preventDefault();
              }}
              className="border border-zinc-600/30 duration-300 bg-zinc-900 shadow rounded-3xl text-zinc-700 flex flex-col"
            >
              <input
                className="bg-transparent p-3 w-full placeholder-zinc-500 text-zinc-100 text-lg font-bold border-b border-zinc-800 duration-300 focus:ring-0 focus:outline-none"
                autoComplete="off"
                type="text"
                name="edit_post_title"
                id="edit_post_title"
                maxLength={64}
                placeholder={strings.title}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                className="bg-transparent p-3 w-full placeholder-zinc-500 text-white h-72 min-h-32 max-h-96 focus:ring-0 focus:outline-none duration-300"
                autoComplete="off"
                name="edit_content"
                id="edit_content"
                maxLength={1000}
                placeholder={strings.postcontent}
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />

              {images.length > 0 && (
                <div className="p-3 flex gap-3 overflow-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {images.map((image) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => handleDeleteImage(image.id)}
                      className="h-32 w-32 rounded-2xl shadow bg-center bg-cover shrink-0 cursor-pointer relative overflow-hidden"
                      style={{ backgroundImage: `url(${image.previewUrl})` }}
                    >
                      {image.status === 'uploading' ? (
                        <div className="bg-zinc-800 text-white rounded-2xl flex items-center justify-center w-full h-full text-5xl font-bold duration-300">
                          <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <use href="#IC-loader"></use>
                          </svg>
                        </div>
                      ) : (
                        <div className="bg-zinc-800 text-white rounded-2xl flex items-center justify-center w-full h-full opacity-0 hover:opacity-90 text-5xl font-bold duration-300">
                          <SvgIcon className="w-8 h-8 inline fill-white" id="IC-times" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="px-3 pb-3 flex items-center justify-center gap-3">
                <Dropdown
                  triggerSize="sm"
                  width="auto"
                  triggerIcon="IC-plus"
                  triggerAriaLabel="Add content"
                  position="top"
                  align="start"
                  triggerClassName="h-7 w-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-white"
                  menuClassName="min-w-32 !gap-1.5 !p-2 !rounded-2xl"
                >
                  <button
                    type="button"
                    onClick={handleOpenFilePicker}
                    className="flex items-center hover:shadow cursor-pointer rounded-2xl duration-150 px-1.5 py-0.5 bg-zinc-700/0 hover:bg-zinc-700/95 font-medium text-white w-full"
                  >
                    <SvgIcon className="w-6 h-6 inline fill-white mr-1" id="IC-photos" />
                    <span>{strings.photo}</span>
                  </button>
                  <div className="flex items-center hover:shadow rounded-2xl duration-150 px-1.5 py-0.5 font-medium bg-zinc-600/30 text-zinc-400 cursor-not-allowed w-full">
                    <SvgIcon className="inline w-6 h-6 fill-zinc-400 mr-1" id="IC-play" />
                    <span>{strings.video}</span>
                  </div>
                  <div className="flex items-center hover:shadow rounded-2xl duration-150 px-1.5 py-0.5 font-medium bg-zinc-600/30 text-zinc-400 cursor-not-allowed w-full">
                    <PollIcon className="inline h-6 w-6 mr-1 fill-zinc-400" />
                    <span>{strings.poll}</span>
                  </div>
                  <div className="flex items-center hover:shadow rounded-2xl duration-150 px-1.5 py-0.5 font-medium bg-zinc-600/30 text-zinc-400 cursor-not-allowed w-full">
                    <SvgIcon className="inline w-6 h-6 fill-zinc-400 mr-1" id="IC-music" />
                    <span>{strings.music}</span>
                  </div>
                </Dropdown>

                <select
                  name="edit_post_topic"
                  className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-xs lg:text-sm cursor-pointer duration-300 text-zinc-100 focus:ring-0 focus:outline-none"
                  id="edit_post_topic"
                  value={selectedTopic}
                  onChange={(event) => setSelectedTopic(event.target.value)}
                >
                  <option value="" disabled>
                    {strings.choisetopic}
                  </option>
                  {topicOptions.map((topicOption) => (
                    <option key={topicOption} value={topicOption}>
                      {topicOption}
                    </option>
                  ))}
                </select>

                <div className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 rounded-3xl shadow text-xs lg:text-sm duration-300 text-zinc-400 flex items-center px-2 cursor-default max-w-[12rem]">
                  <span className="truncate">{post.author.name}</span>
                </div>

                <div className="flex-grow"></div>

                <Dropdown
                  triggerSize="sm"
                  triggerAriaLabel="Insert sticker"
                  position="top"
                  align="end"
                  triggerClassName="h-7 w-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-2xl shadow text-white"
                  menuClassName="!grid !grid-cols-6 !w-[15rem] !rounded-3xl !p-1.5 h-32 overflow-auto"
                  triggerNode={<StickersIcon className="w-5 h-5 fill-white" />}
                >
                  {STICKERS.map((sticker) => (
                    <button
                      key={`${sticker.code}-${sticker.src}`}
                      type="button"
                      onClick={() => handleStickerSelect(sticker.code)}
                      className="inline cursor-pointer active:scale-95 duration-300"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={sticker.src} alt={sticker.code.trim()} className="w-8 h-8 object-contain" />
                    </button>
                  ))}
                </Dropdown>
              </div>
            </form>
          </div>

          <div className={cn('flex flex-col w-full max-w-3xl', activeTab !== 'preview' && 'hidden')}>
            <CreatePostPreview
              authorImage={previewAuthorImage}
              authorName={previewAuthorName}
              images={images.map((image) => ({
                id: image.id,
                status: image.status,
                url: image.previewUrl,
              }))}
              strings={{
                nowTyping: strings.nowTyping,
                placeholderAuthor: strings.placeholderAuthor,
                placeholderContent: strings.placeholderContent,
                placeholderTag: strings.placeholderTag,
                placeholderTitle: strings.placeholderTitle,
                uploading: strings.uploading,
              }}
              tag={selectedTopic}
              text={content}
              title={title}
            />
          </div>
        </>
      )}

      {!isPostLoading && error === 'not_found' && (
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
      )}

      {!isPostLoading && error === 'permission_denied' && (
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
      )}

      {!isPostLoading && error === 'error' && (
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
      )}

      <div className="lg:hidden">
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}
