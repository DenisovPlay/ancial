'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import Modal from '../../../components/modal';
import { Dropdown, DropdownItem } from '../../../components/navigation';
import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import type { DialogMeta, GroupMember } from '../../../messages/lib/messages-shared';
import { canManageCommunityMember } from '../../../group/[link]/lib/community-types';
import { subscribeGlassMode, readGlassMode, getServerGlassMode, isEffectiveFullGlass } from '../../../lib/android-glass';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import GroupCallTile from '../components/group-call-tile';
import {
  getGroupCallGridClass,
  resolveFocusedParticipantId,
  type GroupCallParticipant,
} from '../lib/group-call-state';
import { useGroupCall } from './use-group-call';

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
  const glassMode = useSyncExternalStore(subscribeGlassMode, readGlassMode, getServerGlassMode);
  const isFullGlass = isEffectiveFullGlass(glassMode);

  const itemRef = useRef<HTMLDivElement | null>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawScaleX = useMotionValue(1);
  const rawScaleY = useMotionValue(1);
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);

  const springX = useSpring(rawX, { stiffness: 420, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 420, damping: 22 });
  const springScaleX = useSpring(rawScaleX, { stiffness: 440, damping: 24 });
  const springScaleY = useSpring(rawScaleY, { stiffness: 440, damping: 24 });

  const itemSheen = useMotionTemplate`radial-gradient(45px circle at ${mouseX}px ${mouseY}px, rgba(255, 255, 255, 0.20), transparent 70%)`;

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isFullGlass || disabled) return;
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
    if (!isFullGlass) return;
    rawX.set(0);
    rawY.set(0);
    rawScaleX.set(1);
    rawScaleY.set(1);
    mouseX.set(-100);
    mouseY.set(-100);
  };

  const baseClassName = `relative overflow-hidden ${className || 'flex'} h-14 w-14 cursor-pointer items-center justify-center rounded-full border transition-[color,background-color,border-color,transform,opacity] duration-300 ${disabled ? 'cursor-not-allowed text-zinc-500 opacity-40' : ''} ${danger ? 'border-red-500/30 bg-red-600/90 text-white hover:bg-red-500 shadow' : active ? 'border-purple-500/30 bg-purple-600/90 text-white hover:bg-purple-500 shadow' : off ? 'border-transparent text-red-500 hover:border-red-600/30 hover:bg-red-950/50' : 'border-transparent text-zinc-200 hover:border-zinc-600/30 hover:bg-zinc-700/95'} ${!isFullGlass ? 'active:scale-95' : ''}`;

  return (
    <motion.div
      ref={itemRef}
      onMouseMove={isFullGlass ? handleMouseMove : undefined}
      onMouseLeave={isFullGlass ? handleMouseLeave : undefined}
      onTouchEnd={isFullGlass ? handleMouseLeave : undefined}
      onTouchCancel={isFullGlass ? handleMouseLeave : undefined}
      whileTap={isFullGlass && !disabled ? { scale: 0.90, scaleX: 1.05, scaleY: 0.90 } : undefined}
      style={
        isFullGlass
          ? {
              x: springX,
              y: springY,
              scaleX: springScaleX,
              scaleY: springScaleY,
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
        {isFullGlass && (
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

function ScreenIcon({ active }: { active: boolean }) {
  return (
    <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M7 8a4 4 0 0 0-4 4v21a4 4 0 0 0 4 4h13v4h-6a1.5 1.5 0 1 0 0 3h20a1.5 1.5 0 1 0 0-3h-6v-4h13a4 4 0 0 0 4-4V12a4 4 0 0 0-4-4zm0 3h34a1 1 0 0 1 1 1v21a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V12a1 1 0 0 1 1-1" />
      {active ? (
        <path d="M18 17.5A2.5 2.5 0 0 1 20.5 15h7a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5z" />
      ) : (
        <path d="m24 15-7 7h5v8h4v-8h5z" />
      )}
    </svg>
  );
}

function SpeakerIcon({ off }: { off: boolean }) {
  return (
    <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M27.22 6.1c-.7 0-1.37.25-1.88.7L16.12 15H9.5A4.5 4.5 0 0 0 5 19.5v9A4.5 4.5 0 0 0 9.5 33h6.62l9.22 8.2c1.82 1.61 4.66.32 4.66-2.1V8.9a2.8 2.8 0 0 0-2.78-2.8M27 9.34v29.32l-9.32-8.28A1.5 1.5 0 0 0 16.69 30H9.5A1.5 1.5 0 0 1 8 28.5v-9A1.5 1.5 0 0 1 9.5 18h7.19c.37 0 .72-.14.99-.38zM38.76 11.98a1.5 1.5 0 0 0-1.33 2.21c3.46 6.63 3.46 12.99 0 19.62a1.5 1.5 0 1 0 2.66 1.38c3.84-7.35 3.84-15.03 0-22.38a1.5 1.5 0 0 0-1.33-.83" />
      {off ? <path d="m7.5 4.5 36 36-3 3-36-36z" /> : null}
    </svg>
  );
}

function GroupCallRoom({ config, hash, returnPath }: { config: GroupCallConfig; hash: string; returnPath: string }) {
  const router = useRouter();
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [permissionsOpen, setPermissionsOpen] = useState(true);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [focusedParticipantId, setFocusedParticipantId] = useState<number | null>(null);
  const [members, setMembers] = useState(config.members);
  const title = config.dialog.title || lang?.voice_room_title || 'Групповой звонок';
  const exitCall = useCallback(() => router.push(returnPath), [returnPath, router]);

  const glassMode = useSyncExternalStore(subscribeGlassMode, readGlassMode, getServerGlassMode);
  const isFullGlass = isEffectiveFullGlass(glassMode);
  const isGlassOff = glassMode === 'off';

  const pillRef = useRef<HTMLDivElement>(null);
  const pillMouseX = useMotionValue(-200);
  const pillMouseY = useMotionValue(-200);
  const pillSheen = useMotionTemplate`radial-gradient(130px circle at ${pillMouseX}px ${pillMouseY}px, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.01) 50%, transparent 80%)`;

  const handlePillMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isFullGlass || !pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    pillMouseX.set(e.clientX - rect.left);
    pillMouseY.set(e.clientY - rect.top);
  };

  const handlePillMouseLeave = () => {
    if (!isFullGlass) return;
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
  const activeFocusedParticipantId = resolveFocusedParticipantId(focusedParticipantId, visibleParticipants);
  const currentMember = memberById.get(config.currentUserId);
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
                  stream={participant.user_id === config.currentUserId ? call.localStream : call.remoteStreams[participant.user_id]}
                  isLocal={participant.user_id === config.currentUserId}
                  deafened={call.deafened}
                  focused={participant.user_id === activeFocusedParticipantId}
                  onFocusChange={(focused) => setFocusedParticipantId(focused ? participant.user_id : null)}
                  onDisconnect={config.canManageVoice
                    && participant.user_id !== config.currentUserId
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
          onMouseMove={isFullGlass ? handlePillMouseMove : undefined}
          onMouseLeave={isFullGlass ? handlePillMouseLeave : undefined}
          onTouchEnd={isFullGlass ? handlePillMouseLeave : undefined}
          onTouchCancel={isFullGlass ? handlePillMouseLeave : undefined}
          className={`flex items-center gap-1 p-1 rounded-full h-fit relative shadow-2xl overflow-visible border ${
            isGlassOff ? '!bg-zinc-900 !border-zinc-700/60' : 'bg-zinc-900/50 border-zinc-600/30'
          }`}
        >
          {!isGlassOff && (
            <div className="rounded-full absolute w-full h-full backdrop-blur-md backdrop-saturate-200 top-0 left-0 z-[-1]"></div>
          )}
          {isFullGlass && (
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
            <MicIcon off={!call.micEnabled} />
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
                <CameraIcon off={!call.camEnabled || call.screenEnabled} />
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
                    <svg className="inline w-6 h-6 fill-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 40.980469 8.9902344 A 2.0002 2.0002 0 0 0 39.585938 9.5859375 L 19 30.171875 L 8.4140625 19.585938 A 2.0002 2.0002 0 1 0 5.5859375 22.414062 L 17.585938 34.414062 A 2.0002 2.0002 0 0 0 20.414062 34.414062 L 42.414062 12.414062 A 2.0002 2.0002 0 0 0 40.980469 8.9902344 z"/>
                    </svg>
                  ) : (
                    <svg className="inline w-6 h-6 fill-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                      <path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 10.5 12 L 27.5 12 C 29.450062 12 31 13.549938 31 15.5 L 31 19.453125 L 31 28.482422 L 31 32.5 C 31 34.450062 29.450062 36 27.5 36 L 10.5 36 C 8.5499381 36 7 34.450062 7 32.5 L 7 15.5 C 7 13.549938 8.5499381 12 10.5 12 z M 41 16.150391 L 41 31.849609 L 34 27.650391 L 34 20.349609 L 41 16.150391 z"/>
                    </svg>
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
                <svg className="inline w-6 h-6 fill-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/>
                </svg>
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
            <ScreenIcon active={call.screenEnabled} />
          </CallControlButton>

          <CallControlButton
            label={call.deafened ? (lang?.voice_sound_off || 'Звук выключен — включить') : (lang?.voice_sound_on || 'Звук включён — выключить')}
            off={call.deafened}
            onClick={call.toggleDeafen}
          >
            <SpeakerIcon off={call.deafened} />
          </CallControlButton>

          <CallControlButton danger label={lang?.voice_room_leave || 'Выйти'} onClick={handleLeave}>
            <svg className="h-7 w-7 fill-current" viewBox="0 0 48 48" aria-hidden="true">
              <use href="/icons.svg#IC-exit" />
            </svg>
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
  }, [authLoading, hash, isAuthenticated, lang?.community_channel_forbidden, lang?.voice_room_error, router, user?.id]);

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
        <svg className="h-12 w-12 animate-spin fill-purple-500" viewBox="0 0 48 48" aria-label={lang?.loading || 'Загрузка'}>
          <path d="M24 4a1.5 1.5 0 1 0 0 3c6.26 0 11.77 3.41 14.7 8.46a1.5 1.5 0 1 0 2.6-1.51A20 20 0 0 0 24 4" />
        </svg>
      </div>
    );
  }

  return <GroupCallRoom config={config} hash={hash} returnPath={returnPath} />;
}
