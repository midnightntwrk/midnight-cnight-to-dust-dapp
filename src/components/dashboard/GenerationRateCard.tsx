import { Card } from '@heroui/card';
import { Tooltip } from '@heroui/tooltip';
import React from 'react';

import InfoIcon from '@/assets/icons/info.svg';
import Image from 'next/image';
import { useWalletContext } from '@/contexts/WalletContext';
import { specksToTDust } from '@/lib/specksToTDust';

const GenerationRateCard = () => {
  const { generationStatus, registrationUtxo } = useWalletContext();

  // Check if indexer has synced (registered on-chain but indexer shows false)
  const isIndexerSyncing = registrationUtxo && generationStatus?.registered === false;
  const isIndexerSynced = generationStatus?.registered === true; // this doesn't mean it's synced...

  // Get generation rate - use indexer data if synced, otherwise show syncing state
  const getGenerationRate = () => {
    if (isIndexerSynced) {
      return specksToTDust(generationStatus?.generationRate) || '0';
    }
    if (isIndexerSyncing) {
      return '...';
    }
    return '0';
  };
  // Get CAP from indexer maxCapacity (in specks, converted to DUST)
  const getCapValue = () => {
    if (isIndexerSynced && generationStatus?.maxCapacity) {
      return specksToTDust(generationStatus.maxCapacity);
    }
    if (isIndexerSyncing) {
      return '...';
    }
    return '0';
  };
  return (
    <Card className="bg-[#70707035] p-[24px] w-full lg:w-[20%] gap-4">
      <div className="flex flex-col gap-1">
        <div className="flex flex-row gap-2 z-10">
          <span className="text-[18px] font-normal">Generation Rate</span>
          <Tooltip
            content="Rate of DUST generated per hour"
            placement="top"
            classNames={{
              content: 'bg-gray-800 text-white text-sm px-2 py-1',
            }}
          >
            <Image src={InfoIcon} alt="info" width={24} height={24} className="cursor-pointer" />
          </Tooltip>
        </div>
        <div className="flex flex-row gap-2 items-center z-10">
          <span className={`text-[24px] font-bold ${isIndexerSyncing ? 'text-amber-400 animate-pulse' : ''}`}>
            {getGenerationRate()}
          </span>
          <span className="text-[24px]">DUST/h</span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-row gap-2 z-10">
          <span className="text-[18px] font-normal">CAP</span>
          <Tooltip
            content="Maximum DUST you can generate (cap ratio: 5 DUST/NIGHT)"
            placement="top"
            classNames={{
              content: 'bg-gray-800 text-white text-sm px-2 py-1',
            }}
          >
            <Image src={InfoIcon} alt="info" width={24} height={24} className="cursor-pointer" />
          </Tooltip>
        </div>
        <div className="flex flex-row gap-2 items-center z-10">
          <span className={`text-[24px] font-bold ${isIndexerSyncing ? 'text-amber-400 animate-pulse' : ''}`}>
            {getCapValue()}
          </span>
          <span className="text-[24px]">DUST</span>
        </div>
      </div>
    </Card>
  );
};

export default GenerationRateCard;
