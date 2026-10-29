'use client';

import { useState } from 'react';

import AccountName from '../../components/account-name';
import AppImage from '../../components/app-image';
import Modal from '../../components/modal';
import Icon from '../../components/svg-icon';
import { useAuth } from '../../context/AuthContext';
import { apiUrl } from '../../lib/api-url';
import { cn } from '../../lib/cn';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../lib/messages-shared';
import { useDialogMedia, type DialogMediaKind } from '../lib/use-dialog-media';
import { ActionTile, DialogMediaPane, InfoSectionList, useMediaSections } from './chat-info-parts';
import { MutedBell, PinIcon } from './dialog-swipe-row';

interface DirectChatInfoModalProps {
  about?: string | null;
  avatar: string;
  background: { onClear: () => void; onPick: () => void; uploading: boolean; url: string };
  badges?: string | null;
  callActive?: boolean;
  dialogId: number;
  isOpen: boolean;
  muted: boolean;
  name: string;
  onClose: () => void;
  onDelete: () => void;
  onOpenProfile?: () => void;
  onStartCall: () => void;
  onToggleMute: () => void;
  onTogglePin: () => void;
  pinned: boolean;
  statusLabel: string;
  username?: string | null;
  verify?: number | string | null;
}

type InfoView = 'background' | 'main' | DialogMediaKind;

/**
 * «Информация о чате» личного диалога в духе Telegram: собеседник, быстрые действия (профиль, звонок, звук, закрепление),
 * разделы «Медиа / Ссылки / Треки / Фон чата» — каждый на своём экране — и удаление диалога.
 */
export default function DirectChatInfoModal({
  about,
  avatar,
  background,
  badges,
  callActive,
  dialogId,
  isOpen,
  muted,
  name,
  onClose,
  onDelete,
  onOpenProfile,
  onStartCall,
  onToggleMute,
  onTogglePin,
  pinned,
  statusLabel,
  username,
  verify,
}: DirectChatInfoModalProps) {
  const { lang } = useAuth();
  const [view, setView] = useState<InfoView>('main');
  const media = useDialogMedia(dialogId, isOpen);
  const mediaSections = useMediaSections();
  const backgroundLabel = lang?.chat_info_background || 'Фон чата';

  // Закрытие всегда возвращает окно на главный экран: в следующий раз оно откроется с начала.
  const close = () => {
    setView('main');
    onClose();
  };

  const sectionTitle = view === 'background' ? backgroundLabel : mediaSections.find((section) => section.key === view)?.label ?? '';
  const bgUrl = background.url;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      onBack={view === 'main' ? undefined : () => setView('main')}
      title={view === 'main' ? (lang?.chat_info || 'Информация') : sectionTitle}
      width="md"
    >
      {view === 'main' ? (
        <div className="flex flex-col gap-3">
          {/* Собеседник */}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <AppImage
              width={112}
              height={112}
              fallbackSrc={FALLBACK_AVATAR}
              src={normalizeAssetUrl(avatar, FALLBACK_AVATAR)}
              alt={name}
              className="h-28 w-28 rounded-full object-cover shadow"
            />
            <AccountName
              as="span"
              user={{ badges, name, verify }}
              nameClassName="text-2xl font-bold text-white"
              className="flex max-w-full justify-center truncate"
            />
            <span className="text-sm text-zinc-400">{statusLabel}</span>
            {username ? <span className="text-sm text-purple-300">@{username}</span> : null}
            {about ? <p className="max-w-md text-sm text-zinc-300">{about}</p> : null}
          </div>

          {/* Быстрые действия */}
          <div className={cn('grid gap-3', onOpenProfile ? 'grid-cols-4' : 'grid-cols-3')}>
            {onOpenProfile ? (
              <ActionTile label={lang?.userpage || 'Страница'} onClick={() => { close(); onOpenProfile(); }}>
                <Icon name="IC-user" className="h-6 w-6 fill-current" />
              </ActionTile>
            ) : null}
            <ActionTile active={callActive} label={lang?.chat_info_call || 'Звонок'} onClick={() => { close(); onStartCall(); }}>
              <Icon name="IC-call" className="h-6 w-6 fill-current" />
            </ActionTile>
            <ActionTile active={muted} label={muted ? (lang?.dialog_unmute || 'Включить звук') : (lang?.dialog_mute || 'Без звука')} onClick={onToggleMute}>
              {muted ? <Icon name="IC-notification" className="h-6 w-6 fill-current" /> : <MutedBell className="h-6 w-6" />}
            </ActionTile>
            <ActionTile active={pinned} label={pinned ? (lang?.dialog_unpin || 'Открепить') : (lang?.dialog_pin || 'Закрепить')} onClick={onTogglePin}>
              <PinIcon off={pinned} className="h-6 w-6" />
            </ActionTile>
          </div>

          {/* Разделы: каждый — на своём экране с кнопкой «назад» */}
          <InfoSectionList
            onOpen={(key) => setView(key as InfoView)}
            sections={[...mediaSections, { bg: 'bg-purple-500/15', fill: 'fill-purple-400', icon: 'IC-image', key: 'background', label: backgroundLabel }]}
          />

          {/* Удаление диалога (раньше было в меню аватарки) */}
          <button
            type="button"
            onClick={() => { close(); onDelete(); }}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-zinc-600/30 bg-red-500/15 px-4 py-2.5 text-red-300 duration-300 hover:bg-red-500/25 active:scale-95"
          >
            <Icon name="IC-trash" className="h-5 w-5 fill-current" />
            {lang?.dialogdelete || 'Удалить диалог'}
          </button>
        </div>
      ) : view === 'background' ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm text-zinc-300">{lang?.change_bg || 'Изменить фон'}</h2>
          <div className="drag-scroll viewport -my-3 flex gap-3 overflow-auto px-1 py-3">
            <button
              type="button"
              onClick={background.onClear}
              className={cn(
                'flex h-32 w-20 shrink-0 cursor-pointer flex-col items-center rounded-2xl bg-zinc-800 p-3 shadow duration-300 active:scale-95',
                !bgUrl && 'ring-2 ring-purple-500',
              )}
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-700 px-1.5 text-sm text-zinc-200">Hello</div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700 px-1.5 text-sm text-white">Hi!</div>
            </button>
            <button
              type="button"
              onClick={background.onPick}
              className={cn(
                'flex h-32 w-20 shrink-0 cursor-pointer flex-col items-center rounded-2xl bg-gradient-to-br from-purple-700 to-blue-700 bg-cover bg-center p-3 shadow duration-300 active:scale-95',
                bgUrl && 'ring-2 ring-purple-500',
              )}
              style={bgUrl ? { backgroundImage: `url(${apiUrl(bgUrl)})` } : undefined}
            >
              <div className="mb-1.5 w-full rounded-2xl rounded-bl-none bg-zinc-800/80 px-1.5 text-sm text-zinc-200">Hello</div>
              <div className="w-full rounded-2xl rounded-br-none bg-purple-700/80 px-1.5 text-sm text-white">Hi!</div>
              <div className="flex h-full flex-grow items-end">
                {background.uploading ? (
                  <Icon name="IC-loader" className="h-12 w-12 animate-spin fill-purple-100" />
                ) : (
                  <Icon name="IC-image" className="h-12 w-12 fill-purple-100" />
                )}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <DialogMediaPane isOpen={isOpen} kind={view} media={media} />
      )}
    </Modal>
  );
}
