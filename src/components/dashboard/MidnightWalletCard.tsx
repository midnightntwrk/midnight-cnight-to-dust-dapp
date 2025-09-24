import { Button, Card } from '@heroui/react'
import Image from 'next/image'
import React, { useState } from 'react'

import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import MidnightBg from '@/assets/midnight.svg';
import DustBalanceIcon from '@/assets/icons/DUST.svg';
import { useWalletContext } from '@/contexts/WalletContext';
import ToastContainer from '../ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import UpdateAddressModal from '../modals/UpdateAddressModal';
import StopGenerationModal from '../modals/StopGenerationModal';


const MidnightWalletCard = () => {
    const { toasts, showToast, removeToast } = useToast();
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    const [isStopModalOpen, setIsStopModalOpen] = useState(false);

    const {
        midnight,
        generationStatus
    } = useWalletContext();

    const handleFormatWalletAddress = (address: string) => {
        return address.slice(0, 10) + '...' + address.slice(-10);
    };

    const handleCopyAddress = async () => {
        const addressToCopy = generationStatus?.dustAddress || midnight.address;
        if (addressToCopy) {
            try {
                await navigator.clipboard.writeText(addressToCopy);
                showToast({
                    message: 'DUST address copied to clipboard!',
                    type: 'success'
                });
            } catch (error) {
                showToast({
                    message: 'Failed to copy address',
                    type: 'error'
                });
            }
        }
    };

    const handleAddressUpdate = (newAddress: string) => {
        console.log('Address updated to:', newAddress);
        showToast({
            message: 'DUST address updated successfully!',
            type: 'success'
        });
    };

    const handleStopGeneration = () => {
        console.log('Generation stopped');
        showToast({
            message: 'DUST generation stopped!',
            type: 'success'
        });
    };

    return (
        <Card className='bg-[#70707035] p-[24px] w-full lg:w-[40%] flex flex-col gap-4 relative pb-8'>
            <div className='absolute top-1/2 right-[16px] transform -translate-y-1/2'>
                <Image src={MidnightBg} alt='cardano bg' width={100} height={100} />
            </div>
            <div className='flex flex-row gap-2 z-10'>
                <span className='text-[18px] font-normal'>DUST Balance</span>
                <Image src={InfoIcon} alt='info' width={24} height={24} />
            </div>
            <div className='flex flex-row gap-2 items-center z-10'>
                <Image src={DustBalanceIcon} alt='night balance' width={42} height={42} />
                <span className='text-[24px] font-bold'>***</span>
                <span className='text-[24px]'>DUST</span>
            </div>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <span className='text-[14px] font-normal text-gray-400'>Destination Address Midnight</span>
                    <Image src={InfoIcon} alt='info' width={20} height={20} />
                </div>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <Image src={CheckIcon} alt='check' width={18} height={18} />
                    <span>{handleFormatWalletAddress(generationStatus?.dustAddress || midnight.address || '')}</span>
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

            <div className='flex z-10 mt-4 gap-4'>
                <Button
                    className="bg-brand-primary hover:bg-brand-primary-hover text-white w-full py-2 text-sm"
                    radius="md"
                    size="sm"
                    onPress={() => setIsUpdateModalOpen(true)}
                >
                    CHANGE ADDRESS
                </Button>
                <Button
                    className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 w-full py-2 text-sm"
                    radius="md"
                    size="sm"
                    onPress={() => setIsStopModalOpen(true)}
                >
                    STOP GENERATION
                </Button>
            </div>

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Modals */}
            <UpdateAddressModal
                isOpen={isUpdateModalOpen}
                onOpenChange={setIsUpdateModalOpen}
                currentAddress={generationStatus?.dustAddress || midnight.address}
                onAddressUpdate={handleAddressUpdate}
            />

            <StopGenerationModal
                isOpen={isStopModalOpen}
                onOpenChange={setIsStopModalOpen}
                dustAddress={generationStatus?.dustAddress || midnight.address}
                onStopGeneration={handleStopGeneration}
            />
        </Card>
    )
}

export default MidnightWalletCard