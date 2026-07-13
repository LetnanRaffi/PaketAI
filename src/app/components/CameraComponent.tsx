'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw } from 'lucide-react';

interface CameraComponentProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export default function CameraComponent({ onCapture, onClose }: CameraComponentProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

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

    // Mirror if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    onCapture(imageData);
  }, [isReady, facingMode, onCapture]);

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
        <span className="text-sm font-semibold text-white">Arahkan kamera ke resi</span>
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
        
        {/* Scanning Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3/4 h-1/2 border-2 border-white/50 rounded-lg relative">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/70 text-sm font-medium">Posisikan resi di dalam bingkai</p>
            </div>
          </div>
        </div>

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

      {/* Capture Button */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex justify-center">
          <button
            onClick={capturePhoto}
            disabled={!isReady}
            className="w-16 h-16 rounded-full bg-white border-4 border-indigo-500 flex items-center justify-center hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-500" />
          </button>
        </div>
        <p className="text-white/70 text-xs text-center mt-3">Tekan untuk mengambil gambar</p>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}