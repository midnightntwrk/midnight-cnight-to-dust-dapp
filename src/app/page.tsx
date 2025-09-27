'use client';

import dynamic from 'next/dynamic';

const DynamicHome = dynamic(() => import('@/components/HomeMain'), { ssr: false });

export default function Page() {
    return <DynamicHome />;
}
