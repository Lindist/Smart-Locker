import { NextResponse } from 'next/server';

export async function GET() {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;

  if (!channelId) {
    return NextResponse.json(
      {
        success: false,
        message: 'ยังไม่ได้ตั้งค่า LINE_LOGIN_CHANNEL_ID ใน .env.local กรุณาตรวจสอบการตั้งค่า',
      },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/line/callback`;

  // Random state for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

  // LINE OAuth 2.1 authorization URL
  const lineAuthUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
  lineAuthUrl.searchParams.set('response_type', 'code');
  lineAuthUrl.searchParams.set('client_id', channelId);
  lineAuthUrl.searchParams.set('redirect_uri', redirectUri);
  lineAuthUrl.searchParams.set('state', state);
  lineAuthUrl.searchParams.set('scope', 'profile openid');

  const response = NextResponse.redirect(lineAuthUrl.toString());

  // Store state in HTTP-only cookie for verification
  response.cookies.set('line_oauth_state', state, {
    path: '/',
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: 'lax',
  });

  return response;
}
