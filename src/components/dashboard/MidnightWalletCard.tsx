import { Card } from '@heroui/react'
import Image from 'next/image'
import React from 'react'

import InfoIcon from '@/assets/icons/info.svg';
import CopyIcon from '@/assets/icons/copy.svg';
import CheckIcon from '@/assets/icons/check.svg';
import CardanoBg from '@/assets/cardano.svg';
import MidnightBg from '@/assets/midnight.svg';
import NightBalanceIcon from '@/assets/icons/NIGHT.svg';
import DustBalanceIcon from '@/assets/icons/DUST.svg';
import { useWalletContext } from '@/contexts/WalletContext';


const MidnightWalletCard = () => {

    const {
        midnight
    } = useWalletContext();

    const handleFormatWalletAddress = (address: string) => {
        return address.slice(0, 10) + '...' + address.slice(-10);
    }

    return (
        <Card className='bg-[#70707035] p-[24px] w-[40%] flex flex-col gap-4 relative pb-8'>
            <div className='absolute top-1/2 right-[16px] transform -translate-y-1/2'>
                <Image src={MidnightBg} alt='cardano bg' width={100} height={100} />
            </div>
            <div className='flex flex-row gap-2 z-10'>
                <span className='text-[18px] font-normal'>DUST Balance</span>
                <Image src={InfoIcon} alt='info' width={24} height={24} />
            </div>
            <div className='flex flex-row gap-2 items-center z-10'>
                <Image src={DustBalanceIcon} alt='night balance' width={42} height={42} />
                <span className='text-[24px] font-bold'>1000</span>
                <span className='text-[24px]'>DUST</span>
            </div>
            <div className='flex flex-col gap-2'>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <span className='text-[14px] font-normal text-gray-400'>Destination Address Midnight</span>
                    <Image src={InfoIcon} alt='info' width={20} height={20} />
                </div>
                <div className='flex flex-row gap-2 items-center z-10'>
                    <Image src={CheckIcon} alt='check' width={18} height={18} />
                    <span>{handleFormatWalletAddress(midnight.address || '')}</span>
                    <Image src={CopyIcon} alt='copy' width={18} height={18} onClick={() => navigator.clipboard.writeText(midnight.address || '')} />
                </div>
            </div>
        </Card>
    )
}

export default MidnightWalletCard