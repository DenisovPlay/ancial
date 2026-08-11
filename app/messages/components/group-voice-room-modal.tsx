/* eslint-disable @next/next/no-img-element -- dialog avatars may come from user-configured remote hosts */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Modal from '../../components/modal';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { globalWS } from '../../lib/global-ws';
import type { GroupMember } from '../lib/messages-shared';
import { FALLBACK_AVATAR, normalizeAssetUrl } from '../lib/messages-shared';

type VoiceParticipant = {
  user_id: number;
  mic_enabled: boolean;
  joined_at?: number;
};

type VoiceSignal = {
  kind?: string;
  room_id?: string | null;
  user_id?: number | string;
  from_user_id?: number | string;
  target_user_id?: number | string;
  mic_enabled?: boolean;
  participants?: VoiceParticipant[];
  sdp?: string;
  candidate?: RTCIceCandidateInit;
};

type VoiceEnvelope = {
  dialog_id?: number | string;
  data?: VoiceSignal;
};

type Props = {
  dialogId: number;
  isOpen: boolean;
  members: GroupMember[];
  onClose: () => void;
  onStatusChange?: (participants: VoiceParticipant[]) => void;
  title: string;
};

function setVoicePresence(activity: Record<string, unknown> | null) {
  window.dispatchEvent(new CustomEvent('zypo:presence-activity', { detail: activity }));
}

function RemoteAudio({ muted, stream }: { muted: boolean; stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = ref.current;
    if (!audio) return;
    audio.srcObject = stream;
    void audio.play().catch(() => undefined);
    return () => {
      audio.srcObject = null;
    };
  }, [stream]);

  return <audio ref={ref} autoPlay muted={muted} />;
}

export default function GroupVoiceRoomModal({
  dialogId,
  isOpen,
  members,
  onClose,
  onStatusChange,
  title,
}: Props) {
  const { lang, user } = useAuth();
  const { showNote } = useNotification();
  const currentUserId = Number(user?.id || 0);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const participantsRef = useRef<VoiceParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [deafened, setDeafened] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef('');
  const joinedRef = useRef(false);
  const peersRef = useRef(new Map<number, RTCPeerConnection>());
  const pendingIceRef = useRef(new Map<number, RTCIceCandidateInit[]>());
  const iceServersRef = useRef<RTCIceServer[]>([]);

  const memberById = useMemo(() => {
    const map = new Map<number, GroupMember>();
    members.forEach((member) => map.set(Number(member.id), member));
    return map;
  }, [members]);

  const updateParticipants = useCallback((next: VoiceParticipant[]) => {
    const normalized = next.reduce<VoiceParticipant[]>((result, participant) => {
      const userId = Number(participant.user_id);
      if (userId > 0) {
        result.push({ ...participant, user_id: userId, mic_enabled: Boolean(participant.mic_enabled) });
      }
      return result;
    }, []);
    participantsRef.current = normalized;
    setParticipants(normalized);
    onStatusChange?.(normalized);
  }, [onStatusChange]);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    globalWS.send({
      type: 'voice:signal',
      dialog_id: dialogId,
      ...(roomIdRef.current ? { room_id: roomIdRef.current } : {}),
      ...payload,
    });
  }, [dialogId]);

  const closePeer = useCallback((userId: number) => {
    peersRef.current.get(userId)?.close();
    peersRef.current.delete(userId);
    pendingIceRef.current.delete(userId);
    setRemoteStreams((current) => {
      if (!current[userId]) return current;
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }, []);

  const createPeer = useCallback((targetUserId: number) => {
    const existing = peersRef.current.get(targetUserId);
    if (existing && existing.connectionState !== 'closed') return existing;

    const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peersRef.current.set(targetUserId, pc);
    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
    });
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          kind: 'ice',
          target_user_id: targetUserId,
          candidate: event.candidate.toJSON(),
        });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      setRemoteStreams((current) => ({ ...current, [targetUserId]: stream }));
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(targetUserId);
      }
    };
    return pc;
  }, [closePeer, sendSignal]);

  const makeOffer = useCallback(async (targetUserId: number) => {
    const pc = createPeer(targetUserId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ kind: 'offer', target_user_id: targetUserId, sdp: offer.sdp });
  }, [createPeer, sendSignal]);

  const flushIce = useCallback(async (userId: number, pc: RTCPeerConnection) => {
    const candidates = pendingIceRef.current.get(userId) || [];
    pendingIceRef.current.delete(userId);
    await Promise.all(candidates.map((candidate) => pc.addIceCandidate(candidate).catch(() => undefined)));
  }, []);

  const resetConnection = useCallback(() => {
    joinedRef.current = false;
    setJoined(false);
    setJoining(false);
    setMicEnabled(true);
    roomIdRef.current = '';
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    pendingIceRef.current.clear();
    setRemoteStreams({});
    setVoicePresence(null);
  }, []);

  const leaveRoom = useCallback((closeModal = true) => {
    if (joinedRef.current && roomIdRef.current) sendSignal({ kind: 'leave' });
    resetConnection();
    if (closeModal) onClose();
  }, [onClose, resetConnection, sendSignal]);

  useEffect(() => {
    const handleSignal = (raw?: unknown) => {
      const envelope = (raw || {}) as VoiceEnvelope;
      if (Number(envelope.dialog_id || 0) !== dialogId) return;
      const signal = envelope.data || (raw as VoiceSignal);
      const kind = String(signal.kind || '');

      if (kind === 'status') {
        updateParticipants(Array.isArray(signal.participants) ? signal.participants : []);
        return;
      }
      if (!joinedRef.current && kind !== 'snapshot') return;

      if (kind === 'disconnected') {
        showNote({
          content: lang?.voice_room_disconnected || 'Вы были отключены от голосового канала',
          type: 'warning',
          time: 5,
        });
        resetConnection();
        onClose();
        return;
      }

      if (kind === 'snapshot') {
        roomIdRef.current = String(signal.room_id || '');
        const next = Array.isArray(signal.participants) ? signal.participants : [];
        updateParticipants(next);
        next.forEach((participant) => {
          const targetUserId = Number(participant.user_id);
          if (targetUserId > 0 && targetUserId !== currentUserId) {
            void makeOffer(targetUserId).catch((error) => console.error('Voice offer failed', error));
          }
        });
        return;
      }

      if (kind === 'participant_left') {
        const leftUserId = Number(signal.user_id || 0);
        closePeer(leftUserId);
        updateParticipants(participantsRef.current.filter((participant) => participant.user_id !== leftUserId));
        return;
      }

      if (kind === 'participant_joined') {
        const joinedUserId = Number(signal.user_id || 0);
        if (!participantsRef.current.some((item) => item.user_id === joinedUserId)) {
          updateParticipants([
            ...participantsRef.current,
            { user_id: joinedUserId, mic_enabled: Boolean(signal.mic_enabled) },
          ]);
        }
        return;
      }

      const fromUserId = Number(signal.from_user_id || 0);
      if (fromUserId <= 0 || fromUserId === currentUserId) return;

      if (kind === 'media') {
        updateParticipants(participantsRef.current.map((participant) => participant.user_id === fromUserId
          ? { ...participant, mic_enabled: Boolean(signal.mic_enabled) }
          : participant));
        return;
      }

      void (async () => {
        const pc = createPeer(fromUserId);
        if (kind === 'offer' && signal.sdp) {
          await pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          await flushIce(fromUserId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ kind: 'answer', target_user_id: fromUserId, sdp: answer.sdp });
        } else if (kind === 'answer' && signal.sdp) {
          await pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
          await flushIce(fromUserId, pc);
        } else if (kind === 'ice' && signal.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(signal.candidate);
          } else {
            const queue = pendingIceRef.current.get(fromUserId) || [];
            queue.push(signal.candidate);
            pendingIceRef.current.set(fromUserId, queue.slice(-50));
          }
        }
      })().catch((error) => console.error('Voice signal failed', error));
    };

    const handleWsError = (raw?: unknown) => {
      const payload = (raw || {}) as { code?: string; message?: string };
      if (!['room_full', 'voice_disabled', 'not_in_room', 'stale_room', 'access_denied'].includes(String(payload.code || ''))) return;
      showNote({ content: payload.message || lang?.voice_room_error || 'Не удалось подключиться к звонку', type: 'error', time: 5 });
      resetConnection();
    };

    const handleSubscribed = (raw?: unknown) => {
      const payload = (raw || {}) as { dialog_id?: number | string };
      if (Number(payload.dialog_id || 0) !== dialogId || !joinedRef.current || !localStreamRef.current) return;
      peersRef.current.forEach((peer) => peer.close());
      peersRef.current.clear();
      pendingIceRef.current.clear();
      setRemoteStreams({});
      roomIdRef.current = '';
      sendSignal({ kind: 'join' });
    };

    globalWS.addDialogListener('voice:signal', handleSignal);
    globalWS.addDialogListener('ws:error', handleWsError);
    globalWS.addDialogListener('subscribed', handleSubscribed);
    return () => {
      globalWS.removeDialogListener('voice:signal', handleSignal);
      globalWS.removeDialogListener('ws:error', handleWsError);
      globalWS.removeDialogListener('subscribed', handleSubscribed);
    };
  }, [closePeer, createPeer, currentUserId, dialogId, flushIce, lang?.voice_room_disconnected, lang?.voice_room_error, makeOffer, onClose, onStatusChange, resetConnection, sendSignal, showNote, updateParticipants]);

  useEffect(() => () => {
    if (joinedRef.current && roomIdRef.current) sendSignal({ kind: 'leave' });
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peersRef.current.forEach((peer) => peer.close());
    setVoicePresence(null);
  }, [sendSignal]);

  const joinRoom = async () => {
    if (joining || joinedRef.current) return;
    setJoining(true);
    try {
      const mediaPromise = navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      const turnPromise = AncialAPI.getTurnConfig<{ iceServers?: RTCIceServer[] }>();
      const [stream, turn] = await Promise.all([mediaPromise, turnPromise]);
      localStreamRef.current = stream;
      iceServersRef.current = Array.isArray(turn?.iceServers) ? turn.iceServers : [];
      joinedRef.current = true;
      setJoined(true);
      setMicEnabled(true);
      sendSignal({ kind: 'join' });
      setVoicePresence({
        activity_type: 'call',
        activity_key: String(dialogId),
        activity_label: title,
        activity_url: '/messages',
        activity_meta: { dialog_id: dialogId, title },
      });
    } catch (error) {
      console.error('Voice room join failed', error);
      showNote({
        content: lang?.voice_microphone_denied || 'Не удалось получить доступ к микрофону',
        type: 'error',
        time: 5,
      });
      resetConnection();
    } finally {
      setJoining(false);
    }
  };

  const toggleMicrophone = () => {
    const next = !micEnabled;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
    setMicEnabled(next);
    updateParticipants(participantsRef.current.map((participant) => participant.user_id === currentUserId
      ? { ...participant, mic_enabled: next }
      : participant));
    sendSignal({ kind: 'media', mic_enabled: next });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => leaveRoom(true)}
      title={lang?.voice_room_title || 'Голосовая комната'}
    >
      <div className="flex min-w-0 flex-col gap-3">
        <div className="rounded-3xl border border-zinc-600/30 bg-zinc-900/60 p-3">
          <p className="truncate text-lg font-bold text-white">{title}</p>
          <p className="text-sm text-zinc-400">
            {participants.length > 0
              ? `${participants.length}/8 ${lang?.voice_room_participants || 'участников'}`
              : (lang?.voice_room_empty || 'Сейчас в комнате никого нет')}
          </p>
        </div>

        <div className="grid max-h-[45vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
          {participants.map((participant) => {
            const member = memberById.get(participant.user_id);
            const displayName = [member?.fname, member?.lname].filter(Boolean).join(' ') || member?.username || `#${participant.user_id}`;
            return (
              <div key={participant.user_id} className="flex min-w-0 flex-col items-center gap-2 rounded-3xl border border-zinc-600/30 bg-zinc-800/60 p-3 text-center">
                <div className="relative">
                  <img
                    src={normalizeAssetUrl(member?.img, FALLBACK_AVATAR)}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <span className={`absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-800 text-xs ${participant.mic_enabled ? 'bg-green-500' : 'bg-red-500'}`}>
                    {participant.mic_enabled ? '●' : '×'}
                  </span>
                </div>
                <span className="w-full truncate text-sm font-semibold text-zinc-100">{displayName}</span>
              </div>
            );
          })}
        </div>

        {Object.entries(remoteStreams).map(([userId, stream]) => (
          <RemoteAudio key={userId} stream={stream} muted={deafened} />
        ))}

        {!joined ? (
          <button
            type="button"
            onClick={() => void joinRoom()}
            disabled={joining}
            className="cursor-pointer rounded-3xl border border-purple-400/30 bg-purple-600 p-3 font-semibold text-white duration-300 hover:bg-purple-500 active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            {joining ? (lang?.voice_room_connecting || 'Подключаемся…') : (lang?.voice_room_join || 'Войти в голосовой чат')}
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={toggleMicrophone}
              className={`cursor-pointer rounded-3xl border p-3 text-sm font-semibold text-white duration-300 active:scale-95 ${micEnabled ? 'border-zinc-600/30 bg-zinc-700 hover:bg-zinc-600' : 'border-red-400/30 bg-red-600 hover:bg-red-500'}`}
            >
              {micEnabled ? (lang?.voice_mute || 'Микрофон') : (lang?.voice_unmute || 'Включить')}
            </button>
            <button
              type="button"
              onClick={() => setDeafened((current) => !current)}
              className={`cursor-pointer rounded-3xl border p-3 text-sm font-semibold text-white duration-300 active:scale-95 ${deafened ? 'border-amber-400/30 bg-amber-600 hover:bg-amber-500' : 'border-zinc-600/30 bg-zinc-700 hover:bg-zinc-600'}`}
            >
              {deafened ? (lang?.voice_undeafen || 'Вернуть звук') : (lang?.voice_deafen || 'Заглушить')}
            </button>
            <button
              type="button"
              onClick={() => leaveRoom(true)}
              className="cursor-pointer rounded-3xl border border-red-400/30 bg-red-600 p-3 text-sm font-semibold text-white duration-300 hover:bg-red-500 active:scale-95"
            >
              {lang?.voice_room_leave || 'Выйти'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
