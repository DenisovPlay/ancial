'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import PostWidgetPollModal, { type PollWidgetDraft } from '../../components/post-widget-poll-modal';
import PostWidgetMusicModal, { type MusicWidgetDraft } from '../../components/post-widget-music-modal';
import { FeedEditorUI } from '../editor-ui';

import {
  type DraftImage,
  MAX_IMAGES,
  decodeHtmlEntities,
  makeId,
  safeRevokeObjectUrl,
  uploadImageToImgbb,
} from '../editor-shared';

type AvailableAuthor = {
  id: string;
  name: string;
};

type TrackSearchResult = {
  id: number;
  name: string;
  artist: string;
  img: string;
  src: string;
};

type PollWidget = {
  type: 'poll';
  question: string;
  options: string[];
};

type MusicWidget = {
  type: 'music';
  track_id: number;
  track_name: string;
  artist_name: string;
  track_img: string;
};

type PostWidget = PollWidget | MusicWidget;


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

  // Виджеты
  const [widgets, setWidgets] = useState<PostWidget[]>([]);
  const [isPollModalOpen, setIsPollModalOpen] = useState(false);
  const [isMusicModalOpen, setIsMusicModalOpen] = useState(false);


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
      nowTyping: lang?.nowtyping || fb.nowTyping,
      photo: lang?.photo || fb.photo,
      photosPlaceholder: lang?.photosplaceholder || fb.photosPlaceholder,
      placeholderAuthor: lang?.placeholderauthor || fb.placeholderAuthor,
      placeholderContent: lang?.placeholdercontent || fb.placeholderContent,
      placeholderTag: lang?.placeholdertag || fb.placeholderTag,
      placeholderTitle: lang?.placeholdertitle || fb.placeholderTitle,
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
      uploading: lang?.uploading || fb.uploading,
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
        const data = await AncialAPI.request<AvailableAuthor[]>('/posts/AvailableAuthors.php', {
          signal: controller.signal,
        });

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

  const handleAddMusicWidget = (draft: MusicWidgetDraft) => {
    setWidgets(prev => [...prev.filter(w => w.type !== 'music'), draft]);
  };

  const handleAddPollWidget = (draft: PollWidgetDraft) => {
    setWidgets(prev => [...prev.filter(w => w.type !== 'poll'), draft]);
  };

  const handleRemoveWidget = (index: number) => {
    setWidgets(prev => prev.filter((_, i) => i !== index));
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

      // Сериализуем виджеты
      const serializedWidgets = JSON.stringify(
        widgets.map((w) => {
          if (w.type === 'poll') return { type: 'poll', question: w.question, options: w.options.filter(o => o.trim()) };
          if (w.type === 'music') return { type: 'music', track_id: w.track_id };
          return w;
        })
      );

      const response = await AncialAPI.createPost<{ message?: string }>({
        author_type: authorType,
        gid: selectedAuthorId,
        tags: selectedTopic || 'null',
        contentext: content,
        new_post_title: title,
        photosurls: uploadedImages,
        widgets: serializedWidgets,
      });

      if (!response || !response.message) {
        router.push('/feed');
        return;
      }

      showNote({
        content: response.message,
        html: true,
        type: 'success',
        time: 5,
      });
      router.push('/feed');
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
    <FeedEditorUI
      mode="create"
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
      authors={authors}
      selectedAuthorId={selectedAuthorId}
      setSelectedAuthorId={setSelectedAuthorId}
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
      onBack={() => router.push('/feed')}
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
            setWidgets([...widgets, poll as PostWidget]);
            setIsPollModalOpen(false);
          }}
        />
      )}

      {isMusicModalOpen && (
        <PostWidgetMusicModal
          isOpen={isMusicModalOpen}
          onClose={() => setIsMusicModalOpen(false)}
          onAdd={(music) => {
            setWidgets([...widgets, music as PostWidget]);
            setIsMusicModalOpen(false);
          }}
        />
      )}
    </FeedEditorUI>
  );
}
