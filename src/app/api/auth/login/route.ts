import { NextRequest, NextResponse } from 'next/server';
import { dbLoginUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอก Username และ Password' },
        { status: 400 }
      );
    }

    const user = await dbLoginUser(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `เข้าสู่ระบบสำเร็จในสิทธิ์ ${user.role}`,
      data: user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
