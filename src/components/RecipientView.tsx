'use client';

import React, { useState } from 'react';
import { User, Parcel, Locker } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import { Package, Unlock, KeyRound, CheckCircle2, AlertCircle, Clock, Copy, Check, MapPin, Inbox } from 'lucide-react';

interface RecipientViewProps {
  currentUser: User;
  parcels: Parcel[];
  lockers: Locker[];
  onRefresh: () => void;
}

export default function RecipientView({ currentUser, parcels, lockers, onRefresh }: RecipientViewProps) {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter parcels for current recipient
  const myPendingParcels = parcels.filter(
    (p) => p.recipientId === currentUser.id && p.status === 'PENDING'
  );
  const myHistoryParcels = parcels.filter(
    (p) => p.recipientId === currentUser.id && p.status === 'PICKED_UP'
  );

  const handleCopy = (pin: string, id: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUnlockWithCode = async (code: string) => {
    if (!code) {
      setErrorMsg('กรุณากรอกรหัส PIN หรือ Token');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recipient_unlock',
          code: code.trim(),
          recipientId: currentUser.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(data.message);
      setManualCode('');
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ปลดล็อกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Profile Box */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            สิทธิ์: ผู้รับพัสดุ (Recipient)
          </span>
          <h2 className="text-xl font-bold text-white mt-1">ยินดีต้อนรับ คุณ{currentUser.name}</h2>
          <p className="text-xs text-slate-400">
            ห้อง {currentUser.room} • เบอร์โทร {currentUser.phone}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
          <Inbox className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block leading-tight">พัสดุที่รอรับ</span>
            <span className="text-sm font-bold text-white">{myPendingParcels.length} รายการ</span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-2xl flex items-center gap-3 text-sm animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* SECTION 1: Manual Unlock Form (ช่องกรอกรหัสสำหรับเปิดตู้) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-white mb-2">
          <KeyRound className="w-4 h-4 text-blue-400" />
          <span>กรอกรหัส PIN เพื่อเปิดตู้</span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          หากท่านอยู่ที่หน้าตู้ สามารถกรอกรหัส PIN 6 หลัก หรือรหัส Token เพื่อสั่งปลดล็อกตู้ได้ทันที
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUnlockWithCode(manualCode);
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <input
            type="text"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="กรอกรหัส PIN 6 หลัก เช่น 584912"
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono tracking-wider"
          />
          <button
            type="submit"
            disabled={loading || !manualCode}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4" />
            {loading ? 'กำลังปลดล็อก...' : 'กดเพื่อเปิดตู้'}
          </button>
        </form>
      </div>

      {/* SECTION 2: List of Waiting Parcels with QR Code & PIN */}
      <div>
        <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-400" />
          รายการพัสดุที่รอรับ ({myPendingParcels.length})
        </h3>

        {myPendingParcels.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">ขณะนี้ไม่มีพัสดุที่รอรับในตู้</p>
            <p className="text-xs mt-1">เมื่อมีคนส่งของมา ระบบจะแสดง QR Code และรหัส PIN ที่นี่</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {myPendingParcels.map((parcel) => {
              const currentLocker = lockers.find((l) => l.id === parcel.lockerId);

              return (
                <div
                  key={parcel.id}
                  className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between"
                >
                  {/* Top: Locker Badge & Tracking */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {currentLocker?.name || `ตู้ที่ ${parcel.lockerNumber}`}
                      </span>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(parcel.depositedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="mb-4">
                      <span className="text-[11px] text-slate-400 block">หมายเลขพัสดุ:</span>
                      <span className="text-sm font-bold text-white font-mono">{parcel.trackingCode}</span>
                      {parcel.senderName && (
                        <p className="text-xs text-slate-400 mt-0.5">ผู้ส่ง: {parcel.senderName}</p>
                      )}
                    </div>

                    {/* QR Code & PIN Display */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4 mb-4">
                      {/* QR Code */}
                      <div className="p-2 bg-white rounded-xl shadow-md flex-shrink-0">
                        <QRCodeSVG value={parcel.qrToken} size={110} level="M" />
                      </div>

                      {/* PIN & Instructions */}
                      <div className="text-center sm:text-left flex-1">
                        <span className="text-xs text-slate-400 block mb-1">รหัส PIN สำหรับเปิดตู้:</span>
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="font-mono text-2xl font-black text-blue-400 tracking-widest">
                            {parcel.pickupPin}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(parcel.pickupPin, parcel.id)}
                            className="p-1 text-slate-400 hover:text-white transition"
                            title="คัดลอกรหัส"
                          >
                            {copiedId === parcel.id ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                          นำ QR Code ไปสแกนที่หน้าตู้ หรือกดปุ่ม &quot;ปลดล็อกตู้ทันที&quot; ด้านล่าง
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Unlock button */}
                  <button
                    type="button"
                    onClick={() => handleUnlockWithCode(parcel.pickupPin)}
                    disabled={loading}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Unlock className="w-4 h-4" />
                    ปลดล็อก {currentLocker?.name || `ตู้ที่ ${parcel.lockerNumber}`} ทันที
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: History */}
      {myHistoryParcels.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            ประวัติพัสดุที่รับแล้ว ({myHistoryParcels.length})
          </h4>
          <div className="space-y-2">
            {myHistoryParcels.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between text-xs text-slate-300"
              >
                <div>
                  <span className="font-mono font-bold text-white">{p.trackingCode}</span>
                  <span className="text-slate-500 ml-2">ตู้ที่ {p.lockerNumber}</span>
                </div>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> รับสำเร็จแล้ว
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
