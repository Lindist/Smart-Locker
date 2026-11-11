import { NextRequest, NextResponse } from 'next/server';
import { lockerStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, message: 'กรุณาระบุรหัส PIN หรือ Token' }, { status: 400 });
    }

    const result = lockerStore.unlock(code);

    if (!result.success) {
      return NextResponse.json({ success: false, message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        parcel: result.parcel,
        locker: lockerStore.getState(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการปลดล็อก';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
