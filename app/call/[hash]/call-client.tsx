'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { AncialAPI } from '../../lib/api-v2';
import Modal from '../../components/modal';

export default function CallClient() {
  const router = useRouter();
  const params = useParams<{ hash?: string }>();
  const hash = params?.hash || '';
  const { isAuthenticated, isLoading: authLoading, lang } = useAuth();

  const [dialogInfo, setDialogInfo] = useState<any>(null);
  const [foreignUser, setForeignUser] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [callStatus, setCallStatus] = useState(lang?.connecting || 'Подключение...');
  const [isRtcConnected, setIsRtcConnected] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);

  const [remoteMicEnabled, setRemoteMicEnabled] = useState<boolean | null>(null);
  const [remoteCamEnabled, setRemoteCamEnabled] = useState<boolean | null>(null);
  
  const [permissionsModal, setPermissionsModal] = useState(false);
  const [audioTapNeeded, setAudioTapNeeded] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef('');
  const isPoliteRef = useRef(false);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);

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
      const cUserId = parseInt(resp.currentUserId) || 0;
      const fUserId = parseInt(fUser.id) || 0;
      
      setDialogInfo(dialog);
      setForeignUser(fUser);
      
      isPoliteRef.current = (fUserId > 0 && cUserId > fUserId);

      // Require permissions
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
        await pc.setLocalDescription();
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
        setCallStatus('Соединено');
      } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setIsRtcConnected(false);
        setCallStatus('Соединение потеряно');
      }
    };
  };

  const setupGlobalWS = () => {
    if (!window.GlobalWS) return;
    
    window.GlobalWS.subscribeDialog(dialogInfo.id);
    
    if (window.GlobalWS.isReady()) {
      setCallStatus('Ожидание ответа...');
    }
    
    window.GlobalWS.addDialogListener('auth_ok', () => {
      setCallStatus('Ожидание ответа...');
    });
    window.GlobalWS.addDialogListener('subscribed', () => {
      setCallStatus('Ожидание ответа...');
    });
    
    window.GlobalWS.addDialogListener('call:signal', async (msg: any) => {
      handleWsSignal(msg.data || msg);
    });
  };

  const sendWsSignal = (data: any) => {
    if (!window.GlobalWS) return;
    window.GlobalWS.send({
      type: 'call:signal',
      dialog_id: dialogInfo.id,
      call_id: callIdRef.current,
      ...data
    });
  };

  // A queue to ensure signals are processed sequentially,
  // preventing ICE candidates from failing if setRemoteDescription is still pending.
  const signalQueueRef = useRef<Promise<void>>(Promise.resolve());

  const handleWsSignal = (msg: any) => {
    signalQueueRef.current = signalQueueRef.current.then(async () => {
      const pc = pcRef.current;
      if (!pc) return;

    try {
      if (msg.call_id && !callIdRef.current) {
        callIdRef.current = msg.call_id;
      } else if (msg.call_id && callIdRef.current && msg.call_id !== callIdRef.current) {
        if (isPoliteRef.current && msg.kind === 'offer') {
          // If we are polite, we adopt the other peer's call_id during a collision
          callIdRef.current = msg.call_id;
        } else {
          return; // Ignore signals from other call sessions
        }
      }

      if (msg.kind === 'media') {
        if (msg.mic_enabled !== undefined) setRemoteMicEnabled(msg.mic_enabled);
        if (msg.cam_enabled !== undefined) setRemoteCamEnabled(msg.cam_enabled);
        return;
      }

      if (msg.kind === 'offer') {
        const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
        ignoreOfferRef.current = !isPoliteRef.current && offerCollision;
        if (ignoreOfferRef.current) return;

        await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
        await pc.setLocalDescription();
        sendWsSignal({ kind: 'answer', sdp: pc.localDescription?.sdp });
      } else if (msg.kind === 'answer') {
        await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp });
        } else if (msg.kind === 'candidate' || msg.kind === 'ice') {
          try {
            await pc.addIceCandidate(msg.candidate);
          } catch (err) {
            if (!ignoreOfferRef.current) console.error(err);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }); // End of signalQueueRef.current.then
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(t => t.enabled = !micEnabled);
      setMicEnabled(!micEnabled);
      sendWsSignal({ kind: 'media', mic_enabled: !micEnabled, cam_enabled: camEnabled });
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(t => t.enabled = !camEnabled);
      setCamEnabled(!camEnabled);
      sendWsSignal({ kind: 'media', mic_enabled: micEnabled, cam_enabled: !camEnabled });
    }
  };

  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
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
    return <div className="h-screen w-full flex items-center justify-center bg-black"><span className="text-white">{errorMsg || 'Loading...'}</span></div>;
  }

  const fName = foreignUser ? `${foreignUser.fname || ''} ${foreignUser.lname || ''}`.trim() : '...';
  const fAvatar = foreignUser?.img || '/includes/img/anlite/nothingfound.webp';

  const showCover = !isRtcConnected || remoteCamEnabled === false;

  return (
    <div className="w-full" id="call-root" style={{ minHeight: '100dvh' }}>
      <style>{`#NAVP, [data-app-nav="mobile"] { display: none !important; }`}</style>
      <div className="fixed inset-0 bg-black">
        <video ref={remoteVideoRef} className={`absolute inset-0 w-full h-full object-cover ${showCover ? 'hidden' : ''}`} autoPlay playsInline></video>

        {showCover && (
          <div id="call-cover" className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
            <div className="w-full max-w-screen-sm px-6 text-center">
              <img src={fAvatar} className="w-28 h-28 rounded-full shadow object-cover mx-auto" />
              <div className="mt-4 text-zinc-100 text-2xl font-semibold">{fName}</div>
              <div className="mt-2 text-zinc-300">{remoteCamEnabled === false ? 'Камера выключена' : callStatus}</div>
            </div>
          </div>
        )}

        {remoteMicEnabled === false && (
          <div className="absolute top-6 right-6 bg-red-500/80 backdrop-blur-md p-2 rounded-full shadow-lg z-50">
            <svg className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M19 11v1.6l-2-2V11c0-2.76-2.24-5-5-5-1.04 0-1.99.32-2.79.86l-1.48-1.48C9.07 4.54 10.45 4 12 4c3.87 0 7 3.13 7 7zm-7 8c-3.53 0-6.43-2.61-6.92-6H3.05c.53 4.3 4.14 7.68 8.45 7.93V24h1v-3.07c1.33-.08 2.6-.46 3.73-1.05l-1.47-1.47C13.88 18.79 12.96 19 12 19zm4.27-2.68L20.2 20.25l-1.27 1.27-3.95-3.95C14.15 17.84 13.11 18 12 18c-3.87 0-7-3.13-7-7H3c0 3.99 2.8 7.33 6.5 7.91v2.99h1v-2.99c1.69-.26 3.22-.96 4.49-1.95l3.54 3.54 1.27-1.27-3.53-3.53zM12 13.17L7.83 9A5 5 0 0 1 12 6c1.66 0 3 1.34 3 3v2.17l-3-3zM5.41 4.59L4 6l2.12 2.12A4.986 4.986 0 0 0 6 11v1h2v-1c0-.43.06-.85.18-1.25L10.33 12H12v2.54l1.23 1.23A4.986 4.986 0 0 0 14 11v-1.63L18.41 19 19.83 17.59 5.41 4.59z"/>
            </svg>
          </div>
        )}

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

        <div className="absolute inset-x-0 top-14 lg:top-3 flex items-center justify-center px-3 w-full duration-300">
          <div className="flex justify-end w-full max-w-screen-md h-full">
            <video ref={localVideoRef} className="duration-300 w-28 sm:w-32 md:w-48 rounded-2xl overflow-hidden shadow border border-zinc-600/30 bg-zinc-900" autoPlay playsInline muted></video>
          </div>
        </div>

        {permissionsModal && (
        <Modal
          isOpen={permissionsModal}
          onClose={() => router.back()}
          title="Доступ к медиа"
        >
          <div className="flex flex-col gap-3">
            <div className="text-zinc-300 text-sm">
              Нажмите кнопку ниже и подтвердите разрешение в браузере.
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={initCall} className="w-full rounded-3xl bg-purple-600 hover:bg-purple-500 duration-150 px-3 py-2 active:scale-95 border border-zinc-600/30" type="button">Разрешить</button>
              <button onClick={() => router.back()} className="w-full rounded-3xl bg-zinc-700 hover:bg-zinc-600 duration-150 px-3 py-2 active:scale-95 border border-zinc-600/30" type="button">Отклонить</button>
            </div>
          </div>
        </Modal>
        )}

        <div className="absolute inset-x-0 bottom-3">
          <div className="max-w-screen-lg mx-auto flex items-center justify-center">
            <div className="flex items-center gap-1 p-1 bg-zinc-900/20 border border-zinc-600/30 rounded-full h-fit relative backdrop-blur-md backdrop-saturate-200">
              <div onClick={toggleMic} className={`border-zinc-600/30 w-14 h-14 rounded-full ${micEnabled ? 'text-zinc-200' : 'text-red-500'} hover:bg-zinc-700/95 hover:text-content-100 cursor-pointer active:scale-95 flex items-center justify-center duration-300`}>
                {micEnabled ? (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 2 C 19.047281 2 15 6.0472805 15 11 L 15 26 C 15 30.952719 19.047281 35 24 35 C 28.952719 35 33 30.952719 33 26 L 33 11 C 33 6.0472805 28.952719 2 24 2 z M 24 5 C 27.331281 5 30 7.6687195 30 11 L 30 26 C 30 29.331281 27.331281 32 24 32 C 20.668719 32 18 29.331281 18 26 L 18 11 C 18 7.6687195 20.668719 5 24 5 z M 10.476562 20.978516 A 1.50015 1.50015 0 0 0 9 22.5 L 9 26 C 9 33.760508 14.934038 40.16812 22.5 40.923828 L 22.5 45.5 A 1.50015 1.50015 0 1 0 25.5 45.5 L 25.5 40.923828 C 33.065962 40.16812 39 33.760508 39 26 L 39 22.5 A 1.50015 1.50015 0 1 0 36 22.5 L 36 26 C 36 32.585372 30.739679 37.894735 24.177734 37.990234 A 1.50015 1.50015 0 0 0 23.976562 37.978516 A 1.50015 1.50015 0 0 0 23.8125 37.990234 C 17.255134 37.889572 12 32.582085 12 26 L 12 22.5 A 1.50015 1.50015 0 0 0 10.476562 20.978516 z"/></svg>
                ) : (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 24 2 C 19.047281 2 15 6.0472805 15 11 L 15 26 C 15 30.952719 19.047281 35 24 35 C 28.952719 35 33 30.952719 33 26 L 33 11 C 33 6.0472805 28.952719 2 24 2 M 10.476562 20.978516 A 1.50015 1.50015 0 0 0 9 22.5 L 9 26 C 9 33.760508 14.934038 40.16812 22.5 40.923828 L 22.5 45.5 A 1.50015 1.50015 0 1 0 25.5 45.5 L 25.5 40.923828 C 33.065962 40.16812 39 33.760508 39 26 L 39 22.5 A 1.50015 1.50015 0 1 0 36 22.5 L 36 26 C 36 32.585372 30.739679 37.894735 24.177734 37.990234 A 1.50015 1.50015 0 0 0 23.976562 37.978516 A 1.50015 1.50015 0 0 0 23.8125 37.990234 C 17.255134 37.889572 12 32.582085 12 26 L 12 22.5 A 1.50015 1.50015 0 0 0 10.476562 20.978516 M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/></svg>
                )}
              </div>
              <div onClick={toggleCam} className={`border-zinc-600/30 w-14 h-14 rounded-full ${camEnabled ? 'text-zinc-200' : 'text-red-500'} hover:bg-zinc-700/95 hover:text-content-100 cursor-pointer active:scale-95 flex items-center justify-center duration-300`}>
                {camEnabled ? (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 10.5 12 L 27.5 12 C 29.450062 12 31 13.549938 31 15.5 L 31 19.453125 L 31 28.482422 L 31 32.5 C 31 34.450062 29.450062 36 27.5 36 L 10.5 36 C 8.5499381 36 7 34.450062 7 32.5 L 7 15.5 C 7 13.549938 8.5499381 12 10.5 12 z M 41 16.150391 L 41 31.849609 L 34 27.650391 L 34 20.349609 L 41 16.150391 z"/></svg>
                ) : (
                  <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M 10.5 9 C 6.9280619 9 4 11.928062 4 15.5 L 4 32.5 C 4 36.071938 6.9280619 39 10.5 39 L 27.5 39 C 31.071938 39 34 36.071938 34 32.5 L 34 31.150391 L 41.728516 35.787109 A 1.50015 1.50015 0 0 0 44 34.5 L 44 13.5 A 1.50015 1.50015 0 0 0 42.455078 12 A 1.50015 1.50015 0 0 0 41.728516 12.212891 L 34 16.849609 L 34 15.5 C 34 11.928062 31.071938 9 27.5 9 L 10.5 9 z M 7.5 4.5 L 43.5 40.5 L 40.5 43.5 L 4.5 7.5 Z"/></svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
