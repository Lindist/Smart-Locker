'use client';

import React, { useState } from 'react';
import { LockerState, ActivityLog, Parcel } from '@/lib/types';
import { Shield, RotateCcw, Unlock, Clock, History, Key, CheckCircle, AlertTriangle } from 'lucide-react';

interface AdminPanelProps {
  locker: LockerState;
  logs: ActivityLog[];
  history: Parcel[];
  onRefresh: () => void;
}

export default function AdminPanel({ locker, logs, history, onRefresh }: AdminPanelProps) {
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  const handleForceUnlock = async () => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการสั่งปลดล็อกตู้ฉุกเฉิน?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'FORCE_UNLOCK', reason: 'Admin Force Unlock Manual Command' }),
      });
      const data = await res.json();
      setActionMessage(data.message);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleResetSystem = async () => {
    if (!confirm('ต้องการรีเซ็ตระบบทั้งหมดเป็นค่าเริ่มต้นใช่หรือไม่?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RESET' }),
      });
      const data = await res.json();
      setActionMessage(data.message);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">Admin Management & Control</h2>
            <p className="text-xs text-slate-400">ควบคุมสถานะตู้ ดูบันทึกย้อนหลัง และจัดการฉุกเฉิน</p>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleForceUnlock}
            disabled={loading}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow transition"
          >
            <Unlock className="w-3.5 h-3.5" /> สั่งปลดล็อกฉุกเฉิน (Force Unlock)
          </button>
          <button
            onClick={handleResetSystem}
            disabled={loading}
            className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" /> รีเซ็ตระบบ (Reset)
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {actionMessage && (
          <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>{actionMessage}</span>
          </div>
        )}

        {/* Status Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">สถานะตู้ปัจจุบัน</span>
            <div className="text-lg font-bold flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  locker.status === 'AVAILABLE' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
              <span>{locker.status === 'AVAILABLE' ? 'ตู้ว่าง (AVAILABLE)' : 'มีพัสดุ (OCCUPIED)'}</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">ประตู: {locker.doorState}</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">พัสดุที่กำลังรอรับ</span>
            <div className="text-lg font-bold text-blue-400">
              {locker.currentParcel ? locker.currentParcel.trackingCode : '-'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">
              {locker.currentParcel ? `ผู้รับ: คุณ${locker.currentParcel.recipientName}` : 'ไม่มีพัสดุค้าง'}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <span className="text-xs text-slate-400 block mb-1">สถิติพัสดุทั้งหมด</span>
            <div className="text-lg font-bold text-white">{history.length} รายการ</div>
            <span className="text-[11px] text-slate-500 mt-1 block">นำส่งสำเร็จแล้ว</span>
          </div>
        </div>

        {/* Activity Logs Table */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <History className="w-4 h-4 text-blue-400" />
              <span>ประวัติการทำงานของระบบ (Audit Logs)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">เรียงจากล่าสุด</span>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">ยังไม่มีบันทึกประวัติ</p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-slate-900 border border-slate-800/80 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-semibold text-slate-200 block">{log.details}</span>
                    <span className="text-[10px] font-mono text-blue-400">{log.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deployment & Environment Setup Guide */}
        <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Key className="w-4 h-4 text-amber-400" />
            <span>คำแนะนำการต่อกับ LINE Messaging API จริง:</span>
          </div>
          <p>
            1. ไปที่ <a href="https://developers.line.biz" target="_blank" rel="noreferrer" className="text-blue-400 underline">LINE Developers Console</a> สร้าง Channel &quot;Messaging API&quot;
          </p>
          <p>
            2. คัดลอก <code>LINE_CHANNEL_ACCESS_TOKEN</code> มาใส่ในไฟล์ <code>.env.local</code>
          </p>
          <p>
            3. เมื่อ Deploy ขึ้น <strong>Vercel (ฟรี)</strong> URL จะเป็น HTTPS ทันที สามารถนำไปผูกกับ Webhook และ LINE LIFF ได้ 100%
          </p>
        </div>
      </div>
    </div>
  );
}
