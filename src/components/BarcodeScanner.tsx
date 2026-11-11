'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, AlertCircle, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScanSuccess, onClose }: BarcodeScannerProps) {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const readerElementId = 'html5-qr-reader-container';

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      try {
        const qrCodeScanner = new Html5Qrcode(readerElementId);
        scannerRef.current = qrCodeScanner;

        const config = {
          fps: 15,
          qrbox: { width: 260, height: 200 },
          aspectRatio: 1.333,
        };

        qrCodeScanner
          .start(
            { facingMode: 'environment' }, // Uses back camera on phone or webcam on PC
            config,
            (decodedText) => {
              // Successfully scanned!
              if (scannerRef.current && scannerRef.current.isScanning) {
                scannerRef.current
                  .stop()
                  .then(() => {
                    onScanSuccess(decodedText);
                  })
                  .catch(() => {
                    onScanSuccess(decodedText);
                  });
              } else {
                onScanSuccess(decodedText);
              }
            },
            () => {
              // Scanning frame (no-op)
            }
          )
          .then(() => {
            setIsScanning(true);
          })
          .catch((err) => {
            console.warn('Camera start error:', err);
            setScannerError(
              'ไม่สามารถเปิดกล้องได้ (กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์ หรือใช้วิธีจำลองการสแกนด้านล่าง)'
            );
          });
      } catch (err: unknown) {
        console.error('Html5Qrcode error:', err);
        setScannerError('เกิดข้อผิดพลาดในการโหลดระบบสแกนเนอร์');
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
          } else {
            scannerRef.current.clear();
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [onScanSuccess]);

  // Demo simulator samples
  const handleSimulateScan = (sampleCode: string) => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    onScanSuccess(sampleCode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-slate-800/90 px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
            <Camera className="w-5 h-5 text-teal-400 animate-pulse" />
            <span>สแกน QR Code / บาร์โค้ดพัสดุ</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Area */}
        <div className="p-4 bg-slate-950 flex flex-col items-center">
          {scannerError ? (
            <div className="w-full p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-start gap-2.5 my-4">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{scannerError}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  สามารถคลิกเลือกตัวอย่างโค้ดด้านล่างเพื่อจำลองการสแกนได้ทันที
                </p>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border-2 border-teal-500/40 shadow-inner flex items-center justify-center">
              {/* HTML5 QR Container */}
              <div id="html5-qr-reader-container" className="w-full h-full"></div>

              {/* Laser Line Overlay */}
              {isScanning && (
                <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#2dd4bf] animate-pulse"></div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-400 mt-3 text-center">
            ส่องกล้องไปที่ <strong>QR Code</strong> หรือ <strong>บาร์โค้ดหน้ากล่องพัสดุ</strong> ระบบจะอ่านค่าอัตโนมัติ
          </p>
        </div>

        {/* Quick Demo Simulator Buttons */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            หรือกดจำลองการสแกน (Simulate Barcode):
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleSimulateScan('TH-88291045')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-teal-500/10 border border-slate-700 hover:border-teal-500/40 text-left text-xs transition"
            >
              <div className="font-mono font-bold text-white">TH-88291045</div>
              <div className="text-[10px] text-slate-400">พัสดุไปรษณีย์ไทย (EMS)</div>
            </button>

            <button
              type="button"
              onClick={() => handleSimulateScan('FLASH-TH-994102')}
              className="p-2.5 rounded-xl bg-slate-950 hover:bg-teal-500/10 border border-slate-700 hover:border-teal-500/40 text-left text-xs transition"
            >
              <div className="font-mono font-bold text-white">FLASH-TH-994102</div>
              <div className="text-[10px] text-slate-400">พัสดุ Flash Express</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
