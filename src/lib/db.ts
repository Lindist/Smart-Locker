import { supabase, isSupabaseConfigured } from './supabase';
import { systemStore } from './store';
import { User, Locker, Parcel, UserRole } from './types';
import { sendLineFlexNotification } from './line';

// Helper to convert snake_case from DB to camelCase for TypeScript
function mapUserFromDb(row: Record<string, unknown>): User {
  return {
    id: String(row.id),
    name: String(row.name),
    username: String(row.username),
    password: row.password ? String(row.password) : undefined,
    phone: String(row.phone || ''),
    room: String(row.room || ''),
    role: row.role as User['role'],
    lineUserId: (row.line_user_id as string) || (row.lineUserId as string) || undefined,
  };
}

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
export async function dbLoginUser(identifier: string, password: string): Promise<User | null> {
  const cleanInput = identifier.trim();
  const cleanPhone = cleanInput.replace(/[\s-]/g, '');
  const cleanPass = password.trim();

  // 1. If Supabase is connected
  if (isSupabaseConfigured() && supabase) {
    // Primary lookup: Phone number
    let userRow: Record<string, unknown> | null = null;
    if (cleanPhone) {
      const { data: phoneUsers, error: phoneErr } = await supabase
        .from('users')
        .select('*')
        .eq('phone', cleanPhone)
        .limit(1);

      if (phoneErr) {
        throw new Error(`เชื่อมต่อฐานข้อมูล Supabase ไม่สำเร็จ: ${phoneErr.message}`);
      }
      if (phoneUsers && phoneUsers.length > 0) {
        userRow = phoneUsers[0];
      }
    }

    // Fallback lookup: legacy username (e.g. 'admin' or LINE login users without phone yet)
    if (!userRow && cleanInput) {
      const { data: legacyUsers, error: userErr } = await supabase
        .from('users')
        .select('*')
        .ilike('username', cleanInput)
        .limit(1);

      if (userErr) {
        throw new Error(`เชื่อมต่อฐานข้อมูล Supabase ไม่สำเร็จ: ${userErr.message}`);
      }
      if (legacyUsers && legacyUsers.length > 0) {
        userRow = legacyUsers[0];
      }
    }

    if (userRow) {
      const validPass =
        (userRow.password as string) || (userRow.username === 'admin' ? 'admin' : '1234');
      if (cleanPass === validPass) {
        systemStore.setActiveUserId(String(userRow.id));
        return mapUserFromDb(userRow);
      }
    }
    return null;
  }

  // 2. In-memory fallback (only when Supabase is NOT configured)
  const users = systemStore.getUsers();
  const user = users.find(
    (u) =>
      (cleanPhone && u.phone.replace(/[\s-]/g, '') === cleanPhone) ||
      u.username.toLowerCase() === cleanInput.toLowerCase()
  );
  if (user) {
    const expectedPass = user.password || (user.username === 'admin' ? 'admin' : '1234');
    if (cleanPass === expectedPass) {
      systemStore.setActiveUserId(user.id);
      return user;
    }
  }

  return null;
}

export async function dbFindOrCreateLineUser(params: {
  lineUserId: string;
  displayName: string;
  room?: string;
  phone?: string;
}): Promise<User> {
  const { lineUserId, displayName, room, phone } = params;
  const cleanPhone = (phone || '').trim().replace(/[\s-]/g, '');

  if (isSupabaseConfigured() && supabase) {
    // 1. Check if user with this line_user_id already exists in Supabase
    const { data: existingUser, error: findErr } = await supabase
      .from('users')
      .select('*')
      .eq('line_user_id', lineUserId)
      .single();

    if (findErr && findErr.code !== 'PGRST116') {
      throw new Error(`ค้นหาผู้ใช้ Supabase ล้มเหลว: ${findErr.message}`);
    }

    if (existingUser) {
      systemStore.setActiveUserId(existingUser.id);
      return mapUserFromDb(existingUser);
    }

    // 2. Not found -> Create new user in Supabase
    const id = 'usr-line-' + Date.now();
    const newUserRow = {
      id,
      name: displayName || 'ผู้ใช้ LINE',
      username: 'line_' + lineUserId.substring(1, 8).toLowerCase(),
      password: '1234',
      phone: cleanPhone,
      room: room || '101',
      role: 'RECIPIENT',
      line_user_id: lineUserId,
    };

    const { data: inserted, error } = await supabase.from('users').insert([newUserRow]).select().single();
    if (error || !inserted) {
      throw new Error(`บันทึกผู้ใช้ใหม่ลง Supabase ไม่สำเร็จ: ${error?.message || 'Permission denied / RLS'}`);
    }

    systemStore.setActiveUserId(inserted.id);
    return mapUserFromDb(inserted);
  }

  // Fallback to in-memory store
  const users = systemStore.getUsers();
  const existing = users.find((u) => u.lineUserId === lineUserId);
  if (existing) {
    systemStore.setActiveUserId(existing.id);
    return existing;
  }

  const newUser = systemStore.createUser({
    name: displayName || 'ผู้ใช้ LINE',
    username: 'line_' + lineUserId.substring(1, 8).toLowerCase(),
    password: '1234',
    phone: cleanPhone,
    room: room || '101',
    role: 'RECIPIENT',
    lineUserId,
  });
  systemStore.setActiveUserId(newUser.id);
  return newUser;
}

export async function dbGetUsers(): Promise<User[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Supabase dbGetUsers error:', error);
      return [];
    }
    return (data || []).map(mapUserFromDb);
  }
  return systemStore.getUsers();
}

export async function dbCreateUser(data: Omit<User, 'id'>): Promise<User> {
  const cleanPhone = (data.phone || '').trim().replace(/[\s-]/g, '');
  let cleanUsername =
    (data.username || '').trim() || `u_${cleanPhone || Date.now()}_${Date.now().toString().slice(-4)}`;

  if (isSupabaseConfigured() && supabase) {
    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .limit(1);
      if (existingPhone && existingPhone.length > 0) {
        throw new Error('เบอร์โทรศัพท์นี้มีผู้ใช้งานในระบบแล้ว');
      }
    }

    const { data: existingUsername } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .limit(1);
    if (existingUsername && existingUsername.length > 0) {
      cleanUsername = `${cleanUsername}_${Date.now().toString().slice(-4)}`;
    }

    const id = 'usr-' + Date.now();
    const userRow: Record<string, unknown> = {
      id,
      name: data.name,
      username: cleanUsername,
      password: data.password || '1234',
      phone: cleanPhone,
      room: data.room || '',
      role: data.role,
      line_user_id: data.lineUserId || null,
    };
    const { data: inserted, error } = await supabase.from('users').insert([userRow]).select().single();
    if (error || !inserted) {
      throw new Error(`สร้างผู้ใช้ใน Supabase ไม่สำเร็จ: ${error?.message || 'Unknown error'}`);
    }
    return mapUserFromDb(inserted);
  }

  if (cleanPhone && systemStore.getUsers().some((u) => u.phone.replace(/[\s-]/g, '') === cleanPhone)) {
    throw new Error('เบอร์โทรศัพท์นี้มีผู้ใช้งานในระบบแล้ว');
  }
  return systemStore.createUser({ ...data, phone: cleanPhone, username: cleanUsername });
}

export async function dbUpdateUser(id: string, data: Partial<User>): Promise<User | null> {
  const cleanPhone = data.phone !== undefined ? data.phone.trim().replace(/[\s-]/g, '') : undefined;

  if (isSupabaseConfigured() && supabase) {
    if (cleanPhone) {
      const { data: existingPhone } = await supabase
        .from('users')
        .select('id')
        .eq('phone', cleanPhone)
        .neq('id', id)
        .limit(1);
      if (existingPhone && existingPhone.length > 0) {
        throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานโดยบัญชีอื่นแล้ว');
      }
    }

    const updatePayload: Record<string, unknown> = { ...data };
    if (cleanPhone !== undefined) {
      updatePayload.phone = cleanPhone;
    }
    if (data.lineUserId !== undefined) {
      updatePayload.line_user_id = data.lineUserId || null;
      delete updatePayload.lineUserId;
    }
    const { data: updated, error } = await supabase.from('users').update(updatePayload).eq('id', id).select().single();
    if (error) {
      throw new Error(`อัปเดตผู้ใช้ไม่สำเร็จ: ${error.message}`);
    }
    return updated ? mapUserFromDb(updated) : null;
  }

  if (
    cleanPhone &&
    systemStore.getUsers().some((u) => u.id !== id && u.phone.replace(/[\s-]/g, '') === cleanPhone)
  ) {
    throw new Error('เบอร์โทรศัพท์นี้ถูกใช้งานโดยบัญชีอื่นแล้ว');
  }
  return systemStore.updateUser(id, cleanPhone !== undefined ? { ...data, phone: cleanPhone } : data);
}

export async function dbUpdateUserRole(id: string, newRole: UserRole): Promise<User | null> {
  if (isSupabaseConfigured() && supabase) {
    const { data: updated, error } = await supabase.from('users').update({ role: newRole }).eq('id', id).select().single();
    if (error) {
      throw new Error(`เปลี่ยนสิทธิ์ผู้ใช้ไม่สำเร็จ: ${error.message}`);
    }
    return updated ? mapUserFromDb(updated) : null;
  }
  return systemStore.updateUserRole(id, newRole);
}

export async function dbDeleteUser(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(`ลบผู้ใช้ไม่สำเร็จ: ${error.message}`);
    return true;
  }
  return systemStore.deleteUser(id);
}

// ----------------------------------------------------
// LOCKERS SERVICE
// ----------------------------------------------------
export async function dbGetLockers(): Promise<Locker[]> {
  if (isSupabaseConfigured() && supabase) {
    const { data, error } = await supabase.from('lockers').select('*').order('number', { ascending: true });
    if (error) {
      console.error('Supabase dbGetLockers error:', error);
      return [];
    }
    return (data || []).map(mapLockerFromDb);
  }
  return systemStore.getLockers();
}

// Sender selects available locker -> Unlocks it
export async function dbSenderSelectAndUnlock(lockerId: string): Promise<Locker> {
  if (isSupabaseConfigured() && supabase) {
    const { data: lockerData, error: fetchErr } = await supabase.from('lockers').select('*').eq('id', lockerId).single();
    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') {
        throw new Error(`ไม่พบตู้ ${lockerId} ใน Supabase (ตรวจสอบว่าปิด RLS หรือมีข้อมูลตู้แล้ว)`);
      }
      throw new Error(`ดึงข้อมูลตู้จาก Supabase ไม่สำเร็จ: ${fetchErr.message}`);
    }
    if (!lockerData) throw new Error('ไม่พบตู้ที่ระบุ');
    if (lockerData.status === 'OCCUPIED') throw new Error(`${lockerData.name} มีพัสดุอยู่แล้ว`);

    const { data: updated, error: updateErr } = await supabase
      .from('lockers')
      .update({ door_state: 'OPEN', last_updated: new Date().toISOString() })
      .eq('id', lockerId)
      .select()
      .single();

    if (updateErr || !updated) {
      throw new Error(`สั่งเปิดตู้ใน Supabase ไม่สำเร็จ: ${updateErr?.message || 'อาจติดสิทธิ์ RLS Policy'}`);
    }
    return mapLockerFromDb(updated);
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
    if (error || !updated) {
      throw new Error(`ปลดล็อกตู้ ${lockerId} ไม่สำเร็จ: ${error?.message || 'ไม่พบตู้ หรือติด RLS'}`);
    }
    return mapLockerFromDb(updated);
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
    if (error || !updated) {
      throw new Error(`ปิดประตูตู้ ${lockerId} ไม่สำเร็จ: ${error?.message || 'ไม่พบตู้ หรือติด RLS'}`);
    }
    return mapLockerFromDb(updated);
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
    if (error || !updated) {
      throw new Error(`รีเซ็ตตู้ ${lockerId} ไม่สำเร็จ: ${error?.message || 'ไม่พบตู้ หรือติด RLS'}`);
    }
    return mapLockerFromDb(updated);
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
    if (error) {
      console.error('Supabase dbGetParcels error:', error);
      return [];
    }
    return (data || []).map(mapParcelFromDb);
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

    if (error) {
      throw new Error(`แก้ไขพัสดุไม่สำเร็จ: ${error.message}`);
    }
    return updated ? mapParcelFromDb(updated) : null;
  }
  return systemStore.updateParcel(id, data);
}

export async function dbDeleteParcel(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && supabase) {
    // Check if parcel was assigned to a locker
    const { data: parcel } = await supabase.from('parcels').select('locker_id').eq('id', id).single();
    const { error } = await supabase.from('parcels').delete().eq('id', id);
    if (error) {
      throw new Error(`ลบพัสดุไม่สำเร็จ: ${error.message}`);
    }
    if (parcel?.locker_id) {
      // If locker was holding this parcel, free it
      await supabase
        .from('lockers')
        .update({ status: 'AVAILABLE', door_state: 'CLOSED', current_parcel_id: null })
        .eq('id', parcel.locker_id)
        .eq('current_parcel_id', id);
    }
    return true;
  }
  return systemStore.deleteParcel(id);
}
