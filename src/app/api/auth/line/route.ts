import { NextRequest, NextResponse } from 'next/server';
import { dbFindOrCreateLineUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lineUserId, displayName, room, phone } = body;

    if (!lineUserId) {
      return NextResponse.json({ success: false, message: 'Missing LINE User ID' }, { status: 400 });
    }

    const user = await dbFindOrCreateLineUser({
      lineUserId,
      displayName: displayName || 'LINE User',
      room: room || '101',
      phone: phone || '',
    });

    return NextResponse.json({
      success: true,
      message: `เข้าสู่ระบบด้วย LINE สำเร็จ (${user.name})`,
      data: user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'LINE Login Error';
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}
