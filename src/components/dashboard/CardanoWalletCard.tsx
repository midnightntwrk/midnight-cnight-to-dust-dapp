import { Card, Button } from '@heroui/react'
import Image from 'next/image'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import CardanoBg from '@/assets/cardano.svg';
import NightBalanceIcon from '@/assets/icons/NIGHT.svg';
import { useWalletContext } from '@/contexts/WalletContext';
import LoadingBackdrop from '../ui/LoadingBackdrop';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';


const CardanoWalletCard = () => {
    const router = useRouter();
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    const {
        cardano,
        disconnectCardanoWallet
    } = useWalletContext();

    const handleFormatWalletAddress = (address: string) => {
        return address.slice(0, 10) + '...' + address.slice(-10);
    };

    const handleCopyAddress = async () => {
        if (cardano.address) {
            try {
                await navigator.clipboard.writeText(cardano.address);
                showToast({
                    message: 'Cardano address copied to clipboard!',
                    type: 'success'
                });
            } catch {
                showToast({
                    message: 'Failed to copy address',
                    type: 'error'
                });
            }
        }
    };

    const handleDisconnect = async () => {
        setIsDisconnecting(true);

        // Add small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Disconnect wallet
        disconnectCardanoWallet();

        // Redirect to home
        router.push('/');
    };

    return (
        <Card className='bg-[#70707035] p-[24px] w-full lg:w-[40%] flex flex-col gap-4 relative pb-8'>
            <div className='absolute top-1/2 right-[16px] transform -translate-y-1/2'>
                <Image src={CardanoBg} alt='cardano bg' width={100} height={100} />
            </div>
            <div className='flex flex-row gap-2 z-10'>
                <span className='text-[18px] font-normal'>Night Balance</span>
                <Image src={InfoIcon} alt='info' width={24} height={24} />
            </div>
            <div className='flex flex-row gap-2 items-center z-10'>
                <Image src={NightBalanceIcon} alt='night balance' width={42} height={42} />
                <span className='text-[24px] font-bold'>{cardano.balanceNight}</span>
                <span className='text-[24px]'>NIGHT</span>
            </div>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <span className='text-[14px] font-normal text-gray-400'>Origin Address Cardano</span>
                    <Image src={InfoIcon} alt='info' width={20} height={20} />
                </div>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <Image src={CheckIcon} alt='check' width={18} height={18} />
                    <span>{handleFormatWalletAddress(cardano.address || '')}</span>
                    <Image
                        src={CopyIcon}
                        alt='copy'
                        width={18}
                        height={18}
                        className="cursor-pointer hover:opacity-70"
                        onClick={handleCopyAddress}
                    />
                </div>
            </div>

            {/* Disconnect Button */}
            <div className='z-10 mt-4'>
                <Button
                    onClick={handleDisconnect}
                    isLoading={isDisconnecting}
                    className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 w-full py-2 text-sm"
                    radius="md"
                    size="sm"
                    isDisabled={isDisconnecting}
                >
                    {isDisconnecting ? 'DISCONNECTING...' : 'DISCONNECT'}
                </Button>
            </div>

            {/* Loading Backdrop */}
            <LoadingBackdrop
                isVisible={isDisconnecting}
                title="Disconnecting wallet..."
                subtitle="Redirecting to home page"
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </Card>
    )
}

export default CardanoWalletCard