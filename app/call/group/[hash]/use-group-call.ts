'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { globalWS } from '../../../lib/global-ws';
import { WS_BASE } from '../../../config';
import {
  isGroupCallOfferer,
  isPolitePeer,
  normalizeParticipant,
  normalizeParticipants,
  resolveOfferCollision,
  shouldRecoverPeer,
  updateParticipantMedia,
  type GroupCallParticipant,
  type ParticipantMediaState,
  type VoiceSignal,
} from '../lib/group-call-state';

type VoiceEnvelope = {
  data?: VoiceSignal;
  dialog_id?: number | string;
};

type CameraDevice = {
  deviceId: string;
  label: string;
};

type UseGroupCallOptions = {
  activityUrl: string;
  canPublish: boolean;
  currentUserId: number;
  dialogId: number;
  onDisconnected: () => void;
  title: string;
  /** Гостевой режим: код инвайта и имя гостя (без авторизации). */
  guestCode?: string;
  guestName?: string;
};

const DISCONNECTED_RECOVERY_DELAY_MS = 4_000;
const MISSING_VIDEO_RECOVERY_DELAY_MS = 8_000;

type PeerNegotiationState = {
  ignoreOffer: boolean;
  isPolite: boolean;
  isSettingRemoteAnswerPending: boolean;
  makingOffer: boolean;
};

function setCallPresence(activity: Record<string, unknown> | null) {
  window.dispatchEvent(new CustomEvent('zypo:presence-activity', { detail: activity }));
}

export function useGroupCall({
  activityUrl,
  canPublish,
  currentUserId,
  dialogId,
  onDisconnected,
  title,
  guestCode,
  guestName,
}: UseGroupCallOptions) {
  const { lang } = useAuth();
  const { showNote } = useNotification();
  const [participants, setParticipantsState] = useState<GroupCallParticipant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<number, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [micEnabled, setMicEnabled] = useState(canPublish);
  const [camEnabled, setCamEnabled] = useState(false);
  const [screenEnabled, setScreenEnabled] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');

  const participantsRef = useRef<GroupCallParticipant[]>([]);
  const peersRef = useRef(new Map<number, RTCPeerConnection>());
  const videoSendersRef = useRef(new Map<number, RTCRtpSender>());
  const negotiationStateRef = useRef(new Map<number, PeerNegotiationState>());
  const pendingIceRef = useRef(new Map<number, RTCIceCandidateInit[]>());
  const signalQueuesRef = useRef(new Map<number, Promise<void>>());
  const remoteStreamsRef = useRef(new Map<number, MediaStream>());
  const recoveryTimersRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const videoWatchdogsRef = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const recoveryAttemptsRef = useRef(new Map<number, number>());
  const recoveryRequestRef = useRef<(userId: number, missingMedia?: boolean) => void>(() => undefined);
  const makeOfferRef = useRef<(userId: number, iceRestart?: boolean) => Promise<void>>(async () => undefined);
  const iceServersRef = useRef<RTCIceServer[]>([]);
  const roomIdRef = useRef('');
  const joinedRef = useRef(false);
  const subscribedRef = useRef(false);
  const pendingJoinRef = useRef(false);
  const audioTrackRef = useRef<MediaStreamTrack | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const activeVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const micEnabledRef = useRef(canPublish);
  const camEnabledRef = useRef(false);
  const screenEnabledRef = useRef(false);
  const cameraBeforeScreenRef = useRef(false);

  const setParticipants = useCallback((next: GroupCallParticipant[]) => {
    const limited = next.slice(0, 8);
    participantsRef.current = limited;
    setParticipantsState(limited);
  }, []);

  const refreshLocalStream = useCallback(() => {
    const tracks = [audioTrackRef.current, activeVideoTrackRef.current].filter(
      (track): track is MediaStreamTrack => Boolean(track),
    );
    setLocalStream(new MediaStream(tracks));
  }, []);

  const currentMediaState = useCallback((): ParticipantMediaState => ({
    mic_enabled: canPublish && micEnabledRef.current,
    cam_enabled: canPublish && camEnabledRef.current,
    screen_enabled: canPublish && screenEnabledRef.current,
  }), [canPublish]);

  const sendSignal = useCallback((payload: Record<string, unknown>) => {
    globalWS.send({
      type: 'voice:signal',
      dialog_id: dialogId,
      ...(roomIdRef.current ? { room_id: roomIdRef.current } : {}),
      ...payload,
    });
  }, [dialogId]);

  const sendMediaState = useCallback(() => {
    if (!joinedRef.current || !roomIdRef.current) return;
    sendSignal({ kind: 'media', ...currentMediaState() });
  }, [currentMediaState, sendSignal]);

  const clearRecoveryTimer = useCallback((userId: number) => {
    const timer = recoveryTimersRef.current.get(userId);
    if (timer) clearTimeout(timer);
    recoveryTimersRef.current.delete(userId);
  }, []);

  const clearVideoWatchdog = useCallback((userId: number) => {
    const timer = videoWatchdogsRef.current.get(userId);
    if (timer) clearTimeout(timer);
    videoWatchdogsRef.current.delete(userId);
  }, []);

  const clearPeerSupervision = useCallback((userId: number, clearAttempts = true) => {
    clearRecoveryTimer(userId);
    clearVideoWatchdog(userId);
    signalQueuesRef.current.delete(userId);
    if (clearAttempts) recoveryAttemptsRef.current.delete(userId);
  }, [clearRecoveryTimer, clearVideoWatchdog]);

  const closePeer = useCallback((userId: number, clearAttempts = true) => {
    peersRef.current.get(userId)?.close();
    peersRef.current.delete(userId);
    videoSendersRef.current.delete(userId);
    negotiationStateRef.current.delete(userId);
    pendingIceRef.current.delete(userId);
    remoteStreamsRef.current.delete(userId);
    clearPeerSupervision(userId, clearAttempts);
    setRemoteStreams((current) => {
      if (!current[userId]) return current;
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }, [clearPeerSupervision]);

  const replaceVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    const senders = Array.from(videoSendersRef.current.entries());
    const results = await Promise.allSettled(senders.map(([, sender]) => sender.replaceTrack(track)));
    const failedUserIds = results.flatMap((result, index) => (
      result.status === 'rejected' ? [senders[index][0]] : []
    ));

    activeVideoTrackRef.current = track;
    refreshLocalStream();

    if (failedUserIds.length > 0) {
      failedUserIds.forEach((userId) => {
        closePeer(userId, false);
        recoveryRequestRef.current(userId, true);
      });
    }

  }, [closePeer, refreshLocalStream]);

  const enqueueSignal = useCallback((userId: number, operation: () => Promise<void>) => {
    const previous = signalQueuesRef.current.get(userId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    signalQueuesRef.current.set(userId, next);
    void next.catch((error) => console.error('Group call signal failed', error)).finally(() => {
      if (signalQueuesRef.current.get(userId) === next) signalQueuesRef.current.delete(userId);
    });
    return next;
  }, []);

  const hasLiveRemoteVideo = useCallback((userId: number) => (
    remoteStreamsRef.current.get(userId)?.getVideoTracks().some((track) => (
      track.readyState === 'live' && !track.muted
    )) ?? false
  ), []);

  const watchForRemoteVideo = useCallback((userId: number, expectsVideo: boolean) => {
    clearVideoWatchdog(userId);
    if (!expectsVideo || hasLiveRemoteVideo(userId)) return;
    const timer = setTimeout(() => {
      videoWatchdogsRef.current.delete(userId);
      if (!hasLiveRemoteVideo(userId)) recoveryRequestRef.current(userId, true);
    }, MISSING_VIDEO_RECOVERY_DELAY_MS);
    videoWatchdogsRef.current.set(userId, timer);
  }, [clearVideoWatchdog, hasLiveRemoteVideo]);

  const createPeer = useCallback(async (targetUserId: number) => {
    const existing = peersRef.current.get(targetUserId);
    if (existing && existing.connectionState !== 'closed') return existing;

    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peersRef.current.set(targetUserId, peer);
    const negotiationState: PeerNegotiationState = {
      ignoreOffer: false,
      isPolite: isPolitePeer(currentUserId, targetUserId),
      isSettingRemoteAnswerPending: false,
      makingOffer: false,
    };
    negotiationStateRef.current.set(targetUserId, negotiationState);

    const mediaStream = new MediaStream();
    const audioTrack = audioTrackRef.current;
    if (audioTrack) {
      mediaStream.addTrack(audioTrack);
      peer.addTrack(audioTrack, mediaStream);
    } else {
      peer.addTransceiver('audio', { direction: 'recvonly' });
    }

    const activeVideoTrack = activeVideoTrackRef.current;
    if (activeVideoTrack) {
      mediaStream.addTrack(activeVideoTrack);
      const videoSender = peer.addTrack(activeVideoTrack, mediaStream);
      videoSendersRef.current.set(targetUserId, videoSender);
    } else {
      const videoTransceiver = peer.addTransceiver('video', { direction: 'recvonly' });
      videoSendersRef.current.set(targetUserId, videoTransceiver.sender);
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal({
        kind: 'ice',
        target_user_id: targetUserId,
        candidate: event.candidate.toJSON(),
      });
    };
    peer.onnegotiationneeded = () => {
      void enqueueSignal(targetUserId, async () => {
        if (peer.signalingState === 'closed' || peersRef.current.get(targetUserId) !== peer) return;
        const state = negotiationStateRef.current.get(targetUserId);
        if (!state || state.makingOffer || peer.signalingState !== 'stable') return;
        try {
          state.makingOffer = true;
          await peer.setLocalDescription();
          if (peer.localDescription?.type !== 'offer') return;
          sendSignal({
            kind: 'offer',
            target_user_id: targetUserId,
            sdp: peer.localDescription.sdp,
          });
        } finally {
          state.makingOffer = false;
        }
      });
    };
    peer.ontrack = (event) => {
      const stream = remoteStreamsRef.current.get(targetUserId) ?? new MediaStream();
      if (!stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      remoteStreamsRef.current.set(targetUserId, stream);
      setRemoteStreams((current) => ({ ...current, [targetUserId]: stream }));
      if (event.track.kind === 'video') {
        if (event.track.muted) {
          watchForRemoteVideo(targetUserId, true);
        } else {
          clearVideoWatchdog(targetUserId);
          recoveryAttemptsRef.current.delete(targetUserId);
        }
        event.track.onunmute = () => {
          clearVideoWatchdog(targetUserId);
          recoveryAttemptsRef.current.delete(targetUserId);
        };
        event.track.onmute = () => {
          const participant = participantsRef.current.find((item) => item.user_id === targetUserId);
          watchForRemoteVideo(targetUserId, Boolean(participant?.cam_enabled || participant?.screen_enabled));
        };
      }
      event.track.onended = () => {
        stream.removeTrack(event.track);
        setRemoteStreams((current) => ({ ...current, [targetUserId]: stream }));
        if (event.track.kind === 'video') {
          const participant = participantsRef.current.find((item) => item.user_id === targetUserId);
          watchForRemoteVideo(targetUserId, Boolean(participant?.cam_enabled || participant?.screen_enabled));
        }
      };
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        clearRecoveryTimer(targetUserId);
        const participant = participantsRef.current.find((item) => item.user_id === targetUserId);
        const expectsVideo = Boolean(participant?.cam_enabled || participant?.screen_enabled);
        if (expectsVideo && !hasLiveRemoteVideo(targetUserId)) {
          watchForRemoteVideo(targetUserId, true);
        } else {
          recoveryAttemptsRef.current.delete(targetUserId);
        }
      } else if (peer.connectionState === 'failed') {
        recoveryRequestRef.current(targetUserId);
      } else if (peer.connectionState === 'disconnected') {
        clearRecoveryTimer(targetUserId);
        const timer = setTimeout(() => {
          recoveryTimersRef.current.delete(targetUserId);
          if (peer.connectionState === 'disconnected') recoveryRequestRef.current(targetUserId);
        }, DISCONNECTED_RECOVERY_DELAY_MS);
        recoveryTimersRef.current.set(targetUserId, timer);
      }
    };
    return peer;
  }, [clearRecoveryTimer, clearVideoWatchdog, currentUserId, enqueueSignal, hasLiveRemoteVideo, sendSignal, watchForRemoteVideo]);

  const flushIce = useCallback(async (userId: number, peer: RTCPeerConnection) => {
    const candidates = pendingIceRef.current.get(userId) ?? [];
    pendingIceRef.current.delete(userId);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => undefined)));
  }, []);

  const makeOffer = useCallback(async (targetUserId: number, iceRestart = false) => {
    await enqueueSignal(targetUserId, async () => {
      const peer = await createPeer(targetUserId);
      const state = negotiationStateRef.current.get(targetUserId);
      if (!state || state.makingOffer || peer.signalingState !== 'stable') return;
      try {
        state.makingOffer = true;
        const offer = await peer.createOffer({ iceRestart });
        await peer.setLocalDescription(offer);
        sendSignal({ kind: 'offer', target_user_id: targetUserId, sdp: peer.localDescription?.sdp });
      } finally {
        state.makingOffer = false;
      }
    });
  }, [createPeer, enqueueSignal, sendSignal]);

  const requestPeerRecovery = useCallback((targetUserId: number, missingMedia = false) => {
    if (!joinedRef.current || !roomIdRef.current) return;
    const peer = peersRef.current.get(targetUserId);
    const attempts = recoveryAttemptsRef.current.get(targetUserId) ?? 0;
    const state = missingMedia ? 'failed' : (peer?.connectionState ?? 'failed');
    if (!shouldRecoverPeer(state, attempts)) return;

    recoveryAttemptsRef.current.set(targetUserId, attempts + 1);
    clearRecoveryTimer(targetUserId);
    clearVideoWatchdog(targetUserId);
    if (isGroupCallOfferer(currentUserId, targetUserId)) {
      closePeer(targetUserId, false);
      void makeOfferRef.current(targetUserId, true).catch((error) => {
        console.error('Group call recovery offer failed', error);
      });
    } else {
      closePeer(targetUserId, false);
      sendSignal({ kind: 'restart', target_user_id: targetUserId });
    }
  }, [clearRecoveryTimer, clearVideoWatchdog, closePeer, currentUserId, sendSignal]);

  useEffect(() => {
    makeOfferRef.current = makeOffer;
    recoveryRequestRef.current = requestPeerRecovery;
  }, [makeOffer, requestPeerRecovery]);

  const resetPeers = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    videoSendersRef.current.clear();
    negotiationStateRef.current.clear();
    pendingIceRef.current.clear();
    signalQueuesRef.current.clear();
    remoteStreamsRef.current.clear();
    recoveryTimersRef.current.forEach(clearTimeout);
    recoveryTimersRef.current.clear();
    videoWatchdogsRef.current.forEach(clearTimeout);
    videoWatchdogsRef.current.clear();
    recoveryAttemptsRef.current.clear();
    setRemoteStreams({});
  }, []);

  const stopTracks = useCallback(() => {
    audioTrackRef.current?.stop();
    cameraTrackRef.current?.stop();
    screenTrackRef.current?.stop();
    audioTrackRef.current = null;
    cameraTrackRef.current = null;
    screenTrackRef.current = null;
    activeVideoTrackRef.current = null;
    setLocalStream(null);
  }, []);

  const leave = useCallback((notifyServer = true) => {
    if (notifyServer && joinedRef.current && roomIdRef.current) sendSignal({ kind: 'leave' });
    joinedRef.current = false;
    pendingJoinRef.current = false;
    roomIdRef.current = '';
    resetPeers();
    stopTracks();
    setParticipants([]);
    setJoined(false);
    setJoining(false);
    setCallPresence(null);
  }, [resetPeers, sendSignal, setParticipants, stopTracks]);

  useEffect(() => {
    const handleSignal = (raw?: unknown) => {
      const envelope = (raw || {}) as VoiceEnvelope;
      if (Number(envelope.dialog_id || 0) !== dialogId) return;
      const signal = envelope.data || (raw as VoiceSignal);
      const kind = String(signal.kind || '');

      if (kind === 'status') {
        setParticipants(normalizeParticipants(signal.participants));
        return;
      }
      if (kind === 'disconnected') {
        showNote({
          content: lang?.voice_room_disconnected || 'Вы были отключены от голосового канала',
          type: 'warning',
          time: 5,
        });
        leave(false);
        onDisconnected();
        return;
      }
      if (!joinedRef.current && kind !== 'snapshot') return;

      if (kind === 'snapshot') {
        roomIdRef.current = String(signal.room_id || '');
        const next = normalizeParticipants(signal.participants);
        setParticipants(next);
        next.forEach((participant) => {
          if (isGroupCallOfferer(currentUserId, participant.user_id)) {
            void makeOffer(participant.user_id).catch((error) => console.error('Group call offer failed', error));
          }
          if (participant.user_id !== currentUserId) {
            watchForRemoteVideo(participant.user_id, participant.cam_enabled || participant.screen_enabled);
          }
        });
        return;
      }
      if (kind === 'participant_left') {
        const userId = Number(signal.user_id || 0);
        closePeer(userId);
        setParticipants(participantsRef.current.filter((participant) => participant.user_id !== userId));
        return;
      }
      if (kind === 'participant_joined') {
        const participant = normalizeParticipant(signal);
        if (participant && !participantsRef.current.some((item) => item.user_id === participant.user_id)) {
          setParticipants([...participantsRef.current, participant]);
          watchForRemoteVideo(participant.user_id, participant.cam_enabled || participant.screen_enabled);
          if (isGroupCallOfferer(currentUserId, participant.user_id)) {
            void makeOffer(participant.user_id).catch((error) => console.error('Group call offer failed', error));
          }
        }
        return;
      }

      const fromUserId = Number(signal.from_user_id || 0);
      if (fromUserId <= 0 || fromUserId === currentUserId) return;
      if (kind === 'media') {
        const media: ParticipantMediaState = {
          mic_enabled: Boolean(signal.mic_enabled),
          cam_enabled: Boolean(signal.cam_enabled),
          screen_enabled: Boolean(signal.screen_enabled),
        };
        setParticipants(updateParticipantMedia(participantsRef.current, fromUserId, media));
        watchForRemoteVideo(fromUserId, media.cam_enabled || media.screen_enabled);
        return;
      }

      enqueueSignal(fromUserId, async () => {
        if (kind === 'restart') {
          if (isGroupCallOfferer(currentUserId, fromUserId)) requestPeerRecovery(fromUserId, true);
          return;
        }
        const peer = await createPeer(fromUserId);
        const negotiationState = negotiationStateRef.current.get(fromUserId);
        if (!negotiationState) return;
        if (kind === 'offer' && signal.sdp) {
          const collision = resolveOfferCollision({
            isPolite: negotiationState.isPolite,
            isSettingRemoteAnswerPending: negotiationState.isSettingRemoteAnswerPending,
            makingOffer: negotiationState.makingOffer,
            signalingState: peer.signalingState,
          });
          negotiationState.ignoreOffer = collision.ignore;
          if (collision.ignore) return;
          if (collision.rollback) {
            await Promise.all([
              peer.setLocalDescription({ type: 'rollback' }),
              peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp }),
            ]);
          } else {
            await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          }
          await flushIce(fromUserId, peer);
          await peer.setLocalDescription();
          sendSignal({ kind: 'answer', target_user_id: fromUserId, sdp: peer.localDescription?.sdp });
        } else if (kind === 'answer' && signal.sdp) {
          if (peer.signalingState !== 'have-local-offer') return;
          negotiationState.isSettingRemoteAnswerPending = true;
          try {
            await peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
            await flushIce(fromUserId, peer);
          } finally {
            negotiationState.isSettingRemoteAnswerPending = false;
          }
        } else if (kind === 'ice' && signal.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(signal.candidate).catch((error) => {
              if (!negotiationState.ignoreOffer) throw error;
            });
          } else {
            const queue = pendingIceRef.current.get(fromUserId) ?? [];
            pendingIceRef.current.set(fromUserId, [...queue, signal.candidate].slice(-50));
          }
        }
      });
    };

    const handleSubscribed = (raw?: unknown) => {
      const payload = (raw || {}) as { dialog_id?: number | string };
      if (Number(payload.dialog_id || 0) !== dialogId) return;
      subscribedRef.current = true;

      // 1) Мы ещё не в комнате — обычный первый join после подписки.
      if (!joinedRef.current) {
        sendSignal({ kind: 'join', ...currentMediaState() });
        return;
      }

      // 2) Ресабскрайб при живом звонке. Если комната та же и состав участников
      // не изменился — сохраняем установленные P2P-сессии (не роняем медиа).
      // Снапшот придёт следующим сообщением и дозаполнит недостающих offer'ами.
      if (roomIdRef.current && !pendingJoinRef.current) {
        sendSignal({ kind: 'join', ...currentMediaState() });
        return;
      }

      // 3) Страховка: зависший pendingJoin — полный ресинк.
      resetPeers();
      roomIdRef.current = '';
      pendingJoinRef.current = false;
      sendSignal({ kind: 'join', ...currentMediaState() });
    };

    const handleWsError = (raw?: unknown) => {
      const payload = (raw || {}) as { code?: string; message?: string };
      if (!['room_full', 'voice_disabled', 'not_in_room', 'stale_room', 'access_denied'].includes(String(payload.code || ''))) return;
      showNote({
        content: payload.message || lang?.voice_room_error || 'Не удалось подключиться к звонку',
        type: 'error',
        time: 5,
      });
      leave(false);
    };

    // ─── Гостевой режим: собственное лёгкое WS-подключение (без GlobalWS/auth-токена) ───
    if (guestCode) {
      let ws: WebSocket | null = null;
      let closed = false;
      const guestSend = (payload: Record<string, unknown>) => {
        try { ws?.send(JSON.stringify(payload)); } catch {}
      };
      const onVoiceEvent = (raw: MessageEvent<string>) => {
        let msg: { type?: string; error?: string; code?: string; message?: string; dialog_id?: number | string } & Record<string, unknown>;
        try { msg = JSON.parse(raw.data); } catch { return; }
        if (msg.type === 'auth_ok') {
          guestSend({ type: 'subscribe', dialog_id: dialogId });
          return;
        }
        if (msg.type === 'subscribed') {
          handleSubscribed(msg);
          return;
        }
        if (msg.type === 'voice:signal') {
          handleSignal(msg.data ?? msg);
          return;
        }
        if (msg.type === 'ws_error' || msg.type === 'ws:error' || msg.type === 'error') {
          handleWsError({ code: msg.code || msg.error, message: msg.message });
          return;
        }
        if (msg.type === 'auth_error') {
          showNote({
            content: lang?.voice_invite_invalid || 'Ссылка-инвайт недействительна или устарела',
            type: 'error',
            time: 6,
          });
          onDisconnected();
        }
      };
      try {
        ws = new WebSocket(WS_BASE);
      } catch {
        onDisconnected();
        return;
      }
      ws.onopen = () => {
        guestSend({ type: 'auth', voice_invite: { code: guestCode, name: guestName || '' } });
      };
      ws.onmessage = onVoiceEvent;
      ws.onclose = () => {
        if (!closed && joinedRef.current) {
          // Гость выпал из сети — пробуем переподключиться с тем же именем.
          setTimeout(() => { if (!closed) window.location.reload(); }, 2000);
        }
      };
      return () => {
        closed = true;
        try { ws?.close(); } catch {}
        subscribedRef.current = false;
      };
    }

    globalWS.addDialogListener('voice:signal', handleSignal);
    globalWS.addDialogListener('subscribed', handleSubscribed);
    globalWS.addDialogListener('ws:error', handleWsError);
    globalWS.subscribeDialog(dialogId);
    return () => {
      globalWS.removeDialogListener('voice:signal', handleSignal);
      globalWS.removeDialogListener('subscribed', handleSubscribed);
      globalWS.removeDialogListener('ws:error', handleWsError);
      globalWS.unsubscribeDialog(dialogId);
      subscribedRef.current = false;
    };
  }, [closePeer, createPeer, currentMediaState, currentUserId, dialogId, guestCode, guestName, enqueueSignal, flushIce, lang?.voice_room_disconnected, lang?.voice_room_error, leave, makeOffer, onDisconnected, requestPeerRecovery, resetPeers, sendSignal, setParticipants, showNote, watchForRemoteVideo]);

  useEffect(() => () => {
    if (joinedRef.current && roomIdRef.current) sendSignal({ kind: 'leave' });
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    videoSendersRef.current.clear();
    negotiationStateRef.current.clear();
    pendingIceRef.current.clear();
    signalQueuesRef.current.clear();
    remoteStreamsRef.current.clear();
    recoveryTimersRef.current.forEach(clearTimeout);
    recoveryTimersRef.current.clear();
    videoWatchdogsRef.current.forEach(clearTimeout);
    videoWatchdogsRef.current.clear();
    recoveryAttemptsRef.current.clear();
    audioTrackRef.current?.stop();
    cameraTrackRef.current?.stop();
    screenTrackRef.current?.stop();
    setCallPresence(null);
  }, [sendSignal]);

  const loadCameras = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const next: CameraDevice[] = [];
    devices.forEach((device) => {
      if (device.kind !== 'videoinput') return;
      next.push({
        deviceId: device.deviceId,
        label: device.label || `${lang?.camera || 'Камера'} ${next.length + 1}`,
      });
    });
    setCameras(next);
    if (!selectedCameraId && next[0]) setSelectedCameraId(next[0].deviceId);
  }, [lang?.camera, selectedCameraId]);

  const join = useCallback(async () => {
    if (joining || joinedRef.current) return joinedRef.current;
    setJoining(true);
    try {
      // Деградация медиа: нет камеры/отказ в видео → аудио-звонок вместо провала.
      const mediaPromise = !canPublish
        ? Promise.resolve(new MediaStream())
        : navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: true,
          }).catch(() => navigator.mediaDevices.getUserMedia({
            audio: true,
          }));
      const turnPromise = guestCode
        ? AncialAPI.getGuestTurnConfig()
        : AncialAPI.getTurnConfig<{ iceServers?: RTCIceServer[] }>();
      const [stream, turn] = await Promise.all([mediaPromise, turnPromise]);
      audioTrackRef.current = stream.getAudioTracks()[0] ?? null;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      activeVideoTrackRef.current = cameraTrackRef.current;
      micEnabledRef.current = canPublish && Boolean(audioTrackRef.current);
      camEnabledRef.current = canPublish && Boolean(cameraTrackRef.current);
      setMicEnabled(micEnabledRef.current);
      setCamEnabled(camEnabledRef.current);
      const initialCameraId = cameraTrackRef.current?.getSettings().deviceId;
      if (initialCameraId) setSelectedCameraId(initialCameraId);
      iceServersRef.current = Array.isArray(turn?.iceServers) ? turn.iceServers : [];
      joinedRef.current = true;
      pendingJoinRef.current = true;
      setJoined(true);
      refreshLocalStream();
      void loadCameras().catch(() => undefined);
      if (subscribedRef.current) {
        pendingJoinRef.current = false;
        sendSignal({ kind: 'join', ...currentMediaState() });
      }
      setCallPresence({
        activity_type: 'call',
        activity_key: String(dialogId),
        activity_label: title,
        activity_url: activityUrl,
        activity_meta: { dialog_id: dialogId, title, group: true },
      });
      return true;
    } catch (error) {
      console.error('Group call join failed', error);
      showNote({
        content: lang?.voice_microphone_denied || 'Не удалось получить доступ к микрофону',
        type: 'error',
        time: 5,
      });
      leave(false);
      return false;
    } finally {
      setJoining(false);
    }
  }, [activityUrl, canPublish, currentMediaState, dialogId, guestCode, joining, lang?.voice_microphone_denied, leave, loadCameras, refreshLocalStream, sendSignal, showNote, title]);

  const toggleMic = useCallback(() => {
    if (!canPublish || !audioTrackRef.current) return;
    micEnabledRef.current = !micEnabledRef.current;
    audioTrackRef.current.enabled = micEnabledRef.current;
    setMicEnabled(micEnabledRef.current);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [canPublish, currentMediaState, currentUserId, sendMediaState, setParticipants]);

  const disableCamera = useCallback(async () => {
    const cameraTrack = cameraTrackRef.current;
    if (!screenEnabledRef.current) await replaceVideoTrack(null);
    cameraTrack?.stop();
    cameraTrackRef.current = null;
    camEnabledRef.current = false;
    setCamEnabled(false);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [currentMediaState, currentUserId, replaceVideoTrack, sendMediaState, setParticipants]);

  const enableCamera = useCallback(async (deviceId?: string) => {
    if (!canPublish || screenEnabledRef.current) return;
    let track: MediaStreamTrack | null = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      track = stream.getVideoTracks()[0] ?? null;
      if (!track) return;
      const previousCameraTrack = cameraTrackRef.current;
      await replaceVideoTrack(track);
      previousCameraTrack?.stop();
      cameraTrackRef.current = track;
      const actualDeviceId = track.getSettings().deviceId;
      if (actualDeviceId) setSelectedCameraId(actualDeviceId);
      camEnabledRef.current = true;
      setCamEnabled(true);
      setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
      sendMediaState();
      void loadCameras().catch(() => undefined);
    } catch (error) {
      if (track && activeVideoTrackRef.current !== track) track.stop();
      console.error('Group camera access failed', error);
      showNote({
        content: lang?.camera_access_denied || lang?.camera_off || 'Не удалось включить камеру',
        type: 'error',
        time: 4,
      });
    }
  }, [canPublish, currentMediaState, currentUserId, lang?.camera_access_denied, lang?.camera_off, loadCameras, replaceVideoTrack, sendMediaState, setParticipants, showNote]);

  const toggleCamera = useCallback(async () => {
    if (camEnabledRef.current) await disableCamera();
    else await enableCamera(selectedCameraId || undefined);
  }, [disableCamera, enableCamera, selectedCameraId]);

  const switchCamera = useCallback(async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (camEnabledRef.current) await enableCamera(deviceId);
  }, [enableCamera]);

  const stopScreenShare = useCallback(async () => {
    const shouldRestoreCamera = cameraBeforeScreenRef.current && Boolean(cameraTrackRef.current);
    const screenTrack = screenTrackRef.current;
    await replaceVideoTrack(shouldRestoreCamera ? cameraTrackRef.current : null);
    screenTrackRef.current = null;
    if (screenTrack) {
      screenTrack.onended = null;
      screenTrack.stop();
    }
    screenEnabledRef.current = false;
    camEnabledRef.current = shouldRestoreCamera;
    setScreenEnabled(false);
    setCamEnabled(shouldRestoreCamera);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [currentMediaState, currentUserId, replaceVideoTrack, sendMediaState, setParticipants]);

  const startScreenShare = useCallback(async () => {
    if (!canPublish) return;
    let track: MediaStreamTrack | null = null;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      track = stream.getVideoTracks()[0] ?? null;
      if (!track) return;
      await replaceVideoTrack(track);
      cameraBeforeScreenRef.current = camEnabledRef.current;
      screenTrackRef.current = track;
      screenEnabledRef.current = true;
      camEnabledRef.current = false;
      setScreenEnabled(true);
      setCamEnabled(false);
      track.onended = () => void stopScreenShare();
      setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
      sendMediaState();
    } catch (error) {
      if (track && activeVideoTrackRef.current !== track) track.stop();
      console.error('Group screen share failed', error);
      showNote({
        content: lang?.screen_share_failed || lang?.screen_share || 'Не удалось начать демонстрацию',
        type: 'error',
        time: 4,
      });
    }
  }, [canPublish, currentMediaState, currentUserId, lang?.screen_share, lang?.screen_share_failed, replaceVideoTrack, sendMediaState, setParticipants, showNote, stopScreenShare]);

  const toggleScreenShare = useCallback(async () => {
    if (screenEnabledRef.current) await stopScreenShare();
    else await startScreenShare();
  }, [startScreenShare, stopScreenShare]);

  return {
    camEnabled,
    cameras,
    deafened,
    disableCamera,
    enableCamera,
    joined,
    joining,
    join,
    leave,
    localStream,
    micEnabled,
    participants,
    remoteStreams,
    screenEnabled,
    selectedCameraId,
    switchCamera,
    toggleCamera,
    toggleDeafen: () => setDeafened((current) => !current),
    toggleMic,
    toggleScreenShare,
  };
}
