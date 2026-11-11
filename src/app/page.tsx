'use client';

import React, { useState, useEffect, useCallback } from 'react';
import KioskScreen from '@/components/KioskScreen';
import MobileRecipientView from '@/components/MobileRecipientView';
import LineSimulator from '@/components/LineSimulator';
import HardwareSimulator from '@/components/HardwareSimulator';
import AdminPanel from '@/components/AdminPanel';
import { LockerState, UserDirectoryItem, ActivityLog, Parcel } from '@/lib/types';
import { SentNotification, DEFAULT_USERS } from '@/lib/store';
import { Monitor, Smartphone, Cpu, Shield, RefreshCw, Sparkles, LayoutDashboard } from 'lucide-react';

export default function HomePage() {
  const [activeView, setActiveView] = useState<'showcase' | 'kiosk' | 'mobile' | 'hardware' | 'admin'>('showcase');
  const [mobileToken, setMobileToken] = useState<string>('');

  const [locker, setLocker] = useState<LockerState>({
    id: 'LK-01',
    name: 'Smart Locker 01 (ตู้หลัก)',
    location: 'หอพักนักศึกษา / อาคาร A ชั้น 1',
    status: 'AVAILABLE',
    doorState: 'CLOSED',
    currentParcel: null,
    lastUpdated: '',
    hardwareCommand: 'IDLE',
  });

  const [users, setUsers] = useState<UserDirectoryItem[]>(DEFAULT_USERS);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [history, setHistory] = useState<Parcel[]>([]);
  const [notifications, setNotifications] = useState<SentNotification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch live state from backend
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/locker/status');
      const data = await res.json();
      if (data.success) {
        setLocker(data.data.locker);
        setUsers(data.data.users || DEFAULT_USERS);
        setLogs(data.data.logs || []);
        setHistory(data.data.history || []);
        setNotifications(data.data.notifications || []);

        // Sync mobile token if current parcel exists
        if (data.data.locker.currentParcel) {
          setMobileToken(data.data.locker.currentParcel.qrToken);
        }
      }
    } catch (err) {
      console.error('Fetch status error:', err);
    }
  }, []);

  // Poll state every 2 seconds for real-time synchronization between views
  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            📦
          </div>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              Intelligent Parcel Locker
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                Single Compartment
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">ระบบตู้ไปรษณีย์อัจฉริยะ • Full Stack & IoT</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveView('showcase')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeView === 'showcase' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Showcase ทั้งหมด</span>
          </button>
          <button
            onClick={() => setActiveView('kiosk')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeView === 'kiosk' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">หน้าจอตู้ (Kiosk)</span>
          </button>
          <button
            onClick={() => setActiveView('mobile')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeView === 'mobile' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">LINE & มือถือผู้รับ</span>
          </button>
          <button
            onClick={() => setActiveView('hardware')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeView === 'hardware' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ฮาร์ดแวร์ ESP32</span>
          </button>
          <button
            onClick={() => setActiveView('admin')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
              activeView === 'admin' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          title="Refresh State"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* VIEW 1: Showcase Mode (Side-by-side: Kiosk + LINE/Mobile + Hardware) */}
        {activeView === 'showcase' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-slate-900 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  🚀 Interactive Demonstration Studio
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  ทดสอบระบบแบบครบวงจร: ฝั่งซ้ายคือ <strong>หน้าจอตู้ Kiosk</strong>, ตรงกลางคือ <strong>การแจ้งเตือน LINE ของผู้รับ</strong>, และฝั่งขวาคือ <strong>การทำงานของกลอนและบอร์ด ESP32</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  ● Real-time Synced
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Kiosk Screen (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-blue-400" /> หน้าจอตู้จริง (Physical Locker Kiosk)
                  </h3>
                  <span className="text-[11px] text-slate-500">Touchscreen Display</span>
                </div>
                <KioskScreen locker={locker} users={users} onRefresh={fetchStatus} />
              </div>

              {/* Right Column: LINE Mockup & Mobile Recipient View (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-400" /> ฝั่งผู้รับ (LINE Notification & Web)
                  </h3>
                  <span className="text-[11px] text-slate-500">LINE Flex Message</span>
                </div>
                <LineSimulator
                  notifications={notifications}
                  onOpenMobileView={(token) => {
                    setMobileToken(token);
                    setActiveView('mobile');
                  }}
                />
              </div>
            </div>

            {/* Bottom Section: Hardware & ESP32 Visual */}
            <div className="pt-4">
              <HardwareSimulator locker={locker} onRefresh={fetchStatus} />
            </div>
          </div>
        )}

        {/* VIEW 2: Kiosk Only Mode */}
        {activeView === 'kiosk' && (
          <div className="max-w-4xl mx-auto py-4">
            <KioskScreen locker={locker} users={users} onRefresh={fetchStatus} />
          </div>
        )}

        {/* VIEW 3: Mobile / LINE Only Mode */}
        {activeView === 'mobile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto py-4">
            <div>
              <div className="text-center mb-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
                1. แจ้งเตือนเข้าแอป LINE
              </div>
              <LineSimulator
                notifications={notifications}
                onOpenMobileView={(token) => setMobileToken(token)}
              />
            </div>
            <div>
              <div className="text-center mb-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
                2. หน้าเว็บปลดล็อกที่ผู้รับเปิด
              </div>
              <MobileRecipientView
                token={mobileToken || locker.currentParcel?.qrToken || 'sample_token'}
                initialParcelInfo={
                  locker.currentParcel
                    ? {
                        recipientName: locker.currentParcel.recipientName,
                        recipientRoom: locker.currentParcel.recipientRoom,
                        trackingCode: locker.currentParcel.trackingCode,
                        depositedAt: locker.currentParcel.depositedAt,
                        pickupPin: locker.currentParcel.pickupPin,
                      }
                    : undefined
                }
                onUnlockedSuccess={fetchStatus}
              />
            </div>
          </div>
        )}

        {/* VIEW 4: Hardware & IoT Simulator Mode */}
        {activeView === 'hardware' && (
          <div className="max-w-4xl mx-auto py-4">
            <HardwareSimulator locker={locker} onRefresh={fetchStatus} />
          </div>
        )}

        {/* VIEW 5: Admin Panel Mode */}
        {activeView === 'admin' && (
          <div className="max-w-4xl mx-auto py-4">
            <AdminPanel locker={locker} logs={logs} history={history} onRefresh={fetchStatus} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        Intelligent Parcel Locker System with Automated Notification & QR Code Unlock • Next.js Full Stack
      </footer>
    </div>
  );
}
