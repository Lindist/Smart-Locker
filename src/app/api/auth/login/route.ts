import { NextRequest, NextResponse } from 'next/server';
import { dbLoginUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { phone, username, password } = await req.json();
    const loginIdentifier = phone || username;

    if (!loginIdentifier || !password) {
      return NextResponse.json(
        { success: false, message: 'กรุณากรอกเบอร์โทรศัพท์ และรหัสผ่าน' },
        { status: 400 }
      );
    }

    const user = await dbLoginUser(loginIdentifier, password);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'เบอร์โทรศัพท์หรือรหัสผ่านไม่ถูกต้อง' },
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
