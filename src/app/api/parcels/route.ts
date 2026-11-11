import { NextRequest, NextResponse } from 'next/server';
import { systemStore } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recipientId = searchParams.get('recipientId');

  let parcels = systemStore.getParcels();
  if (recipientId) {
    parcels = parcels.filter((p) => p.recipientId === recipientId);
  }

  return NextResponse.json({ success: true, data: parcels });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing parcel ID' }, { status: 400 });
    }

    const updated = systemStore.updateParcel(id, data);
    if (!updated) {
      return NextResponse.json({ success: false, message: 'ไม่พบพัสดุ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated, message: 'แก้ไขข้อมูลพัสดุสำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Missing parcel ID' }, { status: 400 });
    }

    const ok = systemStore.deleteParcel(id);
    if (!ok) {
      return NextResponse.json({ success: false, message: 'ไม่พบพัสดุ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'ลบพัสดุสำเร็จ' });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error';
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
