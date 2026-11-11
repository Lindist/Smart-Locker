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
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isSupabase, setIsSupabase] = useState(false);

  // Check saved session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('locker_auth_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
      }
    } catch {
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

  // Switch active user session directly from dropdown (quick switch)
  const handleSwitchUser = async (user: User) => {
    try {
      await fetch('/api/auth/current', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      setCurrentUser(user);
      localStorage.setItem('locker_auth_user', JSON.stringify(user));
      setUserDropdownOpen(false);
      fetchAllData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('locker_auth_user');
      setCurrentUser(null);
      setUserDropdownOpen(false);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            📦
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              Smart Parcel Locker
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                4 ตู้ล็อกเกอร์
              </span>
              {isSupabase ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Supabase Connected
                </span>
              ) : (
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  💾 Local DB
                </span>
              )}
            </h1>
            <p className="text-[11px] text-slate-400">ระบบตู้ไปรษณีย์อัจฉริยะแบบแบ่ง 3 สิทธิ์ใช้งาน</p>
          </div>
        </div>

        {/* User Badge, Switcher & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Menu Dropdown */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2.5 bg-slate-950 border border-slate-700 hover:border-slate-500 px-3.5 py-1.5 rounded-xl text-xs transition shadow-sm"
            >
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white">{currentUser.name}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
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
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown Menu */}
            {userDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-800">
                  สลับผู้ใช้งานด่วน
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/60">
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => handleSwitchUser(u)}
                      className={`w-full px-3.5 py-2.5 text-left text-xs transition flex items-center justify-between hover:bg-slate-800 ${
                        currentUser.id === u.id ? 'bg-blue-600/20 text-blue-300' : 'text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{u.name}</div>
                        <div className="text-[10px] text-slate-500">{u.room ? `ห้อง ${u.room}` : u.username}</div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300'
                            : u.role === 'SENDER'
                            ? 'bg-teal-500/20 text-teal-300'
                            : 'bg-blue-500/20 text-blue-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleManualRefresh}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 hover:text-white transition flex items-center gap-1.5 text-xs font-semibold"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Role Content View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
