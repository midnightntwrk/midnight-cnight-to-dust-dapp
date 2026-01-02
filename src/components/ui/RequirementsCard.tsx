'use client';

import React from 'react';
import { Card, CardBody } from '@heroui/react';
import Image from 'next/image';
import WalletIcon from '@/assets/icons/wallet.svg';

export default function RequirementsCard() {
    return (
        <Card className="bg-[#1a1a1a] border-[#2a2a2a] max-w-xl mx-auto">
            <CardBody className="py-6 px-12">
                <div className="flex gap-6">
                    <Image src={WalletIcon} alt="wallet" width={74} height={74} />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-white font-medium">REQUIREMENTS:</span>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-1 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                <span className="text-gray-300 text-sm">CIP-30 compatible wallet</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-1 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                <span className="text-gray-300 text-sm">NIGHT tokens in your wallet</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-1 bg-white rounded-full flex-shrink-0 mt-2"></div>
                                <span className="text-gray-300 text-sm">Valid Midnight DUST address</span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}
