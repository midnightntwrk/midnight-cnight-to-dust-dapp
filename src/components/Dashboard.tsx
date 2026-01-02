'use client';

import InfoIcon from '@/assets/icons/info.svg';
import { SupportedMidnightWallet, SupportedWallet, useWalletContext } from '@/contexts/WalletContext';
import { Accordion, AccordionItem, Tooltip } from '@heroui/react';
import Image from 'next/image';
import { useState } from 'react';
import CardanoWalletCard from './dashboard/CardanoWalletCard';
import DustLifecycleChart from './dashboard/DustLifecycleChart';
import GenerationRateCard from './dashboard/GenerationRateCard';
import IndexerSyncBanner from './dashboard/IndexerSyncBanner';
import MidnightWalletCard from './dashboard/MidnightWalletCard';
import RegistrationUtxoCard from './dashboard/RegistrationUtxoCard';
import LoadingBackdrop from './ui/LoadingBackdrop';
import WalletsModal from './wallet-connect/WalletsModal';

export default function Dashboard() {
  const {
    cardano,
    isAutoReconnecting,
    connectCardanoWallet,
    connectMidnightWallet,
    getAvailableCardanoWallets,
    getAvailableMidnightWallets,
    isLoadingRegistrationUtxo,
    registrationUtxo,
    generationStatus,
  } = useWalletContext();

  // Show banner when registered on-chain (Blockfrost) but indexer hasn't synced yet
  const showIndexerSyncBanner = !!(registrationUtxo && generationStatus?.registered === false);
  const isIndexerSyncing = !!(registrationUtxo && generationStatus?.registered === false);

  // Disable lifecycle chart when indexer is syncing OR when DUST balance is 0
  const dustBalance = generationStatus?.currentCapacity ? parseFloat(generationStatus.currentCapacity) : 0;
  const shouldDisableLifecycleChart = isIndexerSyncing || dustBalance === 0;

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
        <LoadingBackdrop isVisible={true} title="Connecting to saved wallets..." subtitle="Please wait while we restore your wallet connections" />
      </div>
    );
  }

  if (isLoadingRegistrationUtxo) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <LoadingBackdrop isVisible={true} title="Loading registration UTXO..." subtitle="Please wait while we load your registration UTXO" />
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

      {/* Indexer Sync Banner - shows when on-chain registration exists but indexer hasn't synced */}
      <IndexerSyncBanner isVisible={!!showIndexerSyncBanner} />

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <CardanoWalletCard />
        <GenerationRateCard />
        <MidnightWalletCard />
      </div>

      {/* Accordion for Registration UTXO and DUST Lifecycle Chart */}
      <div className="mt-6">
        <Accordion variant="splitted" selectionMode="multiple" className="gap-6">
          <AccordionItem
            key="utxo"
            aria-label="Registration UTXO Details"
            title={
              <div className="flex flex-row gap-2 items-center">
                <span className="text-[18px] font-normal">Registration UTXO Details</span>
                <Tooltip
                  content="On-chain proof of your Cardano-Midnight address registration"
                  placement="top"
                  classNames={{
                    content: 'bg-gray-800 text-white text-sm px-2 py-1',
                  }}
                >
                  <Image src={InfoIcon} alt="info" width={24} height={24} className="cursor-pointer" />
                </Tooltip>
              </div>
            }
            classNames={{
              base: 'bg-[#70707035]',
              title: 'text-white',
              trigger: 'py-4 px-6',
              content: 'pb-6 px-6',
            }}
          >
            <RegistrationUtxoCard />
          </AccordionItem>

          <AccordionItem
            key="lifecycle"
            aria-label="DUST Generation Lifecycle"
            isDisabled={shouldDisableLifecycleChart}
            title={
              <div className="flex flex-row gap-2 items-center">
                <span className="text-[18px] font-normal">DUST Generation Lifecycle</span>
                <Tooltip
                  content={
                    isIndexerSyncing
                      ? 'Chart will be available once indexer syncs'
                      : dustBalance === 0
                        ? 'Chart will be available once you start generating DUST'
                        : 'Visual representation of your DUST generation progress over time'
                  }
                  placement="top"
                  classNames={{
                    content: 'bg-gray-800 text-white text-sm px-2 py-1',
                  }}
                >
                  <Image src={InfoIcon} alt="info" width={24} height={24} className="cursor-pointer" />
                </Tooltip>
              </div>
            }
            classNames={{
              base: 'bg-[#70707035]',
              title: 'text-white',
              trigger: 'py-4 px-6',
              content: 'pb-6 px-6',
            }}
          >
            <DustLifecycleChart />
          </AccordionItem>
        </Accordion>
      </div>

      {/* Wallet Selection Modals */}
      <WalletsModal isOpen={isCardanoModalOpen} onOpenChange={setIsCardanoModalOpen} wallets={getAvailableCardanoWallets()} handleWalletSelect={handleCardanoWalletSelect} />

      <WalletsModal isOpen={isMidnightModalOpen} onOpenChange={setIsMidnightModalOpen} wallets={getAvailableMidnightWallets()} handleWalletSelect={handleMidnightWalletSelect} />
    </div>
  );
}
