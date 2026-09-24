'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useCopyToClipboard } from '../../hooks/use-copy-to-clipboard';
import { AncialAPI } from '../../lib/api-v2';
import Icon from '../../components/svg-icon';

/** Координаты углов QR-кода из jsQR (topLeftCorner и т.д.). */
interface QRLocation {
  topLeftCorner: { x: number; y: number };
  topRightCorner: { x: number; y: number };
  bottomRightCorner: { x: number; y: number };
  bottomLeftCorner: { x: number; y: number };
}

/** MediaTrackCapabilities с флагом вспышки (torch есть не на всех устройствах). */
interface TrackCapabilitiesWithTorch extends MediaTrackCapabilities {
  torch?: boolean;
}

export default function QRContent() {
  const router = useRouter();
  const { lang, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showNote } = useNotification();
  const copyToClipboard = useCopyToClipboard();

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
  const lastQRResultRef = useRef<{ data: string; location: QRLocation } | null>(null);
  const workerBusyRef = useRef<boolean>(false);

  // Detection states (like legacy code)
  const detectionStartTimeRef = useRef<number | null>(null);
  const lastDetectedDataRef = useRef<string | null>(null);
  const lastQRSeenTimeRef = useRef<number | null>(null);
  const lastQRLocationRef = useRef<QRLocation | null>(null);

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
        const capabilities = track.getCapabilities() as TrackCapabilitiesWithTorch;
        setFlashSupported(!!capabilities.torch);
      } else {
        setFlashSupported(false);
      }
    } catch {
      console.error('Camera startup error');
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
      // Легаси mount-запуск камеры: setState внутри startCamera выполняются
      // после await getUserMedia, синхронного каскадного рендера нет.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCamera();
    }

    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-логика камеры: перезапуск при пересоздании startCamera недопустим
  }, [scriptLoaded, scanning, facingMode, isAuthenticated, authLoading]);

  // Drawing overlay box (Telegram style frame)
  const drawTelegramOverlay = (
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    location: QRLocation,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- сканер: handleQRSuccess захватывается на старте сканирования
  }, [scriptLoaded, scanning, cameraActive, facingMode]);

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
        } as MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> });
        setFlashEnabled(nextFlashState);
      } catch (err) {
        console.error('Flash toggle failed:', err);
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

  const handleCopyToClipboard = (text: string) => {
    void copyToClipboard(text);
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
          <Icon name="IC-send" className="w-6 h-6 fill-white" />
          <span>{lang?.wallet_transfer || 'Перевести'} {resolvedWallet.owner_name}</span>
        </button>
      );
    }

    // HTTP Link
    if (isURL(scannedData)) {
      buttons.push(
        <button
          key="open-link"
          onClick={() => window.open(scannedData, '_blank', 'noopener,noreferrer')}
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
        onClick={() => handleCopyToClipboard(scannedData)}
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
          <Icon name="IC-chevron-left" className="w-8 h-8 fill-white inline" />
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
                className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-3xl glass-panel [--glass-blur:16px] active:scale-95 duration-300 ${flashEnabled
                  ? '[--glass-tint:var(--color-purple-700)] [--glass-alpha:1] hover:bg-purple-650 border-purple-650 text-white shadow'
                  : '[--glass-alpha:0.4] border-zinc-700/30 hover:bg-zinc-800 text-zinc-300'
                  } ${!flashSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icon name="IC-flash" className="w-5 h-5 fill-none stroke-current" />
                <span className="font-bold">{strings.flash}</span>
              </button>
              <button
                onClick={handleSwitchCamera}
                className="glass-panel [--glass-alpha:0.4] [--glass-blur:16px] flex-grow flex items-center justify-center gap-2 p-3 border border-zinc-700/30 hover:[--glass-tint:var(--color-zinc-800)] hover:[--glass-alpha:1] text-zinc-350 hover:text-white rounded-3xl active:scale-95 duration-300"
              >
                <Icon name="IC-camera-switch" className="w-5 h-5 fill-none stroke-current" />
                <span className="font-bold">{strings.camera}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scan Result Container */}
        {scannedData && (
          <div className="flex flex-col gap-3 items-center w-full max-w-md">

            {/* QR Content Box */}
            <div className="glass-panel [--glass-alpha:0.6] [--glass-blur:16px] w-full p-4 border border-zinc-800 rounded-3xl text-left">
              <div className="flex items-center gap-2 mb-2 text-zinc-400">
                <Icon name="IC-qr-data" className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" />
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
              className="glass-panel [--glass-alpha:0.4] [--glass-blur:16px] w-full p-3 hover:[--glass-tint:var(--color-zinc-800)] hover:[--glass-alpha:1] text-white font-bold rounded-3xl active:scale-95 duration-300 border border-zinc-700/30"
            >
              {strings.scanagain}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
