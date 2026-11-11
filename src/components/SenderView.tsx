'use client';

import React, { useState } from 'react';
import { User, Locker } from '@/lib/types';
import { 
  Package, 
  Unlock, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Truck, 
  ArrowRight, 
  RotateCcw,
  UserCheck,
  Barcode,
  DoorOpen
} from 'lucide-react';

interface SenderViewProps {
  currentUser: User;
  lockers: Locker[];
  users: User[];
  onRefresh: () => void;
}

export default function SenderView({ currentUser, lockers, users, onRefresh }: SenderViewProps) {
  // Step for selected deposit:
  // null = viewing list of 4 lockers
  // 'unlocked' = selected locker has unlocked, prompt to put item
  // 'form' = select recipient & enter tracking
  // 'success' = deposit confirmed
  const [selectedLocker, setSelectedLocker] = useState<Locker | null>(null);
  const [senderStep, setSenderStep] = useState<'unlocked' | 'form' | 'success' | null>(null);

  const [recipientId, setRecipientId] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{ message: string; pin?: string } | null>(null);

  // Filter list of users who are recipients
  const recipientUsers = users.filter((u) => u.role === 'RECIPIENT');

  // Step 1: Sender selects an available locker -> System unlocks it!
  const handleSelectLocker = async (locker: Locker) => {
    if (locker.status === 'OCCUPIED') {
      setErrorMsg(`${locker.name} มีพัสดุอยู่แล้ว กรุณาเลือกตู้ที่ว่าง`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sender_select_unlock',
          lockerId: locker.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSelectedLocker(data.data);
      setSenderStep('unlocked');
      // Auto-generate sample tracking code for convenience
      setTrackingCode('TH-' + Math.floor(10000000 + Math.random() * 90000000));
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเปิดตู้ได้');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm deposit
  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocker || !recipientId) {
      setErrorMsg('กรุณาเลือกผู้รับพัสดุ');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sender_deposit',
          lockerId: selectedLocker.id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          recipientId,
          trackingCode,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessData({
        message: data.message,
        pin: data.data?.parcel?.pickupPin,
      });
      setSenderStep('success');
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกการฝาก');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFlow = () => {
    setSelectedLocker(null);
    setSenderStep(null);
    setRecipientId('');
    setTrackingCode('');
    setErrorMsg('');
    setSuccessData(null);
    onRefresh();
  };

  const availableCount = lockers.filter((l) => l.status === 'AVAILABLE').length;

  return (
    <div className="space-y-6">
      {/* Header Profile Box */}
      <div className="bg-gradient-to-r from-teal-900/40 via-emerald-900/30 to-slate-900 border border-teal-500/30 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-full border border-teal-500/20">
            สิทธิ์: ผู้ส่งพัสดุ (Sender / Courier)
          </span>
          <h2 className="text-xl font-bold text-white mt-1">ผู้ส่ง: {currentUser.name}</h2>
          <p className="text-xs text-slate-400">
            เลือกตู้ที่ว่างเพื่อเปิดตู้ นำพัสดุเข้าช่อง และระบุผู้รับ
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
          <Truck className="w-5 h-5 text-teal-400" />
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block leading-tight">ตู้ที่พร้อมใช้งาน</span>
            <span className="text-sm font-bold text-emerald-400">ว่าง {availableCount} จาก 4 ตู้</span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-2xl flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW A: SUCCESS DEPOSIT CONFIRMATION                                      */}
      {/* ========================================================================= */}
      {senderStep === 'success' && successData && (
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-2xl animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border-2 border-emerald-500 animate-bounce">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">ส่งพัสดุเรียบร้อยแล้ว!</h3>
          <p className="text-emerald-400 text-sm mb-4">{successData.message}</p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 text-left space-y-2 mb-6">
            <div className="flex justify-between">
              <span className="text-slate-500">ตู้:</span>
              <span className="font-bold text-white">{selectedLocker?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">หมายเลขพัสดุ:</span>
              <span className="font-mono text-blue-400">{trackingCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">รหัส PIN ที่ส่งให้ผู้รับ:</span>
              <span className="font-mono font-bold text-emerald-400">{successData.pin}</span>
            </div>
          </div>

          <button
            onClick={handleResetFlow}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition"
          >
            ส่งพัสดุชิ้นต่อไป (กลับหน้ารายการตู้)
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: LOCKER UNLOCKED -> PROMPT SENDER TO PUT ITEM                     */}
      {/* ========================================================================= */}
      {senderStep === 'unlocked' && selectedLocker && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
            <DoorOpen className="w-8 h-8" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            🚪 {selectedLocker.name} ปลดล็อกเปิดแล้ว!
          </h3>
          <p className="text-slate-300 text-sm mb-6">
            กรุณานำพัสดุวางลงในตู้ และปิดประตูตู้ให้สนิท
          </p>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs text-slate-400 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-white font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              คำแนะนำ:
            </div>
            <p>1. นำกล่องหรือซองพัสดุใส่เข้าไปใน {selectedLocker.name}</p>
            <p>2. ดันประตูตู้ให้ปิดสนิท</p>
            <p>3. กดปุ่มด้านล่างเพื่อระบุข้อมูลผู้รับพัสดุ</p>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleResetFlow}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => setSenderStep('form')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              วางของและปิดตู้เสร็จแล้ว ถัดไป
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW C: SENDER FILLS RECIPIENT & CONFIRMS DEPOSIT                        */}
      {/* ========================================================================= */}
      {senderStep === 'form' && selectedLocker && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white">📝 ระบุผู้รับพัสดุสำหรับ {selectedLocker.name}</h3>
              <p className="text-xs text-slate-400">ระบบจะสร้างรหัส PIN และ QR Code ให้ผู้รับคนนี้</p>
            </div>
            <button
              onClick={() => setSenderStep('unlocked')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ย้อนกลับ
            </button>
          </div>

          <form onSubmit={handleConfirmDeposit} className="space-y-4">
            {/* Select Recipient */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-400" />
                เลือกผู้รับพัสดุ (Resident):
              </label>
              <select
                required
                value={recipientId}
                onChange={(e) => setRecipientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- กรุณาเลือกผู้รับ --</option>
                {recipientUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (ห้อง {u.room}) - โทร {u.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Tracking Code */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-teal-400" />
                หมายเลขพัสดุ (Tracking Number):
              </label>
              <input
                type="text"
                required
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="เช่น TH-12345678"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !recipientId}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {loading ? 'กำลังบันทึก...' : 'กดยืนยันส่งของเรียบร้อย'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW D: ALL 4 LOCKERS SELECTION GRID                                     */}
      {/* ========================================================================= */}
      {senderStep === null && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-teal-400" />
                เลือกตู้ที่ว่างเพื่อฝากพัสดุ (ทั้งหมด 4 ตู้)
              </h3>
              <p className="text-xs text-slate-400">
                แตะที่ตู้ที่มีสถานะ &quot;ว่าง&quot; เพื่อสั่งเปิดกลอนตู้
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {lockers.map((locker) => {
              const isAvailable = locker.status === 'AVAILABLE';

              return (
                <div
                  key={locker.id}
                  className={`rounded-2xl border-2 p-5 transition flex flex-col justify-between ${
                    isAvailable
                      ? 'bg-slate-900 border-slate-700 hover:border-teal-500 hover:shadow-xl shadow-teal-500/10 cursor-pointer'
                      : 'bg-slate-950/70 border-slate-800 opacity-80 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (isAvailable && !loading) {
                      handleSelectLocker(locker);
                    }
                  }}
                >
                  <div>
                    {/* Top Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-extrabold text-lg text-white">{locker.name}</span>
                      {isAvailable ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          ว่าง
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                          มีพัสดุ
                        </span>
                      )}
                    </div>

                    {/* Locker Visual Box */}
                    <div
                      className={`h-28 rounded-xl border flex flex-col items-center justify-center mb-4 transition ${
                        isAvailable
                          ? 'bg-slate-950 border-slate-800 text-slate-400 group-hover:border-teal-500'
                          : 'bg-slate-900/60 border-slate-800 text-rose-400'
                      }`}
                    >
                      {isAvailable ? (
                        <>
                          <Unlock className="w-8 h-8 text-emerald-400 mb-1" />
                          <span className="text-xs font-semibold text-slate-300">พร้อมฝากของ</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-8 h-8 text-rose-400 mb-1" />
                          <span className="text-xs font-semibold text-rose-300">มีพัสดุอยู่ข้างใน</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  {isAvailable ? (
                    <button
                      type="button"
                      disabled={loading}
                      className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      เลือกและเปิดตู้นี้
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs text-slate-500 font-medium">
                      ไม่สามารถเลือกได้
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
