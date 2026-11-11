import { NextResponse } from 'next/server';
import { lockerStore } from '@/lib/store';

export async function POST() {
  try {
    const updatedLocker = lockerStore.completePickup();
    return NextResponse.json({
      success: true,
      message: 'ปิดประตูเรียบร้อย ตู้พร้อมใช้งานสำหรับผู้ส่งท่านถัดไป',
      data: updatedLocker,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'เกิดข้อผิดพลาด';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
