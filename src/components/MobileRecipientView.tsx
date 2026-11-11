'use client';

import React, { useState } from 'react';
import { Package, Unlock, CheckCircle2, AlertCircle, Clock, ShieldCheck, MapPin } from 'lucide-react';

interface MobileRecipientViewProps {
  token: string;
  initialParcelInfo?: {
    recipientName: string;
    recipientRoom: string;
    trackingCode: string;
    depositedAt: string;
    pickupPin: string;
  };
  onUnlockedSuccess?: () => void;
}

export default function MobileRecipientView({
  token,
  initialParcelInfo,
  onUnlockedSuccess,
}: MobileRecipientViewProps) {
  const [loading, setLoading] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unlockMessage, setUnlockMessage] = useState('');

  const handleUnlock = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recipient_unlock', code: token }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setIsUnlocked(true);
      setUnlockMessage(data.message);
      if (onUnlockedSuccess) onUnlockedSuccess();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถปลดล็อกตู้ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 text-white rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col min-h-[580px]">
      {/* Mobile Top App Bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-200" />
            <h2 className="font-bold text-base tracking-wide">Parcel Locker Pickup</h2>
          </div>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
            LINE Connected
          </span>
        </div>
        <p className="text-xs text-emerald-100 mt-1">ระบบเปิดตู้รับพัสดุอัจฉริยะ</p>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 p-3 rounded-xl flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isUnlocked ? (
          /* Unlocked Success State */
          <div className="text-center py-6 my-auto animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">กลอนตู้ปลดล็อกแล้ว!</h3>
            <p className="text-emerald-400 text-sm mb-4">{unlockMessage}</p>

            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-left text-xs text-slate-300 mb-6">
              <p className="font-semibold text-white mb-1">📍 สิ่งที่ต้องทำต่อไป:</p>
              <ol className="list-decimal list-inside space-y-1 text-slate-400">
                <li>เปิดฝาตู้และหยิบพัสดุออกมา</li>
                <li>ปิดฝาตู้ให้สนิทเพื่อความปลอดภัย</li>
              </ol>
            </div>
            <p className="text-[11px] text-slate-500">ขอบคุณที่ใช้บริการตู้ล็อกเกอร์อัจฉริยะ</p>
          </div>
        ) : (
          /* Locked State - Ready to Unlock */
          <div>
            {/* Status card */}
            <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 mb-4">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-700">
                <span className="text-xs text-slate-400">สถานะพัสดุ:</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  รอรับมอบ
                </span>
              </div>

              {initialParcelInfo && (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ผู้รับ:</span>
                    <span className="font-semibold text-white">
                      {initialParcelInfo.recipientName} (ห้อง {initialParcelInfo.recipientRoom})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">รหัสพัสดุ:</span>
                    <span className="font-mono text-blue-400 font-semibold">
                      {initialParcelInfo.trackingCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PIN สำรอง:</span>
                    <span className="font-mono text-emerald-400 font-bold tracking-widest">
                      {initialParcelInfo.pickupPin}
                    </span>
                  </div>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-slate-700 flex items-center gap-1.5 text-[11px] text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                <span>ตำแหน่ง: ตู้ล็อกเกอร์ Smart Locker 01 อาคาร A</span>
              </div>
            </div>

            {/* Instruction Callout */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 text-xs text-blue-300 flex items-start gap-2.5 mb-6">
              <ShieldCheck className="w-4 h-4 flex-shrink-0 text-blue-400 mt-0.5" />
              <span>
                เมื่อคุณยืนอยู่หน้าตู้แล้ว กรุณากดปุ่ม <strong>&quot;กดเพื่อปลดล็อกตู้&quot;</strong> เพื่อให้กลอนตู้เด้งเปิด
              </span>
            </div>

            {/* Big Unlock Button */}
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-bold text-lg rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-3"
            >
              <Unlock className="w-6 h-6 animate-pulse" />
              {loading ? 'กำลังส่งคำสั่งปลดล็อก...' : 'กดเพื่อปลดล็อกตู้'}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
          <span>ระบบรักษาความปลอดภัยแบบ One-time Token</span>
        </div>
      </div>
    </div>
  );
}
