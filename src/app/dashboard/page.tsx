'use client';

import dynamic from 'next/dynamic';

const DynamicDashboard = dynamic(() => import('@/components/DashboardMain'), { ssr: false });

export default function DashboardPage() {
    return <DynamicDashboard />;
}
