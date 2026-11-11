import { NextRequest, NextResponse } from 'next/server';
import { dbFindOrCreateLineUser } from '@/lib/db';
import { systemStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (error || !code) {
    console.error('[LINE OAuth Callback Error]:', error, errorDescription);
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(errorDescription || 'LINE Login Cancelled')}`);
  }

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  const channelSecret = process.env.LINE_LOGIN_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    console.error('[LINE OAuth]: Missing LINE_LOGIN_CHANNEL_ID or LINE_LOGIN_CHANNEL_SECRET');
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Server configuration error: missing LINE Login keys')}`);
  }

  const redirectUri = `${appUrl}/api/auth/line/callback`;

  try {
    // 1. Exchange authorization code for Access Token
    const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[LINE Token Exchange Failed]:', tokenRes.status, errText);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Token exchange failed')}`);
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fetch User Profile from LINE API using Access Token
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('[LINE Profile Fetch Failed]:', profileRes.status, errText);
      return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent('Failed to fetch LINE profile')}`);
    }

    const profile = await profileRes.json();
    const lineUserId = profile.userId; // Starts with 'U...'
    const displayName = profile.displayName || 'ผู้ใช้ LINE';

    // 3. Find existing or Create new User in Supabase 'users' table
    const user = await dbFindOrCreateLineUser({
      lineUserId,
      displayName,
      room: '101',
    });

    systemStore.setActiveUserId(user.id);

    // 4. Redirect user back to home with authenticated payload
    const userJson = JSON.stringify(user);
    const redirectTarget = new URL(appUrl);
    redirectTarget.searchParams.set('line_auth', Buffer.from(userJson).toString('base64'));

    const response = NextResponse.redirect(redirectTarget.toString());
    response.cookies.delete('line_oauth_state');
    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LINE Callback Exception]:', msg);
    return NextResponse.redirect(`${appUrl}?error=${encodeURIComponent(msg)}`);
  }
}
