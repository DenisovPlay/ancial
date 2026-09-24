'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Modal from '../../../components/modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { useCopyToClipboard } from '../../../hooks/use-copy-to-clipboard';
import { AncialAPI, getApiMessage } from '../../../lib/api-v2';
import type { DialogMeta, GroupMember } from '../../../messages/lib/messages-shared';
import { canManageCommunityMember } from '../../../group/[link]/lib/community-types';
import { useAppearanceMotion } from '../../../lib/use-appearance';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import GroupCallTile from '../components/group-call-tile';
import {
  getGroupCallGridClass,
  resolveFocusedParticipantId,
  type GroupCallParticipant,
} from '../lib/group-call-state';
import { useGroupCall } from './use-group-call';
import Icon from '../../../components/svg-icon';

type CommunityVoicePermissions = {
  connect_voice?: boolean;
  manage_voice?: boolean;
  speak_voice?: boolean;
};

type GroupCallDialogResponse = {
  community_permissions?: CommunityVoicePermissions | null;
  currentUserId?: number | string;
  dialog?: DialogMeta | null;
};

type GroupCallConfig = {
  canManageVoice: boolean;
  canPublish: boolean;
  communityId: number;
  currentUserId: number;
  dialog: DialogMeta;
  members: GroupMember[];
  guestCode?: string;
  guestName?: string;
};

type ProfileResponse = Partial<GroupMember> & { id?: number | string };

type CameraDevice = {
  deviceId: string;
  label: string;
};

function safeReturnPath(value: string | null, hash: string) {
  if (value?.startsWith('/') && !value.startsWith('//')) return value;
  return `/messages/${encodeURIComponent(hash)}`;
}

function CallControlButton({
  active = false,
  className = '',
  danger = false,
  disabled = false,
  off = false,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  off?: boolean;
  onClick: () => void;
}) {
  // Отзывчивые эффекты — настройка «Интерфейс → Анимации → Отзывчивое меню».
  const responsive = useAppearanceMotion().nav;

  const itemRef = useRef<HTMLDivElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  // Press animation (replaces whileTap — whileTap gets stuck on iOS Safari)
  const pressScaleX = useMotionValue(1);
  const pressScaleY = useMotionValue(1);

  const springX = useSpring(rawX, { stiffness: 420, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 420, damping: 22 });
  const springPressScaleX = useSpring(pressScaleX, { stiffness: 500, damping: 30 });
  const springPressScaleY = useSpring(pressScaleY, { stiffness: 500, damping: 30 });

  const itemSheen = useMotionTemplate`radial-gradient(45px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.20), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!responsive || disabled) return;
    const el = itemRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const dx = relX - centerX;
    const dy = relY - centerY;

    mouseX.set(relX);
    mouseY.set(relY);

    rawX.set(Math.max(-2.5, Math.min(2.5, dx * 0.08)));
    rawY.set(Math.max(-2.5, Math.min(2.5, dy * 0.08)));

    const distNorm = Math.min(1, Math.hypot(dx, dy) / Math.max(centerX, centerY));
    rawScaleX.set(1 + distNorm * 0.015);
    rawScaleY.set(1 - distNorm * 0.012);
  };

  const handleMouseLeave = () => {
    if (!responsive) return;
    rawX.set(0);
    rawY.set(0);
    rawScaleX.set(1);
    rawScaleY.set(1);
    mouseX.set(-100);
    mouseY.set(-100);
  };

  const handlePressStart = () => {
    if (!responsive || disabled) return;
    pressScaleX.set(1.05);
    pressScaleY.set(0.90);
  };

  const handlePressEnd = () => {
    if (!responsive) return;
    pressScaleX.set(1);
    pressScaleY.set(1);
  };

  const baseClassName = `relative overflow-hidden ${className || 'flex'} h-14 w-14 cursor-pointer items-center justify-center rounded-full border transition-[color,background-color,border-color,transform,opacity] duration-300 ${disabled ? 'cursor-not-allowed text-zinc-500 opacity-40' : ''} ${danger ? 'border-red-500/30 bg-red-600/90 text-white hover:bg-red-500 shadow' : active ? 'border-purple-500/30 bg-purple-600/90 text-white hover:bg-purple-500 shadow' : off ? 'border-transparent text-red-500 hover:border-red-600/30 hover:bg-red-950/50' : 'border-transparent text-zinc-200 hover:border-zinc-600/30 hover:bg-zinc-700/95'} ${!responsive ? 'active:scale-95' : ''}`;

  return (
    <motion.div
      ref={itemRef}
      onMouseMove={responsive ? handleMouseMove : undefined}
      onMouseLeave={responsive ? handleMouseLeave : undefined}
      onTouchEnd={responsive ? handleMouseLeave : undefined}
      onTouchCancel={responsive ? handleMouseLeave : undefined}
      onPointerDown={responsive ? handlePressStart : undefined}
      onPointerUp={responsive ? handlePressEnd : undefined}
      onPointerCancel={responsive ? handlePressEnd : undefined}
      onPointerLeave={responsive ? handlePressEnd : undefined}
      style={
        responsive
          ? {
            x: springX,
            y: springY,
            scaleX: springPressScaleX,
            scaleY: springPressScaleY,
          }
          : undefined
      }
    >
      <button
        type="button"
        aria-label={label}
        title={label}
        disabled={disabled}
        onClick={onClick}
        className={baseClassName}
      >
        {responsive && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
            style={{ background: itemSheen }}
          />
        )}
        <div className="relative z-10 flex items-center justify-center">
          {children}
        </div>
      </button>
    </motion.div>
  );
}

function GroupCallRoom({ config, hash, returnPath }: { config: GroupCallConfig; hash: string; returnPath: string }) {
  const router = useRouter();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const copyToClipboard = useCopyToClipboard();
  const [permissionsOpen, setPermissionsOpen] = useState(true);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [focusedParticipantId, setFocusedParticipantId] = useState<number | null>(null);
  const [members, setMembers] = useState(config.members);
  const title = config.dialog.title || lang?.voice_room_title || 'Групповой звонок';
  const exitCall = useCallback(() => {
    if (config.guestCode) {
      router.push(`/call/invite/${encodeURIComponent(config.guestCode)}`);
    } else {
      router.push(returnPath);
    }
  }, [config.guestCode, returnPath, router]);

  // Отзывчивые эффекты — настройка «Интерфейс → Анимации → Отзывчивое меню».
  const responsive = useAppearanceMotion().nav;

  const pillRef = useRef<HTMLDivElement>(null);
  const pillMouseX = useMotionValue(-200);
  const pillMouseY = useMotionValue(-200);
  const pillSheen = useMotionTemplate`radial-gradient(130px circle at ${pillMouseX}px ${pillMouseY}px, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.01) 50%, transparent 80%)`;

  const handlePillMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!responsive || !pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    pillMouseX.set(e.clientX - rect.left);
    pillMouseY.set(e.clientY - rect.top);
  };

  const handlePillMouseLeave = () => {
    if (!responsive) return;
    pillMouseX.set(-200);
    pillMouseY.set(-200);
  };

  const call = useGroupCall({
    activityUrl: `/call/group/${encodeURIComponent(hash)}`,
    canPublish: config.canPublish,
    currentUserId: config.currentUserId,
    dialogId: Number(config.dialog.id),
    onDisconnected: exitCall,
    title,
    guestCode: config.guestCode,
    guestName: config.guestName,
  });

  const handleCamButtonClick = async () => {
    if (!call.camEnabled) {
      await call.toggleCamera();
      return;
    }
    if (cameraMenuOpen) {
      setCameraMenuOpen(false);
      return;
    }
    let camerasList: CameraDevice[] = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      camerasList = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: (d.label || `${lang?.select_camera || 'Камера'} ${i + 1}`)
            .replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '').trim(),
        }));
    } catch (e) {
      console.error('enumerateDevices failed', e);
    }

    if (camerasList.length <= 1) {
      await call.toggleCamera();
      return;
    }

    setAvailableCameras(camerasList);
    setCameraMenuOpen(true);
  };

  const switchCamera = async (deviceId: string) => {
    setCameraMenuOpen(false);
    await call.switchCamera(deviceId);
  };

  const disableCamFromDropdown = async () => {
    setCameraMenuOpen(false);
    await call.disableCamera();
  };

  const memberById = useMemo(() => new Map(members.map((member) => [Number(member.id), member])), [members]);
  const effectiveUserId = call.currentUserId || config.currentUserId;
  const visibleParticipants = useMemo<GroupCallParticipant[]>(() => {
    if (call.participants.length > 0) {
      return call.participants.map((participant) => (
        participant.user_id === effectiveUserId
          ? {
            ...participant,
            mic_enabled: call.micEnabled,
            cam_enabled: call.camEnabled,
            screen_enabled: call.screenEnabled,
            name: participant.name || config.guestName,
          }
          : participant
      ));
    }
    if (!call.joined) return [];
    return [{
      user_id: effectiveUserId,
      name: config.guestName || undefined,
      mic_enabled: call.micEnabled,
      cam_enabled: call.camEnabled,
      screen_enabled: call.screenEnabled,
    }];
  }, [call.camEnabled, call.joined, call.micEnabled, call.participants, call.screenEnabled, config.guestName, effectiveUserId]);
  const activeFocusedParticipantId = resolveFocusedParticipantId(focusedParticipantId, visibleParticipants);
  const currentMember = memberById.get(effectiveUserId);
  const actorIsOwner = currentMember?.community_role?.is_owner === true;
  const actorPosition = currentMember?.community_role?.position ?? (actorIsOwner ? -2147483648 : null);

  const disconnectParticipant = async (userId: number) => {
    try {
      await AncialAPI.moderateCommunity({
        action: 'disconnect_voice',
        community_id: config.communityId,
        dialog_id: Number(config.dialog.id),
        user_id: userId,
      });
    } catch (error) {
      console.error('Community voice moderation failed', error);
      showNote({ content: lang?.community_permission_error || 'Недостаточно прав', type: 'error', time: 4 });
    }
  };

  useEffect(() => {
    const known = new Set(members.map((member) => Number(member.id)));
    const missingIds = call.participants
      .map((participant) => participant.user_id)
      .filter((userId) => userId > 0 && !known.has(userId));
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

  const handleCopyInvite = async () => {
    try {
      let code = config.guestCode;
      if (!code) {
        const res = await AncialAPI.createVoiceInvite(Number(config.dialog.id));
        code = res.code;
      }
      const url = `${window.location.origin}/call/invite/${encodeURIComponent(code)}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        showNote({
          content: lang?.voice_invite_copied || 'Ссылка на звонок скопирована',
          type: 'success',
          time: 5,
        });
      } else {
        showNote({
          content: lang?.voice_invite_failed || 'Не удалось создать ссылку-инвайт',
          type: 'error',
          time: 5,
        });
      }
    } catch (err) {
      showNote({
        content: getApiMessage(err instanceof Error ? err.message : null, lang, lang?.voice_invite_failed || 'Не удалось создать ссылку-инвайт'),
        type: 'error',
        time: 5,
      });
    }
  };

  return (
    <div className="group-call-route fixed inset-0 z-[3000] min-h-dvh bg-black text-white">
      <style>{`
        #NAVP, #NAVPmini, #NAVPfull, [data-app-nav="mobile"], [data-app-nav="desktop"], div:has(> .pulse-player-mini-shell) { display: none !important; }
        #main-content { padding: 0 !important; }
      `}</style>

      <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black via-black/90 to-transparent px-3 pb-8 pt-[max(env(safe-area-inset-top,0px),0.75rem)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={lang?.back || 'Назад'}
              onClick={handleLeave}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-transform duration-300 active:scale-95"
            >
              <Icon name="IC-chevron-left" className="h-8 w-8 fill-white" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-base font-medium text-zinc-100">{title}</p>
              <p className="text-sm text-zinc-400">
                {visibleParticipants.length}/8 {lang?.voice_room_participants || 'участников'}
              </p>
            </div>
          </div>
          {call.screenEnabled ? (
            <span className="glass-panel [--glass-tint:var(--color-purple-600)] [--glass-alpha:0.8] rounded-full border border-purple-400/30 px-3 py-1.5 text-xs font-medium">
              {lang?.screen_sharing || 'Демонстрация экрана'}
            </span>
          ) : null}
        </div>
      </header>

      <main className="absolute inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom,0px))] top-[calc(4rem+env(safe-area-inset-top,0px))] overflow-y-auto p-3 pt-6">
        {visibleParticipants.length > 0 ? (
          <div className={`mx-auto grid h-full min-h-[20rem] max-w-screen-2xl auto-rows-fr gap-3 ${getGroupCallGridClass(activeFocusedParticipantId === null ? visibleParticipants.length : 1)}`}>
            {visibleParticipants.map((participant) => (
              <div
                key={participant.user_id}
                hidden={activeFocusedParticipantId !== null && participant.user_id !== activeFocusedParticipantId}
                className={activeFocusedParticipantId !== null && participant.user_id !== activeFocusedParticipantId ? 'hidden' : 'contents'}
              >
                <GroupCallTile
                  participant={participant}
                  member={memberById.get(participant.user_id)}
                  stream={participant.user_id === effectiveUserId ? call.localStream : call.remoteStreams[participant.user_id]}
                  isLocal={participant.user_id === effectiveUserId}
                  deafened={call.deafened}
                  focused={participant.user_id === activeFocusedParticipantId}
                  onFocusChange={(focused) => setFocusedParticipantId(focused ? participant.user_id : null)}
                  onDisconnect={config.canManageVoice
                    && participant.user_id !== effectiveUserId
                    && canManageCommunityMember({
                      actorIsOwner,
                      actorPosition,
                      targetIsOwner: memberById.get(participant.user_id)?.community_role?.is_owner === true,
                      targetPosition: memberById.get(participant.user_id)?.community_role?.position ?? 10000,
                    })
                    ? () => void disconnectParticipant(participant.user_id)
                    : undefined}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-zinc-400">
            {lang?.voice_room_empty || 'Сейчас в комнате никого нет'}
          </div>
        )}
      </main>

      <div className="absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom,0px),0.75rem)]">
        <motion.div
          ref={pillRef}
          data-app-nav="call-pill"
          onMouseMove={responsive ? handlePillMouseMove : undefined}
          onMouseLeave={responsive ? handlePillMouseLeave : undefined}
          onTouchEnd={responsive ? handlePillMouseLeave : undefined}
          onTouchCancel={responsive ? handlePillMouseLeave : undefined}
          className={`flex items-center gap-1 p-1 rounded-full h-fit relative shadow-2xl overflow-visible border border-zinc-600/30`}
        >
          {/* Стекло — слоем под содержимым: у пилюли overflow-visible и движущиеся дети. */}
          <div className="glass-nav rounded-full absolute w-full h-full top-0 left-0 z-[-1]"></div>
          {responsive && (
            <motion.div
              className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-80"
              style={{ background: pillSheen }}
            />
          )}
          <CallControlButton
            label={config.canPublish ? (call.micEnabled ? (lang?.voice_mic_on || 'Микрофон включён — выключить') : (lang?.voice_mic_off || 'Микрофон выключен — включить')) : (lang?.voice_listen_only || 'Только слушать')}
            off={!call.micEnabled}
            disabled={!config.canPublish}
            onClick={call.toggleMic}
          >
            <Icon name={!call.micEnabled ? 'IC-call-mic-off' : 'IC-call-mic'} className="h-8 w-8 fill-current" />
          </CallControlButton>

          <Dropdown
            customTrigger={
              <CallControlButton
                onClick={handleCamButtonClick}
                label={call.camEnabled && !call.screenEnabled ? (lang?.voice_camera_on || 'Камера включена — выключить или выбрать') : (lang?.voice_camera_off || 'Камера выключена — включить')}
                off={!call.camEnabled || call.screenEnabled}
                active={Boolean(call.camEnabled && !call.screenEnabled && cameraMenuOpen)}
                disabled={!config.canPublish || call.screenEnabled}
                className="relative z-10"
              >
                <Icon name={(!call.camEnabled || call.screenEnabled) ? 'IC-call-camera-off' : 'IC-call-camera'} className="h-8 w-8 fill-current" />
              </CallControlButton>
            }
            renderTrigger={false}
            open={cameraMenuOpen}
            onOpenChange={setCameraMenuOpen}
            position="top"
            align="center"
            width="auto"
            closeOnChildClick={true}
            wrapperClassName="relative w-14 h-14"
          >
            {availableCameras.map((cam) => (
              <DropdownItem
                key={cam.deviceId}
                onClick={() => void switchCamera(cam.deviceId)}
                iconNode={
                  call.selectedCameraId === cam.deviceId ? (
                    <Icon name="IC-check-bold" className="inline w-6 h-6 fill-purple-400" />
                  ) : (
                    <Icon name="IC-camera" className="inline w-6 h-6 fill-zinc-400" />
                  )
                }
                className={call.selectedCameraId === cam.deviceId ? 'text-purple-300' : ''}
              >
                {cam.label}
              </DropdownItem>
            ))}

            <DropdownItem
              onClick={() => void disableCamFromDropdown()}
              iconNode={
                <Icon name="IC-camera-off" className="inline w-6 h-6 fill-red-400" />
              }
              className="text-red-400"
            >
              {lang?.camera_off || 'Выключить камеру'}
            </DropdownItem>
          </Dropdown>

          <CallControlButton
            className="hidden md:flex"
            label={call.screenEnabled ? (lang?.voice_screen_on || 'Демонстрация включена — остановить') : (lang?.voice_screen_off || 'Демонстрация выключена — включить')}
            active={call.screenEnabled}
            disabled={!config.canPublish}
            onClick={() => void call.toggleScreenShare()}
          >
            <Icon name={call.screenEnabled ? 'IC-call-screen-stop' : 'IC-call-screen-share'} className="h-7 w-7 fill-current" />
          </CallControlButton>

          <CallControlButton
            label={call.deafened ? (lang?.voice_sound_off || 'Звук выключен — включить') : (lang?.voice_sound_on || 'Звук включён — выключить')}
            off={call.deafened}
            onClick={call.toggleDeafen}
          >
            <Icon name={call.deafened ? 'IC-call-speaker-off' : 'IC-call-speaker'} className="h-7 w-7 fill-current" />
          </CallControlButton>

          <CallControlButton
            className="hidden md:flex"
            label={lang?.voice_invite_copy || 'Ссылка-инвайт — скопировать'}
            disabled={!config.canPublish}
            onClick={() => void handleCopyInvite()}
          >
            <Icon name="IC-link" className="h-7 w-7 fill-current" aria-hidden="true" />
          </CallControlButton>

          <CallControlButton danger label={lang?.voice_room_leave || 'Выйти'} onClick={handleLeave}>
            <Icon name="IC-exit" className="h-7 w-7 fill-current" aria-hidden="true" />
          </CallControlButton>
        </motion.div>
      </div>

      <Modal
        isOpen={permissionsOpen}
        onClose={handleLeave}
        title={lang?.media_access || 'Доступ к медиа'}
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-zinc-300">
            {config.canPublish
              ? (lang?.media_access_desc || 'Нажмите кнопку ниже и подтвердите доступ к камере и микрофону.')
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
  const guestCode = searchParams.get('guestCode') || searchParams.get('invite') || '';
  const guestName = searchParams.get('guestName') || searchParams.get('name') || '';
  const [config, setConfig] = useState<GroupCallConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (guestCode) {
      const trimmedGuestName = guestName.trim().replace(/[\x00-\x1F\x7F]/g, '');
      if (!trimmedGuestName) {
        router.replace(`/call/invite/${encodeURIComponent(guestCode)}`);
        return;
      }

      let cancelled = false;
      AncialAPI.getVoiceInviteInfo(guestCode)
        .then((info) => {
          if (cancelled) return;
          setConfig({
            canManageVoice: false,
            dialog: {
              id: Number(info.dialog_id),
              hash: info.hash || hash,
              title: info.title || 'Zypo',
              avatar: info.avatar || '',
              type: 'group',
              voice_enabled: 1,
            } as DialogMeta,
            communityId: 0,
            members: [],
            currentUserId: -1,
            canPublish: true,
            guestCode,
            guestName: trimmedGuestName,
          });
        })
        .catch((requestError) => {
          console.error('Guest call invite loading failed', requestError);
          if (!cancelled) setError(lang?.voice_invite_invalid || 'Приглашение недействительно или устарело');
        });
      return () => {
        cancelled = true;
      };
    }

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
          canManageVoice: response.community_permissions?.manage_voice === true,
          dialog,
          communityId: Number(dialog.community_id || 0),
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
  }, [authLoading, guestCode, guestName, hash, isAuthenticated, lang?.community_channel_forbidden, lang?.voice_invite_invalid, lang?.voice_room_error, router, user?.id]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[3000] flex min-h-dvh flex-col items-center justify-center gap-3 bg-black p-3 text-center text-white">
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
      <div className="fixed inset-0 z-[3000] flex min-h-dvh items-center justify-center bg-black">
        <Icon name="IC-loader" className="h-12 w-12 animate-spin fill-purple-500" aria-label={lang?.loading || 'Загрузка'} />
      </div>
    );
  }

  return <GroupCallRoom config={config} hash={hash} returnPath={returnPath} />;
}
