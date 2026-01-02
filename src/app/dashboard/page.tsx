'use client';

import dynamicImport from 'next/dynamic';

const DynamicDashboard = dynamicImport(() => import('@/components/DashboardMain'), { ssr: false });

// Force dynamic rendering - prevent static generation during build
export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return <DynamicDashboard />;
}
