'use client';

import React from 'react';
import { SentNotification } from '@/lib/store';
import { MessageSquare, ExternalLink, Bell, Smartphone } from 'lucide-react';
import Link from 'next/link';

interface LineSimulatorProps {
  notifications: SentNotification[];
  onOpenMobileView?: (token: string) => void;
}

export default function LineSimulator({ notifications, onOpenMobileView }: LineSimulatorProps) {
  const latest = notifications[0];

  return (
    <div className="w-full max-w-sm mx-auto bg-slate-900 rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col min-h-[580px]">
      {/* LINE App Header */}
      <div className="bg-[#06C755] text-white px-5 py-3.5 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">LINE Official Account</h2>
            <p className="text-[10px] text-emerald-100">Smart Locker Bot • Verified</p>
          </div>
        </div>
        <Bell className="w-4 h-4 text-emerald-100" />
      </div>

      {/* LINE Chat Content Area */}
      <div className="flex-1 bg-[#849EB0] p-4 overflow-y-auto space-y-4 flex flex-col justify-end">
        {!latest ? (
          <div className="my-auto text-center p-6 bg-white/80 backdrop-blur rounded-2xl shadow-sm">
            <Smartphone className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-700">ยังไม่มีข้อความแจ้งเตือน</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              เมื่อมีผู้ส่งฝากพัสดุในตู้ ระบบจะส่งข้อความแจ้งเตือน Flex Message เข้ามาที่นี่อัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Timestamp pill */}
            <div className="text-center mb-3">
              <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full">
                {new Date(latest.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* LINE Flex Message Card */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              {/* Card Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white">
                <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  พัสดุใหม่มาถึงแล้ว
                </span>
                <h3 className="text-lg font-bold mt-1">📦 พัสดุของคุณมาถึงตู้แล้ว!</h3>
                <p className="text-xs text-emerald-100">Smart Locker 01 (อาคาร A ชั้น 1)</p>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 text-xs text-slate-700">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">ผู้รับ:</span>
                  <span className="font-bold text-slate-800">
                    คุณ{latest.recipientName} (ห้อง {latest.recipientRoom})
                  </span>
                </div>

                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400">เลขพัสดุ:</span>
                  <span className="font-mono font-semibold text-blue-600">{latest.trackingCode}</span>
                </div>

                {/* PIN Code Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-500 block mb-0.5">
                    🔑 รหัสเปิดตู้ (PIN Code) 6 หลัก:
                  </span>
                  <span className="font-mono text-2xl font-black text-slate-900 tracking-widest block">
                    {latest.pickupPin}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    (สามารถนำรหัสนี้ไปกดที่หน้าจอตู้ได้โดยตรง)
                  </span>
                </div>

                {/* Web Unlock Action Button */}
                <div className="pt-1">
                  {onOpenMobileView ? (
                    <button
                      type="button"
                      onClick={() => onOpenMobileView(latest.qrToken)}
                      className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      เปิดตู้รับพัสดุ (ผ่านเว็บ)
                    </button>
                  ) : (
                    <Link
                      href={latest.webUnlockUrl}
                      className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                    >
                      <ExternalLink className="w-4 h-4" />
                      เปิดตู้รับพัสดุ (ผ่านเว็บ)
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="bg-slate-800 px-4 py-2 text-center text-[10px] text-slate-400 border-t border-slate-700">
        จำลองหน้าจอแอปพลิเคชัน LINE (LINE Messaging API Flex Message)
      </div>
    </div>
  );
}
