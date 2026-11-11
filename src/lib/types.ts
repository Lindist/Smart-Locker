export type UserRole = 'RECIPIENT' | 'SENDER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  username: string;
  phone: string;
  room: string;
  role: UserRole;
}

export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type DoorStatus = 'CLOSED' | 'OPEN';

export interface Locker {
  id: string; // 'LK-1', 'LK-2', 'LK-3', 'LK-4'
  number: number; // 1, 2, 3, 4
  name: string; // 'ตู้ที่ 1', 'ตู้ที่ 2', ...
  status: LockerStatus;
  doorState: DoorStatus;
  currentParcelId: string | null;
  lastUpdated: string;
}

export interface Parcel {
  id: string;
  trackingCode: string;
  lockerId: string;
  lockerNumber: number;
  recipientId: string;
  recipientName: string;
  recipientPhone: string;
  recipientRoom: string;
  senderId?: string;
  senderName?: string;
  pickupPin: string; // 6-digit PIN code
  qrToken: string; // Unique QR Token
  status: 'PENDING' | 'PICKED_UP';
  depositedAt: string;
  pickedUpAt?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'DEPOSIT' | 'UNLOCK' | 'ADMIN_UNLOCK' | 'ROLE_CHANGE' | 'USER_UPDATE' | 'PARCEL_UPDATE' | 'DELETE';
  details: string;
  userId?: string;
}
