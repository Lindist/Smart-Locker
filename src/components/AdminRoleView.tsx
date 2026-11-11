'use client';

import React, { useState } from 'react';
import { User, Locker, Parcel, UserRole } from '@/lib/types';
import { 
  Shield, 
  Unlock, 
  Lock, 
  Users, 
  Package, 
  Trash2, 
  Edit, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  DoorClosed,
  X
} from 'lucide-react';

interface AdminRoleViewProps {
  currentUser: User;
  lockers: Locker[];
  users: User[];
  parcels: Parcel[];
  onRefresh: () => void;
}

export default function AdminRoleView({ currentUser, lockers, users, parcels, onRefresh }: AdminRoleViewProps) {
  const [activeTab, setActiveTab] = useState<'lockers' | 'users' | 'parcels'>('lockers');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // User form modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    name: '',
    username: '',
    password: '',
    phone: '',
    room: '',
    role: 'RECIPIENT' as UserRole,
    lineUserId: '',
  });

  // Parcel edit modal state
  const [parcelModalOpen, setParcelModalOpen] = useState(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [parcelForm, setParcelForm] = useState({
    trackingCode: '',
    pickupPin: '',
    status: 'PENDING' as 'PENDING' | 'PICKED_UP',
  });

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // --- LOCKER OPERATIONS ---
  const handleAdminUnlock = async (lockerId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_unlock', lockerId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMessage('success', data.message);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminClose = async (lockerId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_close', lockerId }),
      });
      const data = await res.json();
      showMessage('success', data.message);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleAdminReset = async (lockerId: string) => {
    if (!confirm('ยืนยันรีเซ็ตสถานะตู้นี้เป็นว่าง (AVAILABLE) หรือไม่?')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/lockers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_reset', lockerId }),
      });
      const data = await res.json();
      showMessage('success', data.message);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  // --- USER ROLE & CRUD ---
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMessage('success', `เปลี่ยนสิทธิ์ผู้ใช้เป็น ${newRole} สำเร็จ`);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบผู้ใช้ "${name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/users?id=${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMessage('success', data.message);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingUser) {
        // Update
        const res = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingUser.id, ...userForm }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showMessage('success', data.message);
      } else {
        // Create
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userForm),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showMessage('success', data.message);
      }
      setUserModalOpen(false);
      setEditingUser(null);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  // --- PARCEL CRUD ---
  const handleDeleteParcel = async (parcelId: string, trackingCode: string) => {
    if (!confirm(`คุณแน่ใจว่าต้องการลบพัสดุ "${trackingCode}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/parcels?id=${parcelId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMessage('success', data.message);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParcel) return;
    setLoading(true);
    try {
      const res = await fetch('/api/parcels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingParcel.id, ...parcelForm }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      showMessage('success', data.message);
      setParcelModalOpen(false);
      setEditingParcel(null);
      onRefresh();
    } catch (err: unknown) {
      showMessage('error', err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-amber-900/40 via-orange-900/30 to-slate-900 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            สิทธิ์: ผู้ดูแลระบบ (Admin)
          </span>
          <h2 className="text-lg sm:text-xl font-bold text-white mt-1.5">Admin: {currentUser.name}</h2>
          <p className="text-xs text-slate-400">
            ควบคุมปลดล็อกตู้ทุกตู้, กำหนดสิทธิ์ผู้รับ/ผู้ส่ง, จัดการข้อมูลผู้ใช้และพัสดุ
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="w-full lg:w-auto grid grid-cols-3 sm:flex bg-slate-950 p-1 rounded-xl border border-slate-700 text-[11px] sm:text-xs gap-1">
          <button
            onClick={() => setActiveTab('lockers')}
            className={`px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'lockers' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ตู้ (4)</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'users' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">ผู้ใช้ ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('parcels')}
            className={`px-2 sm:px-3 py-2 sm:py-1.5 rounded-lg font-semibold flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 transition ${
              activeTab === 'parcels' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">พัสดุ ({parcels.length})</span>
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {msg && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm animate-in fade-in ${
            msg.type === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
              : 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
          }`}
        >
          {msg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: LOCKERS MANAGEMENT (Master unlock for all 4 lockers)               */}
      {/* ========================================================================= */}
      {activeTab === 'lockers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                <span>สถานะและการควบคุมตู้ทั้งหมด (4 ตู้)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Admin มีสิทธิ์สั่งปลดล็อกตู้ใดก็ได้ในระบบทันที
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {lockers.map((locker) => {
              const currentParcel = parcels.find((p) => p.id === locker.currentParcelId);

              return (
                <div
                  key={locker.id}
                  className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-extrabold text-base text-white">{locker.name}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          locker.status === 'AVAILABLE'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {locker.status === 'AVAILABLE' ? 'ว่าง' : 'มีพัสดุ'}
                      </span>
                    </div>

                    {/* Door Status */}
                    <div className="mb-3 text-xs flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <span className="text-slate-400">สถานะประตู:</span>
                      <span
                        className={`font-semibold flex items-center gap-1 ${
                          locker.doorState === 'OPEN' ? 'text-amber-400' : 'text-slate-300'
                        }`}
                      >
                        {locker.doorState === 'OPEN' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {locker.doorState === 'OPEN' ? 'เปิดอยู่ (OPEN)' : 'ปิดอยู่ (CLOSED)'}
                      </span>
                    </div>

                    {/* Parcel Info if occupied */}
                    {currentParcel ? (
                      <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 mb-4 space-y-1">
                        <div className="truncate">
                          <span className="text-slate-500">พัสดุ:</span>{' '}
                          <span className="font-mono text-blue-400 font-bold">{currentParcel.trackingCode}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-slate-500">ผู้รับ:</span> {currentParcel.recipientName} (ห้อง {currentParcel.recipientRoom})
                        </div>
                        <div>
                          <span className="text-slate-500">PIN:</span>{' '}
                          <span className="font-mono text-emerald-400 font-bold">{currentParcel.pickupPin}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-14 sm:h-16 flex items-center justify-center text-xs text-slate-500 italic mb-4">
                        (ไม่มีพัสดุในตู้)
                      </div>
                    )}
                  </div>

                  {/* Admin Action Buttons */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleAdminUnlock(locker.id)}
                      disabled={loading}
                      className="w-full py-2.5 sm:py-2 bg-amber-600 hover:bg-amber-500 active:scale-[0.98] text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      สั่งปลดล็อกตู้นี้ (Master Unlock)
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAdminClose(locker.id)}
                        disabled={loading || locker.doorState === 'CLOSED'}
                        className="flex-1 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1"
                      >
                        <DoorClosed className="w-3 h-3" /> ปิดประตู
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdminReset(locker.id)}
                        disabled={loading}
                        className="flex-1 py-2 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1"
                        title="รีเซ็ตสถานะตู้เป็นว่าง"
                      >
                        <RotateCcw className="w-3 h-3" /> รีเซ็ตว่าง
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USERS & ROLE ASSIGNMENT                                           */}
      {/* ========================================================================= */}
      {activeTab === 'users' && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400 shrink-0" />
                <span>รายชื่อผู้ใช้งานและการกำหนดสิทธิ์ (User Management)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                เฉพาะ Admin เท่านั้นที่สามารถเปลี่ยนสิทธิ์ผู้ใช้เป็น ผู้รับ, ผู้ส่ง, หรือ Admin ได้
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null);
                setUserForm({ name: '', username: '', password: '1234', phone: '', room: '', role: 'RECIPIENT', lineUserId: '' });
                setUserModalOpen(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow shrink-0"
            >
              <Plus className="w-4 h-4" /> เพิ่มผู้ใช้งานใหม่
            </button>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate">{u.name}</div>
                    <div className="text-xs font-mono text-slate-400 truncate">@{u.username}</div>
                    <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                      <span>ห้อง/แผนก: <strong className="text-slate-200">{u.room || '-'}</strong></span>
                      <span>โทร: <strong className="text-slate-200 font-mono">{u.phone || '-'}</strong></span>
                    </div>
                  </div>
                  {u.lineUserId && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#06C755]/20 text-[#06C755] border border-[#06C755]/30 shrink-0">
                      LINE
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className={`flex-1 text-xs font-bold px-2.5 py-2 rounded-lg border focus:outline-none ${
                      u.role === 'ADMIN'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : u.role === 'SENDER'
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    <option value="RECIPIENT" className="bg-slate-900 text-white">ผู้รับ (RECIPIENT)</option>
                    <option value="SENDER" className="bg-slate-900 text-white">ผู้ส่ง (SENDER)</option>
                    <option value="ADMIN" className="bg-slate-900 text-white">Admin (ADMIN)</option>
                  </select>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u);
                        setUserForm({
                          name: u.name,
                          username: u.username,
                          password: u.password || (u.username === 'admin' ? 'admin' : '1234'),
                          phone: u.phone,
                          room: u.room,
                          role: u.role,
                          lineUserId: u.lineUserId || '',
                        });
                        setUserModalOpen(true);
                      }}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 transition"
                      title="แก้ไข"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id, u.name)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-rose-400 transition"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">ชื่อ - นามสกุล</th>
                  <th className="p-3">Username</th>
                  <th className="p-3">ห้อง / แผนก</th>
                  <th className="p-3">เบอร์โทร</th>
                  <th className="p-3">สิทธิ์ใช้งาน (Role)</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-semibold text-white">{u.name}</td>
                    <td className="p-3 font-mono text-slate-400">{u.username}</td>
                    <td className="p-3">{u.room || '-'}</td>
                    <td className="p-3 font-mono">{u.phone || '-'}</td>
                    <td className="p-3">
                      {/* Role selection dropdown */}
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className={`text-xs font-bold px-2 py-1 rounded-lg border focus:outline-none ${
                          u.role === 'ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : u.role === 'SENDER'
                            ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                            : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        }`}
                      >
                        <option value="RECIPIENT" className="bg-slate-900 text-white">ผู้รับ (RECIPIENT)</option>
                        <option value="SENDER" className="bg-slate-900 text-white">ผู้ส่ง (SENDER)</option>
                        <option value="ADMIN" className="bg-slate-900 text-white">Admin (ADMIN)</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setUserForm({
                              name: u.name,
                              username: u.username,
                              password: u.password || (u.username === 'admin' ? 'admin' : '1234'),
                              phone: u.phone,
                              room: u.room,
                              role: u.role,
                              lineUserId: u.lineUserId || '',
                            });
                            setUserModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-blue-400 transition"
                          title="แก้ไข"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-rose-400 transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PARCELS MANAGEMENT                                                */}
      {/* ========================================================================= */}
      {activeTab === 'parcels' && (
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400 shrink-0" />
                <span>รายการพัสดุทั้งหมดในระบบ ({parcels.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                สามารถดู, แก้ไขรหัส PIN, หรือลบรายการพัสดุได้
              </p>
            </div>
          </div>

          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden space-y-3">
            {parcels.map((p) => (
              <div
                key={p.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-sm text-white break-all">{p.trackingCode}</div>
                    <div className="text-xs font-semibold text-amber-300 mt-0.5">ตู้ที่ {p.lockerNumber}</div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      p.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {p.status === 'PENDING' ? 'รอรับมอบ' : 'รับแล้ว'}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500">ผู้รับ:</span> {p.recipientName} (ห้อง {p.recipientRoom})
                  </div>
                  <div>
                    <span className="text-slate-500">ผู้ส่ง:</span> {p.senderName || '-'}
                  </div>
                  <div>
                    <span className="text-slate-500">รหัส PIN:</span>{' '}
                    <span className="font-mono font-bold text-emerald-400">{p.pickupPin}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingParcel(p);
                      setParcelForm({
                        trackingCode: p.trackingCode,
                        pickupPin: p.pickupPin,
                        status: p.status,
                      });
                      setParcelModalOpen(true);
                    }}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-blue-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Edit className="w-3.5 h-3.5" /> แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteParcel(p.id, p.trackingCode)}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3">หมายเลขพัสดุ</th>
                  <th className="p-3">ตู้ที่เก็บ</th>
                  <th className="p-3">ผู้รับ</th>
                  <th className="p-3">ผู้ส่ง</th>
                  <th className="p-3">รหัส PIN</th>
                  <th className="p-3">สถานะ</th>
                  <th className="p-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {parcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-3 font-mono font-bold text-white">{p.trackingCode}</td>
                    <td className="p-3 font-semibold text-amber-300">ตู้ที่ {p.lockerNumber}</td>
                    <td className="p-3">
                      <div>{p.recipientName}</div>
                      <div className="text-[10px] text-slate-500">ห้อง {p.recipientRoom}</div>
                    </td>
                    <td className="p-3 text-slate-400">{p.senderName || '-'}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">{p.pickupPin}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'PENDING'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-700 text-slate-400'
                        }`}
                      >
                        {p.status === 'PENDING' ? 'รอรับมอบ' : 'รับแล้ว'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingParcel(p);
                            setParcelForm({
                              trackingCode: p.trackingCode,
                              pickupPin: p.pickupPin,
                              status: p.status,
                            });
                            setParcelModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-blue-400 transition"
                          title="แก้ไข"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteParcel(p.id, p.trackingCode)}
                          className="p-1.5 hover:bg-slate-700 rounded-lg text-rose-400 transition"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT USER                                                 */}
      {/* ========================================================================= */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="font-bold text-base text-white">
                {editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h4>
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  required
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="เช่น 1234"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">เลขห้อง / แผนก</label>
                  <input
                    type="text"
                    value={userForm.room}
                    onChange={(e) => setUserForm({ ...userForm, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">กำหนดสิทธิ์ (Role)</label>
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="RECIPIENT">ผู้รับ (RECIPIENT)</option>
                  <option value="SENDER">ผู้ส่ง (SENDER)</option>
                  <option value="ADMIN">Admin (ADMIN)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  LINE User ID (ขึ้นต้นด้วย U สำหรับยิงแจ้งเตือนเข้าแชต)
                </label>
                <input
                  type="text"
                  value={userForm.lineUserId}
                  onChange={(e) => setUserForm({ ...userForm, lineUserId: e.target.value })}
                  placeholder="เช่น Ua1b2c3d4e5f6... (ดูได้จากหน้า Your user ID)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PARCEL                                                     */}
      {/* ========================================================================= */}
      {parcelModalOpen && editingParcel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h4 className="font-bold text-base text-white">แก้ไขข้อมูลพัสดุ</h4>
              <button
                onClick={() => setParcelModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveParcel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">หมายเลขพัสดุ</label>
                <input
                  type="text"
                  required
                  value={parcelForm.trackingCode}
                  onChange={(e) => setParcelForm({ ...parcelForm, trackingCode: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">รหัส PIN 6 หลัก</label>
                <input
                  type="text"
                  required
                  value={parcelForm.pickupPin}
                  onChange={(e) => setParcelForm({ ...parcelForm, pickupPin: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white font-mono tracking-widest focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">สถานะพัสดุ</label>
                <select
                  value={parcelForm.status}
                  onChange={(e) => setParcelForm({ ...parcelForm, status: e.target.value as 'PENDING' | 'PICKED_UP' })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-base sm:text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="PENDING">รอรับมอบ (PENDING)</option>
                  <option value="PICKED_UP">รับแล้ว (PICKED_UP)</option>
                </select>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setParcelModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
                >
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
