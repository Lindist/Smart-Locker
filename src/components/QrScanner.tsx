'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, AlertCircle, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  active?: boolean;
}

export default function QrScanner({ onScanSuccess, onClose, active = true }: QrScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<unknown>(null);
  const elementId = 'reader-container';

  useEffect(() => {
    let isMounted = true;

    if (!active) return;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Check camera permission
        const devices = await Html5Qrcode.getCameras();
        if (!devices || devices.length === 0) {
          if (isMounted) setCameraError('ไม่พบกล้องบนอุปกรณ์นี้');
          return;
        }

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        // Prefer back camera on mobile (facingMode: environment)
        const cameraConfig = { facingMode: 'environment' };

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Success callback
            if (isMounted) {
              onScanSuccess(decodedText);
              // Stop camera after successful scan
              html5QrCode.stop().catch(() => {});
            }
          },
          () => {
            // Frame error (ignore scanning frames without QR)
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn('Camera start error:', err);
          setCameraError('ไม่สามารถเข้าถึงกล้องได้ (กรุณาอนุญาตให้เว็บเข้าถึงกล้อง)');
        }
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current) {
        try {
          const scanner = scannerRef.current as { isScanning?: boolean; stop: () => Promise<void> };
          if (scanner.isScanning) {
            scanner.stop().catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
    };
  }, [active, onScanSuccess]);

  const handleStop = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current as { isScanning?: boolean; stop: () => Promise<void> };
        await scanner.stop();
      } catch {
        // Ignore
      }
    }
    setIsScanning(false);
    if (onClose) onClose();
  };

  return (
    <div className="bg-slate-900 border-2 border-emerald-500/40 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Camera className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">กล้องสแกน QR Code (Scanner)</h4>
            <p className="text-[11px] text-slate-400">ส่องกล้องไปที่ QR Code ที่หน้าตู้พัสดุ</p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={handleStop}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Camera Viewport Area */}
      <div className="relative rounded-2xl overflow-hidden bg-black flex flex-col items-center justify-center min-h-[280px]">
        {/* html5-qrcode element container */}
        <div id={elementId} className="w-full h-full" />

        {/* Laser Scanning Animation Overlay */}
        {isScanning && !cameraError && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder Target Box */}
            <div className="w-56 h-56 border-2 border-emerald-400/70 rounded-2xl relative shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>

              {/* Animated Laser Bar */}
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse absolute top-1/2 -translate-y-1/2"></div>
            </div>
            <span className="text-[11px] text-emerald-300 font-medium bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur border border-emerald-500/30">
              กำลังค้นหา QR Code...
            </span>
          </div>
        )}

        {/* Camera Permission / Error message */}
        {cameraError && (
          <div className="p-6 text-center text-slate-400 flex flex-col items-center">
            <CameraOff className="w-10 h-10 text-rose-400 mb-2" />
            <p className="text-xs text-rose-300 font-semibold mb-1">{cameraError}</p>
            <p className="text-[11px] text-slate-500 max-w-xs mb-4">
              หากใช้งานบนคอมพิวเตอร์ที่ไม่มีกล้อง หรือยังไม่ได้กดอนุญาตกล้อง คุณสามารถกรอกรหัส PIN หรือกดปุ่มปลดล็อกได้โดยตรง
            </p>
          </div>
        )}
      </div>

      {/* Footer controls */}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ระบบจะสั่งปลดล็อกตู้ทันทีเมื่อสแกนเจอ
        </span>
        {onClose && (
          <button
            type="button"
            onClick={handleStop}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            ปิดกล้อง
          </button>
        )}
      </div>
    </div>
  );
}
