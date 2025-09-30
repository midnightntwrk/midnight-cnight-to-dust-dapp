'use client';

import Image from 'next/image';
import Faqs from './ui/Faqs';
import RequirementsCard from './ui/RequirementsCard';
import Onboard from './Onboard';
import LoadingBackdrop from './ui/LoadingBackdrop';
import { useWalletContext } from '@/contexts/WalletContext';

export default function Home() {
    const { cardano, midnight, isLoadingRegistrationUtxo } = useWalletContext();

    // Show loading backdrop when both wallets are connected and checking registration UTXO
    const showLoadingBackdrop = cardano.isConnected && midnight.isConnected && isLoadingRegistrationUtxo;

    return (
        <div className="flex flex-col items-center justify-center h-full gap-[40px]">
            <LoadingBackdrop
                isVisible={showLoadingBackdrop}
                title="Checking registration status..."
                subtitle="Please wait while we verify your registration"
            />

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
