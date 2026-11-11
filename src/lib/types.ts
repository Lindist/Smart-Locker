export type LockerStatus = 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE';
export type DoorStatus = 'CLOSED' | 'OPEN';

export interface Parcel {
  id: string;
  trackingCode: string;
  recipientName: string;
  recipientPhone: string;
  recipientRoom: string;
  recipientLineId?: string;
  pickupPin: string; // 6-digit code e.g. "492015"
  qrToken: string; // unique token for QR unlock URL
  depositedAt: string;
  pickedUpAt?: string;
  status: 'DEPOSITED' | 'PICKED_UP';
}

export interface LockerState {
  id: string;
  name: string;
  location: string;
  status: LockerStatus;
  doorState: DoorStatus;
  currentParcel: Parcel | null;
  lastUpdated: string;
  hardwareCommand: 'IDLE' | 'UNLOCK';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: 'DEPOSIT_STARTED' | 'DOOR_OPENED' | 'DOOR_CLOSED' | 'PARCEL_DEPOSITED' | 'UNLOCK_ATTEMPT' | 'UNLOCK_SUCCESS' | 'PICKED_UP' | 'FORCE_UNLOCK';
  details: string;
  parcelId?: string;
}

export interface UserDirectoryItem {
  id: string;
  name: string;
  phone: string;
  room: string;
  lineId: string;
}
