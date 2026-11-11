import { NextRequest, NextResponse } from 'next/server';
import { lockerStore } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Action 1: Sender wants to open locker door to deposit parcel
    if (action === 'start') {
      const locker = lockerStore.startDeposit();
      return NextResponse.json({
        success: true,
        message: 'ปลดล็อกประตูตู้แล้ว กรุณาวางพัสดุและปิดตู้',
        data: locker,
      });
    }

    // Action 2: Sender confirms deposit with recipient info
    if (action === 'confirm') {
      const { trackingCode, recipientName, recipientPhone, recipientRoom, recipientLineId } = body;

      if (!recipientName || !recipientPhone || !recipientRoom) {
        return NextResponse.json(
          { success: false, message: 'กรุณากรอกข้อมูลผู้รับให้ครบถ้วน (ชื่อ, เบอร์โทร, เลขห้อง)' },
          { status: 400 }
        );
      }

      const result = lockerStore.confirmDeposit({
        trackingCode,
        recipientName,
        recipientPhone,
        recipientRoom,
        recipientLineId,
      });

      return NextResponse.json({
        success: true,
        message: 'บันทึกการฝากพัสดุและส่งแจ้งเตือนเรียบร้อยแล้ว',
        data: result,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการทำรายการ';
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
