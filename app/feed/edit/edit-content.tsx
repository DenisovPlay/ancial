'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dropdown } from '../../components/navigation';
import type { PostAuthor, PostData, PostImage } from '../../components/posts-renderer';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  type DraftImage,
  MAX_IMAGES,
  STICKERS,
  StickersIcon,
  PollIcon,
  SvgIcon,
  buildApiUrl,
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
    const fallback = {
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
      choisetopic: lang?.choisetopic || fallback.choisetopic,
      edit: lang?.edit || fallback.edit,
      errorDescription: fallback.errorDescription,
      films: lang?.films || fallback.films,
      food: lang?.food || fallback.food,
      games: lang?.games || fallback.games,
      humor: lang?.humor || fallback.humor,
      investment: lang?.investment || fallback.investment,
      it: lang?.it || fallback.it,
      loading: lang?.['loading...'] || fallback.loading,
      max3photos: lang?.max3photos || fallback.max3photos,
      music: lang?.music || fallback.music,
      news: lang?.news || fallback.news,
      nopost: fallback.nopost,
      nopostdesc: fallback.nopostdesc,
      notyourpost: fallback.notyourpost,
      notyourpostdesc: fallback.notyourpostdesc,
      nowTyping: fallback.nowTyping,
      photo: lang?.photo || fallback.photo,
      placeholderAuthor: fallback.placeholderAuthor,
      placeholderContent: fallback.placeholderContent,
      placeholderTag: fallback.placeholderTag,
      placeholderTitle: fallback.placeholderTitle,
      poll: lang?.poll || fallback.poll,
      post: lang?.post || fallback.post,
      postcontent: lang?.postcontent || fallback.postcontent,
      preview: lang?.preview || fallback.preview,
      save: lang?.save || fallback.save,
      saved: lang?.saved || fallback.saved,
      science: lang?.science || fallback.science,
      somethingwrong: lang?.somethingwrong || fallback.somethingwrong,
      sport: lang?.sport || fallback.sport,
      title: lang?.title || fallback.title,
      tourism: lang?.tourism || fallback.tourism,
      uploadedcompl: lang?.uploadedcompl || fallback.uploadedcompl,
      uploading: fallback.uploading,
      video: lang?.video || fallback.video,
      waituntillphotouploaded:
        lang?.waituntillphotouploaded || fallback.waituntillphotouploaded,
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
        const response = await fetch(buildApiUrl(`/api/posts/get_post.php?id=${encodeURIComponent(postId)}`), {
          cache: 'no-store',
          credentials: 'include',
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

      const response = await fetch(buildApiUrl('/api/posts/edit.php'), {
        body: body.toString(),
        cache: 'no-store',
        credentials: 'include',
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
          <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
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
          onClick={() => router.push('/feed')}
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
            <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
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
                <path d="M39.175,10.016c1.687,0,2.131,1.276,1.632,4.272c-0.571,3.426-2.216,14.769-3.528,21.83 c-0.502,2.702-1.407,3.867-2.724,3.867c-0.724,0-1.572-0.352-2.546-0.995c-1.32-0.872-7.984-5.279-9.431-6.314 c-1.32-0.943-3.141-2.078-0.857-4.312c0.813-0.796,6.14-5.883,10.29-9.842c0.443-0.423,0.072-1.068-0.42-1.068 c-0.112,0-0.231,0.034-0.347,0.111c-5.594,3.71-13.351,8.859-14.338,9.53c-0.987,0.67-1.949,1.1-3.231,1.1 c-0.655,0-1.394-0.112-2.263-0.362c-1.943-0.558-3.84-1.223-4.579-1.477c-2.845-0.976-2.17-2.241,0.593-3.457 c11.078-4.873,25.413-10.815,27.392-11.637C36.746,10.461,38.178,10.016,39.175,10.016 M39.175,7.016L39.175,7.016 c-1.368,0-3.015,0.441-5.506,1.474L33.37,8.614C22.735,13.03,13.092,17.128,6.218,20.152c-1.074,0.473-4.341,1.91-4.214,4.916 c0.054,1.297,0.768,3.065,3.856,4.124l0.228,0.078c0.862,0.297,2.657,0.916,4.497,1.445c1.12,0.322,2.132,0.478,3.091,0.478 c1.664,0,2.953-0.475,3.961-1.028c-0.005,0.168-0.001,0.337,0.012,0.507c0.182,2.312,1.97,3.58,3.038,4.338l0.149,0.106 c1.577,1.128,8.714,5.843,9.522,6.376c1.521,1.004,2.894,1.491,4.199,1.491c2.052,0,4.703-1.096,5.673-6.318 c0.921-4.953,1.985-11.872,2.762-16.924c0.331-2.156,0.603-3.924,0.776-4.961c0.349-2.094,0.509-4.466-0.948-6.185 C42.208,7.875,41.08,7.016,39.175,7.016L39.175,7.016z"></path>
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
                            <path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z"></path>
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
