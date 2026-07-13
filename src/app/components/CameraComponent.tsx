'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check } from 'lucide-react';

interface CameraComponentProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
  multiMode?: boolean;
  onCaptureMultiple?: (images: string[]) => void;
}

export default function CameraComponent({
  onCapture,
  onClose,
  multiMode = false,
  onCaptureMultiple,
}: CameraComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showFlash, setShowFlash] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      stopCamera();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          setIsReady(true);
        };
      }
    } catch (err: unknown) {
      console.error('Camera error:', err);
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError') {
        setError('Akses kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.');
      } else if (error.name === 'NotFoundError') {
        setError('Tidak ditemukan kamera di perangkat ini.');
      } else {
        setError('Gagal mengakses kamera: ' + (error.message || 'Unknown error'));
      }
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    if (multiMode) {
      // Flash effect
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 150);

      setCapturedImages(prev => {
        const next = [...prev, imageData];
        return next;
      });
    } else {
      onCapture(imageData);
    }
  }, [isReady, facingMode, multiMode, onCapture]);

  const handleDone = useCallback(() => {
    stopCamera();
    onCaptureMultiple?.(capturedImages);
  }, [capturedImages, onCaptureMultiple, stopCamera]);

  const removeLastPhoto = useCallback(() => {
    setCapturedImages(prev => prev.slice(0, -1));
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-semibold text-white">
            {multiMode ? 'Arahkan kamera ke resi' : 'Arahkan kamera ke resi'}
          </span>
          {multiMode && capturedImages.length > 0 && (
            <span className="text-[10px] text-white/70 mt-0.5">
              {capturedImages.length} foto diambil
            </span>
          )}
        </div>
        <button
          onClick={switchCamera}
          className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
        />

        {/* Flash effect */}
        {showFlash && (
          <div className="absolute inset-0 bg-white z-20 animate-[flash_0.15s_ease-out]" />
        )}

        {/* Scanning Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/70 text-sm font-medium">Posisikan resi di dalam bingkai</p>
            </div>
          </div>
        </div>

        {/* Captured photos thumbnail strip */}
        {multiMode && capturedImages.length > 0 && (
          <div className="absolute bottom-24 left-0 right-0 z-10 flex justify-center">
            <div className="flex gap-2 px-4">
              {capturedImages.slice(-4).map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Foto ${capturedImages.length - 3 + i}`}
                    className="h-14 w-14 rounded-lg border-2 border-white object-cover shadow-lg"
                  />
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">
                      {capturedImages.length - 3 + i}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-3" />
              <p className="text-white text-sm">Memuat kamera...</p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center max-w-sm">
              <Camera className="h-12 w-12 text-red-400 mx-auto mb-3" />
              <p className="text-white text-sm mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        {multiMode ? (
          <div className="flex items-center justify-center gap-6">
            {/* Remove last photo */}
            {capturedImages.length > 0 && (
              <button
                onClick={removeLastPhoto}
                className="w-12 h-12 rounded-full bg-black/40 border border-white/30 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {/* Capture button */}
            <button
              onClick={capturePhoto}
              disabled={!isReady}
              className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-500" />
            </button>

            {/* Done button (only when at least 1 photo) */}
            {capturedImages.length > 0 && (
              <button
                onClick={handleDone}
                className="w-12 h-12 rounded-full bg-indigo-500 border-4 border-white flex items-center justify-center text-white hover:bg-indigo-400 active:scale-95 transition-all shadow-lg"
              >
                <Check className="h-5 w-5" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={capturePhoto}
              disabled={!isReady}
              className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <div className="w-12 h-12 rounded-full bg-indigo-500" />
            </button>
          </div>
        )}
        <p className="text-white/70 text-xs text-center mt-3">
          {multiMode
            ? capturedImages.length === 0
              ? 'Tekan untuk mengambil gambar resi'
              : `${capturedImages.length} foto — tekan ✓ untuk scan semua`
            : 'Tekan untuk mengambil gambar'}
        </p>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
