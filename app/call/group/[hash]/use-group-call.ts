'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '../../../context/AuthContext';
import { useNotification } from '../../../context/NotificationContext';
import { AncialAPI } from '../../../lib/api-v2';
import { globalWS } from '../../../lib/global-ws';
import {
  normalizeParticipant,
  normalizeParticipants,
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
  const pendingIceRef = useRef(new Map<number, RTCIceCandidateInit[]>());
  const remoteStreamsRef = useRef(new Map<number, MediaStream>());
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

  const replaceVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    activeVideoTrackRef.current = track;
    await Promise.all(Array.from(videoSendersRef.current.values()).map((sender) => (
      sender.replaceTrack(track).catch((error) => console.error('Group video track replacement failed', error))
    )));
    refreshLocalStream();
  }, [refreshLocalStream]);

  const closePeer = useCallback((userId: number) => {
    peersRef.current.get(userId)?.close();
    peersRef.current.delete(userId);
    videoSendersRef.current.delete(userId);
    pendingIceRef.current.delete(userId);
    remoteStreamsRef.current.delete(userId);
    setRemoteStreams((current) => {
      if (!current[userId]) return current;
      const next = { ...current };
      delete next[userId];
      return next;
    });
  }, []);

  const createPeer = useCallback(async (targetUserId: number) => {
    const existing = peersRef.current.get(targetUserId);
    if (existing && existing.connectionState !== 'closed') return existing;

    const peer = new RTCPeerConnection({ iceServers: iceServersRef.current });
    peersRef.current.set(targetUserId, peer);

    const mediaStream = new MediaStream();
    const audioTrack = audioTrackRef.current;
    if (audioTrack) {
      mediaStream.addTrack(audioTrack);
      peer.addTrack(audioTrack, mediaStream);
    } else {
      peer.addTransceiver('audio', { direction: 'recvonly' });
    }

    const videoTransceiver = peer.addTransceiver('video', {
      direction: 'sendrecv',
      streams: [mediaStream],
    });
    videoSendersRef.current.set(targetUserId, videoTransceiver.sender);
    if (activeVideoTrackRef.current) {
      await videoTransceiver.sender.replaceTrack(activeVideoTrackRef.current);
    }

    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal({
        kind: 'ice',
        target_user_id: targetUserId,
        candidate: event.candidate.toJSON(),
      });
    };
    peer.ontrack = (event) => {
      const stream = remoteStreamsRef.current.get(targetUserId) ?? new MediaStream();
      if (!stream.getTracks().some((track) => track.id === event.track.id)) {
        stream.addTrack(event.track);
      }
      remoteStreamsRef.current.set(targetUserId, stream);
      setRemoteStreams((current) => ({ ...current, [targetUserId]: stream }));
      event.track.onended = () => {
        stream.removeTrack(event.track);
        setRemoteStreams((current) => ({ ...current, [targetUserId]: stream }));
      };
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
        closePeer(targetUserId);
      }
    };
    return peer;
  }, [closePeer, sendSignal]);

  const flushIce = useCallback(async (userId: number, peer: RTCPeerConnection) => {
    const candidates = pendingIceRef.current.get(userId) ?? [];
    pendingIceRef.current.delete(userId);
    await Promise.all(candidates.map((candidate) => peer.addIceCandidate(candidate).catch(() => undefined)));
  }, []);

  const makeOffer = useCallback(async (targetUserId: number) => {
    const peer = await createPeer(targetUserId);
    const offer = await peer.createOffer();
    await peer.setLocalDescription(offer);
    sendSignal({ kind: 'offer', target_user_id: targetUserId, sdp: offer.sdp });
  }, [createPeer, sendSignal]);

  const resetPeers = useCallback(() => {
    peersRef.current.forEach((peer) => peer.close());
    peersRef.current.clear();
    videoSendersRef.current.clear();
    pendingIceRef.current.clear();
    remoteStreamsRef.current.clear();
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
          if (participant.user_id !== currentUserId) {
            void makeOffer(participant.user_id).catch((error) => console.error('Group call offer failed', error));
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
        return;
      }

      void (async () => {
        const peer = await createPeer(fromUserId);
        if (kind === 'offer' && signal.sdp) {
          await peer.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
          await flushIce(fromUserId, peer);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          sendSignal({ kind: 'answer', target_user_id: fromUserId, sdp: answer.sdp });
        } else if (kind === 'answer' && signal.sdp) {
          await peer.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
          await flushIce(fromUserId, peer);
        } else if (kind === 'ice' && signal.candidate) {
          if (peer.remoteDescription) {
            await peer.addIceCandidate(signal.candidate);
          } else {
            const queue = pendingIceRef.current.get(fromUserId) ?? [];
            pendingIceRef.current.set(fromUserId, [...queue, signal.candidate].slice(-50));
          }
        }
      })().catch((error) => console.error('Group call signal failed', error));
    };

    const handleSubscribed = (raw?: unknown) => {
      const payload = (raw || {}) as { dialog_id?: number | string };
      if (Number(payload.dialog_id || 0) !== dialogId) return;
      subscribedRef.current = true;
      if (!joinedRef.current) return;
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
  }, [closePeer, createPeer, currentMediaState, currentUserId, dialogId, flushIce, lang?.voice_room_disconnected, lang?.voice_room_error, leave, makeOffer, onDisconnected, resetPeers, sendSignal, setParticipants, showNote]);

  useEffect(() => () => {
    if (joinedRef.current && roomIdRef.current) sendSignal({ kind: 'leave' });
    peersRef.current.forEach((peer) => peer.close());
    audioTrackRef.current?.stop();
    cameraTrackRef.current?.stop();
    screenTrackRef.current?.stop();
    setCallPresence(null);
  }, [sendSignal]);

  const loadCameras = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const next = devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `${lang?.camera || 'Камера'} ${index + 1}`,
      }));
    setCameras(next);
    if (!selectedCameraId && next[0]) setSelectedCameraId(next[0].deviceId);
  }, [lang?.camera, selectedCameraId]);

  const join = useCallback(async () => {
    if (joining || joinedRef.current) return joinedRef.current;
    setJoining(true);
    try {
      const mediaPromise = canPublish
        ? navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            video: false,
          })
        : Promise.resolve(new MediaStream());
      const turnPromise = AncialAPI.getTurnConfig<{ iceServers?: RTCIceServer[] }>();
      const [stream, turn] = await Promise.all([mediaPromise, turnPromise]);
      audioTrackRef.current = stream.getAudioTracks()[0] ?? null;
      micEnabledRef.current = canPublish && Boolean(audioTrackRef.current);
      setMicEnabled(micEnabledRef.current);
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
  }, [activityUrl, canPublish, currentMediaState, dialogId, joining, lang?.voice_microphone_denied, leave, loadCameras, refreshLocalStream, sendSignal, showNote, title]);

  const toggleMic = useCallback(() => {
    if (!canPublish || !audioTrackRef.current) return;
    micEnabledRef.current = !micEnabledRef.current;
    audioTrackRef.current.enabled = micEnabledRef.current;
    setMicEnabled(micEnabledRef.current);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [canPublish, currentMediaState, currentUserId, sendMediaState, setParticipants]);

  const disableCamera = useCallback(async () => {
    cameraTrackRef.current?.stop();
    cameraTrackRef.current = null;
    camEnabledRef.current = false;
    setCamEnabled(false);
    if (!screenEnabledRef.current) await replaceVideoTrack(null);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [currentMediaState, currentUserId, replaceVideoTrack, sendMediaState, setParticipants]);

  const enableCamera = useCallback(async (deviceId?: string) => {
    if (!canPublish || screenEnabledRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      cameraTrackRef.current?.stop();
      cameraTrackRef.current = track;
      const actualDeviceId = track.getSettings().deviceId;
      if (actualDeviceId) setSelectedCameraId(actualDeviceId);
      camEnabledRef.current = true;
      setCamEnabled(true);
      await replaceVideoTrack(track);
      setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
      sendMediaState();
      void loadCameras().catch(() => undefined);
    } catch (error) {
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
    screenTrackRef.current = null;
    if (screenTrack) {
      screenTrack.onended = null;
      screenTrack.stop();
    }
    screenEnabledRef.current = false;
    camEnabledRef.current = shouldRestoreCamera;
    setScreenEnabled(false);
    setCamEnabled(shouldRestoreCamera);
    await replaceVideoTrack(shouldRestoreCamera ? cameraTrackRef.current : null);
    setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
    sendMediaState();
  }, [currentMediaState, currentUserId, replaceVideoTrack, sendMediaState, setParticipants]);

  const startScreenShare = useCallback(async () => {
    if (!canPublish) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      if (!track) return;
      cameraBeforeScreenRef.current = camEnabledRef.current;
      screenTrackRef.current = track;
      screenEnabledRef.current = true;
      camEnabledRef.current = false;
      setScreenEnabled(true);
      setCamEnabled(false);
      track.onended = () => void stopScreenShare();
      await replaceVideoTrack(track);
      setParticipants(updateParticipantMedia(participantsRef.current, currentUserId, currentMediaState()));
      sendMediaState();
    } catch (error) {
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
