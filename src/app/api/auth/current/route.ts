import { NextRequest, NextResponse } from 'next/server';
import { dbGetUsers } from '@/lib/db';
import { systemStore } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';

export async function GET() {
  const users = await dbGetUsers();
  const activeId = systemStore.getActiveUserId();
  const currentUser = users.find((u) => u.id === activeId) || users[0];

  return NextResponse.json({
    success: true,
    data: {
      currentUser,
      users,
      isSupabase: isSupabaseConfigured(),
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const users = await dbGetUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    systemStore.setActiveUserId(userId);
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
}
