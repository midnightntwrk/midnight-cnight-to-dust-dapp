'use client';

import dynamicImport from 'next/dynamic';

const DynamicConnect = dynamicImport(() => import('@/components/ConnectMain'), { ssr: false });

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <DynamicConnect />
  );
}
