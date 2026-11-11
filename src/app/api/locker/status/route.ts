import { NextResponse } from 'next/server';
import { lockerStore, DEFAULT_USERS } from '@/lib/store';

export async function GET() {
  const state = lockerStore.getState();
  const logs = lockerStore.getLogs();
  const history = lockerStore.getHistory();
  const notifications = lockerStore.getNotifications();

  return NextResponse.json({
    success: true,
    data: {
      locker: state,
      users: DEFAULT_USERS,
      logs: logs.slice(0, 30),
      history,
      notifications: notifications.slice(0, 10),
    },
  });
}
