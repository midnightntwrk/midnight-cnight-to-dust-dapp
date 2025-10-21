'use client';

import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion, AccordionItem, Tooltip } from '@heroui/react';
import Image from 'next/image';
import InfoIcon from '@/assets/icons/info.svg';
import CardanoWalletCard from './dashboard/CardanoWalletCard';
import GenerationRateCard from './dashboard/GenerationRateCard';
import MidnightWalletCard from './dashboard/MidnightWalletCard';
import RegistrationUtxoCard from './dashboard/RegistrationUtxoCard';
import DustLifecycleChart from './dashboard/DustLifecycleChart';
import WalletsModal from './wallet-connect/WalletsModal';
import LoadingBackdrop from './ui/LoadingBackdrop';

export default function Dashboard() {
    const router = useRouter();
    const {
        cardano,
        isAutoReconnecting,
        connectCardanoWallet,
        connectMidnightWallet,
        getAvailableCardanoWallets,
        getAvailableMidnightWallets,
        midnight,
        registrationUtxo,
        isLoadingRegistrationUtxo,
    } = useWalletContext();

    const [isCardanoModalOpen, setIsCardanoModalOpen] = useState(false);
    const [isMidnightModalOpen, setIsMidnightModalOpen] = useState(false);

    // useEffect(() => {
    //     if (!isAutoReconnecting && !cardano.isConnected) {
    //         router.push('/');
    //     }
    // }, [cardano.isConnected, isAutoReconnecting, router]);

    // Show loading backdrop while auto-reconnecting
    if (isAutoReconnecting) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingBackdrop
                    isVisible={true}
                    title="Connecting to saved wallets..."
                    subtitle="Please wait while we restore your wallet connections"
                />
            </div>
        );
    }

    if (isLoadingRegistrationUtxo) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <LoadingBackdrop
                    isVisible={true}
                    title="Loading registration UTXO..."
                    subtitle="Please wait while we load your registration UTXO"
                />
            </div>
        );
    }

    // Don't render dashboard if Cardano wallet is not connected (after auto-reconnect is complete)
    if (!cardano.isConnected) {
        return null; // This should trigger redirect via useEffect
    }

    // Wallet display names and icons

    const handleCardanoWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectCardanoWallet(wallet as SupportedWallet);
        setIsCardanoModalOpen(false);
    };

    const handleMidnightWalletSelect = async (wallet: SupportedWallet | SupportedMidnightWallet) => {
        await connectMidnightWallet(wallet as SupportedMidnightWallet);
        setIsMidnightModalOpen(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Generating DUST</h1>
                    <p className="text-gray-500">Manage your Cardano and Midnight wallet connections</p>
                </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                <CardanoWalletCard />
                <GenerationRateCard />
                <MidnightWalletCard />
            </div>

            {/* Accordion for Registration UTXO and DUST Lifecycle Chart */}
            <div className="mt-6">
                <Accordion
                    variant="splitted"
                    selectionMode="multiple"
                    className='gap-6'
                >
                    <AccordionItem
                        key="utxo"
                        aria-label="Registration UTXO Details"
                        title={
                            <div className="flex flex-row gap-2 items-center">
                                <span className='text-[18px] font-normal'>Registration UTXO Details</span>
                                <Tooltip
                                    content="On-chain proof of your Cardano-Midnight address registration"
                                    placement="top"
                                    classNames={{
                                        content: "bg-gray-800 text-white text-sm px-2 py-1"
                                    }}
                                >
                                    <Image src={InfoIcon} alt='info' width={24} height={24} className="cursor-pointer" />
                                </Tooltip>
                            </div>
                        }
                        classNames={{
                            base: "bg-[#70707035]",
                            title: "text-white",
                            trigger: "py-4 px-6",
                            content: "pb-6 px-6",
                        }}
                    >
                        <RegistrationUtxoCard />
                    </AccordionItem>

                    <AccordionItem
                        key="lifecycle"
                        aria-label="DUST Generation Lifecycle"
                        title={
                            <div className="flex flex-row gap-2 items-center">
                                <span className='text-[18px] font-normal'>DUST Generation Lifecycle</span>
                                <Tooltip
                                    content="Visual representation of your DUST generation progress over time"
                                    placement="top"
                                    classNames={{
                                        content: "bg-gray-800 text-white text-sm px-2 py-1"
                                    }}
                                >
                                    <Image src={InfoIcon} alt='info' width={24} height={24} className="cursor-pointer" />
                                </Tooltip>
                            </div>
                        }
                        classNames={{
                            base: "bg-[#70707035]",
                            title: "text-white",
                            trigger: "py-4 px-6",
                            content: "pb-6 px-6",
                        }}
                    >
                        <DustLifecycleChart />
                    </AccordionItem>
                </Accordion>
            </div>

            {/* Wallet Selection Modals */}
            <WalletsModal
                isOpen={isCardanoModalOpen}
                onOpenChange={setIsCardanoModalOpen}
                wallets={getAvailableCardanoWallets()}
                handleWalletSelect={handleCardanoWalletSelect}
            />

            <WalletsModal
                isOpen={isMidnightModalOpen}
                onOpenChange={setIsMidnightModalOpen}
                wallets={getAvailableMidnightWallets()}
                handleWalletSelect={handleMidnightWalletSelect}
            />
        </div>
    );
}
