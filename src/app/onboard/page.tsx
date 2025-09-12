'use client';

import dynamic from 'next/dynamic';

const DynamicOnboard = dynamic(() => import('@/components/OnboardMain'), { ssr: false });

export default function Page() {
    return (
        <DynamicOnboard />
    );
}
