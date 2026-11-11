import { NextRequest, NextResponse } from 'next/server';
import { 
  dbGetLockers, 
  dbGetParcels, 
  dbSenderSelectAndUnlock, 
  dbSenderDeposit, 
  dbRecipientUnlock,
  dbAdminUnlockLocker,
  dbAdminCloseLocker,
  dbAdminResetLocker
} from '@/lib/db';
import { systemStore } from '@/lib/store';

export async function GET() {
  const lockers = await dbGetLockers();
  const parcels = await dbGetParcels();
  const logs = systemStore.getLogs();

  return NextResponse.json({
    success: true,
    data: {
      lockers,
      parcels,
      logs: logs.slice(0, 30),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Sender Action 1: Select available locker and unlock door
    if (action === 'sender_select_unlock') {
      const { lockerId } = body;
      const locker = await dbSenderSelectAndUnlock(lockerId);
      return NextResponse.json({
        success: true,
        message: `ปลดล็อก ${locker.name} แล้ว กรุณานำพัสดุใส่ในตู้และปิดตู้`,
        data: locker,
      });
    }

    // Sender Action 2: Put item, close door, confirm deposit
    if (action === 'sender_deposit') {
      const { lockerId, senderId, senderName, recipientId, trackingCode } = body;
      if (!lockerId || !recipientId) {
        return NextResponse.json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 });
      }

      const result = await dbSenderDeposit({
        lockerId,
        senderId,
        senderName,
        recipientId,
        trackingCode,
      });

      return NextResponse.json({
        success: true,
        message: `ฝากพัสดุลง ${result.locker.name} เรียบร้อยแล้ว`,
        data: result,
      });
    }

    // Recipient Action: Unlock by PIN code or QR Token
    if (action === 'recipient_unlock') {
      const { code, recipientId } = body;
      const result = await dbRecipientUnlock(code, recipientId);
      if (!result.success) {
        return NextResponse.json({ success: false, message: result.message }, { status: 400 });
      }
      return NextResponse.json(result);
    }

    // Admin Action: Force Unlock any locker
    if (action === 'admin_unlock') {
      const { lockerId } = body;
      const locker = await dbAdminUnlockLocker(lockerId);
      return NextResponse.json({
        success: true,
        message: `Admin ปลดล็อก ${locker.name} สำเร็จ`,
        data: locker,
      });
    }

    // Admin Action: Close door
    if (action === 'admin_close') {
      const { lockerId } = body;
      const locker = await dbAdminCloseLocker(lockerId);
      return NextResponse.json({
        success: true,
        message: `ปิดประตู ${locker.name} เรียบร้อย`,
        data: locker,
      });
    }

    // Admin Action: Reset locker to AVAILABLE
    if (action === 'admin_reset') {
      const { lockerId } = body;
      const locker = await dbAdminResetLocker(lockerId);
      return NextResponse.json({
        success: true,
        message: `รีเซ็ต ${locker.name} เป็นว่าง (AVAILABLE) เรียบร้อย`,
        data: locker,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
