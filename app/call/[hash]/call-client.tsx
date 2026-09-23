'use client';

import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';
import { type DialogMeta, type DialogUser } from '../../messages/lib/messages-shared';
import Modal from '../../components/modal';
import { Dropdown, DropdownItem } from '../../components/navigation';
import { subscribeGlassMode, readGlassMode, getServerGlassMode, isEffectiveFullGlass } from '../../lib/android-glass';
import { motion, useMotionValue, useSpring, useMotionTemplate } from 'framer-motion';
import AppImage from '../../components/app-image';
import Icon from '../../components/svg-icon';

interface CameraDevice {
  deviceId: string;
  label: string;
}

/** Обёртка ответа V2 API: { data: ... } или плоский объект. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- оставлен как документация формата ответа
interface ApiEnvelope<T> {
  data?: T | null;
  [key: string]: unknown;
}

/** Диалог для звонка (getDialogByHash → dialog) + поля прямого диалога. */
type CallDialogInfo = DialogMeta & {
  creator_id?: number | string | null;
  recipient_id?: number | string | null;
};

/** Собеседник в звонке (getDialogByHash → foreignUser). */
type CallForeignUser = DialogUser;

/** Ответ getDialogByHash. */
interface CallDialogResponse {
  dialog?: CallDialogInfo | null;
  foreignUser?: CallForeignUser | null;
  currentUserId?: number | string | null;
}

/** Ответ GetTurnConfig.php. */
interface TurnConfigResponse {
  data?: { iceServers?: RTCIceServer[] } | null;
}

/** Полезная нагрузка WebRTC-сигналинга поверх WS (call:signal). */
type CallSignal = {
  kind?: 'offer' | 'answer' | 'candidate' | 'ice' | 'media' | string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  call_id?: string | number;
  mic_enabled?: boolean;
  cam_enabled?: boolean;
  screen_enabled?: boolean;
  [key: string]: unknown;
};

function CallControlButton({
  onClick,
  active = false,
  off = false,
  danger = false,
  disabled = false,
  className = '',
  label,
  title,
  children,
}: {
  onClick?: () => void;
  active?: boolean;
  off?: boolean;
  danger?: boolean;
  disabled?: boolean;
  className?: string;
  label?: string;
  title?: string;
  children: React.ReactNode;
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
  // Press animation (replaces whileTap — whileTap gets stuck on iOS Safari)
  const pressScaleX = useMotionValue(1);
  const pressScaleY = useMotionValue(1);

  const springX = useSpring(rawX, { stiffness: 420, damping: 22 });
  const springY = useSpring(rawY, { stiffness: 420, damping: 22 });
  const springPressScaleX = useSpring(pressScaleX, { stiffness: 500, damping: 30 });
  const springPressScaleY = useSpring(pressScaleY, { stiffness: 500, damping: 30 });

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

  const handlePressStart = () => {
    if (!isFullGlass || disabled) return;
    pressScaleX.set(1.05);
    pressScaleY.set(0.90);
  };

  const handlePressEnd = () => {
    if (!isFullGlass) return;
    pressScaleX.set(1);
    pressScaleY.set(1);
  };

  const baseClassName = `relative overflow-hidden w-14 h-14 rounded-full cursor-pointer flex items-center justify-center border duration-300 ${
    disabled ? 'cursor-not-allowed opacity-40 text-zinc-500' : ''
  } ${
    danger
      ? 'bg-red-600/90 text-white hover:bg-red-500 border-red-500/30 shadow'
      : active
        ? 'bg-purple-600/90 text-white hover:bg-purple-500 border-purple-500/30 shadow'
        : off
          ? 'text-red-500 hover:bg-red-950/50 border-transparent hover:border-red-600/30'
          : 'text-zinc-200 hover:bg-zinc-700/95 border-transparent hover:border-zinc-600/30'
  } ${!isFullGlass ? 'active:scale-95' : ''} ${className}`;

  return (
    <motion.div
      ref={itemRef}
      onMouseMove={isFullGlass ? handleMouseMove : undefined}
      onMouseLeave={isFullGlass ? handleMouseLeave : undefined}
      onTouchEnd={isFullGlass ? handleMouseLeave : undefined}
      onTouchCancel={isFullGlass ? handleMouseLeave : undefined}
      onPointerDown={isFullGlass ? handlePressStart : undefined}
      onPointerUp={isFullGlass ? handlePressEnd : undefined}
      onPointerCancel={isFullGlass ? handlePressEnd : undefined}
      onPointerLeave={isFullGlass ? handlePressEnd : undefined}
      style={
        isFullGlass
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
        title={title || label}
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

export default function CallClient() {
  const router = useRouter();
  const params = useParams<{ hash?: string }>();
  const hash = params?.hash || '';
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();
  const { showNote } = useNotification();

  const [dialogInfo, setDialogInfo] = useState<CallDialogInfo | null>(null);
  const [foreignUser, setForeignUser] = useState<CallForeignUser | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [callStatus, setCallStatus] = useState(lang?.connecting || 'Подключение...');
  const [isRtcConnected, setIsRtcConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const [remoteMicEnabled, setRemoteMicEnabled] = useState<boolean | null>(null);
  const [remoteCamEnabled, setRemoteCamEnabled] = useState<boolean | null>(null);
  const [remoteScreenEnabled, setRemoteScreenEnabled] = useState<boolean | null>(null);

  const [permissionsModal, setPermissionsModal] = useState(false);
  const [camDropdownOpen, setCamDropdownOpen] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | number>('');
  const isPoliteRef = useRef(false);
  const cUserIdRef = useRef(0);
  const fUserIdRef = useRef(0);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

  // refs для актуальных значений состояния в замыканиях
  const micEnabledRef = useRef(true);
  const camEnabledRef = useRef(true);
  const isScreenSharingRef = useRef(false);

  useEffect(() => { micEnabledRef.current = micEnabled; }, [micEnabled]);
  useEffect(() => { camEnabledRef.current = camEnabled; }, [camEnabled]);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  const loadDialog = async () => {
    try {
      const resp = await AncialAPI.getDialogByHash<CallDialogResponse>(hash);
      if (!resp?.dialog || !resp?.foreignUser) {
        setErrorMsg('Dialog not found');
        return;
      }

      const dialog = resp.dialog;
      const fUser = resp.foreignUser;
      const cUserId = parseInt(String(user?.id || resp.currentUserId || '')) || 0;
      let fUserId = parseInt(String(fUser.id ?? '')) || 0;

      if (!fUserId && dialog) {
        const creatorId = parseInt(String(dialog.creator_id ?? '')) || 0;
        const recipientId = parseInt(String(dialog.recipient_id ?? '')) || 0;
        if (cUserId === creatorId) fUserId = recipientId;
        else if (cUserId === recipientId) fUserId = creatorId;
      }

      setDialogInfo(dialog);
      setForeignUser(fUser);

      cUserIdRef.current = cUserId;
      fUserIdRef.current = fUserId;
      isPoliteRef.current = (fUserId > 0 && cUserId > fUserId);

      setPermissionsModal(true);
    } catch {
      setErrorMsg('Error loading dialog');
    }
  };

  // Initial load
  useEffect(() => {
    if (!callIdRef.current) {
      callIdRef.current = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      // Легаси mount-загрузка диалога: все setState внутри async loadDialog
      // выполняются после await, синхронного каскадного рендера нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-загрузка диалога: повторный запуск при смене user недопустим
  }, [authLoading, isAuthenticated, hash]);

  const initCall = async () => {
    setPermissionsModal(false);
    setCallStatus(lang?.['authorization...'] || 'Авторизация...');

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      // Нет камеры/отказ в видео — деградация до аудио-звонка вместо полного провала
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setCamEnabled(false);
        showNote({ content: lang?.call_video_unavailable || 'Камера недоступна — аудио-звонок', type: 'warning', time: 5 });
      } catch (audioErr) {
        console.error(audioErr);
        setCallStatus(lang?.voice_microphone_denied || 'Нет доступа к камере или микрофону');
        return;
      }
    }
    const activeStream: MediaStream = stream;
    localStreamRef.current = activeStream;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = activeStream;
    }

    // Сохраняем ID выбранной камеры из потока
    const videoTrack = activeStream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      if (settings.deviceId) {
        setSelectedCameraId(settings.deviceId);
      }
    }

    try {
      const turnResp = await AncialAPI.getTurnConfig<TurnConfigResponse>();
      const iceServers = turnResp?.data?.iceServers || [];
      setupWebRTC(iceServers, activeStream);
      setupGlobalWS();
    } catch (e) {
      console.error(e);
      setCallStatus(lang?.call_connection_lost || 'Соединение потеряно');
    }
  };

  const setupWebRTC = (iceServers: RTCIceServer[], localStream: MediaStream) => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    // react-doctor-disable-next-line react-doctor/effect-needs-cleanup -- RTCPeerConnection сохраняется в pcRef и закрывается при размонтировании звонка в unmount-эффекте
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Кандидаты, пришедшие до установки remoteDescription, буферизуются и
    // выливаются после SRD — иначе при гонке сигналов они теряются.
    pendingCandidatesRef.current = [];
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWsSignal({ kind: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendWsSignal({ kind: 'offer', sdp: pc.localDescription?.sdp });
      } catch (err) {
        console.error(err);
      } finally {
        makingOfferRef.current = false;
      }
    };

    // Автовосстановление: disconnected даёт 4с на самовосстановление, затем
    // ICE-restart (до 3 попыток); failed — restart сразу. «Потеряно» показываем,
    // только если лимит исчерпан. Деструктивный close() не трогаем.
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        recoveryAttemptsRef.current = 0;
        if (disconnectedTimerRef.current) { clearTimeout(disconnectedTimerRef.current); disconnectedTimerRef.current = null; }
        setIsRtcConnected(true);
        setCallStatus(lang?.call_connected || 'Соединено');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsRtcConnected(false);
        schedulePcRecovery();
      }
    };
  };

  const recoveryAttemptsRef = useRef(0);
  const disconnectedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePcRecovery = () => {
    if (!pcRef.current) return;
    if (disconnectedTimerRef.current) return; // уже ждём/восстанавливаемся
    const state = pcRef.current.connectionState;
    if (state === 'failed' && recoveryAttemptsRef.current >= 3) {
      setCallStatus(lang?.call_connection_lost || 'Соединение потеряно');
      return;
    }
    if (state === 'disconnected') {
      setCallStatus(lang?.call_reconnecting || 'Переподключение...');
      disconnectedTimerRef.current = setTimeout(() => {
        disconnectedTimerRef.current = null;
        if (!pcRef.current) return;
        if (pcRef.current.connectionState === 'connected') return;
        doPcRestart();
      }, 4000);
      return;
    }
    doPcRestart();
  };

  const doPcRestart = () => {
    if (!pcRef.current) return;
    if (recoveryAttemptsRef.current >= 3) {
      setCallStatus(lang?.call_connection_lost || 'Соединение потеряно');
      return;
    }
    recoveryAttemptsRef.current += 1;
    setCallStatus(lang?.call_reconnecting || 'Переподключение...');
    void (async () => {
      try {
        const offer = await pcRef.current?.createOffer({ iceRestart: true });
        if (!offer || !pcRef.current) return;
        await pcRef.current.setLocalDescription(offer);
        sendWsSignal({ kind: 'offer', sdp: pcRef.current.localDescription?.sdp });
      } catch (err) {
        console.error(err);
      }
    })();
  };

  const isSubscribedRef = useRef(false);
  const outgoingSignalQueueRef = useRef<CallSignal[]>([]);
  const dialogInfoRef = useRef<CallDialogInfo | null>(null);
  const wsTeardownRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    dialogInfoRef.current = dialogInfo;
  }, [dialogInfo]);

  const setupGlobalWS = () => {
    if (!window.GlobalWS) return;

    const subDialogId = dialogInfoRef.current?.id ?? dialogInfo?.id;
    if (subDialogId == null) return;

    wsTeardownRef.current?.();
    window.GlobalWS.subscribeDialog(subDialogId);

    if (window.GlobalWS.isReady()) {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
    }

    const onAuthOk = () => {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
    };
    const onSubscribed = () => {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
      isSubscribedRef.current = true;
      const queue = outgoingSignalQueueRef.current;
      outgoingSignalQueueRef.current = [];
      queue.forEach(data => sendWsSignal(data, true));
    };
    const onCallSignal = (payload: unknown) => {
      const msg = payload as { data?: CallSignal } | CallSignal;
      handleWsSignal(('data' in msg && msg.data ? msg.data : msg) as CallSignal);
    };

    window.GlobalWS.addDialogListener('auth_ok', onAuthOk);
    window.GlobalWS.addDialogListener('subscribed', onSubscribed);
    window.GlobalWS.addDialogListener('call:signal', onCallSignal);

    wsTeardownRef.current = () => {
      window.GlobalWS?.removeDialogListener('auth_ok', onAuthOk);
      window.GlobalWS?.removeDialogListener('subscribed', onSubscribed);
      window.GlobalWS?.removeDialogListener('call:signal', onCallSignal);
    };
  };

  const sendWsSignal = useCallback((data: CallSignal, force = false) => {
    if (!isSubscribedRef.current && !force) {
      outgoingSignalQueueRef.current.push(data);
      return;
    }
    if (!window.GlobalWS) return;
    const dInfo = dialogInfoRef.current || dialogInfo;
    window.GlobalWS.send({
      type: 'call:signal',
      dialog_id: dInfo?.id,
      call_id: callIdRef.current,
      ...data
    });
  }, [dialogInfo]);

  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const signalQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleWsSignal = (msg: CallSignal) => {
    signalQueueRef.current = signalQueueRef.current.then(async () => {
      const pc = pcRef.current;
      if (!pc) return;

      let isPolite = isPoliteRef.current;
      if (cUserIdRef.current > 0 && cUserIdRef.current === fUserIdRef.current) {
        isPolite = msg.call_id !== undefined && String(callIdRef.current) < String(msg.call_id);
      }

      try {
        if (msg.call_id && !callIdRef.current) {
          callIdRef.current = msg.call_id;
        } else if (msg.call_id && callIdRef.current && msg.call_id !== callIdRef.current) {
          if (isPolite && msg.kind === 'offer') {
            callIdRef.current = msg.call_id;
          } else {
            return;
          }
        }

        if (msg.kind === 'media') {
          if (msg.mic_enabled !== undefined) setRemoteMicEnabled(msg.mic_enabled);
          if (msg.cam_enabled !== undefined) setRemoteCamEnabled(msg.cam_enabled);
          if (msg.screen_enabled !== undefined) setRemoteScreenEnabled(msg.screen_enabled);
          return;
        }

        if (msg.kind === 'offer') {
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
          const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
          ignoreOfferRef.current = !isPolite && offerCollision;
          if (ignoreOfferRef.current) return;

          if (offerCollision) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp })
            ]);
          } else {
            await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
          }

          const answer = await pc.createAnswer();
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
          await pc.setLocalDescription(answer);
          sendWsSignal({ kind: 'answer', sdp: pc.localDescription?.sdp });

          const buffered = pendingCandidatesRef.current;
          pendingCandidatesRef.current = [];
          for (const candidate of buffered) {
            await pc.addIceCandidate(candidate).catch((err) => {
              if (!ignoreOfferRef.current) console.error(err);
            });
          }
        } else if (msg.kind === 'answer') {
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
          if (pc.signalingState !== 'have-local-offer') return;
          await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });

          const bufferedA = pendingCandidatesRef.current;
          pendingCandidatesRef.current = [];
          for (const candidate of bufferedA) {
            await pc.addIceCandidate(candidate).catch((err) => {
              if (!ignoreOfferRef.current) console.error(err);
            });
          }
        } else if (msg.kind === 'candidate' || msg.kind === 'ice') {
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
          // Без remoteDescription кандидат добавить нельзя — копим в буфер (групповой паттерн pendingIce).
          if (!pc.remoteDescription) {
            if (msg.candidate) pendingCandidatesRef.current.push(msg.candidate);
            return;
          }
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch (err) {
            if (!ignoreOfferRef.current) console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      const next = !micEnabledRef.current;
      audioTracks.forEach(t => t.enabled = next);
      setMicEnabled(next);
      sendWsSignal({
        kind: 'media',
        mic_enabled: next,
        cam_enabled: camEnabledRef.current,
        screen_enabled: isScreenSharingRef.current,
      });
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      const next = !camEnabledRef.current;
      videoTracks.forEach(t => t.enabled = next);
      setCamEnabled(next);
      sendWsSignal({
        kind: 'media',
        mic_enabled: micEnabledRef.current,
        cam_enabled: next,
        screen_enabled: isScreenSharingRef.current,
      });
    }
  };

  // ─── ВЫБОР КАМЕРЫ ────────────────────────────────────────────────────────────

  const handleCamButtonClick = async () => {
    if (!camEnabledRef.current) {
      // Камера выключена — просто включаем
      toggleCam();
      return;
    }
    // Камера включена: если дропдаун уже открыт — закрываем
    if (camDropdownOpen) {
      setCamDropdownOpen(false);
      return;
    }
    // Камера включена — подгружаем список камер
    let cameras: CameraDevice[] = [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      cameras = devices
        .filter(d => d.kind === 'videoinput')
        .map((d, i) => ({
          deviceId: d.deviceId,
          // Убираем скобки с идентификаторами вида (C4E1:9BFB) в конце названия
          label: (d.label || `${lang?.select_camera || 'Камера'} ${i + 1}`)
            .replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '').trim(),
        }));
    } catch (e) {
      console.error('enumerateDevices failed', e);
    }

    // Если камера одна — просто выключаем, без дропдауна
    if (cameras.length <= 1) {
      toggleCam();
      return;
    }

    setAvailableCameras(cameras);
    setCamDropdownOpen(true);
  };

  const switchCamera = async (deviceId: string) => {
    if (!localStreamRef.current || !pcRef.current) return;
    setCamDropdownOpen(false);

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      newVideoTrack.enabled = true;

      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(newVideoTrack);
      }

      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach(t => {
        t.stop();
        localStreamRef.current!.removeTrack(t);
      });
      localStreamRef.current.addTrack(newVideoTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }

      setSelectedCameraId(deviceId);
      // Убеждаемся что состояние камеры — включена
      if (!camEnabledRef.current) {
        setCamEnabled(true);
        sendWsSignal({
          kind: 'media',
          mic_enabled: micEnabledRef.current,
          cam_enabled: true,
          screen_enabled: isScreenSharingRef.current,
        });
      }
    } catch (e) {
      console.error('switchCamera failed', e);
    }
  };

  const disableCamFromDropdown = () => {
    setCamDropdownOpen(false);
    toggleCam();
  };

  // ─── ДЕМОНСТРАЦИЯ ЭКРАНА ──────────────────────────────────────────────────────

  const startScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      // Заменяем видео-трек в RTCPeerConnection
      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      }

      // Показываем демонстрацию в локальном превью
      if (localVideoRef.current) {
        const previewStream = new MediaStream([screenTrack]);
        localVideoRef.current.srcObject = previewStream;
      }

      setIsScreenSharing(true);

      // Уведомляем партнёра
      sendWsSignal({
        kind: 'media',
        mic_enabled: micEnabledRef.current,
        cam_enabled: camEnabledRef.current,
        screen_enabled: true,
      });

      // Когда пользователь сам останавливает демонстрацию через системный UI браузера
      screenTrack.addEventListener('ended', () => {
        stopScreenShare();
      }, { once: true });
    } catch (e) {
      // Пользователь отменил выбор — не показываем ошибку
      if ((e as DOMException)?.name !== 'NotAllowedError') {
        console.error('getDisplayMedia failed', e);
      }
    }
  };

  const stopScreenShare = useCallback(async () => {
    if (!pcRef.current || !localStreamRef.current) return;

    // Останавливаем треки экрана
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
    }

    // Возвращаем оригинальную камеру
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : true,
        audio: false,
      });
      const cameraTrack = cameraStream.getVideoTracks()[0];
      cameraTrack.enabled = camEnabledRef.current;

      const sender = pcRef.current.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(cameraTrack);
      }

      // Обновляем localStream
      const oldTracks = localStreamRef.current.getVideoTracks();
      oldTracks.forEach(t => {
        t.stop();
        localStreamRef.current!.removeTrack(t);
      });
      localStreamRef.current.addTrack(cameraTrack);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.error('stopScreenShare: failed to restore camera', e);
    }

    setIsScreenSharing(false);

    sendWsSignal({
      kind: 'media',
      mic_enabled: micEnabledRef.current,
      cam_enabled: camEnabledRef.current,
      screen_enabled: false,
    });
  }, [selectedCameraId, sendWsSignal]);

  const toggleScreenShare = () => {
    if (isScreenSharingRef.current) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  useEffect(() => {
    return () => {
      if (disconnectedTimerRef.current) { clearTimeout(disconnectedTimerRef.current); disconnectedTimerRef.current = null; }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      wsTeardownRef.current?.();
      wsTeardownRef.current = null;
      if (window.GlobalWS && dialogInfo && dialogInfo.id != null) {
        window.GlobalWS.unsubscribeDialog(dialogInfo.id);
      }
    };
  }, [dialogInfo]);

  if (authLoading || (!isAuthenticated && !authLoading) || !dialogInfo) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-black gap-3">
        {errorMsg ? (
          <span className="text-white">{errorMsg}</span>
        ) : (
          <Icon name="IC-loader" className="w-12 h-12 inline animate-spin fill-purple-500" />
        )}
      </div>
    );
  }

  const fName = foreignUser ? `${foreignUser.fname || ''} ${foreignUser.lname || ''}`.trim() : '...';
  const fAvatar = foreignUser?.img || '/img/load-placeholders/nothingfound.webp';

  // Обложка: нет соединения, или партнёр выключил камеру (но не во время screen share)
  const showCover = !isRtcConnected || (remoteCamEnabled === false && !remoteScreenEnabled);

  // Статус для обложки
  const coverStatusText = remoteScreenEnabled
    ? (lang?.screen_sharing || 'Демонстрация экрана...')
    : remoteCamEnabled === false
      ? (lang?.camera_off || 'Камера выключена')
      : callStatus;

  return (
    <div className="w-full" id="call-root" style={{ minHeight: '100dvh' }}>
      <style>{`#NAVP, [data-app-nav="mobile"] { display: none !important; }`}</style>
      <div className="fixed inset-0 bg-black">
        {/* Удалённое видео */}
        <video
          ref={remoteVideoRef}
          className={`absolute inset-0 w-full h-full object-cover ${showCover ? 'hidden' : ''}`}
          autoPlay
          playsInline
        />

        {/* Обложка (нет видео / камера выключена) */}
        {showCover && (
          <div id="call-cover" className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="w-full max-w-screen-sm px-6 text-center">
              <AppImage width={112} height={112} src={fAvatar} alt="" className="w-28 h-28 rounded-full shadow object-cover mx-auto" />
              <div className="mt-4 text-zinc-100 text-2xl font-semibold">{fName}</div>
              <div className="mt-2 text-zinc-300">{coverStatusText}</div>
            </div>
          </div>
        )}

        {/* Индикатор: партнёр выключил микрофон */}
        {remoteMicEnabled === false && (
          <div className="absolute top-6 right-6 bg-red-500/80 backdrop-blur-md p-2 rounded-full shadow-lg z-50">
            <Icon name="IC-mic-off" className="w-6 h-6 fill-white" />
          </div>
        )}

        {/* Индикатор: партнёр демонстрирует экран */}
        {remoteScreenEnabled === true && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-purple-600/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg z-50 flex items-center gap-2">
            <Icon name="IC-screen-sharing" className="w-4 h-4 fill-white shrink-0" />
            <span className="text-white text-xs font-medium">{lang?.screen_sharing || 'Демонстрация экрана...'}</span>
          </div>
        )}

        {/* Шапка */}
        <div className="absolute left-0 right-0 top-0 p-3 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="max-w-screen-md mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button style={{ zIndex: 999 }} onClick={() => router.back()} className="cursor-pointer duration-300 active:scale-95" type="button">
                <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
              </button>
              <div className="flex items-start gap-2">
                <AppImage width={40} height={40} src={fAvatar} alt="" className="w-10 h-10 rounded-full shadow object-cover" />
                <div className="flex flex-col leading-tight">
                  <div className="text-zinc-100 font-medium">{fName}</div>
                  <div className="text-zinc-300 text-sm max-w-48 lg:max-w-80">{callStatus}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Локальное превью */}
        <div className="absolute inset-x-0 top-14 lg:top-3 flex items-center justify-center px-3 w-full duration-300">
          <div className="flex justify-end w-full max-w-screen-md h-full">
            <div className="relative">
              <video
                ref={localVideoRef}
                className="duration-300 w-28 sm:w-32 md:w-48 rounded-2xl overflow-hidden shadow border border-zinc-600/30 bg-zinc-900"
                autoPlay
                playsInline
                muted
              />
              {/* Бейдж "Экран" на превью */}
              {isScreenSharing && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-purple-600/90 px-2 py-0.5 rounded-full">
                  <span className="text-white text-xs whitespace-nowrap">{lang?.screen_share || 'Экран'}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Модал: запрос разрешений */}
        {permissionsModal && (
          <Modal
            isOpen={permissionsModal}
            onClose={() => router.back()}
            title={lang?.media_access || 'Доступ к медиа'}
          >
            <div className="flex flex-col gap-3">
              <div className="text-zinc-300 text-sm">
                {lang?.media_access_desc || 'Нажмите кнопку ниже и подтвердите разрешение в браузере.'}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={initCall}
                  className="w-full rounded-3xl bg-purple-600 hover:bg-purple-500 duration-150 px-3 py-2 active:scale-95 border border-zinc-600/30"
                  type="button"
                >
                  {lang?.allow || 'Разрешить'}
                </button>
                <button
                  onClick={() => router.back()}
                  className="w-full rounded-3xl bg-zinc-700 hover:bg-zinc-600 duration-150 px-3 py-2 active:scale-95 border border-zinc-600/30"
                  type="button"
                >
                  {lang?.decline || 'Отклонить'}
                </button>
              </div>
            </div>
          </Modal>
        )}



        {/* Панель управления */}
        <div className="absolute inset-x-0 bottom-3 z-40">
          <div className="max-w-screen-lg mx-auto flex items-center justify-center">
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

              {/* Микрофон */}
              <CallControlButton
                onClick={toggleMic}
                off={!micEnabled}
                label={micEnabled ? (lang?.voice_mic_on || 'Микрофон включён') : (lang?.voice_mic_off || 'Микрофон выключен')}
              >
                {micEnabled ? (
                  <Icon name="IC-mic" className="h-8 w-8 fill-current" />
                ) : (
                  <Icon name="IC-mic-off" className="h-8 w-8 fill-current" />
                )}
              </CallControlButton>

              {/* Камера: кнопка с выпадающим меню */}
              <Dropdown
                customTrigger={
                  <CallControlButton
                    onClick={handleCamButtonClick}
                    label={camEnabled && !isScreenSharing ? (lang?.voice_camera_on || 'Камера включена') : (lang?.voice_camera_off || 'Камера выключена')}
                    off={!camEnabled || isScreenSharing}
                    active={Boolean(camEnabled && !isScreenSharing && camDropdownOpen)}
                    disabled={isScreenSharing}
                    className="relative z-10"
                  >
                    {camEnabled && !isScreenSharing ? (
                      <Icon name="IC-camera" className="h-8 w-8 fill-current" />
                    ) : (
                      <Icon name="IC-camera-off" className="h-8 w-8 fill-current" />
                    )}
                  </CallControlButton>
                }
                renderTrigger={false}
                open={camDropdownOpen}
                onOpenChange={setCamDropdownOpen}
                position="top"
                align="center"
                width="auto"
                closeOnChildClick={true}
                wrapperClassName="relative w-14 h-14"
              >
                {availableCameras.map((cam) => (
                  <DropdownItem
                    key={cam.deviceId}
                    onClick={() => switchCamera(cam.deviceId)}
                    iconNode={
                      selectedCameraId === cam.deviceId ? (
                        <Icon name="IC-check-bold" className="inline w-6 h-6 fill-purple-400" />
                      ) : (
                        <Icon name="IC-camera" className="inline w-6 h-6 fill-zinc-400" />
                      )
                    }
                    className={selectedCameraId === cam.deviceId ? 'text-purple-300' : ''}
                  >
                    {cam.label}
                  </DropdownItem>
                ))}

                <DropdownItem
                  onClick={disableCamFromDropdown}
                  iconNode={
                    <Icon name="IC-camera-off" className="inline w-6 h-6 fill-red-400" />
                  }
                  className="text-red-400"
                >
                  {lang?.camera_off || 'Выключить камеру'}
                </DropdownItem>
              </Dropdown>

              {/* Демонстрация экрана */}
              <CallControlButton
                onClick={toggleScreenShare}
                active={isScreenSharing}
                label={isScreenSharing ? (lang?.stop_screen_share || 'Остановить') : (lang?.screen_share || 'Демонстрация экрана')}
                title={isScreenSharing ? (lang?.stop_screen_share || 'Остановить') : (lang?.screen_share || 'Демонстрация экрана')}
                className="hidden md:flex"
              >
                {isScreenSharing ? (
                  <Icon name="IC-screen-share-stop" className="h-7 w-7 fill-current" />
                ) : (
                  <Icon name="IC-screen-share" className="h-7 w-7 fill-current" />
                )}
              </CallControlButton>

              {/* Завершить звонок */}
              <CallControlButton
                danger
                label={lang?.voice_room_leave || 'Завершить'}
                title={lang?.voice_room_leave || 'Завершить'}
                onClick={() => router.back()}
              >
                <Icon name="IC-exit" className="h-7 w-7 fill-current" aria-hidden="true" />
              </CallControlButton>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
