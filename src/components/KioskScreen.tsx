'use client';

import React, { useState, useEffect } from 'react';
import { LockerState, UserDirectoryItem } from '@/lib/types';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Package, 
  Lock, 
  Unlock, 
  QrCode, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowRight, 
  RotateCcw,
  User,
  Phone,
  Home,
  Barcode
} from 'lucide-react';

interface KioskScreenProps {
  locker: LockerState;
  users: UserDirectoryItem[];
  onRefresh: () => void;
  publicHostUrl?: string;
}

export default function KioskScreen({ locker, users, onRefresh, publicHostUrl }: KioskScreenProps) {
  // Step state for Deposit flow: 'idle' | 'door_opened' | 'form' | 'success'
  const [depositStep, setDepositStep] = useState<'idle' | 'door_opened' | 'form' | 'success'>('idle');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for deposit
  const [selectedUser, setSelectedUser] = useState<UserDirectoryItem | null>(null);
  const [trackingCode, setTrackingCode] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customRoom, setCustomRoom] = useState('');

  // Recipient Unlock flow states
  const [unlockMode, setUnlockMode] = useState<'qr' | 'pin'>('qr');
  const [pinInput, setPinInput] = useState('');
  const [unlockSuccessData, setUnlockSuccessData] = useState<{ message: string; trackingCode?: string } | null>(null);

  // Time display
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync selected user into custom fields
  const handleSelectUser = (user: UserDirectoryItem) => {
    setSelectedUser(user);
    setCustomName(user.name);
    setCustomPhone(user.phone);
    setCustomRoom(user.room);
  };

  // Step 1: Sender taps "Start Deposit"
  const handleStartDeposit = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/locker/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setDepositStep('door_opened');
      // pre-generate sample tracking number
      setTrackingCode('TH-' + Math.floor(10000000 + Math.random() * 90000000));
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'ไม่สามารถเปิดตู้ได้');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Sender confirms deposit
  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customPhone || !customRoom) {
      setErrorMsg('กรุณากรอกข้อมูลผู้รับให้ครบถ้วน');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/locker/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          trackingCode,
          recipientName: customName,
          recipientPhone: customPhone,
          recipientRoom: customRoom,
          recipientLineId: selectedUser?.lineId,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setSuccessMsg(`บันทึกการฝากพัสดุสำเร็จ! ส่งรหัส PIN: ${data.data.parcel.pickupPin} ให้คุณ${customName} ทาง LINE แล้ว`);
      setDepositStep('success');
      onRefresh();

      // Reset state after 5 seconds
      setTimeout(() => {
        setDepositStep('idle');
        setSuccessMsg('');
        setSelectedUser(null);
        setCustomName('');
        setCustomPhone('');
        setCustomRoom('');
      }, 5000);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setLoading(false);
    }
  };

  // Recipient Keypad PIN submission
  const handleKeypadPress = (val: string) => {
    if (val === 'C') {
      setPinInput('');
      setErrorMsg('');
    } else if (val === 'DEL') {
      setPinInput((prev) => prev.slice(0, -1));
    } else if (pinInput.length < 6) {
      setPinInput((prev) => prev + val);
    }
  };

  const handleUnlockWithPin = async () => {
    if (pinInput.length !== 6) {
      setErrorMsg('กรุณากรอกรหัส PIN ให้ครบ 6 หลัก');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/locker/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pinInput }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setUnlockSuccessData({
        message: data.message,
        trackingCode: data.data?.parcel?.trackingCode,
      });
      setPinInput('');
      onRefresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'รหัสเปิดตู้ไม่ถูกต้อง');
    } finally {
      setLoading(false);
    }
  };

  // Recipient has retrieved parcel and closes door
  const handleCompletePickup = async () => {
    setLoading(true);
    try {
      await fetch('/api/locker/complete', { method: 'POST' });
      setUnlockSuccessData(null);
      setErrorMsg('');
      onRefresh();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Construct QR URL: fallback to current location origin or host URL
  const qrBaseUrl = typeof window !== 'undefined' ? window.location.origin : (publicHostUrl || 'http://localhost:3000');
  const recipientUnlockUrl = locker.currentParcel?.qrToken 
    ? `${qrBaseUrl}/pickup/${locker.currentParcel.qrToken}`
    : `${qrBaseUrl}/pickup/sample`;

  return (
    <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border-4 border-slate-700 overflow-hidden flex flex-col min-h-[640px]">
      {/* Top Kiosk Header Bar */}
      <div className="bg-slate-800/90 backdrop-blur px-6 py-4 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-blue-500/30">
            📦
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">{locker.name}</h1>
            <p className="text-xs text-slate-400">{locker.location}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Badge */}
          {locker.status === 'AVAILABLE' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              ตู้ว่าง (AVAILABLE)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              มีพัสดุ (OCCUPIED)
            </span>
          )}

          {/* Door Indicator */}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
            locker.doorState === 'OPEN' 
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' 
              : 'bg-slate-700/60 text-slate-300 border-slate-600'
          }`}>
            {locker.doorState === 'OPEN' ? <Unlock className="w-3.5 h-3.5 text-rose-400" /> : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
            ประตู: {locker.doorState === 'OPEN' ? 'เปิดอยู่ (OPEN)' : 'ปิดล็อก (LOCKED)'}
          </span>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1 text-slate-300 text-sm font-mono bg-slate-950/40 px-3 py-1 rounded-lg border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            {currentTime}
          </div>
        </div>
      </div>

      {/* Main Kiosk Content Area */}
      <div className="flex-1 p-6 flex flex-col justify-center items-center">
        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full max-w-lg mb-4 bg-rose-500/20 border border-rose-500/50 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 1: Parcel Unlocked Success Overlay Screen (Recipient is picking up) */}
        {/* ========================================================================= */}
        {unlockSuccessData ? (
          <div className="w-full max-w-md text-center bg-slate-800/80 p-8 rounded-2xl border border-emerald-500/40 shadow-xl animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Unlock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">🎉 ปลดล็อกตู้สำเร็จ!</h2>
            <p className="text-emerald-400 text-sm mb-4">{unlockSuccessData.message}</p>
            {unlockSuccessData.trackingCode && (
              <p className="text-xs text-slate-400 mb-6 font-mono bg-slate-900/60 py-2 px-3 rounded-lg border border-slate-700">
                พัสดุ: {unlockSuccessData.trackingCode}
              </p>
            )}

            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-xl text-xs text-left mb-6 flex gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <strong>ขั้นตอนสุดท้าย:</strong>
                <p>กรุณาเปิดฝาตู้ นำพัสดุของท่านออกมา และปิดประตูตู้ให้สนิท</p>
              </div>
            </div>

            <button
              onClick={handleCompletePickup}
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              หยิบพัสดุและปิดตู้เรียบร้อยแล้ว
            </button>
          </div>
        ) : locker.status === 'AVAILABLE' ? (
          /* ========================================================================= */
          /* CASE 2: LOCKER IS AVAILABLE -> SENDER DEPOSIT FLOW                        */
          /* ========================================================================= */
          <div className="w-full max-w-2xl">
            {depositStep === 'idle' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/25">
                  <Package className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                  ตู้ว่าง พร้อมรับฝากพัสดุ
                </h2>
                <p className="text-slate-400 max-w-md mx-auto mb-8 text-sm">
                  สำหรับผู้ส่งพัสดุ: แตะปุ่มด้านล่างเพื่อสั่งเปิดตู้ นำพัสดุเข้าช่อง และระบุข้อมูลผู้รับ
                </p>

                <button
                  onClick={handleStartDeposit}
                  disabled={loading}
                  className="px-8 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold rounded-2xl shadow-xl shadow-blue-600/40 transition transform active:scale-95 flex items-center gap-3 mx-auto"
                >
                  <Unlock className="w-6 h-6" />
                  {loading ? 'กำลังเปิดตู้...' : 'แตะเพื่อเปิดตู้ฝากของ'}
                </button>
              </div>
            )}

            {depositStep === 'door_opened' && (
              <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <Unlock className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">🚪 กลอนตู้ปลดล็อกแล้ว!</h3>
                <p className="text-slate-300 text-sm mb-6">
                  กรุณานำพัสดุวางลงในตู้ และปิดประตูตู้ให้สนิท
                </p>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 text-left mb-6 text-xs text-slate-400">
                  <div className="flex items-center gap-2 text-slate-200 font-semibold mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    คำแนะนำ:
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    <li>วางพัสดุให้อยู่ภายในช่อง ไม่ให้ติดขัดกับขอบประตู</li>
                    <li>เมื่อวางเสร็จแล้ว กดปุ่ม "วางของเสร็จแล้ว ถัดไป" ด้านล่างเพื่อกรอกข้อมูลผู้รับ</li>
                  </ul>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setDepositStep('form')}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
                  >
                    วางของเสร็จแล้ว ถัดไป
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {depositStep === 'form' && (
              <div className="bg-slate-800/90 p-6 sm:p-8 rounded-2xl border border-slate-700">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                  <div>
                    <h3 className="text-xl font-bold text-white">📝 ระบุข้อมูลผู้รับพัสดุ</h3>
                    <p className="text-xs text-slate-400">ระบบจะส่งรหัสรับพัสดุ (PIN/QR) ไปยัง LINE ของผู้รับคนนี้</p>
                  </div>
                  <button
                    onClick={() => setDepositStep('door_opened')}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> ย้อนกลับ
                  </button>
                </div>

                {/* Quick select directory */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold text-slate-300 mb-2">
                    เลือกจากรายชื่อผู้พักอาศัย (Quick Select):
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition ${
                          selectedUser?.id === u.id
                            ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                            : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-semibold truncate">{u.name}</div>
                        <div className="text-[10px] text-slate-400">ห้อง {u.room}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form fields */}
                <form onSubmit={handleConfirmDeposit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-400" /> ชื่อผู้รับ
                      </label>
                      <input
                        type="text"
                        required
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="เช่น คุณสมชาย"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-blue-400" /> เลขห้อง / บ้านเลขที่
                      </label>
                      <input
                        type="text"
                        required
                        value={customRoom}
                        onChange={(e) => setCustomRoom(e.target.value)}
                        placeholder="เช่น 101, 205"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-blue-400" /> เบอร์โทรศัพท์ผู้รับ
                      </label>
                      <input
                        type="tel"
                        required
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                        placeholder="เช่น 0812345678"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                        <Barcode className="w-3.5 h-3.5 text-blue-400" /> หมายเลขพัสดุ (Tracking No.)
                      </label>
                      <input
                        type="text"
                        value={trackingCode}
                        onChange={(e) => setTrackingCode(e.target.value)}
                        placeholder="เช่น TH-12345678"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {loading ? 'กำลังบันทึกและส่ง LINE...' : 'ยืนยันการฝากพัสดุ & ส่งแจ้งเตือน'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {depositStep === 'success' && (
              <div className="bg-slate-800/90 p-8 rounded-2xl border border-emerald-500/50 text-center">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">ฝากพัสดุเรียบร้อยแล้ว!</h3>
                <p className="text-emerald-400 text-sm mb-4">{successMsg}</p>
                <p className="text-xs text-slate-400">ระบบจะกลับสู่หน้าหลักโดยอัตโนมัติ...</p>
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 3: LOCKER IS OCCUPIED -> RECIPIENT PICKUP FLOW                       */
          /* ========================================================================= */
          <div className="w-full max-w-2xl bg-slate-800/90 p-6 sm:p-8 rounded-2xl border border-slate-700">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-semibold mb-2">
                <Package className="w-3.5 h-3.5" />
                มีพัสดุรอส่งมอบอยู่ในตู้
              </div>
              <h2 className="text-2xl font-bold text-white">
                📦 สแกน QR Code หรือ กดรหัส PIN เพื่อเปิดตู้
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                ผู้รับ: คุณ{locker.currentParcel?.recipientName} (ห้อง {locker.currentParcel?.recipientRoom})
              </p>
            </div>

            {/* Mode Switch Tabs */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6 border border-slate-700 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setUnlockMode('qr')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  unlockMode === 'qr' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="w-4 h-4" /> สแกน QR Code
              </button>
              <button
                type="button"
                onClick={() => setUnlockMode('pin')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  unlockMode === 'pin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                <KeyRound className="w-4 h-4" /> กรอกรหัส PIN (6 หลัก)
              </button>
            </div>

            {/* TAB 1: QR Code View */}
            {unlockMode === 'qr' && (
              <div className="flex flex-col items-center">
                <div className="p-4 bg-white rounded-2xl shadow-xl mb-4 border-4 border-blue-500/30">
                  <QRCodeSVG
                    value={recipientUnlockUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-200">
                    ใช้กล้องมือถือสแกนเพื่อเปิดเว็บปลดล็อก
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    เมื่อสแกนแล้วจะเข้าสู่หน้าเว็บของผู้รับ และกดปุ่มเพื่อสั่งเปิดตู้ได้ทันที
                  </p>
                  <a
                    href={recipientUnlockUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block text-xs text-blue-400 hover:underline"
                  >
                    (คลิกที่นี่เพื่อทดสอบเปิดเว็บในแท็บใหม่)
                  </a>
                </div>
              </div>
            )}

            {/* TAB 2: On-screen PIN Keypad View */}
            {unlockMode === 'pin' && (
              <div className="max-w-xs mx-auto">
                {/* PIN Display Boxes */}
                <div className="flex justify-center gap-2 mb-4">
                  {[0, 1, 2, 3, 4, 5].map((idx) => (
                    <div
                      key={idx}
                      className={`w-10 h-12 rounded-xl border flex items-center justify-center font-mono text-xl font-bold ${
                        pinInput[idx]
                          ? 'bg-blue-600/30 border-blue-500 text-white'
                          : 'bg-slate-900 border-slate-700 text-slate-500'
                      }`}
                    >
                      {pinInput[idx] ? '●' : ''}
                    </div>
                  ))}
                </div>

                {/* Keypad Grid */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'].map((btn) => (
                    <button
                      key={btn}
                      type="button"
                      onClick={() => handleKeypadPress(btn)}
                      className={`h-12 rounded-xl font-semibold text-base transition active:scale-95 ${
                        btn === 'C'
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
                          : btn === 'DEL'
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-slate-900 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleUnlockWithPin}
                  disabled={loading || pinInput.length !== 6}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Unlock className="w-5 h-5" />
                  {loading ? 'กำลังตรวจสอบ...' : 'ยืนยันรหัส PIN ปลดล็อกตู้'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Kiosk Footer */}
      <div className="bg-slate-800/60 px-6 py-3 border-t border-slate-700/80 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>IoT Hardware: ESP32 Online</span>
        </div>
        <div>
          <span>Smart Parcel Locker v1.0 • Web Kiosk</span>
        </div>
      </div>
    </div>
  );
}
