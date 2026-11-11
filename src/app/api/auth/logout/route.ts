import { NextResponse } from 'next/server';
import { systemStore } from '@/lib/store';

export async function POST() {
  systemStore.setActiveUserId('');
  return NextResponse.json({ success: true, message: 'ออกจากระบบสำเร็จ' });
}
