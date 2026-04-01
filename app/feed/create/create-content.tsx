'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Dropdown } from '../../components/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import CreatePostPreview from './create-post-preview';
import {
  type DraftImage,
  MAX_IMAGES,
  STICKERS,
  StickersIcon,
  PollIcon,
  SvgIcon,
  cn,
  decodeHtmlEntities,
  makeId,
  safeRevokeObjectUrl,
  uploadImageToImgbb,
} from '../editor-shared';

type AvailableAuthor = {
  id: string;
  name: string;
};

export default function CreatePostContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, lang, user } = useAuth();
  const { showNote } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<DraftImage[]>([]);

  const [activeTab, setActiveTab] = useState<'preview' | 'write'>('write');
  const [authors, setAuthors] = useState<AvailableAuthor[]>([]);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<DraftImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState('0');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [title, setTitle] = useState('');

  const strings = useMemo(() => {
    const fb = {
      choisetopic: 'Выберите тему',
      films: 'Фильмы',
      food: 'Еда',
      frommyname: 'От моего имени',
      games: 'Игры',
      humor: 'Юмор',
      investment: 'Инвестиции',
      it: 'IT',
      loading: 'Загрузка...',
      max3photos: 'Можно загрузить не больше 3 фотографий',
      music: 'Музыка',
      newpost: 'Новый пост',
      nowTyping: 'Печатается сейчас!',
      photo: 'Фото',
      photosPlaceholder: 'Здесь появятся все загруженные фотографии.',
      placeholderAuthor: 'Автор',
      placeholderContent: 'Текст поста',
      placeholderTag: 'Тема',
      placeholderTitle: 'Заголовок',
      poll: 'Опрос',
      post: 'Пост',
      postcontent: 'Содержимое поста',
      preview: 'Предпросмотр',
      publicpost: 'Опубликовать',
      science: 'Наука',
      somethingwrong: 'Что-то пошло не так',
      sport: 'Спорт',
      tourism: 'Туризм',
      title: 'Заголовок',
      uploadedcompl: 'Фотография загружена',
      uploading: 'Загружается...',
      video: 'Видео',
      waituntillphotouploaded: 'Подождите, пока фотография загрузится',
      news: 'Новости',
    };
    return {
      choisetopic: lang?.choisetopic || fb.choisetopic,
      films: lang?.films || fb.films,
      food: lang?.food || fb.food,
      frommyname: lang?.frommyname || fb.frommyname,
      games: lang?.games || fb.games,
      humor: lang?.humor || fb.humor,
      investment: lang?.investment || fb.investment,
      it: lang?.it || fb.it,
      loading: lang?.['loading...'] || fb.loading,
      max3photos: lang?.max3photos || fb.max3photos,
      music: lang?.music || fb.music,
      newpost: lang?.newpost || fb.newpost,
      news: lang?.news || fb.news,
      nowTyping: fb.nowTyping,
      photo: lang?.photo || fb.photo,
      photosPlaceholder: fb.photosPlaceholder,
      placeholderAuthor: fb.placeholderAuthor,
      placeholderContent: fb.placeholderContent,
      placeholderTag: fb.placeholderTag,
      placeholderTitle: fb.placeholderTitle,
      poll: lang?.poll || fb.poll,
      post: lang?.post || fb.post,
      postcontent: lang?.postcontent || fb.postcontent,
      preview: lang?.preview || fb.preview,
      publicpost: lang?.publicpost || fb.publicpost,
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

  const selectedAuthor = authors.find((author) => author.id === selectedAuthorId);
  const currentUserName =
    `${user?.fname || ''} ${user?.lname || ''}`.trim() ||
    user?.username ||
    strings.placeholderAuthor;
  const previewAuthorName =
    selectedAuthorId === '0' ? currentUserName : selectedAuthor?.name || strings.placeholderAuthor;
  const previewAuthorImage = selectedAuthorId === '0' ? user?.img || null : null;
  const hasUploadingImages = images.some((image) => image.status === 'uploading');

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
    router.replace('/login?backurl=/feed/create');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();

    const loadAuthors = async () => {
      try {
        const response = await fetch(`/api/posts/available_authors.php`, {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = (await response.json()) as AvailableAuthor[];
        setAuthors(
          Array.isArray(data)
            ? data.map((author) => ({
                ...author,
                name: decodeHtmlEntities(author.name),
              }))
            : [],
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error('Failed to load available authors', error);
        showNote({
          content: strings.somethingwrong,
          type: 'error',
          time: 5,
        });
      }
    };

    void loadAuthors();

    return () => {
      controller.abort();
    };
  }, [isAuthenticated, showNote, strings.somethingwrong]);

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
    } catch (error) {
      console.error('Image upload failed', error);

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
    if (isSubmitting || hasUploadingImages) return;

    setIsSubmitting(true);

    try {
      const authorType = selectedAuthorId === '0' ? '1' : '2';
      const uploadedImages = images
        .filter((image) => image.status === 'uploaded' && image.uploadedUrl)
        .map((image) => image.uploadedUrl as string)
        .join(',');

      const searchParams = new URLSearchParams({
        author_type: authorType,
        gid: selectedAuthorId,
        tags: selectedTopic || 'null',
      });

      const body = new URLSearchParams({
        contentext: content,
        new_post_title: title,
        photosurls: uploadedImages,
      });

      const response = await fetch(`/api/posts/create.php?${searchParams.toString()}`, {
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

      if (responseText.trim() === '') {
        router.push('/feed');
        return;
      }

      showNote({
        content: responseText,
        html: true,
        type: 'success',
        time: 5,
      });
    } catch (error) {
      console.error('Create post failed', error);
      showNote({
        content:
          error instanceof Error && error.message
            ? error.message
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
          <use href="/icons.svg#IC-loader"></use>
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center w-full h-screen">
        <svg className="w-16 h-16 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
          <use href="/icons.svg#IC-loader"></use>
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
          <span>{strings.newpost}</span>
        </button>
      </div>

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
          className={cn(
            'border border-zinc-600/30 bg-purple-500 hover:bg-purple-600 duration-300 active:scale-95 px-3 py-1 shadow rounded-3xl shrink-0 text-sm cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100',
          )}
        >
          <svg className="fill-white w-6 h-6 inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <use href="/icons.svg#IC-send"></use>
          </svg>
          <span>{strings.publicpost}</span>
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
            name="new_post_title"
            id="new_post_title"
            maxLength={64}
            placeholder={strings.title}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            className="bg-transparent p-3 w-full placeholder-zinc-500 text-white h-72 min-h-32 max-h-96 focus:ring-0 focus:outline-none duration-300"
            autoComplete="off"
            name="contentext"
            id="contentext"
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
                        <use href="/icons.svg#IC-loader"></use>
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
              name="new_post_topic"
              className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-xs lg:text-sm cursor-pointer duration-300 text-zinc-100 focus:ring-0 focus:outline-none"
              id="new_post_topic"
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

            <select
              name="new_post_cr"
              className="p-0.5 h-7 border border-zinc-600/30 bg-zinc-900 hover:bg-zinc-700 rounded-3xl shadow text-xs lg:text-sm cursor-pointer duration-300 text-zinc-100 focus:ring-0 focus:outline-none"
              id="new_post_cr"
              value={selectedAuthorId}
              onChange={(event) => setSelectedAuthorId(event.target.value)}
            >
              <option value="0">{strings.frommyname}</option>
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>

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

      <div className="lg:hidden">
        <br />
        <br />
        <br />
      </div>
    </div>
  );
}
