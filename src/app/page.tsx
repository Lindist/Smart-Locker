'use client';

import React, { useState, useEffect, useCallback } from 'react';
import RecipientView from '@/components/RecipientView';
import SenderView from '@/components/SenderView';
import AdminRoleView from '@/components/AdminRoleView';
import AuthScreen from '@/components/AuthScreen';
import { User, Locker, Parcel } from '@/lib/types';
import { 
  Package, 
  RefreshCw, 
  LogOut,
  ChevronDown
} from 'lucide-react';

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);

  // Check saved session on mount or handle LINE OAuth redirect callback
  useEffect(() => {
    try {
      // 1. Check if returning from LINE OAuth 2.1
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const lineAuthParam = params.get('line_auth');
        if (lineAuthParam) {
          const decodedJson = atob(lineAuthParam);
          const userObj = JSON.parse(decodedJson);
          localStorage.setItem('locker_auth_user', JSON.stringify(userObj));
          setCurrentUser(userObj);
          // Clean search params from URL
          window.history.replaceState({}, '', window.location.pathname);
          setIsAuthChecking(false);
          return;
        }
      }

      // 2. Normal localStorage session
      const saved = localStorage.getItem('locker_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      }
    } catch (err) {
      console.warn('Session check warning:', err);
      localStorage.removeItem('locker_auth_user');
    } finally {
      setIsAuthChecking(false);
    }
  }, []);

  // Fetch live state from backend
  const fetchAllData = useCallback(async () => {
    try {
      // 1. Fetch current auth user & users list
      const userRes = await fetch('/api/auth/current');
      const userData = await userRes.json();
      if (userData.success) {
        setAllUsers(userData.data.users);
        setIsSupabase(Boolean(userData.data.isSupabase));
      }

      // 2. Fetch lockers and parcels
      const lockerRes = await fetch('/api/lockers');
      const lockerData = await lockerRes.json();
      if (lockerData.success) {
        setLockers(lockerData.data.lockers || []);
        setParcels(lockerData.data.parcels || []);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    }
  }, []);

  // Poll state every 2.5 seconds for real-time updates when logged in
  useEffect(() => {
    fetchAllData();
    if (!currentUser) return;
    const interval = setInterval(fetchAllData, 2500);
    return () => clearInterval(interval);
  }, [fetchAllData, currentUser]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('locker_auth_user');
      setCurrentUser(null);
    }
  };

  // If still checking initial localStorage session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500 text-sm">
        กำลังตรวจสอบการเข้าสู่ระบบ...
      </div>
    );
  }

  // If NOT logged in, show AuthScreen (Login window)
  if (!currentUser) {
    return (
      <AuthScreen
        isSupabase={isSupabase}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchAllData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-x-hidden">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 shrink-0 text-sm sm:text-base">
            📦
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">Smart Locker</span>
              <span className="hidden sm:inline-flex text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                4 ตู้ล็อกเกอร์
              </span>
              {isSupabase ? (
                <span
                  className="text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1 shrink-0"
                  title="Supabase Connected"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span className="hidden md:inline">Supabase Connected</span>
                  <span className="md:hidden">DB</span>
                </span>
              ) : (
                <span
                  className="hidden sm:inline-flex text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 shrink-0"
                  title="Local DB Mode"
                >
                  💾 Local DB
                </span>
              )}
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400 truncate">
              ระบบตู้ไปรษณีย์อัจฉริยะแบบแบ่ง 3 สิทธิ์ใช้งาน
            </p>
          </div>
        </div>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* User Info Display */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 border border-slate-700 px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs shadow-sm max-w-[160px] sm:max-w-none">
            <span className="font-bold text-white truncate max-w-[75px] sm:max-w-[180px]">
              {currentUser.name}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                currentUser.role === 'ADMIN'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : currentUser.role === 'SENDER'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}
            >
              {currentUser.role === 'ADMIN'
                ? '🛡️ Admin'
                : currentUser.role === 'SENDER'
                ? '🚚 ผู้ส่ง'
                : '👤 ผู้รับ'}
            </span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 transition shrink-0"
            title="รีเฟรชข้อมูล"
            aria-label="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 active:scale-95 border border-rose-500/30 text-rose-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title="ออกจากระบบ"
            aria-label="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Role Content View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 lg:p-8">
        {currentUser.role === 'RECIPIENT' ? (
          /* 1. สิทธิ์: ผู้รับ (Recipient) */
          <RecipientView
            currentUser={currentUser}
            parcels={parcels}
            lockers={lockers}
            onRefresh={fetchAllData}
          />
        ) : currentUser.role === 'SENDER' ? (
          /* 2. สิทธิ์: ผู้ส่ง (Sender) */
          <SenderView
            currentUser={currentUser}
            lockers={lockers}
            users={allUsers}
            onRefresh={fetchAllData}
          />
        ) : (
          /* 3. สิทธิ์: Admin (ผู้ดูแลระบบ) */
          <AdminRoleView
            currentUser={currentUser}
            lockers={lockers}
            users={allUsers}
            parcels={parcels}
            onRefresh={fetchAllData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        Intelligent Parcel Locker System • 3-Tier Roles (Recipient, Sender, Admin) • 4 Compartments
      </footer>
    </div>
  );
}
