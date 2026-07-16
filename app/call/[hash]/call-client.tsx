'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI } from '../../lib/api-v2';
import Modal from '../../components/modal';
import { Dropdown, DropdownItem } from '../../components/navigation';

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function CallClient() {
  const router = useRouter();
  const params = useParams<{ hash?: string }>();
  const hash = params?.hash || '';
  const { isAuthenticated, isLoading: authLoading, lang, user } = useAuth();

  const [dialogInfo, setDialogInfo] = useState<any>(null);
  const [foreignUser, setForeignUser] = useState<any>(null);
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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef('');
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
      loadDialog();
    }
  }, [authLoading, isAuthenticated, hash]);

  const loadDialog = async () => {
    try {
      const resp: any = await AncialAPI.getDialogByHash(hash);
      if (!resp?.dialog || !resp?.foreignUser) {
        setErrorMsg('Dialog not found');
        return;
      }

      const dialog = resp.dialog;
      const fUser = resp.foreignUser;
      const cUserId = parseInt(user?.id || resp.currentUserId) || 0;
      let fUserId = parseInt(fUser.id) || 0;

      if (!fUserId && dialog) {
        const creatorId = parseInt(dialog.creator_id) || 0;
        const recipientId = parseInt(dialog.recipient_id) || 0;
        if (cUserId === creatorId) fUserId = recipientId;
        else if (cUserId === recipientId) fUserId = creatorId;
      }

      setDialogInfo(dialog);
      setForeignUser(fUser);

      cUserIdRef.current = cUserId;
      fUserIdRef.current = fUserId;
      isPoliteRef.current = (fUserId > 0 && cUserId > fUserId);

      setPermissionsModal(true);
    } catch (e) {
      setErrorMsg('Error loading dialog');
    }
  };

  const initCall = async () => {
    setPermissionsModal(false);
    setCallStatus(lang?.['authorization...'] || 'Авторизация...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Сохраняем ID выбранной камеры из потока
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          setSelectedCameraId(settings.deviceId);
        }
      }

      const turnResp: any = await AncialAPI.getTurnConfig();
      const iceServers = turnResp?.data?.iceServers || [];

      setupWebRTC(iceServers, stream);
      setupGlobalWS();
    } catch (e) {
      console.error(e);
      setCallStatus('No access to camera/mic');
    }
  };

  const setupWebRTC = (iceServers: any[], localStream: MediaStream) => {
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

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendWsSignal({ kind: 'ice', candidate: event.candidate });
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

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setIsRtcConnected(true);
        setCallStatus(lang?.call_connected || 'Соединено');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsRtcConnected(false);
        setCallStatus(lang?.call_connection_lost || 'Соединение потеряно');
      }
    };
  };

  const isSubscribedRef = useRef(false);
  const outgoingSignalQueueRef = useRef<any[]>([]);
  const dialogInfoRef = useRef<any>(null);

  useEffect(() => {
    dialogInfoRef.current = dialogInfo;
  }, [dialogInfo]);

  const setupGlobalWS = () => {
    if (!window.GlobalWS) return;

    window.GlobalWS.subscribeDialog(dialogInfoRef.current?.id ?? dialogInfo?.id);

    if (window.GlobalWS.isReady()) {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
    }

    window.GlobalWS.addDialogListener('auth_ok', () => {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
    });
    window.GlobalWS.addDialogListener('subscribed', () => {
      setCallStatus(lang?.waiting_for_answer || 'Ожидание ответа...');
      isSubscribedRef.current = true;
      const queue = outgoingSignalQueueRef.current;
      outgoingSignalQueueRef.current = [];
      queue.forEach(data => sendWsSignal(data, true));
    });

    window.GlobalWS.addDialogListener('call:signal', async (msg: any) => {
      handleWsSignal(msg.data || msg);
    });
  };

  const sendWsSignal = (data: any, force = false) => {
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
  };

  const signalQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleWsSignal = (msg: any) => {
    signalQueueRef.current = signalQueueRef.current.then(async () => {
      const pc = pcRef.current;
      if (!pc) return;

      let isPolite = isPoliteRef.current;
      if (cUserIdRef.current > 0 && cUserIdRef.current === fUserIdRef.current) {
        isPolite = callIdRef.current < msg.call_id;
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
        } else if (msg.kind === 'answer') {
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
          await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
        } else if (msg.kind === 'candidate' || msg.kind === 'ice') {
          if ((pc.signalingState as string) === 'closed' || (pc.connectionState as string) === 'closed') return;
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
    setCamDropdownOpen(prev => !prev);
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
      if ((e as any)?.name !== 'NotAllowedError') {
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
  }, [selectedCameraId]);

  const toggleScreenShare = () => {
    if (isScreenSharingRef.current) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  };

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (window.GlobalWS && dialogInfo) {
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
          <svg className="w-12 h-12 inline animate-spin fill-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 4 A 1.50015 1.50015 0 1 0 24 7 C 30.255882 7 35.765936 10.406785 38.703125 15.455078 A 1.5005776 1.5005776 0 1 0 41.296875 13.945312 C 37.834064 7.9936061 31.344118 4 24 4 z" /></svg>
        )}
      </div>
    );
  }

  const fName = foreignUser ? `${foreignUser.fname || ''} ${foreignUser.lname || ''}`.trim() : '...';
  const fAvatar = foreignUser?.img || '/includes/img/anlite/nothingfound.webp';

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
              <img src={fAvatar} className="w-28 h-28 rounded-full shadow object-cover mx-auto" />
              <div className="mt-4 text-zinc-100 text-2xl font-semibold">{fName}</div>
              <div className="mt-2 text-zinc-300">{coverStatusText}</div>
            </div>
          </div>
        )}

        {/* Индикатор: партнёр выключил микрофон */}
        {remoteMicEnabled === false && (
          <div className="absolute top-6 right-6 bg-red-500/80 backdrop-blur-md p-2 rounded-full shadow-lg z-50">
            <svg className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 24 2 C 19.047281 2 15 6.0472805 15 11 L 15 26 C 15 30.952719 19.047281 35 24 35 C 28.952719 35 33 30.952719 33 26 L 33 11 C 33 6.0472805 28.952719 2 24 2 M 10.476562 20.978516 A 1.50015 1.50015 0 0 0 9 22.5 L 9 26 C 9 33.760508 14.934038 40.16812 22.5 40.923828 L 22.5 45.5 A 1.50015 1.50015 0 1 0 25.5 45.5 L 25.5 40.923828 C 33.065962 40.16812 39 33.760508 39 26 L 39 22.5 A 1.50015 1.50015 0 1 0 36 22.5 L 36 26 C 36 32.585372 30.739679 37.894735 24.177734 37.990234 A 1.50015 1.50015 0 0 0 23.976562 37.978516 A 1.50015 1.50015 0 0 0 23.8125 37.990234 C 17.255134 37.889572 12 32.582085 12 26 L 12 22.5 A 1.50015 1.50015 0 0 0 10.476562 20.978516 M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/>
            </svg>
          </div>
        )}

        {/* Индикатор: партнёр демонстрирует экран */}
        {remoteScreenEnabled === true && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-purple-600/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg z-50 flex items-center gap-2">
            <svg className="w-4 h-4 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path d="M 7 8 C 4.7940678 8 3 9.7940678 3 12 L 3 33 C 3 35.205932 4.7940678 37 7 37 L 20 37 L 20 41 L 14 41 A 1.50015 1.50015 0 1 0 14 44 L 34 44 A 1.50015 1.50015 0 1 0 34 41 L 28 41 L 28 37 L 41 37 C 43.205932 37 45 35.205932 45 33 L 45 12 C 45 9.7940678 43.205932 8 41 8 L 7 8 z M 7 11 L 41 11 C 41.551068 11 42 11.448932 42 12 L 42 33 C 42 33.551068 41.551068 34 41 34 L 7 34 C 6.4489322 34 6 33.551068 6 33 L 6 12 C 6 11.448932 6.4489322 11 7 11 z M 23 41 L 25 41 L 25 44 L 23 44 L 23 41 z"/>
            </svg>
            <span className="text-white text-xs font-medium">{lang?.screen_sharing || 'Демонстрация экрана...'}</span>
          </div>
        )}

        {/* Шапка */}
        <div className="absolute left-0 right-0 top-0 p-3 bg-gradient-to-b from-black via-black/90 to-transparent">
          <div className="max-w-screen-md mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button style={{ zIndex: 999 }} onClick={() => router.back()} className="cursor-pointer duration-300 active:scale-95" type="button">
                <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z"></path>
                </svg>
              </button>
              <div className="flex items-start gap-2">
                <img src={fAvatar} className="w-10 h-10 rounded-full shadow object-cover" />
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
        <div className="absolute inset-x-0 bottom-3">
          <div className="max-w-screen-lg mx-auto flex items-center justify-center">
            <div className="flex items-center gap-1 p-1 bg-zinc-900/20 border border-zinc-600/30 rounded-full h-fit relative backdrop-blur-md backdrop-saturate-200">

              {/* Микрофон */}
              <div
                onClick={toggleMic}
                className={`border-zinc-600/30 w-14 h-14 rounded-full ${micEnabled ? 'text-zinc-200' : 'text-red-500'} hover:bg-zinc-700/95 hover:text-content-100 cursor-pointer active:scale-95 flex items-center justify-center duration-300`}
              >
                {micEnabled ? (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 2 C 19.047281 2 15 6.0472805 15 11 L 15 26 C 15 30.952719 19.047281 35 24 35 C 28.952719 35 33 30.952719 33 26 L 33 11 C 33 6.0472805 28.952719 2 24 2 z M 24 5 C 27.331281 5 30 7.6687195 30 11 L 30 26 C 30 29.331281 27.331281 32 24 32 C 20.668719 32 18 29.331281 18 26 L 18 11 C 18 7.6687195 20.668719 5 24 5 z M 10.476562 20.978516 A 1.50015 1.50015 0 0 0 9 22.5 L 9 26 C 9 33.760508 14.934038 40.16812 22.5 40.923828 L 22.5 45.5 A 1.50015 1.50015 0 1 0 25.5 45.5 L 25.5 40.923828 C 33.065962 40.16812 39 33.760508 39 26 L 39 22.5 A 1.50015 1.50015 0 1 0 36 22.5 L 36 26 C 36 32.585372 30.739679 37.894735 24.177734 37.990234 A 1.50015 1.50015 0 0 0 23.976562 37.978516 A 1.50015 1.50015 0 0 0 23.8125 37.990234 C 17.255134 37.889572 12 32.582085 12 26 L 12 22.5 A 1.50015 1.50015 0 0 0 10.476562 20.978516 z"/></svg>
                ) : (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 2 C 19.047281 2 15 6.0472805 15 11 L 15 26 C 15 30.952719 19.047281 35 24 35 C 28.952719 35 33 30.952719 33 26 L 33 11 C 33 6.0472805 28.952719 2 24 2 M 10.476562 20.978516 A 1.50015 1.50015 0 0 0 9 22.5 L 9 26 C 9 33.760508 14.934038 40.16812 22.5 40.923828 L 22.5 45.5 A 1.50015 1.50015 0 1 0 25.5 45.5 L 25.5 40.923828 C 33.065962 40.16812 39 33.760508 39 26 L 39 22.5 A 1.50015 1.50015 0 1 0 36 22.5 L 36 26 C 36 32.585372 30.739679 37.894735 24.177734 37.990234 A 1.50015 1.50015 0 0 0 23.976562 37.978516 A 1.50015 1.50015 0 0 0 23.8125 37.990234 C 17.255134 37.889572 12 32.582085 12 26 L 12 22.5 A 1.50015 1.50015 0 0 0 10.476562 20.978516 M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/></svg>
                )}
              </div>

              {/* Камера: одна кнопка + дропдаун, оба в одном relative-контейнере */}
              <div className="relative w-14 h-14">

                {/* Dropdown якорится к этому w-14 h-14 контейнеру */}
                <Dropdown
                  renderTrigger={false}
                  open={camDropdownOpen}
                  onOpenChange={setCamDropdownOpen}
                  position="top"
                  align="center"
                  width="auto"
                  closeOnChildClick={true}
                  wrapperClassName="absolute inset-0"
                >
                  {availableCameras.map((cam) => (
                    <DropdownItem
                      key={cam.deviceId}
                      onClick={() => switchCamera(cam.deviceId)}
                      iconNode={
                        selectedCameraId === cam.deviceId ? (
                          <svg className="inline w-6 h-6 fill-purple-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path d="M 40.980469 8.9902344 A 2.0002 2.0002 0 0 0 39.585938 9.5859375 L 19 30.171875 L 8.4140625 19.585938 A 2.0002 2.0002 0 1 0 5.5859375 22.414062 L 17.585938 34.414062 A 2.0002 2.0002 0 0 0 20.414062 34.414062 L 42.414062 12.414062 A 2.0002 2.0002 0 0 0 40.980469 8.9902344 z"/>
                          </svg>
                        ) : (
                          <svg className="inline w-6 h-6 fill-zinc-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 10.5 12 L 27.5 12 C 29.450062 12 31 13.549938 31 15.5 L 31 19.453125 L 31 28.482422 L 31 32.5 C 31 34.450062 29.450062 36 27.5 36 L 10.5 36 C 8.5499381 36 7 34.450062 7 32.5 L 7 15.5 C 7 13.549938 8.5499381 12 10.5 12 z M 41 16.150391 L 41 31.849609 L 34 27.650391 L 34 20.349609 L 41 16.150391 z"/>
                          </svg>
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
                      <svg className="inline w-6 h-6 fill-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                        <path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/>
                      </svg>
                    }
                    className="text-red-400"
                  >
                    {lang?.camera_off || 'Выключить камеру'}
                  </DropdownItem>
                </Dropdown>

                {/* Кнопка камеры поверх — z-index выше чем invisible меню */}
                <div
                  onClick={handleCamButtonClick}
                  className={`relative z-10 w-14 h-14 rounded-full cursor-pointer active:scale-95 flex items-center justify-center duration-300 hover:bg-zinc-700/95 ${
                    camEnabled && !isScreenSharing
                      ? camDropdownOpen ? 'text-white bg-zinc-700/60' : 'text-zinc-200'
                      : isScreenSharing ? 'text-zinc-500'
                      : 'text-red-500'
                  }`}
                >
                  {camEnabled && !isScreenSharing ? (
                    <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 10.5 12 L 27.5 12 C 29.450062 12 31 13.549938 31 15.5 L 31 19.453125 L 31 28.482422 L 31 32.5 C 31 34.450062 29.450062 36 27.5 36 L 10.5 36 C 8.5499381 36 7 34.450062 7 32.5 L 7 15.5 C 7 13.549938 8.5499381 12 10.5 12 z M 41 16.150391 L 41 31.849609 L 34 27.650391 L 34 20.349609 L 41 16.150391 z"/></svg>
                  ) : (
                    <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/></svg>
                  )}
                </div>

              </div>

              {/* Демонстрация экрана */}
              <div
                onClick={toggleScreenShare}
                title={isScreenSharing ? (lang?.stop_screen_share || 'Остановить') : (lang?.screen_share || 'Демонстрация экрана')}
                className={`border-zinc-600/30 w-14 h-14 rounded-full ${isScreenSharing ? 'text-purple-400' : 'text-zinc-200'} hover:bg-zinc-700/95 cursor-pointer active:scale-95 flex items-center justify-center duration-300`}
              >
                {isScreenSharing ? (
                  /* Иконка «остановить демонстрацию» */
                  <svg className="h-7 w-7 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M 7 8 C 4.7940678 8 3 9.7940678 3 12 L 3 33 C 3 35.205932 4.7940678 37 7 37 L 20 37 L 20 41 L 14 41 A 1.50015 1.50015 0 1 0 14 44 L 34 44 A 1.50015 1.50015 0 1 0 34 41 L 28 41 L 28 37 L 41 37 C 43.205932 37 45 35.205932 45 33 L 45 12 C 45 9.7940678 43.205932 8 41 8 L 7 8 z M 7 11 L 41 11 C 41.551068 11 42 11.448932 42 12 L 42 33 C 42 33.551068 41.551068 34 41 34 L 7 34 C 6.4489322 34 6 33.551068 6 33 L 6 12 C 6 11.448932 6.4489322 11 7 11 z M 20 18 L 20 28 L 28 23 L 20 18 z M 23 41 L 25 41 L 25 44 L 23 44 L 23 41 z"/>
                  </svg>
                ) : (
                  /* Иконка «начать демонстрацию» */
                  <svg className="h-7 w-7 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                    <path d="M 7 8 C 4.7940678 8 3 9.7940678 3 12 L 3 33 C 3 35.205932 4.7940678 37 7 37 L 20 37 L 20 41 L 14 41 A 1.50015 1.50015 0 1 0 14 44 L 34 44 A 1.50015 1.50015 0 1 0 34 41 L 28 41 L 28 37 L 41 37 C 43.205932 37 45 35.205932 45 33 L 45 12 C 45 9.7940678 43.205932 8 41 8 L 7 8 z M 7 11 L 41 11 C 41.551068 11 42 11.448932 42 12 L 42 33 C 42 33.551068 41.551068 34 41 34 L 7 34 C 6.4489322 34 6 33.551068 6 33 L 6 12 C 6 11.448932 6.4489322 11 7 11 z M 23 41 L 25 41 L 25 44 L 23 44 L 23 41 z M 24 16 L 18 22 L 22 22 L 22 31 L 26 31 L 26 22 L 30 22 L 24 16 z"/>
                  </svg>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
