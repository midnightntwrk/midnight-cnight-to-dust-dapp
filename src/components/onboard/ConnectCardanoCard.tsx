'use client';

import CardanoLogo from '@/assets/cardano.svg';
import CheckIcon from '@/assets/icons/check.svg';
import InfoIcon from '@/assets/icons/info.svg';
import { Button, Card, CardBody } from '@heroui/react';
import Image from 'next/image';

interface ConnectCardanoCardProps {
  // Connection state
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  isLoading?: boolean;
  error?: string | null;

  // Wallet info (when connected)
  walletName?: string;
  balanceNight?: string;
  address?: string;
}

export default function ConnectCardanoCard({ isConnected, onConnect, onDisconnect, isLoading = false, error, walletName, balanceNight, address }: ConnectCardanoCardProps) {
  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 9)}...${addr.slice(-9)}`;
  };

  return (
    <div className="flex justify-center mb-8">
      <Card className="bg-[#70707040] border-none max-w-2xl w-full relative overflow-hidden">
        <CardBody className="p-6 md:p-8">
          {/* Cardano Logo - Background */}
          <div className="absolute top-8 right-8">
            <Image src={CardanoLogo} alt="Cardano" width={90} height={90} />
          </div>

          {/* Content */}
          <div className="relative z-10">
            {!isConnected ? (
              /* Disconnected State */
              <div className="space-y-6">
                {/* Title */}
                <h2 className="text-xl md:text-2xl font-bold text-white">Connect your Cardano Wallet</h2>

                {/* Subtitle */}
                <p className="text-[#FFFFFF50] text-sm md:text-base">Connect your CIP-30 compatible Cardano wallet.</p>

                {/* Connect Button */}
                <Button
                  onPress={onConnect}
                  isLoading={isLoading}
                  className="bg-brand-primary hover:bg-brand-primary-hover text-white font-medium w-full py-3 text-sm md:text-base"
                  size="lg"
                  radius="md"
                >
                  {isLoading ? 'CONNECTING...' : 'CONNECT CARDANO WALLET'}
                </Button>

                {/* Error Message */}
                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-sm">❌ {error}</p>
                  </div>
                )}
              </div>
            ) : (
              /* Connected State */
              <div className="space-y-4">
                {/* Header with Info Icon and Disconnect Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-bold text-white">Origin Address Cardano</h2>
                    <Image src={InfoIcon} alt="info" width={16} height={16} />
                  </div>
                </div>

                {/* Balance Info */}
                <div className="text-gray-400 text-sm">
                  Balance: <span className="text-white font-medium">{balanceNight} NIGHT</span>
                </div>

                {/* Wallet Info */}
                <div className="text-gray-400 text-sm">
                  Wallet: <span className="text-white font-medium">{walletName}</span>
                </div>

                {/* Address with Check and Copy Icons */}
                <div className="flex items-center gap-2 mt-3">
                  <Image src={CheckIcon} alt="check" width={16} height={16} />
                  <span className="text-white text-sm font-mono flex-1">{formatAddress(address || '')}</span>
                  <Button onPress={onDisconnect} size="sm" className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 px-4 py-1 text-xs" radius="md">
                    DISCONNECT
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
