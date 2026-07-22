'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { AncialAPI } from '../../lib/api-v2';

export default function QRContent() {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showNote } = useNotification();

  const [scriptLoaded, setScriptLoaded] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  // Scan results
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [resolvedWallet, setResolvedWallet] = useState<{
    account_id: number;
    account_name: string;
    owner_name: string;
    owner_login: string;
  } | null>(null);
  const [resolvedLoading, setResolvedLoading] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const lastQRResultRef = useRef<{ data: string; location: any } | null>(null);
  const workerBusyRef = useRef<boolean>(false);

  // Detection states (like legacy code)
  const detectionStartTimeRef = useRef<number | null>(null);
  const lastDetectedDataRef = useRef<string | null>(null);
  const lastQRSeenTimeRef = useRef<number | null>(null);
  const lastQRLocationRef = useRef<any>(null);

  const SCAN_DELAY = 500; // ms
  const QR_LOST_TOLERANCE = 500; // ms

  const strings = useMemo(() => {
    return {
      qrscanner: lang?.qrscanner || 'QR Сканер',
      flash: lang?.flash || 'Вспышка',
      camera: lang?.camera || 'Камера',
      openlink: lang?.openlink || 'Открыть ссылку',
      copylink: lang?.copylink || 'Скопировать ссылку',
      writeemail: lang?.writeemail || 'Написать письмо',
      copyemail: lang?.copyemail || 'Скопировать email',
      call: lang?.call || 'Позвонить',
      copyphone: lang?.copyphone || 'Скопировать телефон',
      showpassword: lang?.showpassword || 'Показать пароль',
      gotopayment: lang?.gotopayment || 'Перейти к оплате',
      copytext: lang?.copytext || 'Скопировать текст',
      scanagain: lang?.scanagain || 'Сканировать заново',
      noaccesstocamera: lang?.noaccesstocamera || 'Нет доступа к камере',
      copied: lang?.copied || 'Скопировано!'
    };
  }, [lang]);

  // jsQR is bundled directly via npm import

  // Camera start / stop flow
  const startCamera = async () => {
    if (streamRef.current) {
      stopCamera();
    }
    setCameraError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
      }

      // Check flash support
      const track = stream.getVideoTracks()[0];
      if (track && typeof track.getCapabilities === 'function') {
        const capabilities = track.getCapabilities() as any;
        setFlashSupported(!!capabilities.torch);
      } else {
        setFlashSupported(false);
      }
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraError(strings.noaccesstocamera);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    workerBusyRef.current = false;
    lastQRResultRef.current = null;
    setFlashEnabled(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login?backurl=/wallet/qr');
      return;
    }

    if (scriptLoaded && scanning) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scriptLoaded, scanning, facingMode, isAuthenticated, authLoading]);

  // Main scan loop using requestAnimationFrame
  useEffect(() => {
    if (!scriptLoaded || !scanning || !cameraActive || !streamRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    if (!video || !canvas || !overlay) return;

    const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
    const overlayContext = overlay.getContext('2d');
    if (!canvasContext || !overlayContext) return;

    // Spin up QR decoder Worker
    const worker = new Worker('/qr-worker.js');
    workerRef.current = worker;
    workerBusyRef.current = false;
    lastQRResultRef.current = null;

    worker.onmessage = (e: MessageEvent) => {
      workerBusyRef.current = false;
      lastQRResultRef.current = e.data; // null or { data, location }
    };

    // RAF loop — only captures frames and draws overlay. Decode is async in worker.
    const loop = () => {
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        // Set canvas dimensions only when they change
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        // Update overlay size to match display
        const displayWidth = video.clientWidth;
        const displayHeight = video.clientHeight;
        if (displayWidth > 0 && displayHeight > 0 && (overlay.width !== displayWidth || overlay.height !== displayHeight)) {
          overlay.width = displayWidth;
          overlay.height = displayHeight;
        }

        // Grab current frame and send to worker if idle
        canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (!workerBusyRef.current) {
          const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height);
          workerBusyRef.current = true;
          worker.postMessage(
            { data: imageData.data, width: imageData.width, height: imageData.height },
            [imageData.data.buffer]
          );
        }

        // Process latest worker result
        const result = lastQRResultRef.current;
        if (result && result.data && result.location) {
          lastQRSeenTimeRef.current = Date.now();
          lastQRLocationRef.current = result.location;

          if (!detectionStartTimeRef.current || lastDetectedDataRef.current !== result.data) {
            detectionStartTimeRef.current = Date.now();
            lastDetectedDataRef.current = result.data;
          }

          const elapsed = Date.now() - detectionStartTimeRef.current;
          const progress = Math.min(elapsed / 300, 1);

          drawTelegramOverlay(overlay, overlayContext, result.location, progress);

          if (elapsed >= 300) {
            if (navigator.vibrate) navigator.vibrate(200);
            handleQRSuccess(result.data);
            return;
          }
        } else {
          // Handle brief frame-loss tolerance
          if (detectionStartTimeRef.current && lastQRSeenTimeRef.current && lastQRLocationRef.current) {
            const timeSinceLastSeen = Date.now() - lastQRSeenTimeRef.current;
            if (timeSinceLastSeen <= QR_LOST_TOLERANCE) {
              const elapsed = Date.now() - detectionStartTimeRef.current;
              const progress = Math.min(elapsed / SCAN_DELAY, 1);
              drawTelegramOverlay(overlay, overlayContext, lastQRLocationRef.current, progress);

              if (elapsed >= SCAN_DELAY && lastDetectedDataRef.current) {
                if (navigator.vibrate) navigator.vibrate(200);
                handleQRSuccess(lastDetectedDataRef.current);
                return;
              }
            } else {
              clearOverlay(overlay, overlayContext);
              detectionStartTimeRef.current = null;
              lastDetectedDataRef.current = null;
              lastQRSeenTimeRef.current = null;
              lastQRLocationRef.current = null;
            }
          } else {
            clearOverlay(overlay, overlayContext);
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      worker.terminate();
      workerRef.current = null;
    };
  }, [scriptLoaded, scanning, cameraActive, facingMode]);

  // Drawing overlay box (Telegram style frame)
  const drawTelegramOverlay = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    location: any,
    progress: number
  ) => {
    const video = videoRef.current;
    if (!video) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate scale factors
    const scaleX = canvas.width / video.videoWidth;
    const scaleY = canvas.height / video.videoHeight;

    const p1 = { x: location.topLeftCorner.x * scaleX, y: location.topLeftCorner.y * scaleY };
    const p2 = { x: location.topRightCorner.x * scaleX, y: location.topRightCorner.y * scaleY };
    const p3 = { x: location.bottomRightCorner.x * scaleX, y: location.bottomRightCorner.y * scaleY };
    const p4 = { x: location.bottomLeftCorner.x * scaleX, y: location.bottomLeftCorner.y * scaleY };

    // Center of QR
    const centerX = (p1.x + p2.x + p3.x + p4.x) / 4;
    const centerY = (p1.y + p2.y + p3.y + p4.y) / 4;

    // Average side size
    const side1 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    const side2 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));
    const side3 = Math.sqrt(Math.pow(p4.x - p3.x, 2) + Math.pow(p4.y - p3.y, 2));
    const side4 = Math.sqrt(Math.pow(p1.x - p4.x, 2) + Math.pow(p1.y - p4.y, 2));
    const avgSize = (side1 + side2 + side3 + side4) / 4;

    const padding = 20;
    const size = avgSize + padding * 2;
    const halfSize = size / 2;

    const angle1 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angle2 = Math.atan2(p3.y - p4.y, p3.x - p4.x);
    const avgAngle = (angle1 + angle2) / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(avgAngle);

    // Punch out the scanning frame (destination-out)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';

    const radius = 24;
    ctx.beginPath();
    ctx.moveTo(-halfSize + radius, -halfSize);
    ctx.lineTo(halfSize - radius, -halfSize);
    ctx.arcTo(halfSize, -halfSize, halfSize, -halfSize + radius, radius);
    ctx.lineTo(halfSize, halfSize - radius);
    ctx.arcTo(halfSize, halfSize, halfSize - radius, halfSize, radius);
    ctx.lineTo(-halfSize + radius, halfSize);
    ctx.arcTo(-halfSize, halfSize, -halfSize, halfSize - radius, radius);
    ctx.lineTo(-halfSize, -halfSize + radius);
    ctx.arcTo(-halfSize, -halfSize, -halfSize + radius, -halfSize, radius);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';

    // Draw frame stroke with progress-based glow
    ctx.strokeStyle = `rgba(137, 40, 201, ${0.7 + progress * 0.3})`;
    ctx.lineWidth = 4 + progress * 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = `rgba(137, 40, 201, ${progress * 0.9})`;
    ctx.shadowBlur = 25 * progress;

    ctx.beginPath();
    ctx.moveTo(-halfSize + radius, -halfSize);
    ctx.lineTo(halfSize - radius, -halfSize);
    ctx.arcTo(halfSize, -halfSize, halfSize, -halfSize + radius, radius);
    ctx.lineTo(halfSize, halfSize - radius);
    ctx.arcTo(halfSize, halfSize, halfSize - radius, halfSize, radius);
    ctx.lineTo(-halfSize + radius, halfSize);
    ctx.arcTo(-halfSize, halfSize, -halfSize, halfSize - radius, radius);
    ctx.lineTo(-halfSize, -halfSize + radius);
    ctx.arcTo(-halfSize, -halfSize, -halfSize + radius, -halfSize, radius);
    ctx.closePath();
    ctx.stroke();

    // Corner brackets
    const cornerSize = 25 + progress * 10;
    ctx.lineWidth = 5;
    ctx.strokeStyle = `rgba(168, 85, 247, ${0.9 + progress * 0.1})`;

    // Top left
    ctx.beginPath();
    ctx.moveTo(-halfSize + cornerSize, -halfSize);
    ctx.lineTo(-halfSize + radius, -halfSize);
    ctx.arcTo(-halfSize, -halfSize, -halfSize, -halfSize + radius, radius);
    ctx.lineTo(-halfSize, -halfSize + cornerSize);
    ctx.stroke();

    // Top right
    ctx.beginPath();
    ctx.moveTo(halfSize - cornerSize, -halfSize);
    ctx.lineTo(halfSize - radius, -halfSize);
    ctx.arcTo(halfSize, -halfSize, halfSize, -halfSize + radius, radius);
    ctx.lineTo(halfSize, -halfSize + cornerSize);
    ctx.stroke();

    // Bottom right
    ctx.beginPath();
    ctx.moveTo(halfSize - cornerSize, halfSize);
    ctx.lineTo(halfSize - radius, halfSize);
    ctx.arcTo(halfSize, halfSize, halfSize, halfSize - radius, radius);
    ctx.lineTo(halfSize, halfSize - cornerSize);
    ctx.stroke();

    // Bottom left
    ctx.beginPath();
    ctx.moveTo(-halfSize + cornerSize, halfSize);
    ctx.lineTo(-halfSize + radius, halfSize);
    ctx.arcTo(-halfSize, halfSize, -halfSize, halfSize - radius, radius);
    ctx.lineTo(-halfSize, halfSize - cornerSize);
    ctx.stroke();

    ctx.restore();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  };

  const clearOverlay = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Switch between front/back camera
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Toggle flash torch
  const handleToggleFlash = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === 'function') {
      try {
        const nextFlashState = !flashEnabled;
        await track.applyConstraints({
          advanced: [{ torch: nextFlashState }]
        } as any);
        setFlashEnabled(nextFlashState);
      } catch (err) {
        console.error('Flash toggle failed:', err);
      }
    }
  };

  // Scanned QR code successful trigger
  const handleQRSuccess = async (data: string) => {
    setScanning(false);
    stopCamera();
    setScannedData(data);

    const trimmedData = data.trim();
    const isWallet = trimmedData.startsWith('ancial:wallet:') || trimmedData.startsWith('ancwal:') || /^\d+$/.test(trimmedData);

    if (isWallet) {
      setResolvedLoading(true);
      try {
        const cleanQR = trimmedData.startsWith('ancial:wallet:') || trimmedData.startsWith('ancwal:')
          ? trimmedData.replace('ancwal:', 'ancial:wallet:')
          : `ancial:wallet:${trimmedData}`;

        const res = await AncialAPI.resolveQRCode(cleanQR);
        if (res && res.type === 'wallet') {
          setResolvedWallet({
            account_id: res.account_id || 0,
            account_name: res.account_name || (lang?.bankaccount || 'Счёт'),
            owner_name: res.owner_name || (lang?.user || 'Пользователь'),
            owner_login: res.owner_login || ''
          });
        }
      } catch (err) {
        console.error('Failed to resolve wallet QR code:', err);
      } finally {
        setResolvedLoading(false);
      }
    }
  };

  // Helper functions for content types (matching legacy)
  const isURL = (str: string) => {
    try {
      new URL(str);
      return true;
    } catch {
      return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(str);
    }
  };

  const isEmail = (str: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };

  const isPhone = (str: string) => {
    return /^[\d\s()+-]{10,}$/.test(str);
  };

  const isWiFi = (str: string) => {
    return str.startsWith('WIFI:');
  };

  const parseWiFi = (str: string) => {
    const ssidMatch = str.match(/S:([^;]+)/);
    const passMatch = str.match(/P:([^;]+)/);
    if (ssidMatch && passMatch) {
      return { ssid: ssidMatch[1], password: passMatch[1] };
    }
    return null;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const resetScanner = () => {
    setScannedData(null);
    setResolvedWallet(null);
    setScanning(true);
  };


  const renderActions = () => {
    if (!scannedData) return null;

    const buttons = [];

    // Wallet QR resolved
    if (resolvedWallet) {
      buttons.push(
        <button
          key="pay-wallet"
          onClick={() => {
            stopCamera();
            const loginParam = resolvedWallet.owner_login
              ? `&login=${encodeURIComponent(resolvedWallet.owner_login)}`
              : '';
            router.push(`/wallet?action=send${loginParam}`);
          }}
          className="flex items-center justify-center gap-3 p-3 bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-3xl duration-300 active:scale-95 border border-zinc-700/30"
        >
          <svg className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M39.175,10.016c1.687,0,2.131,1.276,1.632,4.272c-0.571,3.426-2.216,14.769-3.528,21.83 c-0.502,2.702-1.407,3.867-2.724,3.867c-0.724,0-1.572-0.352-2.546-0.995c-1.32-0.872-7.984-5.279-9.431-6.314 c-1.32-0.943-3.141-2.078-0.857-4.312c0.813-0.796,6.14-5.883,10.29-9.842c0.443-0.423,0.072-1.068-0.42-1.068 c-0.112,0-0.231,0.034-0.347,0.111c-5.594,3.71-13.351,8.859-14.338,9.53c-0.987,0.67-1.949,1.1-3.231,1.1 c-0.655,0-1.394-0.112-2.263-0.362c-1.943-0.558-3.84-1.223-4.579-1.477c-2.845-0.976-2.17-2.241,0.593-3.457 c11.078-4.873,25.413-10.815,27.392-11.637C36.746,10.461,38.178,10.016,39.175,10.016 M39.175,7.016L39.175,7.016 c-1.368,0-3.015,0.441-5.506,1.474L33.37,8.614C22.735,13.03,13.092,17.128,6.218,20.152c-1.074,0.473-4.341,1.91-4.214,4.916 c0.054,1.297,0.768,3.065,3.856,4.124l0.228,0.078c0.862,0.297,2.657,0.916,4.497,1.445c1.12,0.322,2.132,0.478,3.091,0.478 c1.664,0,2.953-0.475,3.961-1.028c-0.005,0.168-0.001,0.337,0.012,0.507c0.182,2.312,1.97,3.58,3.038,4.338l0.149,0.106 c1.577,1.128,8.714,5.843,9.522,6.376c1.521,1.004,2.894,1.491,4.199,1.491c2.052,0,4.703-1.096,5.673-6.318 c0.921-4.953,1.985-11.872,2.762-16.924c0.331-2.156,0.603-3.924,0.776-4.961c0.349-2.094,0.509-4.466-0.948-6.185 C42.208,7.875,41.08,7.016,39.175,7.016L39.175,7.016z" />
          </svg>
          <span>{lang?.send || 'Перевести'} {resolvedWallet.owner_name}</span>
        </button>
      );
    }

    // HTTP Link
    if (isURL(scannedData)) {
      buttons.push(
        <button
          key="open-link"
          onClick={() => window.open(scannedData, '_blank')}
          className="flex items-center justify-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-3xl duration-300 active:scale-95 border border-zinc-600/30"
        >
          <span>{strings.openlink}</span>
        </button>
      );
    }

    // Email address
    if (isEmail(scannedData)) {
      buttons.push(
        <button
          key="send-email"
          onClick={() => (window.location.href = `mailto:${scannedData}`)}
          className="flex items-center justify-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-3xl duration-300 active:scale-95 border border-zinc-600/30"
        >
          <span>{strings.writeemail}</span>
        </button>
      );
    }

    // Phone number
    if (isPhone(scannedData)) {
      buttons.push(
        <button
          key="call-phone"
          onClick={() => (window.location.href = `tel:${scannedData}`)}
          className="flex items-center justify-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-3xl duration-300 active:scale-95 border border-zinc-600/30"
        >
          <span>{strings.call}</span>
        </button>
      );
    }

    // Wifi QR code
    if (isWiFi(scannedData)) {
      const wifi = parseWiFi(scannedData);
      if (wifi) {
        buttons.push(
          <button
            key="show-wifi"
            onClick={() =>
              showNote({
                content: `${lang?.network || 'Сеть:'} ${wifi.ssid} | ${lang?.password || 'Пароль:'} ${wifi.password}`,
                type: 'info',
                time: 10
              })
            }
            className="flex items-center justify-center gap-3 p-3 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-3xl duration-300 active:scale-95 border border-zinc-600/30"
          >
            <span>{strings.showpassword}</span>
          </button>
        );
      }
    }

    // Always copy button
    buttons.push(
      <button
        key="copy-text"
        onClick={() => copyToClipboard(scannedData)}
        className="flex items-center justify-center gap-3 p-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white font-semibold rounded-3xl duration-300 active:scale-95 border border-zinc-600/30"
      >
        <span>{strings.copytext}</span>
      </button>
    );

    return <div className="w-full flex flex-col gap-2.5">{buttons}</div>;
  };

  return (
    <div className="flex flex-col w-full items-center justify-center pb-3 gap-3 bg-black min-h-screen">
      {/* Header / Title */}
      <div className="w-full max-w-screen-md flex items-center gap-3 px-3 lg:px-0 pt-3">
        <span
          onClick={() => {
            stopCamera();
            router.push('/wallet');
          }}
          className="w-fit text-3xl font-extralight hover:text-zinc-300 duration-300 active:scale-95 flex items-center gap-1.5 cursor-pointer text-zinc-100"
        >
          <svg className="w-8 h-8 fill-white inline" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
            <path d="M 29.449219 4.9863281 A 1.50015 1.50015 0 0 0 28.423828 5.4550781 L 11.423828 22.955078 A 1.50015 1.50015 0 0 0 11.423828 25.044922 L 28.423828 42.544922 A 1.50015 1.50015 0 1 0 30.576172 40.455078 L 14.591797 24 L 30.576172 7.5449219 A 1.50015 1.50015 0 0 0 29.449219 4.9863281 z" />
          </svg>
          {strings.qrscanner}
        </span>
      </div>

      {/* Main scanning viewport / results card */}
      <div className="w-full max-w-screen-md flex flex-col gap-3 px-3 lg:px-0 flex-grow lg:items-center">

        {scanning && (
          <div className="flex flex-col gap-3 items-center w-full max-w-md">
            {/* Viewport container */}
            <div className="relative w-full aspect-square bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={overlayRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

              {/* Corner markings inside CSS for static frame if needed */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-purple-500/25 rounded-3xl pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-2xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-2xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-2xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-2xl" />
              </div>

              {/* Scanner guide label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                <p className="text-purple-400 text-center text-sm font-semibold animate-pulse">
                  {cameraError || (lang?.point_camera_at_qr || 'Наведите камеру на QR-код')}
                </p>
              </div>
            </div>

            {/* Flash / Camera switchers */}
            <div className="flex gap-3 w-full">
              <button
                onClick={handleToggleFlash}
                disabled={!flashSupported}
                className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-3xl backdrop-blur-lg active:scale-95 duration-300 ${flashEnabled
                  ? 'bg-purple-700 hover:bg-purple-650 border-purple-650 text-white shadow'
                  : 'bg-zinc-900/40 border-zinc-700/30 hover:bg-zinc-800 text-zinc-300'
                  } ${!flashSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-bold">{strings.flash}</span>
              </button>
              <button
                onClick={handleSwitchCamera}
                className="flex-grow flex items-center justify-center gap-2 p-3 bg-zinc-900/40 border border-zinc-700/30 hover:bg-zinc-800 text-zinc-350 hover:text-white rounded-3xl backdrop-blur-lg active:scale-95 duration-300"
              >
                <svg className="w-5 h-5 fill-none stroke-current" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-bold">{strings.camera}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scan Result Container */}
        {scannedData && (
          <div className="flex flex-col gap-3 items-center w-full max-w-md">

            {/* QR Content Box */}
            <div className="w-full p-4 bg-zinc-900/60 border border-zinc-800 backdrop-blur-lg rounded-3xl text-left">
              <div className="flex items-center gap-2 mb-2 text-zinc-400">
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <span className="text-xs font-bold uppercase tracking-wider">{lang?.qr_data || 'Данные QR-кода:'}</span>
              </div>
              <div className="w-full p-3.5 bg-black/45 rounded-2xl border border-zinc-800/40">
                {resolvedLoading ? (
                  <div className="flex items-center justify-center p-2">
                    <div className="w-5 h-5 rounded-full animate-spin border-2 border-solid border-purple-500 border-t-transparent" />
                  </div>
                ) : resolvedWallet ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-purple-400 font-bold text-base">{resolvedWallet.owner_name}</span>
                    <span className="text-zinc-400 text-xs font-mono">{lang?.walletAccount || 'Счёт'}: #{resolvedWallet.account_id} ({resolvedWallet.account_name})</span>
                  </div>
                ) : (
                  <p className="text-zinc-100 font-mono text-sm break-all">{scannedData}</p>
                )}
              </div>
            </div>

            {/* Actions Trigger Block */}
            {renderActions()}

            {copiedSuccess && (
              <span className="text-green-500 text-xs font-bold animate-pulse">{strings.copied}</span>
            )}

            {/* Rescan Button */}
            <button
              onClick={resetScanner}
              className="w-full p-3 bg-zinc-900/40 hover:bg-zinc-800 text-white font-bold rounded-3xl backdrop-blur-lg active:scale-95 duration-300 border border-zinc-700/30"
            >
              {strings.scanagain}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
