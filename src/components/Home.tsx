'use client';

import { Button, Link } from '@heroui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Faqs from './ui/Faqs';
import RequirementsCard from './ui/RequirementsCard';
import Onboard from './Onboard';
import { useWalletContext } from '@/contexts/WalletContext';

export default function Home() {
    const router = useRouter();
    const { cardano, generationStatus, isCheckingRegistration } = useWalletContext();

    // Auto-redirect to dashboard if user is already registered
    useEffect(() => {
        console.log('🔍 Redirect check:', {
            cardanoConnected: cardano.isConnected,
            isCheckingRegistration,
            generationStatus,
            isRegistered: generationStatus?.isRegistered
        });

        if (cardano.isConnected && !isCheckingRegistration && generationStatus?.isRegistered) {
            console.log('🎯 User is already registered, redirecting to dashboard...');
            router.push('/dashboard');
        }
    }, [cardano.isConnected, isCheckingRegistration, generationStatus, router]);

    // Show loading while checking registration status
    if (cardano.isConnected && isCheckingRegistration) {
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
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                    Generate DUST from your NIGHT
                </p>
            </div>
            <div className="w-full flex flex-col items-center justify-center gap-[20px]">
                <Onboard />
            </div>
            {/* <div className="flex flex-row items-center justify-center gap-[20px]">
                <Button
                    as={Link}
                    href="/onboard"
                    // color="primary"
                    className="bg-[#0000FE] hover:bg-blue-600 text-white font-medium py-3 text-sm md:text-base"
                >
                    Register with Cardano
                </Button>
                <Button as={Link} href="/onboard" className="bg-black border-1 border-white text-white font-medium py-3 text-sm md:text-base">
                    Login with Midnight
                </Button>
            </div> */}
            <RequirementsCard />
            <Faqs />
        </div>
    );
}
