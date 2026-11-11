-- ========================================================
-- INTELLIGENT PARCEL LOCKER SYSTEM - SUPABASE DATABASE SCHEMA
-- ========================================================

-- 1. DROP EXISTING TABLES (IF ANY)
DROP TABLE IF EXISTS parcels CASCADE;
DROP TABLE IF EXISTS lockers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;

-- 2. CREATE USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '1234',
    phone TEXT DEFAULT '',
    room TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'RECIPIENT', -- 'ADMIN', 'SENDER', 'RECIPIENT'
    line_user_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CREATE LOCKERS TABLE
CREATE TABLE IF NOT EXISTS lockers (
    id TEXT PRIMARY KEY,
    number INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'
    door_state TEXT NOT NULL DEFAULT 'CLOSED', -- 'OPEN', 'CLOSED'
    current_parcel_id TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CREATE PARCELS TABLE
CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    tracking_code TEXT NOT NULL,
    locker_id TEXT NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
    locker_number INTEGER NOT NULL,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    recipient_phone TEXT DEFAULT '',
    recipient_room TEXT DEFAULT '',
    sender_id TEXT,
    sender_name TEXT,
    pickup_pin TEXT NOT NULL,
    qr_token TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PICKED_UP', 'CANCELLED'
    deposited_at TIMESTAMPTZ DEFAULT NOW(),
    picked_up_at TIMESTAMPTZ
);

-- 5. CREATE ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    locker_id TEXT
);

-- 6. DISABLE ROW LEVEL SECURITY (RLS) FOR API ACCESS
-- หรือจะอนุญาตให้ anon key เข้าถึงได้เนื่องจากระบบมี API layer ตรวจสอบสิทธิ์
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE lockers DISABLE ROW LEVEL SECURITY;
ALTER TABLE parcels DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- 7. INSERT INITIAL DATA (ตู้และผู้ใช้งานเริ่มต้น)
INSERT INTO users (id, name, username, password, phone, room, role, line_user_id)
VALUES 
  ('usr-admin', 'สมศักดิ์ ดูแลระบบ (Admin)', 'admin', 'admin', '0890000000', 'Office', 'ADMIN', NULL),
  ('usr-sender', 'วิชัย ขนส่งด่วน (Courier)', 'sender1', '1234', '0819998888', 'Delivery', 'SENDER', NULL),
  ('usr-rec1', 'สมชาย สายเปย์', 'somchai', '1234', '0812345678', '101', 'RECIPIENT', NULL),
  ('usr-rec2', 'สมศรี มณีวรรณ', 'somsri', '1234', '0898765432', '205', 'RECIPIENT', NULL),
  ('usr-rec3', 'ธนากร สุขสันต์', 'thanakorn', '1234', '0865554321', '312', 'RECIPIENT', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO lockers (id, number, name, status, door_state, current_parcel_id, last_updated)
VALUES 
  ('LK-1', 1, 'ตู้ที่ 1', 'AVAILABLE', 'CLOSED', NULL, NOW()),
  ('LK-2', 2, 'ตู้ที่ 2', 'AVAILABLE', 'CLOSED', NULL, NOW()),
  ('LK-3', 3, 'ตู้ที่ 3', 'AVAILABLE', 'CLOSED', NULL, NOW()),
  ('LK-4', 4, 'ตู้ที่ 4', 'AVAILABLE', 'CLOSED', NULL, NOW())
ON CONFLICT (id) DO NOTHING;
