'use client';

import dynamicImport from 'next/dynamic';

const DynamicHome = dynamicImport(() => import('@/components/HomeMain'), { ssr: false });

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

export default function Page() {
  return <DynamicHome />;
}
