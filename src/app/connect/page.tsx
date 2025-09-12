'use client';

import dynamic from 'next/dynamic';

const DynamicConnect = dynamic(() => import('@/components/ConnectMain'), { ssr: false });

export default function Home() {
  return (
    <DynamicConnect />
  );
}
