'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, X, CheckCircle2 } from 'lucide-react';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  active?: boolean;
}

export default function QrScanner({ onScanSuccess, onClose, active = true }: QrScannerProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Keep latest onScanSuccess in a ref so useEffect does NOT re-run on parent re-renders!
  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  }, [onScanSuccess]);

  const scannerRef = useRef<any>(null);
  const containerIdRef = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const isStartingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const elementId = containerIdRef.current;

    if (!active) return;

    const startCamera = async () => {
      if (isStartingRef.current) return;
      isStartingRef.current = true;

      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMounted) return;

        // Check container existence in DOM
        const container = document.getElementById(elementId);
        if (!container) return;

        const html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const cameraConfig = { facingMode: 'environment' };

        await html5QrCode.start(
          cameraConfig,
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (isMounted) {
              // Trigger success callback
              if (onScanSuccessRef.current) {
                onScanSuccessRef.current(decodedText);
              }
            }
          },
          () => {
            // Ignore scan frames without QR
          }
        );

        if (isMounted) {
          setIsScanning(true);
          setCameraError(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn('Camera error:', err);
          setCameraError('ไม่สามารถเปิดกล้องได้ หรือถูกปฏิเสธสิทธิ์การเข้าถึงกล้อง');
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    // Small delay to ensure DOM element is ready
    const timer = setTimeout(startCamera, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          const scanner = scannerRef.current;
          if (scanner.isScanning) {
            scanner
              .stop()
              .then(() => {
                try {
                  scanner.clear();
                } catch {}
              })
              .catch(() => {});
          } else {
            try {
              scanner.clear();
            } catch {}
          }
        } catch {}
      }
    };
  }, [active]); // Depend strictly on `active` only!

  const handleStop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scanner.clear();
      } catch {}
    }
    setIsScanning(false);
    if (onClose) onClose();
  }, [onClose]);

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
        {/* Stable container for html5-qrcode */}
        <div
          id={containerIdRef.current}
          className="w-full h-full max-w-sm mx-auto overflow-hidden rounded-2xl"
        />

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
            <span className="text-[11px] text-emerald-300 font-medium bg-black/70 px-3 py-1 rounded-full mt-3 backdrop-blur border border-emerald-500/30">
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
              หากใช้งานบนอุปกรณ์ที่ไม่มีกล้อง หรือยังไม่ได้กดอนุญาต คุณสามารถกรอกรหัส PIN หรือกดปุ่มปลดล็อกได้โดยตรง
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
