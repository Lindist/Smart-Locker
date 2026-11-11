import { LockerState, Parcel, ActivityLog, UserDirectoryItem, DoorStatus } from './types';

// Pre-seeded residents for testing
export const DEFAULT_USERS: UserDirectoryItem[] = [
  { id: 'usr-1', name: 'สมชาย สายเปย์', phone: '0812345678', room: '101', lineId: 'U111111111' },
  { id: 'usr-2', name: 'สมศรี มณีวรรณ', phone: '0898765432', room: '205', lineId: 'U222222222' },
  { id: 'usr-3', name: 'ธนากร สุขสันต์', phone: '0865554321', room: '312', lineId: 'U333333333' },
  { id: 'usr-4', name: 'กิตติพงษ์ รุ่งเรือง', phone: '0841239876', room: '404', lineId: 'U444444444' },
];

export interface SentNotification {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientPhone: string;
  recipientRoom: string;
  trackingCode: string;
  pickupPin: string;
  qrToken: string;
  webUnlockUrl: string;
  flexMessagePayload: Record<string, unknown>;
  status: 'SENT' | 'SIMULATED';
}

// Global in-memory storage (singleton in Node.js process)
class LockerStore {
  private state: LockerState = {
    id: 'LK-01',
    name: 'Smart Locker 01 (ตู้หลัก)',
    location: 'หอพักนักศึกษา / อาคาร A ชั้น 1',
    status: 'AVAILABLE',
    doorState: 'CLOSED',
    currentParcel: null,
    lastUpdated: new Date().toISOString(),
    hardwareCommand: 'IDLE',
  };

  private history: Parcel[] = [];
  private logs: ActivityLog[] = [
    {
      id: 'log-0',
      timestamp: new Date().toISOString(),
      action: 'DOOR_CLOSED',
      details: 'ระบบเริ่มต้นทำงาน ตู้พร้อมใช้งาน (AVAILABLE)',
    },
  ];
  private notifications: SentNotification[] = [];

  getState(): LockerState {
    return { ...this.state };
  }

  getLogs(): ActivityLog[] {
    return [...this.logs];
  }

  getHistory(): Parcel[] {
    return [...this.history];
  }

  getNotifications(): SentNotification[] {
    return [...this.notifications];
  }

  addLog(action: ActivityLog['action'], details: string, parcelId?: string) {
    const log: ActivityLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      action,
      details,
      parcelId,
    };
    this.logs.unshift(log); // latest first
    if (this.logs.length > 100) this.logs.pop();
  }

  // Sender starts deposit process -> Unlock door to put parcel
  startDeposit(): LockerState {
    if (this.state.status === 'OCCUPIED') {
      throw new Error('ไม่สามารถฝากได้เนื่องจากมีพัสดุอยู่ในตู้');
    }
    this.state.doorState = 'OPEN';
    this.state.hardwareCommand = 'UNLOCK';
    this.state.lastUpdated = new Date().toISOString();
    this.addLog('DOOR_OPENED', 'ผู้ส่งกดเปิดตู้เพื่อนำพัสดุเข้าช่อง');
    return this.getState();
  }

  // Sender confirms deposit after putting item & filling recipient info
  confirmDeposit(params: {
    trackingCode: string;
    recipientName: string;
    recipientPhone: string;
    recipientRoom: string;
    recipientLineId?: string;
  }): { locker: LockerState; parcel: Parcel; notification: SentNotification } {
    if (this.state.status === 'OCCUPIED') {
      throw new Error('ตู้มีพัสดุอยู่แล้ว');
    }

    // Generate random 6-digit PIN (e.g. "724915")
    const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();
    // Generate secure QR Token
    const qrToken = 'pk_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

    const parcel: Parcel = {
      id: 'pcl-' + Date.now(),
      trackingCode: params.trackingCode || 'TH-' + Math.floor(10000000 + Math.random() * 90000000),
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      recipientRoom: params.recipientRoom,
      recipientLineId: params.recipientLineId,
      pickupPin,
      qrToken,
      depositedAt: new Date().toISOString(),
      status: 'DEPOSITED',
    };

    this.state.status = 'OCCUPIED';
    this.state.doorState = 'CLOSED';
    this.state.hardwareCommand = 'IDLE';
    this.state.currentParcel = parcel;
    this.state.lastUpdated = new Date().toISOString();

    this.addLog('PARCEL_DEPOSITED', `ฝากพัสดุ ${parcel.trackingCode} สำหรับ ${parcel.recipientName} (ห้อง ${parcel.recipientRoom}) สำเร็จ`, parcel.id);

    // Create Notification Payload for LINE
    const webUnlockUrl = `/pickup/${qrToken}`;
    const notification: SentNotification = {
      id: 'notif-' + Date.now(),
      timestamp: new Date().toISOString(),
      recipientName: parcel.recipientName,
      recipientPhone: parcel.recipientPhone,
      recipientRoom: parcel.recipientRoom,
      trackingCode: parcel.trackingCode,
      pickupPin,
      qrToken,
      webUnlockUrl,
      status: 'SENT',
      flexMessagePayload: {
        type: 'flex',
        altText: `📦 มีพัสดุมาส่งถึงคุณ! (รหัสรับของ: ${pickupPin})`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: '📦 พัสดุมาถึงแล้ว!', weight: 'bold', size: 'lg', color: '#1DB446' },
              { type: 'text', text: `ตู้ล็อกเกอร์: ${this.state.name}`, size: 'xs', color: '#888888' },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              { type: 'text', text: `ผู้รับ: คุณ${parcel.recipientName} (ห้อง ${parcel.recipientRoom})`, weight: 'bold', size: 'md' },
              { type: 'text', text: `เลขพัสดุ: ${parcel.trackingCode}`, size: 'sm', color: '#555555' },
              { type: 'separator', margin: 'md' },
              { type: 'text', text: '🔑 รหัสเปิดตู้ (PIN Code):', size: 'sm', color: '#888888', margin: 'md' },
              { type: 'text', text: pickupPin, size: 'xxl', weight: 'bold', color: '#0284c7', align: 'center' },
              { type: 'text', text: 'หรือสแกน QR Code ที่หน้าตู้เพื่อเปิดผ่านมือถือ', size: 'xs', color: '#999999', align: 'center' },
            ],
          },
        },
      },
    };

    this.notifications.unshift(notification);

    return { locker: this.getState(), parcel, notification };
  }

  // Recipient unlocks via PIN (at Kiosk) or QR Token (from Mobile Web)
  unlock(codeOrToken: string): { success: boolean; message: string; parcel?: Parcel } {
    if (this.state.status !== 'OCCUPIED' || !this.state.currentParcel) {
      return { success: false, message: 'ขณะนี้ไม่มีพัสดุในตู้' };
    }

    const parcel = this.state.currentParcel;
    const isValid = parcel.pickupPin === codeOrToken.trim() || parcel.qrToken === codeOrToken.trim();

    if (!isValid) {
      this.addLog('UNLOCK_ATTEMPT', `พยายามปลดล็อกไม่สำเร็จ (รหัสไม่ถูกต้อง: ${codeOrToken})`, parcel.id);
      return { success: false, message: 'รหัสเปิดตู้ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' };
    }

    // Success: Unlock door
    this.state.doorState = 'OPEN';
    this.state.hardwareCommand = 'UNLOCK';
    this.state.lastUpdated = new Date().toISOString();

    // Mark parcel as picked up
    parcel.pickedUpAt = new Date().toISOString();
    parcel.status = 'PICKED_UP';
    this.history.unshift({ ...parcel });

    this.addLog('UNLOCK_SUCCESS', `ปลดล็อกตู้สำเร็จ! นำพัสดุ ${parcel.trackingCode} ออกเรียบร้อย`, parcel.id);

    return { success: true, message: 'ปลดล็อกตู้สำเร็จ! กรุณาเปิดประตูและหยิบพัสดุ', parcel };
  }

  // Door is closed after parcel retrieval -> Reset to AVAILABLE
  completePickup(): LockerState {
    this.state.status = 'AVAILABLE';
    this.state.doorState = 'CLOSED';
    this.state.currentParcel = null;
    this.state.hardwareCommand = 'IDLE';
    this.state.lastUpdated = new Date().toISOString();
    this.addLog('DOOR_CLOSED', 'ประตูปิดเรียบร้อย ตู้พร้อมใช้งานสำหรับผู้ส่งรายถัดไป');
    return this.getState();
  }

  // Admin emergency unlock
  forceUnlock(reason: string = 'แอดมินสั่งปลดล็อกฉุกเฉิน'): LockerState {
    this.state.doorState = 'OPEN';
    this.state.hardwareCommand = 'UNLOCK';
    this.state.lastUpdated = new Date().toISOString();
    this.addLog('FORCE_UNLOCK', reason, this.state.currentParcel?.id);
    return this.getState();
  }

  // Hardware updates door state (e.g. ESP32 Reed Switch sensor reports closed/open)
  updateDoorState(doorState: DoorStatus): LockerState {
    this.state.doorState = doorState;
    if (doorState === 'CLOSED' && this.state.status === 'AVAILABLE' && this.state.hardwareCommand === 'UNLOCK') {
      this.state.hardwareCommand = 'IDLE';
    }
    this.state.lastUpdated = new Date().toISOString();
    return this.getState();
  }

  // Clear hardware command once ESP32 executes it
  acknowledgeHardwareCommand(): void {
    this.state.hardwareCommand = 'IDLE';
  }

  // Reset entire system for demo / testing
  resetSystem(): LockerState {
    this.state = {
      id: 'LK-01',
      name: 'Smart Locker 01 (ตู้หลัก)',
      location: 'หอพักนักศึกษา / อาคาร A ชั้น 1',
      status: 'AVAILABLE',
      doorState: 'CLOSED',
      currentParcel: null,
      lastUpdated: new Date().toISOString(),
      hardwareCommand: 'IDLE',
    };
    this.addLog('DOOR_CLOSED', 'รีเซ็ตระบบกลับสู่ค่าเริ่มต้น พร้อมใช้งาน');
    return this.getState();
  }
}

// Global singleton instance across Next.js API requests
const globalForStore = globalThis as unknown as { lockerStore: LockerStore };
export const lockerStore = globalForStore.lockerStore || new LockerStore();
if (process.env.NODE_ENV !== 'production') globalForStore.lockerStore = lockerStore;
