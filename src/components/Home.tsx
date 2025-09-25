'use client';

import Image from 'next/image';
import Faqs from './ui/Faqs';
import RequirementsCard from './ui/RequirementsCard';
import Onboard from './Onboard';
import { useWalletContext } from '@/contexts/WalletContext';

export default function Home() {
    const { cardano, isCheckingRegistration, isLoadingRegistrationUtxo } = useWalletContext();

    
    // Show loading while checking registration status
    if (cardano.isConnected && (isCheckingRegistration || isLoadingRegistrationUtxo)) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-[40px]">
                <div className="flex-1" />
                <Image src="/assets/midnight_logo.svg" alt="logo" width={150} height={100} />
                <div className="flex flex-col items-center justify-center text-center px-4">
                    <p className="text-xl font-bold leading-tight">Checking registration status...</p>
                </div>
                <div className="flex-1" />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-[40px]">
            <div className="flex-1" />
            <Image src="/assets/midnight_logo.svg" alt="logo" width={150} height={100} />
            <div className="flex flex-col items-center justify-center text-center px-4">
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">Generate DUST from your NIGHT</p>
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-[20px]">
                <Onboard />
            </div>
            <RequirementsCard />
            <Faqs />
        </div>
    );
}
