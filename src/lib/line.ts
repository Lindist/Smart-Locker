export interface SendLineParams {
  lineUserId: string;
  recipientName: string;
  recipientRoom: string;
  lockerNumber: number;
  trackingCode: string;
  pickupPin: string;
  qrToken: string;
}

export async function sendLineFlexNotification(params: SendLineParams): Promise<{ success: boolean; message: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    console.log('[LINE] ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env.local (ข้ามการส่ง LINE)');
    return { success: false, message: 'ไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN' };
  }

  if (!params.lineUserId || !params.lineUserId.startsWith('U')) {
    console.log(`[LINE] ผู้รับ (${params.recipientName}) ยังไม่มี LINE User ID ที่ถูกต้อง`);
    return { success: false, message: 'ผู้รับยังไม่ได้ระบุ LINE User ID' };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const unlockUrl = `${appUrl}/pickup/${params.qrToken}`;

  // Rich Flex Message Bubble
  const flexPayload = {
    to: params.lineUserId,
    messages: [
      {
        type: 'flex',
        altText: `📦 มีพัสดุมาส่งถึงคุณที่ ตู้ที่ ${params.lockerNumber} (รหัสเปิดตู้: ${params.pickupPin})`,
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#06C755',
            paddingAll: 'lg',
            contents: [
              {
                type: 'text',
                text: '📦 พัสดุของคุณมาถึงตู้แล้ว!',
                weight: 'bold',
                size: 'lg',
                color: '#FFFFFF',
              },
              {
                type: 'text',
                text: `Smart Parcel Locker • ตู้ที่ ${params.lockerNumber}`,
                size: 'xs',
                color: '#E0F8E8',
                margin: 'xs',
              },
            ],
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'lg',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ผู้รับ:', size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: `${params.recipientName} (ห้อง ${params.recipientRoom})`, size: 'sm', weight: 'bold', color: '#111111', flex: 5 },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'sm',
                contents: [
                  { type: 'text', text: 'เลขพัสดุ:', size: 'sm', color: '#888888', flex: 2 },
                  { type: 'text', text: params.trackingCode, size: 'sm', weight: 'bold', color: '#0284c7', flex: 5 },
                ],
              },
              { type: 'separator', margin: 'md' },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                backgroundColor: '#F8FAFC',
                cornerRadius: 'md',
                paddingAll: 'md',
                alignItems: 'center',
                contents: [
                  { type: 'text', text: '🔑 รหัสเปิดตู้ (PIN Code) 6 หลัก', size: 'xs', color: '#64748B' },
                  { type: 'text', text: params.pickupPin, size: 'xxl', weight: 'bold', color: '#0F172A', margin: 'xs' },
                  { type: 'text', text: 'นำรหัสนี้ไปกดที่หน้าตู้ หรือแตะปุ่มด้านล่าง', size: 'xxs', color: '#94A3B8', margin: 'xs' },
                ],
              },
            ],
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            paddingAll: 'md',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#06C755',
                action: {
                  type: 'uri',
                  label: '🔓 เปิดตู้รับพัสดุ (ผ่านเว็บ)',
                  uri: unlockUrl,
                },
              },
            ],
          },
        },
      },
    ],
  };

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(flexPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[LINE Error]:', res.status, errText);
      return { success: false, message: `LINE API Error: ${errText}` };
    }

    console.log(`[LINE] ยิงข้อความแจ้งเตือนหา ${params.lineUserId} สำเร็จ!`);
    return { success: true, message: 'ส่งการแจ้งเตือนทาง LINE สำเร็จ' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[LINE Network Error]:', errorMsg);
    return { success: false, message: errorMsg };
  }
}
