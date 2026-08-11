'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Modal from '../../../components/modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { useAuth } from '../../../context/AuthContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { DialogMeta, GroupMember } from '../../../messages/lib/messages-shared';
import GroupCallTile from '../components/group-call-tile';
import { getGroupCallGridClass, type GroupCallParticipant } from '../lib/group-call-state';
import { useGroupCall } from './use-group-call';

type CommunityVoicePermissions = {
  connect_voice?: boolean;
  speak_voice?: boolean;
};

type GroupCallDialogResponse = {
  community_permissions?: CommunityVoicePermissions | null;
  currentUserId?: number | string;
  dialog?: DialogMeta | null;
};

type GroupCallConfig = {
  canPublish: boolean;
  currentUserId: number;
  dialog: DialogMeta;
  members: GroupMember[];
};

type ProfileResponse = Partial<GroupMember> & { id?: number | string };

function safeReturnPath(value: string | null, hash: string) {
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  return `/messages/${encodeURIComponent(hash)}`;
}

function CallControlButton({
  active = false,
  danger = false,
  disabled = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition-[color,background-color,transform,opacity] duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${danger ? 'bg-red-600 text-white hover:bg-red-500' : active ? 'bg-purple-600 text-white hover:bg-purple-500' : 'text-zinc-200 hover:bg-zinc-700/95'}`}
    >
      {children}
    </button>
  );
}

function MicIcon({ off }: { off: boolean }) {
  return (
    <svg className="h-8 w-8 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 2c-4.95 0-9 4.05-9 9v15c0 4.95 4.05 9 9 9s9-4.05 9-9V11c0-4.95-4.05-9-9-9M10.48 20.98A1.5 1.5 0 0 0 9 22.5V26c0 7.76 5.93 14.17 13.5 14.92v4.58a1.5 1.5 0 1 0 3 0v-4.58C33.07 40.17 39 33.76 39 26v-3.5a1.5 1.5 0 1 0-3 0V26c0 6.59-5.26 11.89-11.82 11.99h-.37C17.26 37.89 12 32.58 12 26v-3.5a1.5 1.5 0 0 0-1.52-1.52" />
      {off ? <path d="m7.5 4.5 36 36-3 3-36-36z" /> : null}
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return (
    <svg className="h-8 w-8 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M10.5 9A6.5 6.5 0 0 0 4 15.5v17a6.5 6.5 0 0 0 6.5 6.5h17a6.5 6.5 0 0 0 6.5-6.5v-1.35l7.73 4.64A1.5 1.5 0 0 0 44 34.5v-21a1.5 1.5 0 0 0-2.27-1.29L34 16.85V15.5A6.5 6.5 0 0 0 27.5 9z" />
      {off ? <path d="m7.5 4.5 36 36-3 3-36-36z" /> : null}
    </svg>
  );
}

function ScreenIcon() {
  return (
    <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 8a4 4 0 0 0-4 4v21a4 4 0 0 0 4 4h13v4h-6a1.5 1.5 0 1 0 0 3h20a1.5 1.5 0 1 0 0-3h-6v-4h13a4 4 0 0 0 4-4V12a4 4 0 0 0-4-4zm0 3h34a1 1 0 0 1 1 1v21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1m17 5-6 6h4v9h4v-9h4z" />
    </svg>
  );
}

function GroupCallRoom({ config, hash, returnPath }: { config: GroupCallConfig; hash: string; returnPath: string }) {
  const router = useRouter();
  const { lang } = useAuth();
  const [permissionsOpen, setPermissionsOpen] = useState(true);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [members, setMembers] = useState(config.members);
  const title = config.dialog.title || lang?.voice_room_title || 'Групповой звонок';
  const exitCall = () => router.push(returnPath);
  const call = useGroupCall({
    activityUrl: `/call/group/${encodeURIComponent(hash)}`,
    canPublish: config.canPublish,
    currentUserId: config.currentUserId,
    dialogId: Number(config.dialog.id),
    onDisconnected: exitCall,
    title,
  });

  const memberById = useMemo(() => new Map(members.map((member) => [Number(member.id), member])), [members]);
  const visibleParticipants = useMemo<GroupCallParticipant[]>(() => {
    if (call.participants.length > 0) return call.participants;
    if (!call.joined) return [];
    return [{
      user_id: config.currentUserId,
      mic_enabled: call.micEnabled,
      cam_enabled: call.camEnabled,
      screen_enabled: call.screenEnabled,
    }];
  }, [call.camEnabled, call.joined, call.micEnabled, call.participants, call.screenEnabled, config.currentUserId]);

  useEffect(() => {
    const known = new Set(members.map((member) => Number(member.id)));
    const missingIds = call.participants
      .map((participant) => participant.user_id)
      .filter((userId) => !known.has(userId));
    if (missingIds.length === 0) return;

    let cancelled = false;
    void Promise.all(missingIds.map((userId) => AncialAPI.getProfile<ProfileResponse>(userId).catch(() => null)))
      .then((profiles) => {
        if (cancelled) return;
        const additions = profiles.flatMap((profile) => profile?.id ? [{
          id: Number(profile.id),
          username: profile.username || '',
          fname: profile.fname || '',
          lname: profile.lname || '',
          img: profile.img || '',
          verify: Number(profile.verify || 0),
          role: profile.role || 'member',
        } satisfies GroupMember] : []);
        if (additions.length > 0) {
          setMembers((current) => {
            const byId = new Map(current.map((member) => [Number(member.id), member]));
            additions.forEach((member) => byId.set(Number(member.id), member));
            return Array.from(byId.values());
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [call.participants, members]);

  const handleJoin = async () => {
    const connected = await call.join();
    if (connected) setPermissionsOpen(false);
  };

  const handleLeave = () => {
    call.leave();
    exitCall();
  };

  return (
    <div className="group-call-route fixed inset-0 z-[3000] bg-black text-white">
      <style>{`
        #NAVP, #NAVPmini, #NAVPfull, [data-app-nav="mobile"], [data-app-nav="desktop"], div:has(> .pulse-player-mini-shell) { display: none !important; }
        #main-content { padding: 0 !important; }
      `}</style>

      <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black via-black/90 to-transparent p-3 pb-8">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={lang?.back || 'Назад'}
              onClick={handleLeave}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 active:scale-95"
            >
              <svg className="h-8 w-8 fill-white" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M29.45 4.99a1.5 1.5 0 0 0-1.03.47l-17 17.5a1.5 1.5 0 0 0 0 2.09l17 17.5a1.5 1.5 0 1 0 2.16-2.09L14.59 24 30.58 7.54a1.5 1.5 0 0 0-1.13-2.55" />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-zinc-100">{title}</p>
              <p className="text-sm text-zinc-400">
                {visibleParticipants.length}/8 {lang?.voice_room_participants || 'участников'}
              </p>
            </div>
          </div>
          {call.screenEnabled ? (
            <span className="rounded-full border border-purple-400/30 bg-purple-600/80 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
              {lang?.screen_sharing || 'Демонстрация экрана'}
            </span>
          ) : null}
        </div>
      </header>

      <main className="absolute inset-x-0 bottom-24 top-16 overflow-y-auto p-3 pt-6">
        {visibleParticipants.length > 0 ? (
          <div className={`mx-auto grid h-full min-h-[20rem] max-w-screen-2xl auto-rows-fr gap-3 ${getGroupCallGridClass(visibleParticipants.length)}`}>
            {visibleParticipants.map((participant) => (
              <GroupCallTile
                key={participant.user_id}
                participant={participant}
                member={memberById.get(participant.user_id)}
                stream={participant.user_id === config.currentUserId ? call.localStream : call.remoteStreams[participant.user_id]}
                isLocal={participant.user_id === config.currentUserId}
                deafened={call.deafened}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            {lang?.voice_room_empty || 'Сейчас в комнате никого нет'}
          </div>
        )}
      </main>

      <div className="absolute inset-x-0 bottom-3 z-40 flex justify-center px-3">
        <div className="flex items-center gap-1 rounded-full border border-zinc-600/30 bg-zinc-900/20 p-1 shadow backdrop-blur-md backdrop-saturate-200">
          <CallControlButton
            label={config.canPublish ? (call.micEnabled ? (lang?.voice_mute || 'Микрофон') : (lang?.voice_unmute || 'Включить')) : (lang?.voice_listen_only || 'Только слушать')}
            active={!call.micEnabled}
            disabled={!config.canPublish}
            onClick={call.toggleMic}
          >
            <MicIcon off={!call.micEnabled} />
          </CallControlButton>

          <div className="relative h-14 w-14">
            <Dropdown
              renderTrigger={false}
              open={cameraMenuOpen}
              onOpenChange={setCameraMenuOpen}
              position="top"
              align="center"
              width="auto"
              closeOnChildClick
              wrapperClassName="absolute inset-0"
            >
              {call.cameras.map((camera) => (
                <DropdownItem
                  key={camera.deviceId}
                  onClick={() => void call.switchCamera(camera.deviceId)}
                  className={call.selectedCameraId === camera.deviceId ? 'text-purple-300' : ''}
                >
                  {camera.label}
                </DropdownItem>
              ))}
              {call.camEnabled ? (
                <DropdownItem className="text-red-400" onClick={() => void call.toggleCamera()}>
                  {lang?.camera_off || 'Выключить камеру'}
                </DropdownItem>
              ) : null}
            </Dropdown>
            <CallControlButton
              label={call.camEnabled ? (lang?.camera || 'Камера') : (lang?.camera_off || 'Камера выключена')}
              active={call.camEnabled}
              disabled={!config.canPublish || call.screenEnabled}
              onClick={() => {
                if (call.camEnabled) setCameraMenuOpen(true);
                else void call.toggleCamera();
              }}
            >
              <CameraIcon off={!call.camEnabled} />
            </CallControlButton>
          </div>

          <CallControlButton
            label={call.screenEnabled ? (lang?.stop_screen_share || 'Остановить демонстрацию') : (lang?.screen_share || 'Демонстрация экрана')}
            active={call.screenEnabled}
            disabled={!config.canPublish}
            onClick={() => void call.toggleScreenShare()}
          >
            <ScreenIcon />
          </CallControlButton>

          <CallControlButton
            label={call.deafened ? (lang?.voice_undeafen || 'Вернуть звук') : (lang?.voice_deafen || 'Заглушить')}
            active={call.deafened}
            onClick={call.toggleDeafen}
          >
            <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
              <use href="/icons.svg#IC-speaker" />
            </svg>
          </CallControlButton>

          <CallControlButton danger label={lang?.voice_room_leave || 'Выйти'} onClick={handleLeave}>
            <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
              <use href="/icons.svg#IC-exit" />
            </svg>
          </CallControlButton>
        </div>
      </div>

      <Modal
        isOpen={permissionsOpen}
        onClose={handleLeave}
        title={lang?.media_access || 'Доступ к медиа'}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-300">
            {config.canPublish
              ? (lang?.media_access_desc || 'Подтвердите доступ к микрофону. Камера останется выключенной.')
              : (lang?.voice_listen_only || 'Только слушать')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={call.joining}
              onClick={() => void handleJoin()}
              className="w-full cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-600 px-3 py-2 text-white transition-[background-color,transform,opacity] duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              {call.joining ? (lang?.voice_room_connecting || 'Подключаемся…') : (lang?.allow || 'Разрешить')}
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="w-full cursor-pointer rounded-3xl border border-zinc-600/30 bg-zinc-700 px-3 py-2 text-white transition-[background-color,transform] duration-300 hover:bg-zinc-600 active:scale-95"
            >
              {lang?.decline || 'Отклонить'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function GroupCallClient() {
  const params = useParams<{ hash?: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const hash = params?.hash || '';
  const returnPath = safeReturnPath(searchParams.get('return'), hash);
  const [config, setConfig] = useState<GroupCallConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace(`/login?return=${encodeURIComponent(`/call/group/${hash}`)}`);
      return;
    }

    let cancelled = false;
    void AncialAPI.getDialogByHash<GroupCallDialogResponse>(hash)
      .then((response) => {
        if (cancelled) return;
        const dialog = response?.dialog;
        if (!dialog || dialog.type !== 'group' || ['0', 'false', 'off', 'no'].includes(String(dialog.voice_enabled ?? 1).toLowerCase())) {
          setError(lang?.voice_room_error || 'Групповой звонок недоступен');
          return;
        }
        if (response.community_permissions?.connect_voice === false) {
          setError(lang?.community_channel_forbidden || 'Нет доступа к голосовому каналу');
          return;
        }
        setConfig({
          dialog,
          members: Array.isArray(dialog.members) ? dialog.members : [],
          currentUserId: Number(response.currentUserId || user?.id || 0),
          canPublish: response.community_permissions ? response.community_permissions.speak_voice === true : true,
        });
      })
      .catch((requestError) => {
        console.error('Group call dialog loading failed', requestError);
        if (!cancelled) setError(lang?.voice_room_error || 'Не удалось открыть групповой звонок');
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, hash, isAuthenticated, lang?.community_channel_forbidden, lang?.voice_room_error, router, user?.id]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[3000] flex flex-col items-center justify-center gap-3 bg-black p-3 text-center text-white">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => router.push(returnPath)}
          className="cursor-pointer rounded-3xl bg-purple-600 px-4 py-2 transition-[background-color,transform] duration-300 hover:bg-purple-500 active:scale-95"
        >
          {lang?.back || 'Назад'}
        </button>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black">
        <svg className="h-12 w-12 animate-spin fill-purple-500" viewBox="0 0 48 48" aria-label={lang?.loading || 'Загрузка'}>
          <path d="M24 4a1.5 1.5 0 1 0 0 3c6.26 0 11.77 3.41 14.7 8.46a1.5 1.5 0 1 0 2.6-1.51A20 20 0 0 0 24 4" />
        </svg>
      </div>
    );
  }

  return <GroupCallRoom config={config} hash={hash} returnPath={returnPath} />;
}
