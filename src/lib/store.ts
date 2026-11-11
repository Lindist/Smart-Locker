import { User, Locker, Parcel, ActivityLog, UserRole, LockerStatus } from './types';

export const INITIAL_USERS: User[] = [
  { id: 'usr-admin', name: 'สมศักดิ์ ดูแลระบบ', username: 'admin', password: 'admin', phone: '0890000000', room: 'Office', role: 'ADMIN' },
  { id: 'usr-sender', name: 'วิชัย ขนส่งด่วน (Courier)', username: 'sender1', password: '1234', phone: '0819998888', room: 'Delivery', role: 'SENDER' },
  { id: 'usr-rec1', name: 'สมชาย สายเปย์', username: 'somchai', password: '1234', phone: '0812345678', room: '101', role: 'RECIPIENT' },
  { id: 'usr-rec2', name: 'สมศรี มณีวรรณ', username: 'somsri', password: '1234', phone: '0898765432', room: '205', role: 'RECIPIENT' },
  { id: 'usr-rec3', name: 'ธนากร สุขสันต์', username: 'thanakorn', password: '1234', phone: '0865554321', room: '312', role: 'RECIPIENT' },
];

export const INITIAL_LOCKERS: Locker[] = [
  {
    id: 'LK-1',
    number: 1,
    name: 'ตู้ที่ 1',
    status: 'AVAILABLE',
    doorState: 'CLOSED',
    currentParcelId: null,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'LK-2',
    number: 2,
    name: 'ตู้ที่ 2',
    status: 'OCCUPIED',
    doorState: 'CLOSED',
    currentParcelId: 'pcl-sample-1',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'LK-3',
    number: 3,
    name: 'ตู้ที่ 3',
    status: 'AVAILABLE',
    doorState: 'CLOSED',
    currentParcelId: null,
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'LK-4',
    number: 4,
    name: 'ตู้ที่ 4',
    status: 'AVAILABLE',
    doorState: 'CLOSED',
    currentParcelId: null,
    lastUpdated: new Date().toISOString(),
  },
];

export const INITIAL_PARCELS: Parcel[] = [
  {
    id: 'pcl-sample-1',
    trackingCode: 'TH-99482710',
    lockerId: 'LK-2',
    lockerNumber: 2,
    recipientId: 'usr-rec1', // สมชาย ห้อง 101
    recipientName: 'สมชาย สายเปย์',
    recipientPhone: '0812345678',
    recipientRoom: '101',
    senderId: 'usr-sender',
    senderName: 'วิชัย ขนส่งด่วน (Courier)',
    pickupPin: '584912',
    qrToken: 'qr_demo_token_somchai',
    status: 'PENDING',
    depositedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
];

class SystemStore {
  private users: User[] = [...INITIAL_USERS];
  private lockers: Locker[] = [...INITIAL_LOCKERS];
  private parcels: Parcel[] = [...INITIAL_PARCELS];
  private logs: ActivityLog[] = [
    {
      id: 'log-init',
      timestamp: new Date().toISOString(),
      action: 'DEPOSIT',
      details: 'ระบบเริ่มต้น: ตู้ที่ 2 มีพัสดุรอรับ (TH-99482710)',
    },
  ];
  private activeUserId: string = 'usr-rec1'; // default active user for UI preview

  getActiveUserId(): string {
    return this.activeUserId;
  }

  setActiveUserId(id: string): User | undefined {
    const user = this.users.find((u) => u.id === id);
    if (user) {
      this.activeUserId = id;
    }
    return user;
  }

  getUsers(): User[] {
    return [...this.users];
  }

  getLockers(): Locker[] {
    return [...this.lockers];
  }

  getParcels(): Parcel[] {
    return [...this.parcels];
  }

  getLogs(): ActivityLog[] {
    return [...this.logs];
  }

  addLog(action: ActivityLog['action'], details: string, userId?: string) {
    this.logs.unshift({
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      action,
      details,
      userId,
    });
    if (this.logs.length > 50) this.logs.pop();
  }

  // --- USER CRUD ---
  createUser(data: Omit<User, 'id'>): User {
    const newUser: User = {
      id: 'usr-' + Date.now(),
      ...data,
    };
    this.users.push(newUser);
    this.addLog('USER_UPDATE', `สร้างผู้ใช้ใหม่: ${newUser.name} (${newUser.role})`);
    return newUser;
  }

  updateUser(id: string, data: Partial<User>): User | null {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...data };
    this.addLog('USER_UPDATE', `แก้ไขข้อมูลผู้ใช้: ${this.users[index].name}`);
    return this.users[index];
  }

  updateUserRole(id: string, newRole: UserRole): User | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;

    const oldRole = user.role;
    user.role = newRole;
    this.addLog('ROLE_CHANGE', `เปลี่ยนสิทธิ์ผู้ใช้ ${user.name} จาก ${oldRole} เป็น ${newRole}`);
    return user;
  }

  deleteUser(id: string): boolean {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;

    const removed = this.users.splice(index, 1)[0];
    this.addLog('DELETE', `ลบผู้ใช้: ${removed.name} (${removed.phone || removed.username})`);
    return true;
  }

  // --- PARCEL CRUD ---
  updateParcel(id: string, data: Partial<Parcel>): Parcel | null {
    const index = this.parcels.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.parcels[index] = { ...this.parcels[index], ...data };
    this.addLog('PARCEL_UPDATE', `แก้ไขพัสดุ: ${this.parcels[index].trackingCode}`);
    return this.parcels[index];
  }

  deleteParcel(id: string): boolean {
    const index = this.parcels.findIndex((p) => p.id === id);
    if (index === -1) return false;

    const removed = this.parcels.splice(index, 1)[0];
    // If this parcel was inside a locker, free the locker
    const locker = this.lockers.find((l) => l.id === removed.lockerId);
    if (locker && locker.currentParcelId === removed.id) {
      locker.status = 'AVAILABLE';
      locker.doorState = 'CLOSED';
      locker.currentParcelId = null;
    }

    this.addLog('DELETE', `ลบพัสดุ: ${removed.trackingCode}`);
    return true;
  }

  // --- SENDER FLOW ---
  // Step 1: Sender selects available locker -> Unlocks it
  senderSelectAndUnlockLocker(lockerId: string): Locker {
    const locker = this.lockers.find((l) => l.id === lockerId);
    if (!locker) throw new Error('ไม่พบตู้ที่ระบุ');
    if (locker.status === 'OCCUPIED') throw new Error(`${locker.name} มีพัสดุอยู่ ไม่สามารถเปิดได้`);

    locker.doorState = 'OPEN';
    locker.lastUpdated = new Date().toISOString();
    this.addLog('UNLOCK', `ผู้ส่งสั่งเปิด ${locker.name} เพื่อเตรียมวางพัสดุ`);
    return locker;
  }

  // Step 2: Sender places item, closes door, confirms recipient -> OCCUPIED
  senderDepositParcel(params: {
    lockerId: string;
    senderId?: string;
    senderName?: string;
    recipientId: string;
    trackingCode: string;
  }): { locker: Locker; parcel: Parcel } {
    const locker = this.lockers.find((l) => l.id === params.lockerId);
    if (!locker) throw new Error('ไม่พบตู้ที่ระบุ');
    if (locker.status === 'OCCUPIED') throw new Error(`${locker.name} มีพัสดุอยู่แล้ว`);

    const recipient = this.users.find((u) => u.id === params.recipientId);
    if (!recipient) throw new Error('ไม่พบข้อมูลผู้รับ');

    // Generate 6-digit PIN and unique QR token
    const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();
    const qrToken = 'qr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

    const parcel: Parcel = {
      id: 'pcl-' + Date.now(),
      trackingCode: params.trackingCode || 'TH-' + Math.floor(10000000 + Math.random() * 90000000),
      lockerId: locker.id,
      lockerNumber: locker.number,
      recipientId: recipient.id,
      recipientName: recipient.name,
      recipientPhone: recipient.phone,
      recipientRoom: recipient.room,
      senderId: params.senderId,
      senderName: params.senderName,
      pickupPin,
      qrToken,
      status: 'PENDING',
      depositedAt: new Date().toISOString(),
    };

    // Update locker
    locker.status = 'OCCUPIED';
    locker.doorState = 'CLOSED';
    locker.currentParcelId = parcel.id;
    locker.lastUpdated = new Date().toISOString();

    this.parcels.unshift(parcel);
    this.addLog(
      'DEPOSIT',
      `ผู้ส่ง ${params.senderName || ''} ฝากพัสดุ ${parcel.trackingCode} ใน ${locker.name} ให้ ${recipient.name} (ห้อง ${recipient.room}) สำเร็จ`
    );

    return { locker, parcel };
  }

  // --- RECIPIENT FLOW ---
  // Unlock locker using 6-digit PIN code or QR Token
  recipientUnlock(codeOrToken: string, recipientId?: string): { success: boolean; message: string; locker?: Locker; parcel?: Parcel } {
    const trimmed = codeOrToken.trim();
    if (!trimmed) return { success: false, message: 'กรุณากรอกรหัส PIN หรือ Token' };

    // Find matching pending parcel
    const parcel = this.parcels.find(
      (p) => p.status === 'PENDING' && (p.pickupPin === trimmed || p.qrToken === trimmed)
    );

    if (!parcel) {
      return { success: false, message: 'รหัสเปิดตู้ไม่ถูกต้อง หรือไม่มีพัสดุที่รอรับด้วยรหัสนี้' };
    }

    const locker = this.lockers.find((l) => l.id === parcel.lockerId);
    if (!locker) {
      return { success: false, message: 'ไม่พบตู้ที่เก็บพัสดุนี้' };
    }

    // Unlock door
    locker.doorState = 'OPEN';
    locker.status = 'AVAILABLE';
    locker.currentParcelId = null;
    locker.lastUpdated = new Date().toISOString();

    // Mark parcel picked up
    parcel.status = 'PICKED_UP';
    parcel.pickedUpAt = new Date().toISOString();

    this.addLog(
      'UNLOCK',
      `ผู้รับ ${parcel.recipientName} ปลดล็อก ${locker.name} นำพัสดุ ${parcel.trackingCode} ออกเรียบร้อย`,
      recipientId
    );

    return {
      success: true,
      message: `ปลดล็อก ${locker.name} สำเร็จ! ประตูเปิดแล้ว กรุณาหยิบพัสดุและปิดตู้`,
      locker,
      parcel,
    };
  }

  // --- ADMIN MASTER FLOW ---
  adminUnlockLocker(lockerId: string): Locker {
    const locker = this.lockers.find((l) => l.id === lockerId);
    if (!locker) throw new Error('ไม่พบตู้');

    locker.doorState = 'OPEN';
    locker.lastUpdated = new Date().toISOString();
    this.addLog('ADMIN_UNLOCK', `Admin สั่งปลดล็อกฉุกเฉิน ${locker.name}`);
    return locker;
  }

  adminCloseLocker(lockerId: string): Locker {
    const locker = this.lockers.find((l) => l.id === lockerId);
    if (!locker) throw new Error('ไม่พบตู้');

    locker.doorState = 'CLOSED';
    locker.lastUpdated = new Date().toISOString();
    return locker;
  }

  adminResetLocker(lockerId: string): Locker {
    const locker = this.lockers.find((l) => l.id === lockerId);
    if (!locker) throw new Error('ไม่พบตู้');

    if (locker.currentParcelId) {
      const p = this.parcels.find((item) => item.id === locker.currentParcelId);
      if (p) p.status = 'PICKED_UP';
    }

    locker.status = 'AVAILABLE';
    locker.doorState = 'CLOSED';
    locker.currentParcelId = null;
    locker.lastUpdated = new Date().toISOString();
    this.addLog('ADMIN_UNLOCK', `Admin รีเซ็ต ${locker.name} เป็นว่าง (AVAILABLE)`);
    return locker;
  }
}

const globalForStore = globalThis as unknown as { systemStore: SystemStore };
export const systemStore = globalForStore.systemStore || new SystemStore();
if (process.env.NODE_ENV !== 'production') globalForStore.systemStore = systemStore;
