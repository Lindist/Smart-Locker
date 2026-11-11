'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { 
  Lock, 
  User as UserIcon, 
  Shield, 
  Truck, 
  Package, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  Sparkles,
  X,
  CheckCircle2,
  Home
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  isSupabase?: boolean;
}

export default function AuthScreen({ onLoginSuccess, isSupabase }: AuthScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // LINE Modal state for manual LINE ID connect when LIFF ID is not yet in .env
  const [lineModalOpen, setLineModalOpen] = useState(false);
  const [lineName, setLineName] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [lineRoom, setLineRoom] = useState('101');

  const handleLogin = async (e: React.FormEvent | null, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const u = customUser || username;
    const p = customPass || password;

    if (!u || !p) {
      setErrorMsg('กรุณากรอก Username และ Password');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.message);
      }

      // Save to localStorage for persistence
      localStorage.setItem('locker_auth_user', JSON.stringify(data.data));
      onLoginSuccess(data.data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    handleLogin(null, u, p);
  };

  // LINE Login / LIFF Trigger
  const handleLineLogin = async () => {
    setLoading(true);
    setErrorMsg('');

    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
    if (liffId && !liffId.includes('your-liff-id')) {
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });

        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        // Send to /api/auth/line to find or create in Supabase
        const res = await fetch('/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineUserId: profile.userId,
            displayName: profile.displayName,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        localStorage.setItem('locker_auth_user', JSON.stringify(data.data));
        onLoginSuccess(data.data);
        return;
      } catch (err: unknown) {
        console.warn('LIFF init warning:', err);
      } finally {
        setLoading(false);
      }
    }

    // If LIFF ID is not set yet in .env, open the LINE Connect dialog
    setLoading(false);
    setLineModalOpen(true);
  };

  // Submit manual LINE Connect Modal
  const handleConfirmLineConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineUserId) {
      setErrorMsg('กรุณากรอก LINE User ID (ตัว U...)');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: lineUserId.trim(),
          displayName: lineName.trim() || 'ผู้ใช้ LINE',
          room: lineRoom.trim() || '101',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      localStorage.setItem('locker_auth_user', JSON.stringify(data.data));
      setLineModalOpen(false);
      onLoginSuccess(data.data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'เชื่อมต่อ LINE ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20 text-3xl">
            📦
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Smart Parcel Locker</h1>
          <p className="text-xs text-slate-400 mt-1">
            ระบบตู้ไปรษณีย์อัจฉริยะ • กรุณาเข้าสู่ระบบตามสิทธิ์ของคุณ
          </p>
          <div className="mt-2">
            {isSupabase ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Supabase Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-normal bg-slate-900 text-slate-400 border border-slate-800">
                💾 Local Database Mode
              </span>
            )}
          </div>
        </div>

        {/* Main Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-2xl flex items-center gap-2.5 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
            {/* Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-blue-400" /> Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="กรอกชื่อผู้ใช้ เช่น admin, sender1, somchai"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="กรอกรหัสผ่าน"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2"
              >
                <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* OR LINE LOGIN DIVIDER */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-slate-900 px-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
              หรือเข้าใช้งานด้วย
            </span>
          </div>

          {/* LINE Login / LINE LIFF Button */}
          <button
            type="button"
            onClick={handleLineLogin}
            disabled={loading}
            className="w-full py-3.5 bg-[#06C755] hover:bg-[#05b34c] active:scale-95 text-white font-bold text-sm rounded-xl shadow-xl shadow-[#06C755]/20 transition flex items-center justify-center gap-2.5"
          >
            {/* LINE Official Speech Bubble Icon */}
            <svg className="w-5 h-5 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992z"/>
            </svg>
            <span>เข้าสู่ระบบด้วย LINE (LINE Login / LIFF)</span>
          </button>

          {/* Quick Demo Login Section */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              คลิกเพื่อทดสอบเข้าสู่ระบบด่วน:
            </span>

            <div className="space-y-2">
              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin')}
                className="w-full p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-400" />
                  <span>สิทธิ์ Admin (ผู้ดูแลระบบ)</span>
                </div>
                <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">
                  user: <strong>admin</strong> / pass: <strong>admin</strong>
                </span>
              </button>

              {/* Sender Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin('sender1', '1234')}
                className="w-full p-2.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-teal-400" />
                  <span>สิทธิ์ ผู้ส่ง (Courier)</span>
                </div>
                <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">
                  user: <strong>sender1</strong> / pass: <strong>1234</strong>
                </span>
              </button>

              {/* Recipient Button */}
              <button
                type="button"
                onClick={() => handleQuickLogin('somchai', '1234')}
                className="w-full p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold flex items-center justify-between transition group"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <span>สิทธิ์ ผู้รับ (ห้อง 101)</span>
                </div>
                <span className="text-[10px] font-mono opacity-70 group-hover:opacity-100">
                  user: <strong>somchai</strong> / pass: <strong>1234</strong>
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Intelligent Parcel Locker System • Authentication & LINE Gateway
        </p>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: LINE CONNECT / LIFF AUTO-SIGN IN                                  */}
      {/* ========================================================================= */}
      {lineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-[#06C755] font-bold text-base">
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.121.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992z"/>
                </svg>
                <span>เข้าใช้งานด้วยบัญชี LINE</span>
              </div>
              <button onClick={() => setLineModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              กรอกข้อมูลเพื่อเชื่อมต่อบัญชี LINE ของคุณ ระบบจะค้นหาหรือ<strong>สร้าง User ใหม่ใน Supabase</strong> ให้โดยอัตโนมัติ
            </p>

            <form onSubmit={handleConfirmLineConnect} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-[#06C755]" /> ชื่อโปรไฟล์ LINE (Display Name)
                </label>
                <input
                  type="text"
                  required
                  value={lineName}
                  onChange={(e) => setLineName(e.target.value)}
                  placeholder="เช่น สมศักดิ์ หรือชื่อ LINE ของคุณ"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#06C755]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[9px] font-bold">U</span>
                  LINE User ID (ขึ้นต้นด้วย U...)
                </label>
                <input
                  type="text"
                  required
                  value={lineUserId}
                  onChange={(e) => setLineUserId(e.target.value)}
                  placeholder="เช่น Ua1b2c3d4e5f67890..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-[#06C755]"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  (ดูได้จากหน้า Your user ID ใน LINE Developers Console)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-blue-400" /> เลขห้องพัก / บ้านเลขที่
                </label>
                <input
                  type="text"
                  value={lineRoom}
                  onChange={(e) => setLineRoom(e.target.value)}
                  placeholder="เช่น 101, 205"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !lineUserId}
                  className="w-full py-3.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {loading ? 'กำลังเชื่อมต่อ...' : 'เข้าสู่ระบบและสร้าง User ใน Supabase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
