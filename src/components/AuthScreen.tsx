'use client';

import React, { useState } from 'react';
import { User } from '@/lib/types';
import { 
  Package, 
  Lock, 
  User as UserIcon, 
  Shield, 
  Truck, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  Sparkles
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

  const handleLogin = async (e: React.FormEvent, customUser?: string, customPass?: string) => {
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
    handleLogin(null as unknown as React.FormEvent, u, p);
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
          Intelligent Parcel Locker System • Authentication Gateway
        </p>
      </div>
    </div>
  );
}
