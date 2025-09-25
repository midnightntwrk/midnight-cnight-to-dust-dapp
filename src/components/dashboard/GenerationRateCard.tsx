import { Card } from '@heroui/react'
import React from 'react'

import InfoIcon from '@/assets/icons/info.svg';
import Image from 'next/image';
import { useWalletContext } from '@/contexts/WalletContext';


const GenerationRateCard = () => {
    const { generationStatus, cardano } = useWalletContext();

    // Calculate CAP as Night Balance * 10
    const calculateCap = () => {
        if (!cardano.balance) return '0';
        const balance = parseFloat(cardano.balance);
        const cap = Math.floor(balance * 10);
        return cap.toLocaleString();
    };
    return (
        <Card className='bg-[#70707035] p-[24px] w-full lg:w-[20%] gap-4'>
            <div className='flex flex-col gap-1'>
                <div className='flex flex-row gap-2 z-10'>
                    <span className='text-[18px] font-normal'>Generation Rate</span>
                    <Image src={InfoIcon} alt='info' width={24} height={24} />
                </div>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <span className='text-[24px] font-bold'>{generationStatus?.generationRate || '0'}</span>
                    <span className='text-[24px]'>DUST/H</span>
                </div>
            </div>
            <div className='flex flex-col gap-1'>
                <div className='flex flex-row gap-2 z-10'>
                    <span className='text-[18px] font-normal'>CAP</span>
                    <Image src={InfoIcon} alt='info' width={24} height={24} />
                </div>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <span className='text-[24px] font-bold'>{calculateCap()}</span>
                    <span className='text-[24px]'>DUST</span>
                </div>
            </div>

        </Card>
    )
}

export default GenerationRateCard