import { NextRequest, NextResponse } from 'next/server';
import { dbGetUsers, dbCreateUser, dbUpdateUser, dbUpdateUserRole, dbDeleteUser } from '@/lib/db';
import { UserRole } from '@/lib/types';

export async function GET() {
  const users = await dbGetUsers();
  return NextResponse.json({ success: true, data: users });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, phone, room, role, password, lineUserId } = body;
    if (!name || !username) {
      return NextResponse.json({ success: false, message: 'กรุณากรอกชื่อและ Username' }, { status: 400 });
    }

    const newUser = await dbCreateUser({
      name,
      username,
      password: password || '1234',
      phone: phone || '',
      room: room || '',
      role: (role as UserRole) || 'RECIPIENT',
      lineUserId: lineUserId || '',
    });

    return NextResponse.json({ success: true, data: newUser, message: 'สร้างผู้ใช้สำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, role, ...rest } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing user ID' }, { status: 400 });
    }

    // Role assignment
    if (role) {
      const updated = await dbUpdateUserRole(id, role as UserRole);
      if (!updated) return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    // Update other fields
    if (Object.keys(rest).length > 0) {
      await dbUpdateUser(id, rest);
    }

    const users = await dbGetUsers();
    const user = users.find((u) => u.id === id);

    return NextResponse.json({ success: true, data: user, message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing user ID' }, { status: 400 });
    }

    const ok = await dbDeleteUser(id);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'ไม่พบผู้ใช้' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ลบผู้ใช้สำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
