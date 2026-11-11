'use client';

import React, { use, useState, useEffect, Suspense } from 'react';
import MobileRecipientView from '@/components/MobileRecipientView';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

function PickupInner({ params }: PageProps) {
  const { token } = use(params);
  const [parcelInfo, setParcelInfo] = useState<{
    recipientName: string;
    recipientRoom: string;
    trackingCode: string;
    depositedAt: string;
    pickupPin: string;
  } | undefined>(undefined);

  useEffect(() => {
    fetch('/api/locker/status')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.locker?.currentParcel) {
          const parcel = data.data.locker.currentParcel;
          if (parcel.qrToken === token) {
            setParcelInfo({
              recipientName: parcel.recipientName,
              recipientRoom: parcel.recipientRoom,
              trackingCode: parcel.trackingCode,
              depositedAt: parcel.depositedAt,
              pickupPin: parcel.pickupPin,
            });
          }
        }
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-4 flex justify-between items-center">
        <Link
          href="/"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" /> กลับสู่หน้าควบคุมหลัก
        </Link>
        <span className="text-[10px] text-slate-500 font-mono">Token: {token.slice(0, 8)}...</span>
      </div>

      <MobileRecipientView token={token} initialParcelInfo={parcelInfo} />
    </div>
  );
}

export default function PickupPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-sm">กำลังโหลดข้อมูลพัสดุ...</div>}>
        <PickupInner params={params} />
      </Suspense>
    </div>
  );
}
