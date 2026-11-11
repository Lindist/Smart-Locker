import { NextRequest, NextResponse } from 'next/server';
import { lockerStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, reason } = body;

    if (action === 'FORCE_UNLOCK') {
      const state = lockerStore.forceUnlock(reason || 'แอดมินสั่งปลดล็อกฉุกเฉิน');
      return NextResponse.json({ success: true, message: 'สั่งปลดล็อกฉุกเฉินสำเร็จ', data: state });
    }

    if (action === 'RESET') {
      const state = lockerStore.resetSystem();
      return NextResponse.json({ success: true, message: 'รีเซ็ตระบบทั้งหมดเรียบร้อยแล้ว', data: state });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Admin API error';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
