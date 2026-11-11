import { supabase, isSupabaseConfigured } from './supabase';
import { systemStore } from './store';
import { User, Locker, Parcel, UserRole } from './types';
import { sendLineFlexNotification } from './line';

// Helper to convert snake_case from DB to camelCase for TypeScript
function mapLockerFromDb(row: Record<string, unknown>): Locker {
  return {
    id: String(row.id),
    number: Number(row.number),
    name: String(row.name),
    status: row.status as Locker['status'],
    doorState: (row.door_state as Locker['doorState']) || 'CLOSED',
    currentParcelId: row.current_parcel_id ? String(row.current_parcel_id) : null,
    lastUpdated: String(row.last_updated || new Date().toISOString()),
  };
}

function mapParcelFromDb(row: Record<string, unknown>): Parcel {
  return {
    id: String(row.id),
    trackingCode: String(row.tracking_code),
    lockerId: String(row.locker_id),
    lockerNumber: Number(row.locker_number),
    recipientId: String(row.recipient_id),
    recipientName: String(row.recipient_name),
    recipientPhone: String(row.recipient_phone || ''),
    recipientRoom: String(row.recipient_room || ''),
    senderId: row.sender_id ? String(row.sender_id) : undefined,
    senderName: row.sender_name ? String(row.sender_name) : undefined,
    pickupPin: String(row.pickup_pin),
    qrToken: String(row.qr_token),
    status: row.status as Parcel['status'],
    depositedAt: String(row.deposited_at || new Date().toISOString()),
    pickedUpAt: row.picked_up_at ? String(row.picked_up_at) : undefined,
  };
}

// ----------------------------------------------------
// USERS SERVICE
// ----------------------------------------------------
export async function dbLoginUser(username: string, password: string): Promise<User | null> {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  // 1. If Supabase is connected
  if (isSupabaseConfigured() && supabase) {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', cleanUser)
      .single();

    if (!error && user) {
      const validPass = user.password || (user.username === 'admin' ? 'admin' : '1234');
      if (cleanPass === validPass) {
        systemStore.setActiveUserId(user.id);
        return user as User;
      }
    }
  }

  // 2. In-memory fallback
  const users = systemStore.getUsers();
  const user = users.find((u) => u.username.toLowerCase() === cleanUser.toLowerCase());
  if (user) {
    const expectedPass = user.password || (user.username === 'admin' ? 'admin' : '1234');
    if (cleanPass === expectedPass) {
      systemStore.setActiveUserId(user.id);
      return user;
    }
  }

  return null;
}

export async function dbGetUsers(): Promise<User[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('users').select('*');
    if (!error && data) return data as User[];
  }
  return systemStore.getUsers();
}

export async function dbCreateUser(data: Omit<User, 'id'>): Promise<User> {
  if (isSupabaseConfigured() && supabase) {
    const id = 'usr-' + Date.now();
    const newUser = { id, ...data };
    const { data: inserted, error } = await supabase.from('users').insert([newUser]).select().single();
    if (!error && inserted) return inserted as User;
  }
  return systemStore.createUser(data);
}

export async function dbUpdateUser(id: string, data: Partial<User>): Promise<User | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data: updated, error } = await supabase.from('users').update(data).eq('id', id).select().single();
    if (!error && updated) return updated as User;
  }
  return systemStore.updateUser(id, data);
}

export async function dbUpdateUserRole(id: string, newRole: UserRole): Promise<User | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data: updated, error } = await supabase.from('users').update({ role: newRole }).eq('id', id).select().single();
    if (!error && updated) return updated as User;
  }
  return systemStore.updateUserRole(id, newRole);
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    return !error;
  }
  return systemStore.deleteUser(id);
}

// ----------------------------------------------------
// LOCKERS SERVICE
// ----------------------------------------------------
export async function dbGetLockers(): Promise<Locker[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lockers').select('*').order('number', { ascending: true });
    if (!error && data && data.length > 0) {
      return data.map(mapLockerFromDb);
    }
  }
  return systemStore.getLockers();
}

// Sender selects available locker -> Unlocks it
export async function dbSenderSelectAndUnlock(lockerId: string): Promise<Locker> {
  if (isSupabaseConfigured() && supabase) {
    const { data: lockerData, error: fetchErr } = await supabase.from('lockers').select('*').eq('id', lockerId).single();
    if (fetchErr || !lockerData) throw new Error('ไม่พบตู้ที่ระบุ');
    if (lockerData.status === 'OCCUPIED') throw new Error(`${lockerData.name} มีพัสดุอยู่แล้ว`);

    const { data: updated, error: updateErr } = await supabase
      .from('lockers')
      .update({ door_state: 'OPEN', last_updated: new Date().toISOString() })
      .eq('id', lockerId)
      .select()
      .single();

    if (!updateErr && updated) return mapLockerFromDb(updated);
  }
  return systemStore.senderSelectAndUnlockLocker(lockerId);
}

// Sender deposits parcel -> Locks locker, creates PIN & QR, sets OCCUPIED
export async function dbSenderDeposit(params: {
  lockerId: string;
  senderId?: string;
  senderName?: string;
  recipientId: string;
  trackingCode: string;
}): Promise<{ locker: Locker; parcel: Parcel }> {
  if (isSupabaseConfigured() && supabase) {
    const { data: lockerData } = await supabase.from('lockers').select('*').eq('id', params.lockerId).single();
    if (!lockerData) throw new Error('ไม่พบตู้ที่ระบุ');

    const { data: recipientData } = await supabase.from('users').select('*').eq('id', params.recipientId).single();
    if (!recipientData) throw new Error('ไม่พบข้อมูลผู้รับ');

    const pickupPin = Math.floor(100000 + Math.random() * 900000).toString();
    const qrToken = 'qr_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const parcelId = 'pcl-' + Date.now();

    const newParcelRow = {
      id: parcelId,
      tracking_code: params.trackingCode || 'TH-' + Math.floor(10000000 + Math.random() * 90000000),
      locker_id: lockerData.id,
      locker_number: lockerData.number,
      recipient_id: recipientData.id,
      recipient_name: recipientData.name,
      recipient_phone: recipientData.phone || '',
      recipient_room: recipientData.room || '',
      sender_id: params.senderId || null,
      sender_name: params.senderName || null,
      pickup_pin: pickupPin,
      qr_token: qrToken,
      status: 'PENDING',
      deposited_at: new Date().toISOString(),
    };

    const { data: insertedParcel, error: parcelErr } = await supabase.from('parcels').insert([newParcelRow]).select().single();
    if (parcelErr || !insertedParcel) throw new Error('บันทึกพัสดุไม่สำเร็จ: ' + parcelErr?.message);

    const { data: updatedLocker, error: lockerErr } = await supabase
      .from('lockers')
      .update({
        status: 'OCCUPIED',
        door_state: 'CLOSED',
        current_parcel_id: parcelId,
        last_updated: new Date().toISOString(),
      })
      .eq('id', params.lockerId)
      .select()
      .single();

    if (lockerErr || !updatedLocker) throw new Error('อัปเดตตู้ไม่สำเร็จ');

    // Trigger LINE notification
    const recipientLineId = recipientData.line_user_id || recipientData.lineUserId;
    if (recipientLineId) {
      sendLineFlexNotification({
        lineUserId: recipientLineId,
        recipientName: recipientData.name,
        recipientRoom: recipientData.room || '',
        lockerNumber: lockerData.number,
        trackingCode: newParcelRow.tracking_code,
        pickupPin,
        qrToken,
      }).catch(console.error);
    }

    return {
      locker: mapLockerFromDb(updatedLocker),
      parcel: mapParcelFromDb(insertedParcel),
    };
  }

  const res = systemStore.senderDepositParcel(params);
  const recipient = systemStore.getUsers().find((u) => u.id === params.recipientId);
  if (recipient?.lineUserId) {
    sendLineFlexNotification({
      lineUserId: recipient.lineUserId,
      recipientName: recipient.name,
      recipientRoom: recipient.room,
      lockerNumber: res.parcel.lockerNumber,
      trackingCode: res.parcel.trackingCode,
      pickupPin: res.parcel.pickupPin,
      qrToken: res.parcel.qrToken,
    }).catch(console.error);
  }
  return res;
}

// Recipient unlocks locker via PIN or QR Token
export async function dbRecipientUnlock(
  code: string,
  recipientId?: string
): Promise<{ success: boolean; message: string; locker?: Locker; parcel?: Parcel }> {
  if (isSupabaseConfigured() && supabase) {
    const trimmed = code.trim();
    const { data: parcelsData } = await supabase
      .from('parcels')
      .select('*')
      .eq('status', 'PENDING')
      .or(`pickup_pin.eq.${trimmed},qr_token.eq.${trimmed}`)
      .limit(1);

    const parcelRow = parcelsData?.[0];
    if (!parcelRow) {
      return { success: false, message: 'รหัสเปิดตู้ไม่ถูกต้อง หรือไม่มีพัสดุที่รอรับด้วยรหัสนี้' };
    }

    // Update parcel to PICKED_UP
    const { data: updatedParcel } = await supabase
      .from('parcels')
      .update({ status: 'PICKED_UP', picked_up_at: new Date().toISOString() })
      .eq('id', parcelRow.id)
      .select()
      .single();

    // Update locker to AVAILABLE and door OPEN
    const { data: updatedLocker } = await supabase
      .from('lockers')
      .update({
        status: 'AVAILABLE',
        door_state: 'OPEN',
        current_parcel_id: null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', parcelRow.locker_id)
      .select()
      .single();

    const lockerObj = updatedLocker ? mapLockerFromDb(updatedLocker) : undefined;
    const parcelObj = updatedParcel ? mapParcelFromDb(updatedParcel) : undefined;

    return {
      success: true,
      message: `ปลดล็อก ${lockerObj?.name || 'ตู้'} สำเร็จ! กรุณาหยิบพัสดุและปิดตู้`,
      locker: lockerObj,
      parcel: parcelObj,
    };
  }

  return systemStore.recipientUnlock(code, recipientId);
}

// ----------------------------------------------------
// ADMIN MASTER LOCKER ACTIONS
// ----------------------------------------------------
export async function dbAdminUnlockLocker(lockerId: string): Promise<Locker> {
  if (isSupabaseConfigured() && supabase) {
    const { data: updated, error } = await supabase
      .from('lockers')
      .update({ door_state: 'OPEN', last_updated: new Date().toISOString() })
      .eq('id', lockerId)
      .select()
      .single();
    if (!error && updated) return mapLockerFromDb(updated);
  }
  return systemStore.adminUnlockLocker(lockerId);
}

export async function dbAdminCloseLocker(lockerId: string): Promise<Locker> {
  if (isSupabaseConfigured() && supabase) {
    const { data: updated, error } = await supabase
      .from('lockers')
      .update({ door_state: 'CLOSED', last_updated: new Date().toISOString() })
      .eq('id', lockerId)
      .select()
      .single();
    if (!error && updated) return mapLockerFromDb(updated);
  }
  return systemStore.adminCloseLocker(lockerId);
}

export async function dbAdminResetLocker(lockerId: string): Promise<Locker> {
  if (isSupabaseConfigured() && supabase) {
    const { data: lockerData } = await supabase.from('lockers').select('current_parcel_id').eq('id', lockerId).single();
    if (lockerData?.current_parcel_id) {
      await supabase.from('parcels').update({ status: 'PICKED_UP' }).eq('id', lockerData.current_parcel_id);
    }

    const { data: updated, error } = await supabase
      .from('lockers')
      .update({
        status: 'AVAILABLE',
        door_state: 'CLOSED',
        current_parcel_id: null,
        last_updated: new Date().toISOString(),
      })
      .eq('id', lockerId)
      .select()
      .single();
    if (!error && updated) return mapLockerFromDb(updated);
  }
  return systemStore.adminResetLocker(lockerId);
}

// ----------------------------------------------------
// PARCELS SERVICE
// ----------------------------------------------------
export async function dbGetParcels(recipientId?: string): Promise<Parcel[]> {
  if (isSupabaseConfigured() && supabase) {
    let query = supabase.from('parcels').select('*').order('deposited_at', { ascending: false });
    if (recipientId) {
      query = query.eq('recipient_id', recipientId);
    }
    const { data, error } = await query;
    if (!error && data) {
      return data.map(mapParcelFromDb);
    }
  }

  let parcels = systemStore.getParcels();
  if (recipientId) {
    parcels = parcels.filter((p) => p.recipientId === recipientId);
  }
  return parcels;
}

export async function dbUpdateParcel(id: string, data: Partial<Parcel>): Promise<Parcel | null> {
  if (isSupabaseConfigured() && supabase) {
    const updatePayload: Record<string, unknown> = {};
    if (data.trackingCode !== undefined) updatePayload.tracking_code = data.trackingCode;
    if (data.pickupPin !== undefined) updatePayload.pickup_pin = data.pickupPin;
    if (data.status !== undefined) updatePayload.status = data.status;

    const { data: updated, error } = await supabase
      .from('parcels')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (!error && updated) return mapParcelFromDb(updated);
  }
  return systemStore.updateParcel(id, data);
}

export async function dbDeleteParcel(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    // Check if parcel was assigned to a locker
    const { data: parcel } = await supabase.from('parcels').select('locker_id').eq('id', id).single();
    const { error } = await supabase.from('parcels').delete().eq('id', id);
    if (!error && parcel?.locker_id) {
      // If locker was holding this parcel, free it
      await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE', door_state: 'CLOSED', current_parcel_id: null })
        .eq('id', parcel.locker_id)
        .eq('current_parcel_id', id);
    }
    return !error;
  }
  return systemStore.deleteParcel(id);
}
