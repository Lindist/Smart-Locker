import { NextRequest, NextResponse } from 'next/server';
import { systemStore } from '@/lib/store';

export async function GET() {
  const activeId = systemStore.getActiveUserId();
  const users = systemStore.getUsers();
  const currentUser = users.find((u) => u.id === activeId) || users[0];

  return NextResponse.json({
    success: true,
    data: {
      currentUser,
      users,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    const user = systemStore.setActiveUserId(userId);
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
  }
}
